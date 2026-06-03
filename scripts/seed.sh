#!/usr/bin/env bash
# Seed missing flags and segments from flags.json into a Flagsmith project.
# Idempotent: existing items are skipped (POST returns 400 with "already exists").
#
# Required env vars:
#   FLAGSMITH_API_TOKEN  - admin API token (Org settings -> API Tokens)
#   FLAGSMITH_PROJECT_ID - numeric project id
#
# Optional:
#   FLAGSMITH_API_BASE   - default https://api.flagsmith.com/api/v1
#
# Used as the recovery half of the Vercel build:
#   bash scripts/validate.sh || bash scripts/seed.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FLAGS_FILE="${FLAGS_FILE:-$PROJECT_DIR/flags.json}"

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

FAILURES=0
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

post_json() {
  # Args: url, body
  # Echoes "HTTPCODE BODY" on stdout; non-fatal (caller decides).
  local url="$1" body="$2"
  local code
  code=$(curl -sS -o "$TMP" -w "%{http_code}" \
    -X POST "$url" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$body")
  printf '%s\n' "$code"
}

handle_response() {
  # Args: kind name code
  local kind="$1" name="$2" code="$3"
  case "$code" in
    200|201)
      printf "  created  %-9s %s\n" "$kind" "$name"
      ;;
    400)
      if grep -qi "already exists\|unique" "$TMP" 2>/dev/null; then
        printf "  exists   %-9s %s\n" "$kind" "$name"
      else
        printf "  FAIL     %-9s %s (HTTP 400)\n" "$kind" "$name"
        cat "$TMP"; echo
        FAILURES=$((FAILURES + 1))
      fi
      ;;
    401|403)
      printf "  AUTH FAIL on %s %s (HTTP %s). Check FLAGSMITH_API_TOKEN.\n" "$kind" "$name" "$code"
      cat "$TMP"; echo
      exit 1
      ;;
    404)
      printf "  NOT FOUND on %s %s (HTTP %s). Check FLAGSMITH_PROJECT_ID.\n" "$kind" "$name" "$code"
      exit 1
      ;;
    *)
      printf "  FAIL     %-9s %s (HTTP %s)\n" "$kind" "$name" "$code"
      cat "$TMP"; echo
      FAILURES=$((FAILURES + 1))
      ;;
  esac
}

echo "seed.sh: project ${FLAGSMITH_PROJECT_ID} via ${API_BASE}"
echo

# ---- features ---------------------------------------------------------------
FEATURES_URL="${API_BASE}/projects/${FLAGSMITH_PROJECT_ID}/features/"
while IFS= read -r flag; do
  name=$(jq -r '.name'           <<<"$flag")
  # Build the body from the source JSON, dropping null/absent optional fields.
  body=$(jq -c '{
      name,
      type,
      default_enabled,
      description: (.description // ""),
      initial_value: (.initial_value // null)
    } | with_entries(select(.value != null))' <<<"$flag")
  code=$(post_json "$FEATURES_URL" "$body")
  handle_response "feature" "$name" "$code"
done < <(jq -c '.flags[]' "$FLAGS_FILE")

# ---- segments ---------------------------------------------------------------
SEGMENTS_URL="${API_BASE}/projects/${FLAGSMITH_PROJECT_ID}/segments/"
while IFS= read -r segment; do
  name=$(jq -r '.name' <<<"$segment")
  # Flagsmith segment create wants project id in the body as well as the URL.
  body=$(jq -c --argjson pid "$FLAGSMITH_PROJECT_ID" '{
      name,
      description: (.description // ""),
      project: $pid,
      rules
    }' <<<"$segment")
  code=$(post_json "$SEGMENTS_URL" "$body")
  handle_response "segment" "$name" "$code"
done < <(jq -c '.segments[]' "$FLAGS_FILE")

echo
if [ "$FAILURES" -gt 0 ]; then
  echo "seed.sh: $FAILURES failure(s). See output above."
  exit 1
fi
echo "seed.sh: done. Verify at https://app.flagsmith.com/project/${FLAGSMITH_PROJECT_ID}/environments/"
