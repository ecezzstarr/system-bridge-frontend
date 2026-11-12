#!/usr/bin/env python3
"""Regression for non-secret self-host release failure evidence."""
import importlib.util
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

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

    def test_disk_preflight_reports_explicit_operator_action(self):
        output = (
            "[WEAVE deploy] STAGE=disk_preflight\\n"
            "[WEAVE storage] INSUFFICIENT_DISK: need at least 16 GiB; deployment NOT started\\n"
        )
        message = worker.summarize_executor_failure(output, 12, {})
        self.assertIn("stage=disk_preflight", message)
        self.assertIn("insufficient_disk", message.lower())
        self.assertIn("recovery=not_confirmed", message)

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

    def test_executor_preflight_stderr_reaches_the_redacted_diagnostic(self):
        sha = "a" * 40
        token = "private_worker_token_123456789"
        with tempfile.TemporaryDirectory() as directory:
            executor = Path(directory) / "executor.sh"
            executor.write_text(
                "printf '%s\\n' 'Server checkout has uncommitted source changes.' >&2\n"
                f"printf '%s\\n' 'Authorization: Bearer {token}' >&2\n"
                "exit 3\n"
            )
            values = {"WEAVE_RELEASE_EXECUTOR": str(executor), "WEAVE_RELEASE_CONTROL_TOKEN": token}
            job = {"action": "deploy_latest", "target_sha": sha}
            with patch.object(worker, "validate_origin"), \
                    patch.object(worker, "cmd", return_value=sha), \
                    patch.object(worker, "is_good_ci", return_value=True), \
                    patch.object(worker, "get_local_release", return_value="b" * 40), \
                    patch.object(worker, "journal_executor_failure") as journal:
                with self.assertRaisesRegex(RuntimeError, "uncommitted source changes") as raised:
                    worker.execute(job, values)
                self.assertNotIn(token, str(raised.exception))
                output, settings, _ = journal.call_args.args
                self.assertIn("uncommitted source changes", output)
                self.assertNotIn(token, worker.safe_executor_excerpt(output, settings))

    def test_script_emits_structured_failure_stages_and_preserves_rollback(self):
        shell = (ROOT / "selfhost" / "deploy-production.sh").read_text()
        self.assertIn('trap \'rollback $? $LINENO\' ERR', shell)
        self.assertIn("FAILED_STAGE=$DEPLOY_STAGE", shell)
        self.assertIn("RECOVERY_STATUS=verified", shell)
        self.assertIn("RECOVERY_STATUS=manual_required", shell)
        for stage in ("checkout", "release_environment", "image_build", "compose_restart",
                      "local_health", "public_health", "postdeploy_diagnostics"):
            self.assertIn(f'DEPLOY_STAGE="{stage}"', shell)

    def test_worker_checks_the_latest_canonical_main_run(self):
        sha = "a" * 40
        run = {"head_sha": sha, "head_branch": "main", "status": "completed", "conclusion": "success"}
        pr = dict(run, event="pull_request", created_at="2026-11-08T01:00:00Z")
        main = dict(run, event="push", created_at="2026-11-08T00:00:00Z")
        failed = dict(run, event="workflow_dispatch", conclusion="failure", created_at="2026-11-08T02:00:00Z")
        with patch.object(worker, "github_get", return_value={"workflow_runs": [pr]}):
            self.assertFalse(worker.is_good_ci(sha, ""))
        with patch.object(worker, "github_get", return_value={"workflow_runs": [pr, main]}):
            self.assertTrue(worker.is_good_ci(sha, ""))
        with patch.object(worker, "github_get", return_value={"workflow_runs": [main, pr, failed]}):
            self.assertFalse(worker.is_good_ci(sha, ""))

    def test_an_already_live_local_sha_cannot_skip_public_verification(self):
        sha = "a" * 40
        job = {"action": "deploy_latest", "target_sha": sha}
        with patch.object(worker, "validate_origin"), \
                patch.object(worker, "cmd", return_value=sha), \
                patch.object(worker, "is_good_ci", return_value=True), \
                patch.object(worker, "get_local_release", return_value=sha), \
                patch.object(worker, "get_healthy_release", return_value="b" * 40) as public, \
                patch.object(worker.subprocess, "run", return_value=worker.subprocess.CompletedProcess([], 0)) as executor:
            with self.assertRaisesRegex(RuntimeError, "Local and public health"):
                worker.execute(job, {})
            executor.assert_called_once()
            public.assert_called_once_with("https://weavingsystem.online/api/health")


if __name__ == "__main__":
    unittest.main()
