# OpenCode Integration

This directory contains the OpenCode desktop integration: its runtime payload,
installer engine, development scripts, and tests. For the project overview and
end-user installation instructions, see the [project README](../README.md) and
[installation guide](../docs/installation.md).

## Directory layout

```text
opencode/
├── runtime/       # Replaceable production payload bundled by the installer
├── patcher/       # Cross-platform ASAR patcher and install/restore engine
├── installer/     # Shared Electron installer and release updater
├── scripts/       # Install, uninstall, version sync, and build helpers
└── tests/         # Installer, UI, menu integration, and updater tests
```

## Startup integration

The desktop app's ESM `app.asar` entry point is `./out/main/index.js`. The
patcher adds `out/harness/harness-boot.js` and `out/harness/harness-meta.json`,
then changes only the package `main` field:

1. Electron loads the ESM boot shim.
2. The shim loads `~/.config/opencode-harness/runtime/core/main.js` and
   initializes the CommonJS runtime.
3. The runtime registers the additional session preload, IPC handlers, and
   renderer hooks used for themes and interactive companions.
4. The shim imports the original `out/main/index.js` entry point.

The original entry-point file is not rewritten. Uninstall restores the
original ASAR header from the install backup.

## Runtime and user data

The installed runtime is replaceable during upgrades. User preferences,
provider credentials, backups, and logs remain in a separate per-user data
directory:

- Linux: `~/.config/opencode-harness/` or `$XDG_CONFIG_HOME/opencode-harness/`
- Windows: `%APPDATA%\opencode-harness\`
- macOS: `~/Library/Application Support/opencode-harness/`

The data directory can contain `config.json`, `secrets.json`, installation
metadata, timestamped ASAR backups, and a rotated runtime log. The installer
does not expose provider credentials to its renderer.

## Native themes

Installation exports corresponding native theme files to the OpenCode theme
directory. For example, `och-pixel16` and `och-primeval_forest` can be selected
from the application's native theme picker.

## Development and tests

From the repository root:

```bash
npm --prefix opencode/installer ci
npm --prefix opencode/installer test
xvfb-run -a npm --prefix opencode/installer run test:ui
npm --prefix opencode/installer run build:linux
```

The UI test needs a display server; CI runs it under Xvfb. A Windows build can
be produced with `npm --prefix opencode/installer run build:win` on a Windows
host. Release builds use the root-level workflows and signing configuration.

For lower-level manual development, the integration engine also supports
detecting, checking, installing, and restoring an application archive:

```bash
node opencode/patcher/install-engine.js detect
node opencode/patcher/install-engine.js status
node opencode/patcher/install-engine.js install
node opencode/patcher/install-engine.js uninstall
```

Do not use manual patch commands against a running application or an
unreviewed installation. Use the installer for routine installation and
restoration.

## Runtime flags

- `OCH_HARNESS_DISABLE=1` disables runtime initialization.
- `OCH_HARNESS_DEV=1` enables development file watching and dynamic reloads.
- `OCH_HARNESS_DEBUG=1` enables optional diagnostic hooks.
- `OCH_HARNESS_DATA_DIR` and `OCH_HARNESS_RUNTIME_DIR` override the default
  user-data and runtime directories.

The shared UI retains a legacy bridge alias for compatibility with the other
integration. Keep the target-specific runtime and user-data paths isolated.
