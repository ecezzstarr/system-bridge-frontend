"""Normalize explicitly selected read_thread pages offline. Never grants training approval."""
import argparse
import hashlib
import json
from pathlib import Path


def unwrap(value):
    if "thread" in value:
        return value
    if value.get("isError"):
        raise ValueError("Source tool reported an error")
    for block in value.get("content", []):
        if block.get("type") == "text":
            parsed = json.loads(block["text"])
            if "thread" in parsed:
                return parsed
    raise ValueError("Expected a read_thread response")


def normalize(paths, allowed):
    sources = {}
    for path in paths:
        raw = Path(path).read_bytes()
        page = unwrap(json.loads(raw))
        cid = page["thread"]["id"]
        if cid not in allowed:
            raise ValueError("Source is outside explicit allowlist")
        row = sources.setdefault(cid, {"source_id": cid, "title": page["thread"]["title"],
            "approved": False, "source_type": "accessible_chat_text", "messages": [],
            "pages": [], "limitations": ["No attachments or alternate branches recovered",
                "Tool-visible text only; assistant claims are not verified facts"]})
        row["pages"].append({"sha256": hashlib.sha256(raw).hexdigest(),
            "next_cursor": page.get("page", {}).get("nextCursor"),
            "has_more": page.get("page", {}).get("hasMore"),
            "item_cursors": [t["nextItemCursor"] for t in page.get("turns", []) if t.get("nextItemCursor")]})
        for turn in page.get("turns", []):
            for index, item in enumerate(turn.get("items", [])):
                kind = item.get("type")
                if kind not in ("userMessage", "agentMessage"):
                    continue
                text = item.get("text") if kind == "agentMessage" else "\n".join(
                    p["text"] for p in item.get("content", []) if p.get("type") == "text")
                if not isinstance(text, str) or not text.strip():
                    continue
                message = {"message_id": item["id"], "turn_id": turn["id"],
                    "timestamp": turn.get("startedAt"), "item_order": index,
                    "role": "user" if kind == "userMessage" else "assistant", "content": text}
                previous = next((m for m in row["messages"] if m["message_id"] == message["message_id"]), None)
                if previous is not None and previous != message:
                    raise ValueError("Conflicting repeated source message")
                if previous is None:
                    row["messages"].append(message)
    if set(sources) != allowed:
        raise ValueError("Some selected sources were not recovered")
    for row in sources.values():
        row["messages"].sort(key=lambda m: (m["timestamp"] or 0, m["turn_id"], m["item_order"]))
        row["terminal_page_seen"] = any(p["has_more"] is False and not p["next_cursor"] for p in row["pages"])
        row["pagination_exhausted"] = len(row["pages"]) == 1 and row["terminal_page_seen"] and not any(p["item_cursors"] for p in row["pages"])
        # Exhausted pagination does not establish complete original account coverage.
        row["account_complete"] = False
    return sorted(sources.values(), key=lambda r: (r["messages"][0]["timestamp"] if r["messages"] else 0, r["source_id"]))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("allowlist")
    p.add_argument("output", help="Private JSONL outside the checkout")
    p.add_argument("pages", nargs="+")
    a = p.parse_args()
    allowed = json.loads(Path(a.allowlist).read_text(encoding="utf-8"))
    if not isinstance(allowed, list) or not allowed or not all(isinstance(x, str) and x for x in allowed):
        raise ValueError("Nonempty explicit source ID list required")
    output = Path(a.output).resolve()
    checkout = Path(__file__).resolve().parent.parent
    if output.is_relative_to(checkout):
        raise ValueError("Private source output must be outside the checkout")
    rows = normalize(a.pages, set(allowed))
    with output.open("x", encoding="utf-8") as fp:
        for row in rows:
            fp.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"{len(rows)} sources normalized; none approved for training")


if __name__ == "__main__":
    main()
