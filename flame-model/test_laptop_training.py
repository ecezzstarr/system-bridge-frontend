import json
import tempfile
import time
import unittest
from pathlib import Path
from laptop_training import execute, handle, NoRedirect
from training_worker import Workshop

ACTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

class OutboundTrainingTests(unittest.TestCase):
    def test_refusal_and_replay(self):
        with tempfile.TemporaryDirectory() as root:
            w = Workshop(root)
            for action in ('exec', 'install', '__proto__'):
                with self.assertRaises(ValueError):
                    execute(w, {'action': action, 'actor': ACTOR, 'command': 'anything'})
            job = {'id': ACTOR, 'lease': 'a' * 64, 'payload': {'action': 'deactivate', 'actor': ACTOR, 'confirmation': 'DEACTIVATE PILOT'}}
            first = handle(w, job)
            self.assertTrue(first['result']['success'])
            self.assertEqual(handle(w, job), first)
            with self.assertRaises(ValueError):
                handle(w, {**job, 'lease': 'b' * 64})
            with self.assertRaises(ValueError):
                NoRedirect().redirect_request(None, None, None, None, None, None)

    def test_synthetic_native_training_evaluation_pilot_and_rollback(self):
        with tempfile.TemporaryDirectory() as root:
            w = Workshop(root)
            rows = [dict(source_id='synthetic-'+split, approved=True, split=split,
                         messages=[dict(role='user', content='Say hello.'),dict(role='assistant', content='Hello.')])
                    for split in ('train', 'validation')]
            text = '\n'.join(json.dumps(row) for row in rows)
            with self.assertRaises(ValueError):
                w.import_corpus(text.replace('true', 'false'), ACTOR)
            corpus = w.import_corpus(text, ACTOR)
            hashes = []
            for index in range(2):
                run = w.start(corpus['sha'], 1, ACTOR)
                deadline = time.monotonic() + 240
                while w.record(run['id'])['state'] in ('queued', 'training', 'evaluating') and time.monotonic() < deadline:
                    time.sleep(.2)
                record = w.record(run['id'])
                self.assertEqual(record['state'], 'evaluated', record)
                self.assertEqual(w.report(run['id'])['checkpoint_sha256'], record['checkpoint'])
                hashes.append((run['id'], record['checkpoint']))
                w.activate(*hashes[-1], ACTOR)
            self.assertEqual(w.active()['previous']['checkpoint'], hashes[0][1])
            w.activate(*hashes[0], ACTOR)
            self.assertEqual(w.active()['current']['checkpoint'], hashes[0][1])
            answer = w.test([{'role': 'user', 'content': 'Say hello.'}])
            self.assertEqual(answer['checkpoint'], hashes[0][1])
            self.assertTrue(answer['experimental'])
            self.assertIsNone(w.deactivate(ACTOR)['current'])
            self.assertFalse(w.status()['productionEnabled'])
            print('Synthetic evidence:', json.dumps({'corpus':corpus['sha'], 'checkpoints':hashes, 'rollback':True, 'deactivated':True}))

if __name__ == '__main__':
    unittest.main()
