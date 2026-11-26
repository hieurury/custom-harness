# Antigravity Harness

Custom themes, typography, and interactive desktop pets engine for **Google Antigravity** (cross-platform: Linux, Windows, macOS).

## Architecture

```text
antigravity/
├── runtime/                         # Pure production payload bundled into installers
│   ├── manifest.json                # Runtime metadata & schema version
│   ├── boot/
│   │   └── harness-boot.js          # Minimal ASAR entry shim (dist/harnessBoot.js)
│   ├── config/
│   │   └── default.config.json      # Clean default settings (no secrets)
│   ├── core/
│   │   ├── config.js                # Config loader/saver, atomic writes, log rotation
│   │   ├── main.js                  # Electron main-process orchestrator & IPC handlers
│   │   ├── preload.js               # Session preload bridge (contextBridge)
│   │   ├── theme-manager.js         # Font & theme CSS/effects loader
│   │   ├── pet-manager.js           # Pet asset loader & sanitized renderer injection
│   │   ├── pet-brain.js             # Multi-provider AI dialogue & offline fallbacks
│   │   ├── pet-runtime.js           # In-app pet physics, stage, and interactions
│   │   ├── pet-runtime.css          # Pet overlay & radial menu styles
│   │   └── ui/
│   │       ├── harness-ui.js        # In-app Harness configuration modal (Ctrl+Shift+H)
│   │       └── harness-ui.css       # Harness modal styles
│   ├── fonts/                       # Bundled WOFF2 fonts + fonts.json
│   ├── themes/                      # Built-in themes (pixel16, primeval_forest)
│   └── pets/                        # Built-in pets (pixel_owl)
├── patcher/                         # Cross-platform ASAR patcher & install engine
│   ├── paths.js                     # OS-aware user data & backup paths
│   ├── patch-asar.js                # Non-destructive ASAR header patch/unpatch
│   └── install-engine.js            # Auto-detect, backup, deploy, patch, and restore
└── scripts/                         # Thin Linux CLI wrappers
    ├── install.sh
    └── uninstall.sh
```

### Runtime vs User Data Separation

`runtime/` is strictly read-only/replaceable during upgrades. Mutable user state (settings, API keys, backups, logs) lives in the OS user data directory:

- **Linux**: `~/.config/antigravity-harness/` (or `$XDG_CONFIG_HOME/antigravity-harness/`)
- **Windows**: `%APPDATA%\antigravity-harness\`
- **macOS**: `~/Library/Application Support/antigravity-harness/`

User files stored there:
- `config.json` — User preferences and optional AI provider key (`0600` permissions on POSIX; never exposed to renderer globals)
- `install.json` — Installation metadata (`mode`, `runtimeDir`, `appDir`, `version`)
- `backups/` — Timestamped `app.asar` snapshots + SHA-256 checksums and pristine `backups/original/app.asar.<version>`
- `harness.log` — Runtime diagnostics (auto-rotated at 512 KB)

## CLI Usage (Development / Manual)

Detect installed Antigravity directories and check status:

```bash
node patcher/install-engine.js detect
node patcher/install-engine.js status
```

Install or re-apply after an Antigravity update:

```bash
./scripts/install.sh                 # Production copy to user data dir
./scripts/install.sh --dev           # Link directly to workspace runtime/
./scripts/install.sh --app-dir /path/to/Antigravity
```

Uninstall and restore pristine `app.asar`:

```bash
./scripts/uninstall.sh               # Keep user config.json & backups
./scripts/uninstall.sh --purge       # Also remove config.json & logs
```

On Windows, call the cross-platform engine directly with Node.js (or Antigravity's Electron binary with `ELECTRON_RUN_AS_NODE=1`):

```powershell
node patcher\install-engine.js install
node patcher\install-engine.js uninstall
```

## Emergency Bypass & Environment Flags

- `AGY_HARNESS_DISABLE=1` — Launch Antigravity with the harness completely disabled.
- `AGY_HARNESS_DEV=1` — Enable live file watching of `runtime/` and dynamic reload of `pet-brain.js`.
- `AGY_HARNESS_DEBUG=1` — Enable `userDataDir/debug/` screenshot/eval hooks (disabled by default).
- `AGY_HARNESS_DATA_DIR` / `AGY_HARNESS_RUNTIME_DIR` — Override default user data or runtime directories.
