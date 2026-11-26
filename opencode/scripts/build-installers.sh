#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALLER_DIR="$ROOT/installer"
DIST_DIR="$INSTALLER_DIR/dist"

echo "==> Syncing Harness version from runtime/manifest.json"
node "$ROOT/scripts/sync-version.js"

echo "==> Cleaning previous build output in $DIST_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "==> Building Linux packages (.deb & .AppImage)"
(cd "$INSTALLER_DIR" && npm run build:linux)

echo "==> Building Windows NSIS setup (.exe)"
if command -v wine >/dev/null 2>&1 || command -v wine64 >/dev/null 2>&1; then
  (cd "$INSTALLER_DIR" && npm run build:win)
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  mkdir -p "$HOME/.cache/electron" "$HOME/.cache/electron-builder"
  docker run --rm \
    -v "$(dirname "$ROOT"):/workspace" \
    -v "$HOME/.cache/electron:/root/.cache/electron" \
    -v "$HOME/.cache/electron-builder:/root/.cache/electron-builder" \
    -e "HOST_UID=$(id -u)" \
    -e "HOST_GID=$(id -g)" \
    electronuserland/builder:wine \
    bash -lc 'set -euo pipefail
      trap '\''chown -R "$HOST_UID:$HOST_GID" /workspace/opencode/installer/dist /root/.cache/electron /root/.cache/electron-builder 2>/dev/null || true'\'' EXIT
      cd /workspace/opencode/installer
      npx electron-builder --win nsis --publish never'
else
  echo "ERROR: Wine (or Docker with electronuserland/builder:wine) is required on Linux to build Windows NSIS .exe installers." >&2
  exit 1
fi

echo "==> Generating SHA256SUMS.txt"
(
  cd "$DIST_DIR"
  rm -f SHA256SUMS.txt
  shopt -s nullglob
  artifacts=()
  for f in *.deb *.AppImage *.exe; do
    case "$f" in
      *__uninstaller.exe) continue ;;
    esac
    artifacts+=("$f")
  done
  if [ ${#artifacts[@]} -eq 0 ]; then
    echo "ERROR: No installer artifacts found in $DIST_DIR" >&2
    exit 1
  fi
  sha256sum "${artifacts[@]}" > SHA256SUMS.txt
  ls -lh "${artifacts[@]}" SHA256SUMS.txt
)
