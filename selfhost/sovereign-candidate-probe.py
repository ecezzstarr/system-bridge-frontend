#!/usr/bin/env python3
"""WEAVE-owned candidate host read-only readiness and signed telemetry.

Run only on the separately provisioned machine, never as a production migration
or DNS cutover command. Does not modify Docker, Git, data or live configuration.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHECK_NAMES = (
    "independent_host", "hardware", "docker", "compose", "persistent_media",
    "database_and_media", "https_preview", "release_identity", "restore_rehearsal",
)


def private_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_path = ROOT / "selfhost" / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf8").splitlines():
            if "=" not in line or line.lstrip().startswith("#"):
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("'\"")
    values.update(os.environ)
    return values


def run_check(*args: str) -> bool:
    if not shutil.which(args[0]):
        return False
    try:
        return subprocess.run(args, check=False, stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL, timeout=12).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def memory_gib() -> float:
    try:
        match = re.search(r"^MemTotal:\s+(\d+)\s+kB", pathlib.Path("/proc/meminfo").read_text(), re.M)
        return int(match.group(1)) / 1024**2 if match else 0.0
    except OSError:
        return 0.0


def health(url: str) -> dict:
    if not url:
        return {}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "weave-sovereign-probe/1"})
        with urllib.request.urlopen(req, timeout=8) as response:
            reached = urllib.parse.urlparse(response.geturl())
            requested = urllib.parse.urlparse(url)
            if (response.status != 200 or reached.scheme != requested.scheme or reached.netloc != requested.netloc or reached.path != requested.path):
                return {}
            data = response.read(4000)
            decoded = json.loads(data)
            return decoded if isinstance(decoded, dict) else {}
    except (urllib.error.URLError, ValueError, TimeoutError, OSError):
        return {}


def restore_proof() -> bool:
    # A signed-off restore drill is required, not merely existence of a backup.
    # Only operator-created attestation file accepted. This is not cryptographic
    # proof of data recovery; independently verify the rehearsal and logs.
    file = ROOT / "selfhost" / "sovereign-restore-proof.json"
    try:
        values = json.loads(file.read_text(encoding="utf8"))
        date = dt.datetime.fromisoformat(values["verified_at"].replace("Z", "+00:00"))
        now = dt.datetime.now(dt.timezone.utc)
        age = now - date.astimezone(dt.timezone.utc)
        digest = values.get("source_backup_sha256", "")
        return (values.get("database_restored") is True and
                values.get("media_restored") is True and
                re.fullmatch(r"[0-9a-f]{64}", digest) is not None and
                dt.timedelta(0) <= age <= dt.timedelta(days=7))
    except (OSError, KeyError, TypeError, ValueError):
        return False


def database_fingerprint(raw: str) -> str | None:
    """Matches the Node app's private endpoint identity; excludes credentials."""
    if not raw:
        return None
    try:
        parsed = urllib.parse.urlsplit(raw)
        if parsed.scheme not in ("postgres", "postgresql") or not parsed.hostname:
            return None
        db = urllib.parse.unquote(parsed.path.lstrip("/"))
        if not db or "/" in db or len(db) > 256 or "\x00" in db:
            return None
        host = parsed.hostname.lower().rstrip(".")
        port = parsed.port or 5432
        canonical = f"WEAVE:db-endpoint:v1\x00{host}\x00{port}\x00{db}"
        return hashlib.sha256(canonical.encode("utf8")).hexdigest()
    except (ValueError, TypeError):
        return None


def gather(values: dict[str, str]) -> dict:
    node = values.get("WEAVE_SOVEREIGN_NODE_ID", "")
    if not re.fullmatch(r"[a-z][a-z0-9-]{5,63}", node):
        raise ValueError("Configure a stable WEAVE_SOVEREIGN_NODE_ID using lowercase characters")
    provider = values.get("WEAVE_HOST_PROVIDER", "").strip().lower()
    preview = values.get("WEAVE_SOVEREIGN_PREVIEW_URL", "").rstrip("/")
    preview_valid = False
    if preview:
        target = urllib.parse.urlparse(preview)
        preview_valid = (target.scheme == "https" and bool(target.hostname) and
                         not target.username and not target.password and
                         not target.path.strip("/") and not target.query and not target.fragment and
                         target.hostname.lower().rstrip(".") not in
                         ("localhost", "127.0.0.1", "weavingsystem.online", "www.weavingsystem.online"))
    local = health("http://127.0.0.1:3000/api/health/ready")
    remote = health(preview + "/api/health/ready") if preview_valid else {}
    sha = local.get("releaseSha")
    sha_valid = isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{40}", sha, re.I) is not None
    try:
        disk = shutil.disk_usage(values.get("WEAVE_SOVEREIGN_DISK_PATH", "/"))
        free_gib = disk.free / 1024**3
    except OSError:
        free_gib = 0.0
    identity_matches = all(
        isinstance(result.get("host"), dict) and
        result["host"].get("provider") == "weave-owned" and
        result["host"].get("nodeId") == node
        for result in (local, remote)
    )
    checks = {
        "independent_host": provider == "weave-owned",
        "hardware": (os.cpu_count() or 0) >= 4 and memory_gib() >= 8 and free_gib >= 32,
        "docker": run_check("docker", "info", "--format", "{{.ServerVersion}}"),
        "compose": run_check("docker", "compose", "version", "--short"),
        "persistent_media": run_check("docker", "volume", "inspect", "weave-media"),
        "database_and_media": (local.get("status") == "ready" and
                               local.get("checks", {}).get("database") is True and
                               local.get("checks", {}).get("accounts") is True and
                               local.get("checks", {}).get("media") is True),
        "https_preview": (preview_valid and remote.get("status") == "ready"),
        "release_identity": bool(sha_valid and remote.get("releaseSha") == sha and identity_matches),
        "restore_rehearsal": restore_proof(),
    }
    return {
        "nodeId": node,
        "provider": "weave-owned" if provider == "weave-owned" else "unverified",
        "observedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "releaseSha": sha if sha_valid else None,
        "databaseFingerprint": database_fingerprint(values.get("DATABASE_URL", "")),
        "checks": checks,
        "ready": all(checks.values()),
        "requirements": {"minimumCpu": 4, "minimumRamGiB": 8, "minimumFreeDiskGiB": 32},
    }


class _RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Refusing to send candidate token through a redirect")


def report(values: dict[str, str], evidence: dict) -> None:
    token = values.get("WEAVE_SOVEREIGN_PROBE_TOKEN", "").strip()
    endpoint = values.get("WEAVE_SOVEREIGN_PROBE_TARGET",
                          "https://weavingsystem.online/api/infrastructure/sovereign-probe")
    parsed = urllib.parse.urlparse(endpoint)
    if (not token or len(token) < 32 or parsed.scheme != "https" or
            parsed.hostname != "weavingsystem.online" or
            parsed.path != "/api/infrastructure/sovereign-probe" or
            parsed.query or parsed.fragment or parsed.username or parsed.password):
        raise RuntimeError("A private probe token and HTTPS report endpoint are required")
    body = json.dumps(evidence, separators=(",", ":")).encode("utf8")
    req = urllib.request.Request(
        endpoint, data=body, method="POST",
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json", "User-Agent": "weave-sovereign-probe/1"},
    )
    opener = urllib.request.build_opener(_RejectRedirects())
    with opener.open(req, timeout=12) as response:
        if response.status != 200 or not json.load(response).get("success"):
            raise RuntimeError("Weave refused the candidate readiness report")


def main() -> int:
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--report", action="store_true",
                      help="Send the small evidence report to the current Oracle-hosted Weave portal")
    opts = args.parse_args()
    values = private_env()
    try:
        evidence = gather(values)
        # JSON contains booleans and the release hash only, never credentials or IPs.
        print(json.dumps(evidence, indent=2))
        if opts.report:
            report(values, evidence)
        return 0 if evidence["ready"] else 2
    except Exception as error:
        print("Readiness inspection failed: " + str(error), file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
