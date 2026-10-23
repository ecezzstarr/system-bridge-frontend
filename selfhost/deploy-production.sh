#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.selfhost.yml)
ENV_FILE="$ROOT/selfhost/.env"
JOURNAL_FILE="$ROOT/selfhost/deployment-history.log"
DEFAULT_DOMAIN="weavingsystem.online"
DEPLOY_SOURCE="selfhost-deploy"
DEPLOY_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ROLLING_BACK=0

log() { printf '[WEAVE deploy] %s\n' "$*"; }

read_env_value() {
  local key="$1"
  python3 - "$ENV_FILE" "$key" <<'PY'
import pathlib, sys
path=pathlib.Path(sys.argv[1]); key=sys.argv[2]
if not path.exists(): raise SystemExit(0)
for raw in path.read_text().splitlines():
    line=raw.strip()
    if not line or line.startswith('#') or '=' not in line: continue
    k,v=line.split('=',1)
    if k.strip()==key:
        print(v.strip().strip('"').strip("'"))
        break
PY
}

set_env_value() {
  local key="$1" value="$2"
  python3 - "$ENV_FILE" "$key" "$value" <<'PY'
import pathlib, sys
path=pathlib.Path(sys.argv[1]); key=sys.argv[2]; value=sys.argv[3]
lines=path.read_text().splitlines() if path.exists() else []
out=[]; replaced=False
for raw in lines:
    if raw.strip() and not raw.lstrip().startswith('#') and '=' in raw:
        k=raw.split('=',1)[0].strip()
        if k==key:
            if not replaced: out.append(f'{key}={value}')
            replaced=True
            continue
    out.append(raw)
if not replaced:
    if out and out[-1] != '': out.append('')
    out.append(f'{key}={value}')
path.write_text('\n'.join(out).rstrip()+'\n')
PY
}

ensure_env_value() {
  local key="$1" value="$2"
  local existing
  existing="$(read_env_value "$key")"
  if [[ -n "$existing" ]]; then
    printf '%s' "$existing"
    return 0
  fi
  set_env_value "$key" "$value"
  printf '%s' "$value"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing selfhost/.env. The server runtime must already have its private environment." >&2
  exit 2
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Server checkout has uncommitted source changes. Deployment stopped to preserve them." >&2
  exit 3
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  git checkout main
fi

git fetch origin main
PREVIOUS_SHA="$(git rev-parse HEAD)"
ORIGIN_MAIN_SHA="$(git rev-parse origin/main)"
REQUESTED_SHA="${WEAVE_DEPLOY_TARGET_SHA:-}"
ROLLBACK_TARGET="${WEAVE_DEPLOY_ROLLBACK_SHA:-}"
if [[ -n "$ROLLBACK_TARGET" && -n "$REQUESTED_SHA" ]]; then
  echo "Cannot request a new release and a rollback simultaneously." >&2
  exit 4
fi

if [[ -n "$ROLLBACK_TARGET" ]]; then
  if [[ ! "$ROLLBACK_TARGET" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "Rollback must name one exact historical Git commit SHA." >&2
    exit 4
  fi
  if ! git cat-file -e "${ROLLBACK_TARGET}^{commit}" 2>/dev/null; then
    echo "Historical rollback commit is absent from the host checkout." >&2
    exit 5
  fi
  if ! git merge-base --is-ancestor "$ROLLBACK_TARGET" "$ORIGIN_MAIN_SHA"; then
    echo "Refusing rollback to a commit outside canonical main history." >&2
    exit 6
  fi
  TARGET_SHA="$ROLLBACK_TARGET"
  DEPLOY_SOURCE="administration-release-rollback"
elif [[ -n "$REQUESTED_SHA" ]]; then
  if [[ ! "$REQUESTED_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "WEAVE_DEPLOY_TARGET_SHA must be a full Git commit SHA." >&2
    exit 4
  fi
  if ! git cat-file -e "${REQUESTED_SHA}^{commit}" 2>/dev/null; then
    echo "Verified deployment SHA is not present in the server checkout: $REQUESTED_SHA" >&2
    exit 5
  fi
  if [[ "$REQUESTED_SHA" != "$ORIGIN_MAIN_SHA" ]]; then
    log "Verified release $REQUESTED_SHA was superseded by canonical main $ORIGIN_MAIN_SHA. No deployment performed."
    exit 0
  fi
  TARGET_SHA="$REQUESTED_SHA"
else
  TARGET_SHA="$ORIGIN_MAIN_SHA"
fi

DOMAIN="$(read_env_value WEAVE_DOMAIN)"
DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"
SERVER_KEY="$(ensure_env_value WEAVE_DEPLOYMENT_SERVER weave-selfhost)"
DEPLOY_TOKEN="$(read_env_value WEAVE_DEPLOY_RECORD_TOKEN)"
if [[ -z "$DEPLOY_TOKEN" ]]; then
  DEPLOY_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  set_env_value WEAVE_DEPLOY_RECORD_TOKEN "$DEPLOY_TOKEN"
fi

ROLLBACK_PATH="git reset --hard ${PREVIOUS_SHA} && WEAVE_RELEASE_SHA=${PREVIOUS_SHA} docker compose -f docker-compose.selfhost.yml build weave && WEAVE_RELEASE_SHA=${PREVIOUS_SHA} docker compose -f docker-compose.selfhost.yml up -d --remove-orphans"

build_record_payload() {
  local status="$1" release_sha="$2" previous_sha="$3" verification="${4:-}" details="${5:-{}}"
  python3 - "$status" "$release_sha" "$previous_sha" "$SERVER_KEY" "$DEPLOY_SOURCE" "$verification" "$ROLLBACK_PATH" "$details" <<'PY'
import json,sys,datetime,uuid
status,release,previous,server,source,verification,rollback,details=sys.argv[1:]
try: detail_obj=json.loads(details)
except Exception: detail_obj={'note':details}
detail_obj=dict(detail_obj)
detail_obj.setdefault('hostJournalEventId',str(uuid.uuid4()))
detail_obj.setdefault('hostJournaledAt',datetime.datetime.now(datetime.timezone.utc).isoformat())
print(json.dumps({
 'status':status,'releaseSha':release,'previousSha':previous or None,
 'serverKey':server,'source':source,'verification':verification or None,
 'rollbackPath':rollback,'details':detail_obj,
},separators=(',',':')))
PY
}

spool_record() {
  local payload="$1"
  printf '%s\n' "$payload" >> "$JOURNAL_FILE"
}

send_record_payload() {
  local payload="$1"
  curl -fsS --max-time 15 \
    -H "Authorization: Bearer ${DEPLOY_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    http://127.0.0.1:3000/api/system/deployment-record >/dev/null
}

post_record() {
  local status="$1" release_sha="$2" previous_sha="$3" verification="${4:-}" details="${5:-{}}"
  local payload
  payload="$(build_record_payload "$status" "$release_sha" "$previous_sha" "$verification" "$details")"
  if send_record_payload "$payload"; then
    return 0
  fi
  spool_record "$payload"
  return 1
}

replay_journal() {
  [[ -s "$JOURNAL_FILE" ]] || return 0
  local pending="${JOURNAL_FILE}.pending.$$"
  : > "$pending"
  local payload
  while IFS= read -r payload || [[ -n "$payload" ]]; do
    [[ -n "$payload" ]] || continue
    if ! send_record_payload "$payload"; then
      printf '%s\n' "$payload" >> "$pending"
    fi
  done < "$JOURNAL_FILE"
  mv "$pending" "$JOURNAL_FILE"
  if [[ -s "$JOURNAL_FILE" ]]; then
    log "Some host deployment records remain queued for replay."
    return 1
  fi
  log "Host deployment journal replayed into Sovereign + Flame records."
  return 0
}

health_matches() {
  local url="$1" expected="$2"
  local body
  body="$(curl -fsS --max-time 15 "$url")" || return 1
  python3 - "$expected" "$body" <<'PY'
import json,sys
expected=sys.argv[1]
try: data=json.loads(sys.argv[2])
except Exception: raise SystemExit(1)
raise SystemExit(0 if data.get('status')=='healthy' and data.get('releaseSha')==expected else 1)
PY
}

wait_for_health() {
  local url="$1" expected="$2" label="$3"
  local attempt
  for attempt in $(seq 1 36); do
    if health_matches "$url" "$expected"; then
      log "$label verified at $expected"
      return 0
    fi
    sleep 5
  done
  echo "$label did not become healthy for release $expected" >&2
  return 1
}

rollback() {
  local exit_code="${1:-1}" line="${2:-unknown}"
  if [[ "$ROLLING_BACK" == "1" ]]; then exit "$exit_code"; fi
  ROLLING_BACK=1
  trap - ERR
  set +e
  log "Deployment failed at line $line. Restoring $PREVIOUS_SHA"

  post_record failed "$TARGET_SHA" "$PREVIOUS_SHA" "Deployment failed before final verification at line $line" "{\"failedLine\":\"$line\"}" || true
  post_record rollback_started "$TARGET_SHA" "$PREVIOUS_SHA" "Automatic rollback started" "{\"failedLine\":\"$line\"}" || true

  git reset --hard "$PREVIOUS_SHA"
  set_env_value WEAVE_RELEASE_SHA "$PREVIOUS_SHA"
  export WEAVE_RELEASE_SHA="$PREVIOUS_SHA"
  "${COMPOSE[@]}" build weave
  "${COMPOSE[@]}" up -d --remove-orphans
  wait_for_health http://127.0.0.1:3000/api/health "$PREVIOUS_SHA" "Rollback local health" || true
  post_record rolled_back "$PREVIOUS_SHA" "$TARGET_SHA" "Automatic rollback restored previous release after failure at line $line" "{\"failedRelease\":\"$TARGET_SHA\"}" || true
  replay_journal || true

  exit "$exit_code"
}
trap 'rollback $? $LINENO' ERR

log "Previous release: $PREVIOUS_SHA"
log "Verified target release: $TARGET_SHA"

# Every movement is attempted against the current WEAVE runtime. On the first
# rollout, or during an outage, a failed record write is appended to the host
# journal and replayed after a healthy runtime returns.
if [[ -n "$ROLLBACK_TARGET" ]]; then
  post_record rollback_started "$TARGET_SHA" "$PREVIOUS_SHA" "Administration selected previously healthy release" "{\\"startedAt\\":\\"$DEPLOY_STARTED_AT\\"}" || true
else
  post_record started "$TARGET_SHA" "$PREVIOUS_SHA" "Verified canonical main selected for production deployment" "{\"startedAt\":\"$DEPLOY_STARTED_AT\"}" || true
fi

git reset --hard "$TARGET_SHA"
set_env_value WEAVE_RELEASE_SHA "$TARGET_SHA"
export WEAVE_RELEASE_SHA="$TARGET_SHA"
BUILD_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
"${COMPOSE[@]}" build --pull weave
BUILD_FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

"${COMPOSE[@]}" up -d --remove-orphans
RESTARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

wait_for_health http://127.0.0.1:3000/api/health "$TARGET_SHA" "Local WEAVE"
replay_journal || true
post_record built "$TARGET_SHA" "$PREVIOUS_SHA" "Self-host image built successfully" "{\"buildStartedAt\":\"$BUILD_STARTED_AT\",\"buildFinishedAt\":\"$BUILD_FINISHED_AT\"}" || true
post_record restarted "$TARGET_SHA" "$PREVIOUS_SHA" "Docker Compose restarted WEAVE and Caddy without orphaned services" "{\"restartedAt\":\"$RESTARTED_AT\"}" || true

wait_for_health "https://${DOMAIN}/api/health" "$TARGET_SHA" "Public WEAVE"

VERIFIED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ -n "$ROLLBACK_TARGET" ]]; then
  post_record rolled_back "$TARGET_SHA" "$PREVIOUS_SHA" "Administration rollback verified against local and public health" "{\\"verifiedAt\\":\\"$VERIFIED_AT\\",\\"domain\\":\\"$DOMAIN\\"}" || true
else
  post_record healthy "$TARGET_SHA" "$PREVIOUS_SHA" "Local and public /api/health both serve the verified canonical release SHA" "{\"verifiedAt\":\"$VERIFIED_AT\",\"domain\":\"$DOMAIN\"}" || true
fi
replay_journal || true

"${COMPOSE[@]}" ps
"${COMPOSE[@]}" logs --tail=80 weave || true
"${COMPOSE[@]}" logs --tail=80 caddy || true
docker image prune -f >/dev/null || true

trap - ERR
log "LIVE VERIFIED: $TARGET_SHA at https://${DOMAIN}"
