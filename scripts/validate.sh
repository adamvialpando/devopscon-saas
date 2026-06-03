#!/usr/bin/env bash
# Validate that every flag and segment declared in flags.json exists in the
# target Flagsmith project. Exits 0 if all present, 1 if any missing (and
# prints what's missing).
#
# Required env vars:
#   FLAGSMITH_API_TOKEN  - admin API token (Org settings -> API Tokens)
#   FLAGSMITH_PROJECT_ID - numeric project id (visible in the Flagsmith URL)
#
# Optional:
#   FLAGSMITH_API_BASE   - default https://api.flagsmith.com/api/v1
#
# Used as the first half of the Vercel build:
#   bash scripts/validate.sh || bash scripts/seed.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FLAGS_FILE="${FLAGS_FILE:-$PROJECT_DIR/flags.json}"

# Load .env next to the project root if present (developer ergonomics).
ENV_FILE="${SEED_ENV_FILE:-$PROJECT_DIR/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi

: "${FLAGSMITH_API_TOKEN:?Set FLAGSMITH_API_TOKEN}"
: "${FLAGSMITH_PROJECT_ID:?Set FLAGSMITH_PROJECT_ID}"

API_BASE="${FLAGSMITH_API_BASE:-https://api.flagsmith.com/api/v1}"
AUTH="Authorization: Api-Key ${FLAGSMITH_API_TOKEN}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found on PATH" >&2
  exit 2
fi

fetch_names() {
  # Pulls every name across paginated results. Flagsmith's admin list endpoints
  # paginate with ?page=N; ride them until next=null. Bails immediately on any
  # non-2xx response so a bad token doesn't spin forever.
  local kind="$1"  # features | segments
  local page=1
  while :; do
    local resp http_code body
    resp=$(curl -sS -o /tmp/fs-validate-resp -w "%{http_code}" \
      -H "$AUTH" "${API_BASE}/projects/${FLAGSMITH_PROJECT_ID}/${kind}/?page=${page}&page_size=100")
    http_code="$resp"
    body="$(cat /tmp/fs-validate-resp)"
    case "$http_code" in
      200) ;;
      401|403)
        echo "validate.sh: $http_code from Flagsmith. Token is wrong or revoked." >&2
        echo "  -> FLAGSMITH_API_TOKEN must be an Organisation API Token (Org settings -> API Tokens -> Create)." >&2
        echo "  -> Not the per-environment client SDK key, not a personal account token." >&2
        echo "$body" >&2
        exit 2
        ;;
      404)
        echo "validate.sh: 404 from Flagsmith. FLAGSMITH_PROJECT_ID=${FLAGSMITH_PROJECT_ID} likely wrong." >&2
        echo "$body" >&2
        exit 2
        ;;
      *)
        echo "validate.sh: unexpected HTTP $http_code listing $kind" >&2
        echo "$body" >&2
        exit 2
        ;;
    esac
    local count
    count=$(echo "$body" | jq -r '.results | length // 0')
    [ "$count" = "0" ] && break
    echo "$body" | jq -r '.results[].name'
    [ "$(echo "$body" | jq -r '.next // "null"')" = "null" ] && break
    page=$((page + 1))
  done
}

declared_flags=$(jq -r '.flags[].name' "$FLAGS_FILE")
declared_segments=$(jq -r '.segments[].name' "$FLAGS_FILE")

remote_flags=$(fetch_names features) || { echo "Failed to fetch features (check token, project id, base URL)" >&2; exit 2; }
remote_segments=$(fetch_names segments) || { echo "Failed to fetch segments" >&2; exit 2; }

missing_flags=()
for f in $declared_flags; do
  if ! grep -Fxq "$f" <<<"$remote_flags"; then
    missing_flags+=("$f")
  fi
done

missing_segments=()
for s in $declared_segments; do
  if ! grep -Fxq "$s" <<<"$remote_segments"; then
    missing_segments+=("$s")
  fi
done

if [ "${#missing_flags[@]}" -eq 0 ] && [ "${#missing_segments[@]}" -eq 0 ]; then
  echo "validate.sh: all $(echo "$declared_flags" | wc -l | tr -d ' ') flags and $(echo "$declared_segments" | wc -l | tr -d ' ') segments present in project ${FLAGSMITH_PROJECT_ID}"
  exit 0
fi

echo "validate.sh: missing items in project ${FLAGSMITH_PROJECT_ID}:"
for f in "${missing_flags[@]:-}";    do [ -n "$f" ] && echo "  flag:    $f"; done
for s in "${missing_segments[@]:-}"; do [ -n "$s" ] && echo "  segment: $s"; done
exit 1
