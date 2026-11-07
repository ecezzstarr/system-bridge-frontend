#!/usr/bin/env python3
"""Regression for non-secret self-host release failure evidence."""
import importlib.util
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parent.parent
MODULE = ROOT / "selfhost" / "release-worker.py"
spec = importlib.util.spec_from_file_location("weave_release_worker", MODULE)
assert spec and spec.loader
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ReleaseFailureEvidence(unittest.TestCase):
    def test_build_failure_summary_and_verified_rollback(self):
        token = "private_worker_token_123456789"
        output = (
            "[WEAVE deploy] STAGE=image_build\n"
            "ERROR: failed to solve: no space left on device\n"
            f"Authorization: Bearer {token}\n"
            "[WEAVE deploy] FAILED_STAGE=image_build exit_code=1 line=301; restoring previous release\n"
            "[WEAVE deploy] Rollback local health verified at previous-sha\n"
            "[WEAVE deploy] Rollback public health verified at previous-sha\n"
            "[WEAVE deploy] RECOVERY_STATUS=verified rollback_sha=previous-sha\n"
        )
        values = {"WEAVE_RELEASE_CONTROL_TOKEN": token}
        message = worker.summarize_executor_failure(output, 1, values)
        self.assertIn("stage=image_build", message)
        self.assertIn("recovery=verified_previous_release", message)
        self.assertIn("no space left on device", message)
        self.assertNotIn(token, message)
        tail = worker.safe_executor_excerpt(output, values)
        self.assertIn("[redacted]", tail)
        self.assertNotIn(token, tail)

    def test_failing_public_health_and_unverified_recovery(self):
        output = (
            "[WEAVE deploy] STAGE=public_health\n"
            "Public WEAVE did not become healthy for release a1b2\n"
            "[WEAVE deploy] FAILED_STAGE=public_health exit_code=1 line=309\n"
            "[WEAVE deploy] RECOVERY_STATUS=manual_required rollback_sha=a1b2\n"
        )
        message = worker.summarize_executor_failure(output, 1, {})
        self.assertIn("stage=public_health", message)
        self.assertIn("recovery=manual_recovery_required", message)
        self.assertIn("did not become healthy", message)

    def test_preflight_failure_is_not_misreported_as_success(self):
        message = worker.summarize_executor_failure(
            "Server checkout has uncommitted source changes. Deployment stopped.\n", 3, {}
        )
        self.assertIn("stage=preflight_or_unreported", message)
        self.assertIn("recovery=not_confirmed", message)
        self.assertIn("exit=3", message)

    def test_script_emits_structured_failure_stages_and_preserves_rollback(self):
        shell = (ROOT / "selfhost" / "deploy-production.sh").read_text()
        self.assertIn('trap \'rollback $? $LINENO\' ERR', shell)
        self.assertIn("FAILED_STAGE=$DEPLOY_STAGE", shell)
        self.assertIn("RECOVERY_STATUS=verified", shell)
        self.assertIn("RECOVERY_STATUS=manual_required", shell)
        for stage in ("checkout", "release_environment", "image_build", "compose_restart",
                      "local_health", "public_health", "postdeploy_diagnostics"):
            self.assertIn(f'DEPLOY_STAGE="{stage}"', shell)


if __name__ == "__main__":
    unittest.main()
