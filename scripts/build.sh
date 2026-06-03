#!/usr/bin/env bash
# Vercel build entrypoint. Ensures dependencies are available, then runs the
# flag validation; falls back to seeding if any flag or segment is missing.
#
# Local dev typically has jq via brew/apt; Vercel's build image does not, so
# we pull a static binary into /tmp and put it on PATH for this build only.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v jq >/dev/null 2>&1; then
  echo "build.sh: jq not on PATH; downloading static binary for this build"
  curl -fsSL -o /tmp/jq https://github.com/jqlang/jq/releases/latest/download/jq-linux-amd64
  chmod +x /tmp/jq
  export PATH="/tmp:$PATH"
fi

bash "$SCRIPT_DIR/validate.sh" || bash "$SCRIPT_DIR/seed.sh"
