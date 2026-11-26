#!/usr/bin/env bash
# Antigravity Harness — Linux CLI uninstaller wrapper.
# Forwards all flags (e.g. --app-dir <path>, --purge) or an optional positional <app-dir>
# to patcher/install-engine.js.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENGINE="$PROJECT_ROOT/patcher/install-engine.js"

if command -v node >/dev/null 2>&1; then
  exec node "$ENGINE" uninstall "$@"
fi

for candidate in \
  "$HOME/Applications/Antigravity/Antigravity-x64/antigravity" \
  "/opt/Antigravity/antigravity" \
  "/opt/antigravity/antigravity" \
  "$(command -v antigravity 2>/dev/null || true)"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    exec env ELECTRON_RUN_AS_NODE=1 "$candidate" "$ENGINE" uninstall "$@"
  fi
done

echo "ERROR: Node.js or Antigravity binary not found." >&2
exit 1
