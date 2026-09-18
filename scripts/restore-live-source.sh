#!/bin/bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./scripts/restore-live-source.sh /absolute/path/to/extracted-live-source

Restores the current Git checkout from an extracted live source snapshot while
preserving the hardened deployment/build files already present in this branch.

The working tree must be clean before running this script.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  usage >&2
  exit 1
fi

RAW_SOURCE_DIR="$1"
if [[ "$RAW_SOURCE_DIR" != /* ]]; then
  echo "Source path must be absolute: $RAW_SOURCE_DIR" >&2
  exit 1
fi

SOURCE_DIR="$(cd "$RAW_SOURCE_DIR" 2>/dev/null && pwd || true)"
if [[ -z "$SOURCE_DIR" || ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $RAW_SOURCE_DIR" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "This script must be run inside a Git checkout." >&2
  exit 1
fi

if [[ "$SOURCE_DIR" == "$REPO_ROOT" ]]; then
  echo "Source directory must be different from the target Git checkout." >&2
  exit 1
fi

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash them first." >&2
  exit 1
fi

if [[ ! -f "$SOURCE_DIR/package.json" && ! -d "$SOURCE_DIR/app" ]]; then
  echo "Source directory does not look like an extracted app snapshot: $SOURCE_DIR" >&2
  exit 1
fi

BACKUP_DIR="$(mktemp -d /tmp/system-bridge-live-restore.XXXXXX)"
cleanup() {
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

PRESERVE_FILES=(
  "Dockerfile"
  "cloudbuild.yaml"
  "DEPLOYMENT.md"
  "scripts/verify-build.sh"
  "scripts/deploy-cloud.sh"
  "scripts/restore-live-source.sh"
  ".github/workflows/system-switch-ci.yml"
)

for rel in "${PRESERVE_FILES[@]}"; do
  src="$REPO_ROOT/$rel"
  if [[ -f "$src" ]]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
    cp "$src" "$BACKUP_DIR/$rel"
  fi
done

find "$REPO_ROOT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
mkdir -p "$REPO_ROOT"

tar -C "$SOURCE_DIR" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.turbo' \
  --exclude='.npm' \
  -cf - . | tar -C "$REPO_ROOT" -xf -

for rel in "${PRESERVE_FILES[@]}"; do
  backup="$BACKUP_DIR/$rel"
  if [[ -f "$backup" ]]; then
    mkdir -p "$REPO_ROOT/$(dirname "$rel")"
    cp "$backup" "$REPO_ROOT/$rel"
  fi
done

chmod +x "$REPO_ROOT/scripts/verify-build.sh" "$REPO_ROOT/scripts/deploy-cloud.sh" "$REPO_ROOT/scripts/restore-live-source.sh" 2>/dev/null || true

cat <<NEXTSTEPS
Live source restored into Git working tree.

Next steps:
  1. Review the diff: git status --short
  2. Commit the recovery source on a branch
  3. Validate the restored app: npm ci --legacy-peer-deps && ./scripts/verify-build.sh
  4. Deploy from Git after the recovery commit is merged to main
NEXTSTEPS
