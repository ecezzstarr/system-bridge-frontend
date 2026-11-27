"""Synthetic recovery regressions; contains no account material."""
import json
import tempfile
import unittest
from pathlib import Path
from prepare_threads import normalize


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)

    def page(self, name, turns, more=False):
        p = Path(self.temp.name) / name
        p.write_text(json.dumps({"thread":{"id":"selected","title":"Synthetic"},
            "page":{"hasMore":more,"nextCursor":"older" if more else None}, "turns":turns}), encoding="utf-8")
        return p

    def turn(self, ident, time, text):
        return {"id":ident,"startedAt":time,"items":[{"type":"userMessage","id":ident+"u",
            "content":[{"type":"text","text":text}]}]}

    def test_chronology_dedup_and_corrections(self):
        older = self.turn("old", 1, "Prior decision")
        newer = self.turn("new", 2, "Correction replaces prior decision")
        p = self.page("one.json", [newer, older])
        row = normalize([p, p], {"selected"})[0]
        self.assertEqual([m["content"] for m in row["messages"]], ["Prior decision", "Correction replaces prior decision"])
        self.assertFalse(row["approved"])
        self.assertFalse(row["account_complete"])

    def test_allowlist_missing_and_unselected(self):
        p = self.page("one.json", [])
        with self.assertRaises(ValueError):
            normalize([p], {"different"})
        with self.assertRaises(ValueError):
            normalize([p], {"selected", "missing"})

    def test_conflicting_message_rejected(self):
        a = self.page("a.json", [self.turn("same", 1, "original")])
        b = self.page("b.json", [self.turn("same", 1, "changed")])
        with self.assertRaises(ValueError):
            normalize([a, b], {"selected"})

    def test_partial_pagination_disclosed(self):
        p = self.page("one.json", [], more=True)
        self.assertFalse(normalize([p], {"selected"})[0]["pagination_exhausted"])


if __name__ == "__main__":
    unittest.main()
