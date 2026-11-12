#!/usr/bin/env bash
# Space guard for WEAVE's dedicated Docker release host.
# Intentionally never deletes containers, named volumes, databases or Caddy data.
set -Eeuo pipefail

MODE="${1:-preflight}"
TARGET_SHA="${2:-}"
PREVIOUS_SHA="${3:-}"
case "$MODE" in preflight|postdeploy) ;; *) echo "Expected preflight or postdeploy" >&2; exit 2;; esac
[[ -z "$TARGET_SHA" || "$TARGET_SHA" =~ ^[a-fA-F0-9]{40}$ ]] || exit 2
[[ -z "$PREVIOUS_SHA" || "$PREVIOUS_SHA" =~ ^[a-fA-F0-9]{40}$ ]] || exit 2
MIN_FREE_GIB="${WEAVE_MIN_BUILD_FREE_GIB:-16}"
GC_TRIGGER_GIB="${WEAVE_GC_TRIGGER_GIB:-24}"
[[ "$MIN_FREE_GIB" =~ ^[0-9]+$ && "$GC_TRIGGER_GIB" =~ ^[0-9]+$ ]] || exit 2
(( MIN_FREE_GIB >= 8 && MIN_FREE_GIB <= 100 && GC_TRIGGER_GIB >= MIN_FREE_GIB )) || exit 2

log() { printf '[WEAVE storage] %s\n' "$*"; }
command -v docker >/dev/null || { log "Docker unavailable"; exit 1; }
docker info >/dev/null 2>&1 || { log "Docker daemon unavailable"; exit 1; }

CHECKOUT_ROOT="${WEAVE_ROOT:-$(pwd)}"
DOCKER_ROOT="$(docker info --format '{{.DockerRootDir}}')"
[[ -d "$DOCKER_ROOT" ]] || { log "Docker root is unavailable: $DOCKER_ROOT"; exit 1; }

free_kib() {
  local amount
  amount="$(df -Pk "$1" | awk 'NR==2 { print $4 }')"
  [[ "$amount" =~ ^[0-9]+$ ]] || { log "Could not read free disk capacity for $1"; return 1; }
  printf '%s\n' "$amount"
}
min_kib=$((MIN_FREE_GIB * 1024 * 1024))
trigger_kib=$((GC_TRIGGER_GIB * 1024 * 1024))
disk_free="$(free_kib "$DOCKER_ROOT")"
checkout_free="$(free_kib "$CHECKOUT_ROOT")"
log "Before cleanup: docker_free_kib=$disk_free checkout_free_kib=$checkout_free minimum_gib=$MIN_FREE_GIB"

if [[ "$MODE" == preflight ]] && (( disk_free >= trigger_kib && checkout_free >= trigger_kib )); then
  log "Capacity sufficient; skipping cleanup"
  exit 0
fi
if [[ "$MODE" == postdeploy ]] && (( disk_free >= trigger_kib && checkout_free >= trigger_kib )); then
  log "Post-deploy capacity sufficient"
  exit 0
fi

# BuildKit's unused layers commonly fill small Oracle boot disks. These
# operations do not remove currently running containers, their volumes or data.
log "Pruning unused Docker builder cache"
docker builder prune --all --force >/dev/null || log "Docker builder prune was unavailable"
if docker buildx version >/dev/null 2>&1; then
  docker buildx prune --all --force >/dev/null || log "Docker buildx prune was unavailable"
fi

disk_free="$(free_kib "$DOCKER_ROOT")"
checkout_free="$(free_kib "$CHECKOUT_ROOT")"

# Only retire old WEAVE-tagged images, and never force-remove an image. Docker
# itself also refuses to delete images referenced by existing containers.
# Preserve the current live container, the previous good SHA, the requested
# target, and one additional recent WEAVE release as a fallback.
ACTIVE_IMAGE="$(docker inspect --format '{{.Config.Image}}' weave-app 2>/dev/null || true)"
EXTRA_RETAINED=0
while IFS= read -r tag; do
  [[ "$tag" =~ ^weave-release:[a-fA-F0-9]{40}$ ]] || continue
  [[ "$tag" == "$ACTIVE_IMAGE" ]] && continue
  [[ -n "$TARGET_SHA" && "$tag" == "weave-release:$TARGET_SHA" ]] && continue
  [[ -n "$PREVIOUS_SHA" && "$tag" == "weave-release:$PREVIOUS_SHA" ]] && continue
  if (( EXTRA_RETAINED == 0 )); then
    EXTRA_RETAINED=1
    continue
  fi
  if [[ "$MODE" == preflight ]] && (( disk_free >= min_kib && checkout_free >= min_kib )); then
    break
  fi
  if docker image rm "$tag" >/dev/null 2>&1; then
    log "Retired unused WEAVE release image $tag"
  else
    log "Preserved referenced WEAVE release image $tag"
  fi
  disk_free="$(free_kib "$DOCKER_ROOT")"
  checkout_free="$(free_kib "$CHECKOUT_ROOT")"
done < <(docker image ls --filter 'reference=weave-release:*' --format '{{.Repository}}:{{.Tag}}')

disk_free="$(free_kib "$DOCKER_ROOT")"
checkout_free="$(free_kib "$CHECKOUT_ROOT")"
log "After cleanup: docker_free_kib=$disk_free checkout_free_kib=$checkout_free"

if [[ "$MODE" == preflight ]] && (( disk_free < min_kib || checkout_free < min_kib )); then
  log "INSUFFICIENT_DISK: need at least $MIN_FREE_GIB GiB on Docker and checkout filesystems. Deployment NOT started; inspect host capacity or expand the Oracle boot volume."
  exit 12
fi
log "Storage guard completed without touching persistent volumes"
