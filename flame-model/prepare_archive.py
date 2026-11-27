"""Private export preparation. Nothing is uploaded and candidates are not training data."""
import argparse
import json
from pathlib import Path

def extract(export_path, allowed_ids):
    conversations = json.loads(Path(export_path).read_text(encoding="utf-8"))
    if not isinstance(conversations, list):
        raise ValueError("Expected conversations.json list")
    found = set()
    for conv in conversations:
        cid = str(conv.get("id") or conv.get("conversation_id") or "")
        if cid not in allowed_ids:
            continue
        found.add(cid)
        mapping = conv.get("mapping", {})
        node = conv.get("current_node")
        chain, visited = [], set()
        while node:
            if node in visited or node not in mapping:
                raise ValueError("Invalid conversation branch: " + cid)
            visited.add(node)
            item = mapping[node]
            msg = item.get("message") or {}
            role = (msg.get("author") or {}).get("role")
            body = msg.get("content") or {}
            if role in ("user", "assistant") and body.get("content_type") == "text":
                parts = body.get("parts", [])
                if parts and all(isinstance(p, str) for p in parts):
                    value = "\n".join(parts).strip()
                    if value:
                        chain.append({"role": role, "content": value})
            node = item.get("parent")
        yield {"source_id": cid, "title": conv.get("title", ""),
               "created_at": conv.get("create_time"), "approved": False,
               "messages": list(reversed(chain))}
    if found != allowed_ids:
        raise ValueError("Some selected conversation IDs were not found")

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("export", help="Private ChatGPT conversations.json")
    p.add_argument("allowlist", help="JSON array of explicitly selected conversation IDs")
    p.add_argument("output", help="Private review JSONL, outside the repository")
    a = p.parse_args()
    allowed = json.loads(Path(a.allowlist).read_text(encoding="utf-8"))
    if not isinstance(allowed, list) or not allowed or not all(isinstance(x, str) and x for x in allowed):
        raise ValueError("A nonempty explicit conversation ID list is required")
    rows = list(extract(a.export, set(allowed)))
    output = Path(a.output)
    with output.open("x", encoding="utf-8") as fp:
        for row in rows:
            fp.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"{len(rows)} selected conversations extracted for private review. Not approved for training.")

if __name__ == "__main__":
    main()
