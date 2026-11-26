#!/usr/bin/env bash
# OpenCode Harness — Linux CLI uninstaller wrapper.
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
  "/opt/OpenCode/ai.opencode" \
  "/opt/opencode/ai.opencode" \
  "$HOME/Applications/Opencode/ai.opencode" \
  "$HOME/Applications/OpenCode/ai.opencode" \
  "$(command -v ai.opencode 2>/dev/null || true)" \
  "$(command -v opencode-desktop 2>/dev/null || true)"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    exec env ELECTRON_RUN_AS_NODE=1 "$candidate" "$ENGINE" uninstall "$@"
  fi
done

echo "ERROR: Node.js or OpenCode binary not found." >&2
exit 1
