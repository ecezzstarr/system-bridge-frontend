#!/usr/bin/env python3
"""Provider-neutral WEAVE host release executor.

Run this separately on the Docker host, never in the public Next.js process.
Uses only the standard library, git, Docker Compose, and a host-only token.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "selfhost" / ".env"
ENDPOINT = "http://127.0.0.1:3000/api/system/release-worker"
GITHUB_API = "https://api.github.com/repos/ecezzstarr/system-bridge-frontend"
SHA = re.compile(r"^[0-9a-f]{40}$", re.I)


def env_values():
    values = {}
    if ENV_FILE.is_file():
        for raw in ENV_FILE.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            values[key.strip()] = val.strip().strip(chr(39) + chr(34))
    values.update(os.environ)
    return values


def api(data, token):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        ENDPOINT, data=body, method="POST",
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        result = json.load(response)
    if not result.get("success"):
        raise RuntimeError("Host release endpoint refused the operation")
    return result


def github_get(path, github_token):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "weave-release-worker",
               "X-GitHub-Api-Version": "2022-11-28"}
    if github_token:
        headers["Authorization"] = "Bearer " + github_token
    request = urllib.request.Request(GITHUB_API + path, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if github_token and error.code in (401, 403, 404):
            error.close()
            return github_get(path, "")
        raise RuntimeError(f"GitHub Production Check could not be read (HTTP {error.code})") from error


def cmd(*args, env=None, timeout=3600):
    return subprocess.run(args, cwd=ROOT, env=env, text=True, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout).stdout


def safe_executor_excerpt(output, values):
    """Retain only a redacted, bounded host-only tail; never store raw env data."""
    recent = (output or "").splitlines()[-90:]
    excerpt = "\n".join(recent)[-18000:]
    for key, value in values.items():
        label = str(key).upper()
        if any(marker in label for marker in ("TOKEN", "SECRET", "PASSWORD", "PRIVATE_KEY",
                                             "DATABASE_URL", "API_KEY", "AUTH", "SMTP")):
            if isinstance(value, str) and len(value) >= 6:
                excerpt = excerpt.replace(value, "[redacted]")
    excerpt = re.sub(r"(?i)(authorization:\s*bearer\s+)\S+", r"\1[redacted]", excerpt)
    excerpt = re.sub(r"(?i)(://[^:/\s]+:)[^@/\s]+@", r"\1[redacted]@", excerpt)
    excerpt = re.sub(r"(?i)((?:token|secret|password|api[_-]?key)=)[^\s&]+",
                     r"\1[redacted]", excerpt)
    return excerpt


def summarize_executor_failure(output, returncode, values):
    """Return safe, actionable phase + recovery evidence for the Admin request."""
    stage = re.findall(r"\[WEAVE deploy\] FAILED_STAGE=([a-z_]+)", output or "")
    if not stage:
        stage = re.findall(r"\[WEAVE deploy\] STAGE=([a-z_]+)", output or "")
    phase = stage[-1] if stage else "preflight_or_unreported"
    recovery = "not_confirmed"
    if re.search(r"\[WEAVE deploy\] RECOVERY_STATUS=verified\b", output or ""):
        recovery = "verified_previous_release"
    elif re.search(r"\[WEAVE deploy\] RECOVERY_STATUS=manual_required\b", output or ""):
        recovery = "manual_recovery_required"
    excerpt = safe_executor_excerpt(output, values)
    diagnostic = "inspect the private host executor failure log and journal"
    for line in reversed(excerpt.splitlines()):
        if re.search(r"(?i)\b(insufficient_disk|no space left on device|out of memory|cannot connect to the docker daemon|"
                     r"permission denied|failed to solve|did not become healthy|build failed|"
                     r"uncommitted source changes|missing selfhost/.env|holds the host checkout lock|"
                     r"safe rollback could not be established|superseded by canonical main)\b", line):
            diagnostic = re.sub(r"\s+", " ", line.strip())[-200:]
            break
    return (f"Executor exit={returncode}; stage={phase}; recovery={recovery}; "
            f"diagnostic={diagnostic}")


def journal_executor_failure(output, values, summary):
    """Keep a permission-restricted redacted failure tail on the host only."""
    target = ROOT / "selfhost" / "release-executor-failures.log"
    excerpt = safe_executor_excerpt(output, values)
    evidence = (f"\n[WEAVE Release] {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n"
                f"{summary}\n{excerpt}\n")
    flags = os.O_WRONLY | os.O_APPEND | os.O_CREAT
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(str(target), flags, 0o600)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "a", encoding="utf-8") as report:
            report.write(evidence)
    except BaseException:
        # fdopen owns the descriptor after success; close on early failure.
        try:
            os.close(fd)
        except OSError:
            pass
        raise


def is_good_ci(sha, github_token):
    if not SHA.fullmatch(sha):
        raise RuntimeError("Invalid target release identity")
    data = github_get(
        "/actions/workflows/production-check.yml/runs?"
        + urllib.parse.urlencode({"head_sha": sha, "branch": "main", "per_page": 30}),
        github_token,
    )
    runs = [item for item in data.get("workflow_runs", [])
            if item.get("head_sha") == sha and item.get("head_branch") == "main"
            and item.get("event") in ("push", "workflow_dispatch")]
    latest = max(runs, key=lambda item: item.get("created_at") or "", default={})
    return latest.get("status") == "completed" and latest.get("conclusion") == "success"


def get_healthy_release(url):
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            data = json.load(response)
        if data.get("status") == "healthy" and SHA.fullmatch(data.get("releaseSha") or ""):
            return data["releaseSha"]
    except Exception:
        pass
    return None


def get_local_release():
    return get_healthy_release("http://127.0.0.1:3000/api/health")


def validate_origin():
    remote = cmd("git", "remote", "get-url", "origin").strip()
    if not re.search(r"(github\.com[:/]ecezzstarr/system-bridge-frontend(?:\.git)?)$", remote):
        raise RuntimeError("Host checkout does not point to the canonical WEAVE repository")


def execute(job, values):
    target = job.get("target_sha")
    action = job["action"]
    validate_origin()
    cmd("git", "fetch", "origin", "main", timeout=90)
    main = cmd("git", "rev-parse", "origin/main").strip()
    if not SHA.fullmatch(main):
        raise RuntimeError("Cannot verify canonical origin/main release")
    if action == "deploy_latest":
        if not target or not SHA.fullmatch(target):
            raise RuntimeError("Administration did not pin an exact GitHub release SHA")
        if target.lower() != main.lower():
            raise RuntimeError("GitHub main moved after Administration approval; refresh and submit a new request")
        github_token = values.get("WEAVE_GITHUB_TOKEN") or values.get("WEAVE_GITHUB_READ_TOKEN", "")
        if not is_good_ci(target, github_token):
            raise RuntimeError("Selected main commit has no successful Production Check; deployment is blocked")
    elif action == "rollback":
        if not target or not SHA.fullmatch(target):
            raise RuntimeError("Rollback request does not contain a historical SHA")
        cmd("git", "cat-file", "-e", target + "^{commit}")
        cmd("git", "merge-base", "--is-ancestor", target, main)
        # The database API also restricted this SHA to a previously healthy
        # release before it queued the job. Never accept arbitrary ref or branch.
    else:
        raise RuntimeError("Release action not allowed")

    previous = get_local_release()

    process_env = os.environ.copy()
    process_env.update({
        "WEAVE_DEPLOY_TARGET_SHA": target if action == "deploy_latest" else "",
        "WEAVE_DEPLOY_ROLLBACK_SHA": target if action == "rollback" else "",
        "WEAVE_DEPLOY_REQUESTED_BY": str(job.get("requested_by") or ""),
    })
    # Existing script builds locally, waits for matching local/public health,
    # and automatically restores the prior release on a failed deployment.
    # An existing managed host may preserve its own Compose/env layout.
    # This root-owned setting is never accepted from a website release request.
    # The worker must never execute a website-selected script path, nor an executor
    # outside the trusted checkout. A host operator may choose a fixed script
    # through its private service environment, not through a browser request.
    executor = Path(values.get("WEAVE_RELEASE_EXECUTOR", str(ROOT / "selfhost" / "deploy-production.sh"))).resolve()
    if not executor.is_file():
        raise RuntimeError("Configured host release executor is unavailable")
    result = subprocess.run(
        ["bash", str(executor)],
        cwd=ROOT, env=process_env, text=True, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, timeout=3600,
    )
    if result.returncode:
        summary = summarize_executor_failure(result.stdout, result.returncode, values)
        try:
            journal_executor_failure(result.stdout, values, summary)
        except OSError as error:
            print(f"[WEAVE Release] Could not write private failure log: {type(error).__name__}",
                  file=sys.stderr, flush=True)
        raise RuntimeError(summary)
    domain = values.get("WEAVE_DOMAIN") or "weavingsystem.online"
    if get_local_release() != target or get_healthy_release(f"https://{domain}/api/health") != target:
        raise RuntimeError("Local and public health did not both report the requested release after execution")
    return ("rolled_back" if action == "rollback" else "healthy",
            target, previous if previous != target else None,
            "Verified release SHA against local and public /api/health")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Poll once and exit")
    parser.add_argument("--interval", type=int, default=15)
    args = parser.parse_args()
    values = env_values()
    token = values.get("WEAVE_RELEASE_CONTROL_TOKEN", "")
    if len(token) < 32:
        sys.exit("WEAVE_RELEASE_CONTROL_TOKEN must be at least 32 characters on the host")
    worker = values.get("WEAVE_DEPLOYMENT_SERVER", "weave-selfhost")
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,119}", worker, re.I):
        sys.exit("WEAVE_DEPLOYMENT_SERVER must be a safe, stable worker identifier")
    while True:
        try:
            job = api({"action": "claim", "workerKey": worker, "capabilities": ["pinned-main-v2"]}, token).get("job")
            if job:
                print(f"[WEAVE Release] {job['id']} {job['action']} accepted", flush=True)
                status = "failed"
                resolved = None
                previous = None
                verification = ""
                try:
                    status, resolved, previous, verification = execute(job, values)
                except Exception as error:
                    verification = f"{type(error).__name__}: {str(error)}"[:900]
                    print(f"[WEAVE Release] {verification}", file=sys.stderr, flush=True)
                completion = {
                    "action": "complete", "id": job["id"],
                    "leaseToken": job["lease_token"], "status": status,
                    "resolvedSha": resolved, "previousSha": previous,
                    "verification": verification,
                }
                # The container may temporarily be unavailable after an update.
                # Never acquire another job while completing this one.
                delivered = False
                for attempt in range(40):
                    try:
                        api(completion, token)
                        delivered = True
                        print(f"[WEAVE Release] {job['id']} {status} recorded", flush=True)
                        break
                    except Exception as error:
                        print(f"[WEAVE Release] completion retry {attempt + 1}: {error}", file=sys.stderr, flush=True)
                        time.sleep(15)
                if not delivered:
                    sys.exit("Release completion could not be recorded; manual reconciliation required")
        except (urllib.error.URLError, TimeoutError, RuntimeError) as error:
            print(f"[WEAVE Release] Poll unavailable: {error}", file=sys.stderr, flush=True)
        if args.once:
            break
        time.sleep(max(10, min(300, args.interval)))


if __name__ == "__main__":
    main()
