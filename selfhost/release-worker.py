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
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "weave-release-worker"}
    if github_token:
        headers["Authorization"] = "Bearer " + github_token
    request = urllib.request.Request(GITHUB_API + path, headers=headers)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def cmd(*args, env=None, timeout=3600):
    return subprocess.run(args, cwd=ROOT, env=env, text=True, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout).stdout


def is_good_ci(sha, github_token):
    if not SHA.fullmatch(sha):
        raise RuntimeError("Invalid target release identity")
    data = github_get(
        "/actions/workflows/production-check.yml/runs?"
        + urllib.parse.urlencode({"head_sha": sha, "branch": "main", "per_page": 30}),
        github_token,
    )
    return any(item.get("head_sha") == sha
               and item.get("head_branch") == "main"
               and item.get("status") == "completed"
               and item.get("conclusion") == "success"
               for item in data.get("workflow_runs", []))


def get_local_release():
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/api/health", timeout=8) as response:
            data = json.load(response)
        if data.get("status") == "healthy" and SHA.fullmatch(data.get("releaseSha") or ""):
            return data["releaseSha"]
    except Exception:
        pass
    return None


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
        target = main
        if not is_good_ci(target, values.get("WEAVE_GITHUB_TOKEN", "")):
            raise RuntimeError("Latest main has no successful Production Check; deployment is blocked")
    elif action == "rollback":
        if not target or not SHA.fullmatch(target):
            raise RuntimeError("Rollback request does not contain a historical SHA")
        cmd("git", "cat-file", "-e", target + "^{commit}")
        cmd("git", "merge-base", "--is-ancestor", target, main)
        # The database API also restricted this SHA to a previously healthy
        # release before it queued the job. Never accept arbitrary ref or branch.
    else:
        raise RuntimeError("Release action not allowed")

    previous = get_local_release() or cmd("git", "rev-parse", "HEAD").strip()
    if action == "deploy_latest" and previous == target:
        return "healthy", target, previous, "Already live, health confirmed at requested SHA"

    process_env = os.environ.copy()
    process_env.update({
        "WEAVE_DEPLOY_TARGET_SHA": target if action == "deploy_latest" else "",
        "WEAVE_DEPLOY_ROLLBACK_SHA": target if action == "rollback" else "",
        "WEAVE_DEPLOY_REQUESTED_BY": str(job.get("requested_by") or ""),
    })
    # Existing script builds locally, waits for matching local/public health,
    # and automatically restores the prior release on a failed deployment.
    result = subprocess.run(
        ["bash", "selfhost/deploy-production.sh"],
        cwd=ROOT, env=process_env, text=True, capture_output=True, timeout=3600,
    )
    if result.returncode:
        raise RuntimeError("Deployment script failed and attempted automatic recovery; inspect host journal and Sovereign + Flame records")
    final = get_local_release()
    if final != target:
        raise RuntimeError("Host did not report the requested healthy release after operation")
    return ("rolled_back" if action == "rollback" else "healthy",
            target, previous, "Verified release SHA against local and public /api/health")


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
            job = api({"action": "claim", "workerKey": worker}, token).get("job")
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
