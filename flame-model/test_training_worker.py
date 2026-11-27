import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from training_worker import Workshop, validate_corpus, digest, atomic

class TrainingWorkerTests(unittest.TestCase):
    def test_reviewed_corpus_boundaries_and_snapshot(self):
        sample=Path(__file__).with_name("demo_corpus.jsonl").read_text()
        counts=validate_corpus(sample)
        self.assertGreater(counts["train"],0)
        self.assertGreater(counts["validation"],0)
        with self.assertRaises(ValueError):
            validate_corpus(sample.replace('"approved":true','"approved":false').replace('"approved": true','"approved": false'))
        with tempfile.TemporaryDirectory() as root:
            w=Workshop(root)
            r=w.import_corpus(sample,"test")
            self.assertEqual(digest(Path(root)/("corpus-"+r["sha"]+".jsonl")),r["sha"])
            with self.assertRaises(ValueError):w.start("0"*64,1,"test")
            with self.assertRaises(ValueError):w.start(r["sha"],2001,"test")
            with patch("training_worker.threading.Thread") as thread:
                run=w.start(r["sha"],1,"test")
                self.assertEqual(run["state"],"queued")
                thread.return_value.start.assert_called_once()
                with self.assertRaises(ValueError):w.start(r["sha"],1,"test")
            with self.assertRaises(ValueError):w.activate(run["id"],"0"*64,"test")
            with self.assertRaises(ValueError):w.record("../outside")
            self.assertFalse(w.status()["productionEnabled"])
            self.assertEqual(Workshop(root).record(run["id"])["state"],"interrupted")

    def test_pilot_pins_checkpoint_and_evaluation(self):
        with tempfile.TemporaryDirectory() as root:
            w=Workshop(root); ident="a"*32; folder=w.run_dir(ident);folder.mkdir()
            (folder/"model.pt").write_bytes(b"synthetic")
            sha=digest(folder/"model.pt")
            atomic(folder/"evaluation.json",{"checkpoint_sha256":sha})
            atomic(folder/"record.json",{"id":ident,"state":"evaluated","checkpoint":sha,"reportSha":digest(folder/"evaluation.json"),"createdAt":"2026"})
            with patch("flame_lm.load",return_value=object()):
                self.assertEqual(w.activate(ident,sha,"test")["current"]["checkpoint"],sha)
            self.assertIsNone(w.deactivate("test")["current"])
            (folder/"evaluation.json").write_text("{}")
            with self.assertRaises(ValueError):w.activate(ident,sha,"test")

if __name__=="__main__":unittest.main()
