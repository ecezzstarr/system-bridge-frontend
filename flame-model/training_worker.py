"""Private, bounded research training and checkpoint pilot deployment.
No arbitrary shell, uploaded checkpoints, public inference, or tool execution."""
import argparse
import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
LIMIT = 1024 * 1024
HEX = re.compile(r"[a-f0-9]{64}")
RUN = re.compile(r"[a-f0-9]{32}")
TOKEN = re.compile(r"[A-Za-z0-9_-]{32,128}")
def now():
    return datetime.now(timezone.utc).isoformat()
def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
    return h.hexdigest()
def read(path):
    return json.loads(path.read_text(encoding="utf-8"))
def atomic(path, value):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    os.replace(tmp, path)
def validate_corpus(text):
    if not isinstance(text, str) or not 0 < len(text.encode("utf-8")) <= LIMIT:
        raise ValueError("Reviewed JSONL must be at most 1 MiB.")
    groups, counts = {}, {"train": 0, "validation": 0}
    for line in text.splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not isinstance(row, dict) or row.get("approved") is not True:
            raise ValueError("All dialogues must have explicit human approval.")
        source, split, messages = row.get("source_id"), row.get("split"), row.get("messages")
        if not isinstance(source,str) or not source.strip() or len(source)>250 or split not in counts or not isinstance(messages,list) or not 2<=len(messages)<=32 or len(messages)%2:
            raise ValueError("Invalid source, split or dialogue.")
        if groups.setdefault(source,split)!=split:
            raise ValueError("A source cannot cross training and validation splits.")
        for i,m in enumerate(messages):
            if not isinstance(m,dict) or m.get("role")!=("assistant" if i%2 else "user") or not isinstance(m.get("content"),str) or not m["content"].strip() or len(m["content"].encode("utf-8"))>(480 if i%2 else 4000):
                raise ValueError("Review alternating messages; assistant turns must fit the 512-byte model context.")
            if i%2:
                counts[split]+=1
        if sum(counts.values())>2000:
            raise ValueError("This CPU workshop accepts at most 2,000 assistant turns per corpus.")
    if min(counts.values())<1:
        raise ValueError("Training and validation must both be present.")
    return counts
class Workshop:
    def __init__(self, root):
        self.root=Path(root).resolve()
        code_root = HERE.parent if (HERE.parent / 'package.json').exists() else HERE
        if self.root==code_root or code_root in self.root.parents:
            raise ValueError("Private root must be outside the repository.")
        self.root.mkdir(parents=True,exist_ok=True,mode=0o700)
        if os.name!="nt":
            os.chmod(self.root,0o700)
        self.lock=threading.RLock()
        self.model=None
        self.model_sha=None
        self.active_path=self.root/"active.json"
        for p in self.root.glob("run-*/record.json"):
            row=read(p)
            if row["state"] in ("queued","training","evaluating"):
                row.update(state="interrupted",finishedAt=now())
                atomic(p,row)
    def run_dir(self, ident):
        if not isinstance(ident,str) or not RUN.fullmatch(ident):
            raise ValueError("Invalid run reference.")
        return self.root/("run-"+ident)
    def record(self, ident):
        p=self.run_dir(ident)/"record.json"
        if not p.is_file():
            raise ValueError("Run not found.")
        return read(p)
    def active(self):
        return read(self.active_path) if self.active_path.exists() else {"current":None,"previous":None}
    def status(self):
        with self.lock:
            corpus=self.root/"corpus.json"
            rows=[read(p) for p in self.root.glob("run-*/record.json")]
            rows.sort(key=lambda r:r["createdAt"],reverse=True)
            return {"ready":True,"corpus":read(corpus) if corpus.exists() else None,"runs":rows[:40],"deployment":self.active(),"productionEnabled":False}
    def import_corpus(self, text, actor):
        counts=validate_corpus(text)
        sha=hashlib.sha256(text.encode("utf-8")).hexdigest()
        with self.lock:
            p=self.root/("corpus-"+sha+".jsonl")
            if not p.exists():
                with p.open("xb") as f:f.write(text.encode("utf-8"))
            row={"sha":sha,"counts":counts,"importedAt":now(),"actor":actor}
            atomic(self.root/"corpus.json",row)
            return row
    def start(self, sha, steps, actor, parent=None):
        if not isinstance(sha,str) or not HEX.fullmatch(sha) or type(steps) is not int or not 1<=steps<=2000:
            raise ValueError("Choose a reviewed corpus and 1–2,000 training steps.")
        with self.lock:
            status=self.status()
            if any(r["state"] in ("queued","training","evaluating") for r in status["runs"]):
                raise ValueError("A training run is already active.")
            if not status["corpus"] or status["corpus"]["sha"]!=sha:
                raise ValueError("Corpus selection changed; refresh and confirm.")
            corpus=self.root/("corpus-"+sha+".jsonl")
            if digest(corpus)!=sha:raise ValueError("Corpus hash mismatch.")
            parent_path=None
            if parent is not None:
                r=self.record(parent)
                parent_path=self.run_dir(parent)/"model.pt"
                if r["state"]!="evaluated" or digest(parent_path)!=r["checkpoint"]:
                    raise ValueError("Parent checkpoint is not verified.")
            ident=uuid.uuid4().hex
            folder=self.run_dir(ident);folder.mkdir(mode=0o700)
            row={"id":ident,"state":"queued","createdAt":now(),"actor":actor,"corpus":sha,"steps":steps,"parent":parent}
            atomic(folder/"record.json",row)
            threading.Thread(target=self.train,args=(folder,row,corpus,parent_path),daemon=True).start()
            return row
    def train(self, folder, row, corpus, parent):
        def stage(state, **kwargs):
            with self.lock:
                row.update(state=state,**kwargs);atomic(folder/"record.json",row)
        try:
            stage("training")
            args=[sys.executable,str(HERE/"flame_lm.py"),"train",str(corpus),str(folder/"model.pt"),"--block","512","--width","64","--heads","4","--layers","2","--batch","2","--threads","2","--steps",str(row["steps"])]
            if parent:args+=["--initialize-from",str(parent)]
            result=subprocess.run(args,check=True,capture_output=True,text=True,timeout=7200)
            metrics=json.loads(result.stdout.strip().splitlines()[-1])
            checkpoint=digest(folder/"model.pt")
            stage("evaluating",checkpoint=checkpoint,metrics=metrics)
            subprocess.run([sys.executable,str(HERE/"evaluate.py"),str(folder/"model.pt"),str(folder/"evaluation.json"),"--knowledge",str(HERE/"institutional_seed.jsonl")],check=True,capture_output=True,timeout=900)
            report=read(folder/"evaluation.json")
            if report["checkpoint_sha256"]!=checkpoint or digest(folder/"model.pt")!=checkpoint:
                raise ValueError("Evaluation identity mismatch.")
            stage("evaluated",reportSha=digest(folder/"evaluation.json"),diagnosticPasses=report["keyword_probe_passes"],diagnosticCount=report["probe_count"],finishedAt=now())
        except Exception:
            stage("failed",finishedAt=now(),reason="Training or evaluation did not complete. Check private host capacity and corpus validity.")
    def verified(self, ident, sha):
        r=self.record(ident);folder=self.run_dir(ident)
        if r["state"]!="evaluated" or r.get("checkpoint")!=sha or digest(folder/"model.pt")!=sha or digest(folder/"evaluation.json")!=r.get("reportSha"):
            raise ValueError("Evaluated checkpoint identity not verified.")
        return r,folder
    def report(self, ident):
        r=self.record(ident)
        _,folder=self.verified(ident,r.get("checkpoint"))
        return read(folder/"evaluation.json")
    def activate(self, ident, sha, actor):
        with self.lock:
            _,folder=self.verified(ident,sha)
            from flame_lm import load
            import torch
            torch.set_num_threads(2)
            old=self.active()
            if old["current"] and old["current"]["checkpoint"]==sha and old["current"]["id"]==ident and self.model_sha==sha:
                return old
            candidate=load(folder/"model.pt")
            current={"id":ident,"checkpoint":sha,"actor":actor,"activatedAt":now()}
            atomic(self.active_path,{"current":current,"previous":old["current"] if old["current"] and old["current"]["id"]!=ident else old["previous"]})
            self.model,self.model_sha=candidate,sha
            return self.active()
    def deactivate(self, actor):
        with self.lock:
            old=self.active()
            atomic(self.active_path,{"current":None,"previous":old["current"] or old["previous"],"deactivatedBy":actor,"deactivatedAt":now()})
            self.model=self.model_sha=None
            return self.active()
    def test(self, messages):
        from serve import validate
        from flame_lm import load,generate,retrieve
        messages=validate({"messages":messages})
        with self.lock:
            active=self.active()["current"]
            if not active:raise ValueError("No checkpoint activated for pilot testing.")
            _,folder=self.verified(active["id"],active["checkpoint"])
            if self.model_sha!=active["checkpoint"]:
                self.model=load(folder/"model.pt");self.model_sha=active["checkpoint"]
            text=generate(self.model,messages,retrieve(HERE/"institutional_seed.jsonl",messages[-1]["content"]),limit=160,temperature=0)
            return {"text":text,"checkpoint":active["checkpoint"],"experimental":True}
class Handler(BaseHTTPRequestHandler):
    def setup(self):
        self.request.settimeout(30);super().setup()
    def log_message(self,*args):pass
    def reply(self,status,value):
        data=json.dumps(value,ensure_ascii=False,allow_nan=False).encode()
        self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Cache-Control","no-store");self.send_header("Content-Length",str(len(data)));self.end_headers();self.wfile.write(data)
    def authorized(self):
        return hmac.compare_digest(self.headers.get("Authorization","").encode(),("Bearer "+self.server.token).encode())
    def do_GET(self):
        if not self.authorized():return self.reply(401,{"error":"Unauthorized"})
        if self.path!="/status":return self.reply(404,{"error":"Not found"})
        try:self.reply(200,self.server.workshop.status())
        except Exception:self.reply(503,{"error":"Private worker unavailable."})
    def do_POST(self):
        if not self.authorized():return self.reply(401,{"error":"Unauthorized"})
        if self.path!="/action":return self.reply(404,{"error":"Not found"})
        try:
            n=int(self.headers.get("Content-Length","0"))
            if self.headers.get("Transfer-Encoding") or not 0<n<=LIMIT*2+65536 or self.headers.get_content_type()!="application/json":raise ValueError("Invalid request size or type.")
            body=json.loads(self.rfile.read(n))
            if not isinstance(body,dict):raise ValueError("Invalid request.")
            a=body.get("action");actor=body.get("actor")
            if not isinstance(actor,str) or not re.fullmatch(r"[a-fA-F0-9-]{36}",actor):raise ValueError("Invalid operator.")
            w=self.server.workshop
            if a=="import" and body.get("confirmation")=="IMPORT REVIEWED CORPUS":result=w.import_corpus(body.get("corpus"),actor)
            elif a=="train" and body.get("confirmation")=="START TRAINING":result=w.start(body.get("sha"),body.get("steps"),actor,body.get("parent"))
            elif a=="report":result=w.report(body.get("id"))
            elif a=="activate" and body.get("confirmation")=="DEPLOY PILOT":result=w.activate(body.get("id"),body.get("sha"),actor)
            elif a=="deactivate" and body.get("confirmation")=="DEACTIVATE PILOT":result=w.deactivate(actor)
            elif a=="test":result=w.test(body.get("messages"))
            else:raise ValueError("Unknown action or confirmation missing.")
            self.reply(200,{"success":True,"result":result})
        except (ValueError,KeyError,TypeError,FileNotFoundError):
            self.reply(400,{"error":"Invalid request, unverified artifact, or conflicting operation. Refresh workshop records."})
        except Exception:self.reply(503,{"error":"Private operation not confirmed."})
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("--root",required=True);a=p.parse_args()
    token=os.environ.get("WEAVE_FLAME_TRAINING_TOKEN","")
    if not TOKEN.fullmatch(token):raise SystemExit("Configure a private training token.")
    os.umask(0o077)
    server=ThreadingHTTPServer(("127.0.0.1",8766),Handler)
    server.token=token;server.workshop=Workshop(a.root)
    try:server.serve_forever()
    finally:server.server_close()
if __name__=="__main__":main()
