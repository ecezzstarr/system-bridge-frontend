"""Exercise candidate evidence without a network, Docker daemon or live DB."""
import importlib.util
import pathlib
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('candidate_probe', ROOT / 'selfhost/sovereign-candidate-probe.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class CandidateEvidence(unittest.TestCase):
    def gather(self, preview='https://candidate.weavingsystem.online', remote_host=None, disk_failure=False):
        node = 'weave-owned-01'
        sha = 'a' * 40
        values = {'WEAVE_SOVEREIGN_NODE_ID': node, 'WEAVE_HOST_PROVIDER': 'weave-owned',
                  'WEAVE_SOVEREIGN_PREVIEW_URL': preview}
        local = {'status': 'ready', 'releaseSha': sha,
                 'checks': {'database': True, 'accounts': True, 'media': True},
                 'host': {'provider': 'weave-owned', 'nodeId': node}}
        remote = dict(local, host=remote_host or local['host'])
        with patch.object(probe, 'health', side_effect=[local, remote]), \
             patch.object(probe, 'run_check', return_value=True), \
             patch.object(probe, 'memory_gib', return_value=16), \
             patch.object(probe.os, 'cpu_count', return_value=8), \
             patch.object(probe, 'restore_proof', return_value=True), \
             patch.object(probe.shutil, 'disk_usage',
                          side_effect=OSError('disk unavailable') if disk_failure else None,
                          return_value=types.SimpleNamespace(free=64 * 1024**3)):
            return probe.gather(values)

    def test_approved_candidate_passes(self):
        self.assertTrue(self.gather()['ready'])

    def test_oracle_with_same_sha_fails(self):
        report = self.gather(remote_host={'provider': 'oracle', 'nodeId': 'weave-owned-01'})
        self.assertFalse(report['checks']['release_identity'])
        self.assertFalse(report['ready'])

    def test_different_candidate_with_same_sha_fails(self):
        self.assertFalse(self.gather(remote_host={'provider': 'weave-owned', 'nodeId': 'another-host'})['ready'])

    def test_production_is_not_a_separate_preview(self):
        for url in ('https://weavingsystem.online', 'https://WEAVINGSYSTEM.ONLINE.',
                    'https://www.weavingsystem.online', 'https://candidate.weavingsystem.online/#fragment'):
            with self.subTest(url=url):
                self.assertFalse(self.gather(preview=url)['checks']['https_preview'])

    def test_disk_failure_still_generates_failed_evidence(self):
        report = self.gather(disk_failure=True)
        self.assertFalse(report['checks']['hardware'])
        self.assertFalse(report['ready'])
        self.assertEqual(report['nodeId'], 'weave-owned-01')

    def test_health_rejects_non_object_json(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.geturl.return_value = 'https://candidate.example/api/health/ready'
        response.read.return_value = b'[]'
        with patch.object(probe.urllib.request, 'urlopen', return_value=response):
            self.assertEqual(probe.health(response.geturl()), {})


if __name__ == '__main__':
    unittest.main()
