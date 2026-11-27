"""Synthetic end-to-end training and trusted checkpoint continuation."""
import argparse
import hashlib
import tempfile
import unittest
from pathlib import Path
import torch
from flame_lm import train, load


class CheckpointTests(unittest.TestCase):
    def test_continues_weights_with_parent_identity_without_overwriting(self):
        with tempfile.TemporaryDirectory() as folder:
            parent = Path(folder) / "parent.pt"
            child = Path(folder) / "child.pt"
            args = argparse.Namespace(corpus=Path(__file__).with_name("demo_corpus.jsonl"),
                output=parent, block=512, width=32, heads=4, layers=1, steps=1,
                batch=2, threads=2, seed=42, lr=0.001, device="cpu", initialize_from=None)
            train(args)
            digest = hashlib.sha256(parent.read_bytes()).hexdigest()
            args.output, args.initialize_from = child, parent
            args.width = 64  # Parent config must take precedence when continuing.
            train(args)
            artifact = torch.load(child, weights_only=True)
            self.assertEqual(artifact["config"]["width"], 32)
            self.assertEqual(artifact["metrics"]["parent_checkpoint_sha256"], digest)
            self.assertEqual(artifact["metrics"]["initialization"], "checkpoint_weights_fresh_optimizer")
            self.assertFalse(artifact["metrics"]["release_approved"])
            self.assertEqual(hashlib.sha256(parent.read_bytes()).hexdigest(), digest)
            self.assertEqual(load(child).config["width"], 32)
            with self.assertRaises(FileExistsError):
                train(args)


if __name__ == "__main__":
    unittest.main()
