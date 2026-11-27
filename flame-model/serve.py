"""Private Flame inference service. Experimental evaluation only; never executes tools."""
import argparse
import hmac
import json
import os
import re
import threading
from hashlib import sha256
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import torch
from flame_lm import load, generate, retrieve

MAX_BODY = 16384
MAX_MESSAGES = 9
MAX_TEXT = 4000
MAX_REPLY = 256

def validate(body):
    if not isinstance(body, dict) or set(body) != {"messages"}:
        raise ValueError("Expected messages only")
    messages = body["messages"]
    if not isinstance(messages, list) or not 1 <= len(messages) <= MAX_MESSAGES or len(messages) % 2 != 1:
        raise ValueError("Expected bounded, alternating conversation ending with user")
    for i, m in enumerate(messages):
        role = "user" if i % 2 == 0 else "assistant"
        if not isinstance(m, dict) or set(m) != {"role", "content"} or m["role"] != role:
            raise ValueError("Invalid role or message fields")
        text = m["content"]
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT:
            raise ValueError("Invalid message length")
    return messages

class Server(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address, token, model, checkpoint_hash, knowledge=None):
        super().__init__(address, Handler)
        self.token = token
        self.model = model
        self.checkpoint_hash = checkpoint_hash
        self.knowledge = knowledge
        self.slot = threading.BoundedSemaphore(1)

class Handler(BaseHTTPRequestHandler):
    def setup(self):
        self.request.settimeout(10)
        super().setup()
    def log_message(self, *args):
        pass  # No conversation text, tokens, or user records in request logs.
    def reply(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def authorized(self):
        provided = self.headers.get("Authorization", "")
        return hmac.compare_digest(provided.encode("utf-8"), ("Bearer "+self.server.token).encode("utf-8"))
    def do_GET(self):
        if not self.authorized():
            return self.reply(401, {"error":"Unauthorized"})
        if self.path != "/health":
            return self.reply(404, {"error":"Not found"})
        return self.reply(200, {"ready":True, "experimental":True, "checkpoint":self.server.checkpoint_hash})
    def do_POST(self):
        if not self.authorized():
            return self.reply(401, {"error":"Unauthorized"})
        if self.path != "/generate":
            return self.reply(404, {"error":"Not found"})
        if self.headers.get("Transfer-Encoding") or self.headers.get_content_type() != "application/json":
            return self.reply(400, {"error":"Expected bounded JSON"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if not 0 < n <= MAX_BODY:
                return self.reply(413, {"error":"Request too large or empty"})
            raw = self.rfile.read(n)
            if len(raw) != n:
                raise ValueError("Incomplete body")
            messages = validate(json.loads(raw))
        except (ValueError, UnicodeError, TimeoutError):
            return self.reply(400, {"error":"Invalid conversation"})
        if not self.server.slot.acquire(blocking=False):
            return self.reply(429, {"error":"Model busy"})
        try:
            context = retrieve(self.server.knowledge, messages[-1]["content"]) if self.server.knowledge else ""
            result = generate(self.server.model, messages, context, limit=MAX_REPLY, temperature=0)
            if not isinstance(result, str) or not result.strip():
                return self.reply(503, {"error":"No usable model output"})
            return self.reply(200, {"text":result, "experimental":True, "checkpoint":self.server.checkpoint_hash})
        except Exception:
            return self.reply(503, {"error":"Inference unavailable"})
        finally:
            self.server.slot.release()

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("checkpoint")
    p.add_argument("--knowledge")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--threads", type=int, default=2)
    a = p.parse_args()
    token = os.environ.get("WEAVE_FLAME_LM_TOKEN", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", token):
        raise SystemExit("Set a strong WEAVE_FLAME_LM_TOKEN")
    path = Path(a.checkpoint)
    digest = sha256(path.read_bytes()).hexdigest()
    torch.set_num_threads(max(1,min(a.threads,8)))
    model = load(path)
    server = Server(("127.0.0.1", a.port), token, model, digest, a.knowledge)
    print("Experimental Flame inference listening on loopback", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
