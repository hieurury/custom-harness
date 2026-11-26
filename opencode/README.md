# OpenCode Harness

Custom themes, typography, and interactive desktop pets engine for the **OpenCode desktop app** (cross-platform: Linux, Windows, macOS).

Ported from the Antigravity Harness, with an OpenCode-specific injection path and design-token mapping.

## Architecture

```text
opencode/
├── runtime/                         # Pure production payload bundled into installers
│   ├── manifest.json                # Runtime metadata & schema version
│   ├── package.json                 # Forces CommonJS for runtime/core (safe with type:module apps)
│   ├── boot/
│   │   └── harness-boot.js          # ESM ASAR entry shim (out/harness/harness-boot.js)
│   ├── config/
│   │   └── default.config.json      # Clean default settings (no secrets)
│   ├── core/
│   │   ├── config.js                # Config loader/saver, atomic writes, log rotation
│   │   ├── main.js                  # Electron main-process orchestrator & IPC handlers
│   │   ├── preload.js               # Session preload bridge (opencodeHarness + legacy alias)
│   │   ├── theme-manager.js         # Font & theme CSS/effects loader
│   │   ├── pet-manager.js           # Pet asset loader & sanitized renderer injection
│   │   ├── pet-brain.js             # Multi-provider AI dialogue & offline fallbacks
│   │   ├── pet-runtime.js           # In-app pet physics, stage, and interactions
│   │   ├── pet-runtime.css          # Pet overlay & radial menu styles
│   │   ├── world/                   # EventBus, LayoutRegistry, WorldRegistry, ThemeStore
│   │   └── ui/
│   │       ├── harness-ui.js        # In-app Harness configuration modal (Ctrl+Shift+H)
│   │       └── harness-ui.css       # Harness modal styles
│   ├── fonts/                       # Bundled WOFF2 fonts + fonts.json
│   ├── themes/                      # Built-in themes (pixel16, primeval_forest)
│   │   └── <theme>/opencode-theme.json  # Native OpenCode theme exported on install
│   └── pets/                        # Built-in pets (pixel_owl)
├── patcher/                         # Cross-platform ASAR patcher & install engine
│   ├── paths.js                     # OS-aware user data & backup paths
│   ├── patch-asar.js                # Non-destructive ASAR header patch/unpatch
│   └── install-engine.js            # Auto-detect, backup, deploy, patch, restore, theme export
├── installer/                       # Electron one-click installer (deb / AppImage / NSIS)
└── scripts/                         # Thin Linux CLI wrappers
    ├── install.sh
    ├── uninstall.sh
    ├── build-installers.sh
    └── sync-version.js
```

### How injection works

OpenCode desktop ships an ESM `app.asar` whose `package.json` `main` points at
`./out/main/index.js`. The patcher appends `out/harness/harness-boot.js` plus
`out/harness/harness-meta.json` and rewrites only the `main` field:

1. Electron loads `out/harness/harness-boot.js` (ESM).
2. The shim resolves `~/.config/opencode-harness/runtime/core/main.js` and calls
   `init()` (CommonJS, loaded from the mutable runtime dir).
3. The harness registers an extra session preload, theme/pet IPC handlers, and a
   `web-contents-created` hook that injects CSS/JS/pets into `oc://renderer/` windows.
4. The shim then dynamically imports the original `out/main/index.js`.

Original entry bytes are never modified, so uninstall is a pure header restore.

### Runtime vs User Data Separation

`runtime/` is strictly read-only/replaceable during upgrades. Mutable user state
(settings, API keys, backups, logs) lives in the OS user data directory:

- **Linux**: `~/.config/opencode-harness/` (or `$XDG_CONFIG_HOME/opencode-harness/`)
- **Windows**: `%APPDATA%\opencode-harness\`
- **macOS**: `~/Library/Application Support/opencode-harness/`

User files stored there:
- `config.json` — User preferences (`0600` permissions on POSIX); legacy provider keys are migrated out on install/startup
- `secrets.json` — AI provider keys, stored separately from UI preferences and never sent to the installer renderer
- `install.json` — Installation metadata (`mode`, `runtimeDir`, `appDir`, `version`)
- `backups/` — Timestamped `app.asar` snapshots + SHA-256 checksums and pristine `backups/original/app.asar.<version>`
- `harness.log` — Runtime diagnostics (auto-rotated at 512 KB)

### Native OpenCode themes

Installing also exports matching native theme JSON files to the OpenCode config
directory (`~/.config/opencode/themes/och-<theme>.json` on Linux), so the palette
can be selected from OpenCode's own theme picker:

- `och-pixel16` — Pixel 16-bit
- `och-primeval_forest` — Rừng Nguyên Sinh

## Sử dụng menu Harness trong OpenCode

- Mở **menu OpenCode** (biểu tượng menu ở góc trên bên trái) → **Harness**.
- Hoặc nhấn **Ctrl + Shift + H**. Không còn nút Harness nổi hoặc nút ngoài menu.
- Mục Harness được gắn lại mỗi khi OpenCode tạo menu; hỗ trợ chuột và bàn phím
  (mũi tên lên/xuống, Home/End, Enter/Space). Esc đóng menu bằng cơ chế của OpenCode.
- Sau khi cập nhật runtime, thoát hoàn toàn rồi mở lại OpenCode để nạp mã mới.
  Đây là thay đổi mã injection, không phải thay đổi cấu hình OpenCode thông thường.

## Bộ cài dạng tab (OpenCode + Antigravity)

Bộ cài tại `opencode/installer/` đóng gói **cả hai harness**. Bộ cài Antigravity
cũ tại `antigravity/installer/` vẫn được giữ riêng, không bị thay thế.

1. Chọn tab **OpenCode** hoặc **Antigravity**. Trạng thái, thư mục ứng dụng, cấu hình,
   bản sao lưu và thao tác gỡ cài đặt đều độc lập cho từng tab.
2. Chọn đúng thư mục ứng dụng. Bộ cài kiểm tra tên ứng dụng trong ASAR, ngăn việc
   áp dụng nhầm harness sang ứng dụng khác.
3. Chọn **Áp dụng các lựa chọn…** để đặt theme, font giao diện/code, bảng màu,
   hiệu ứng, thời tiết và pet (các mục được đọc từ manifest của theme tương ứng).
   Cài mới: mặc định bật lựa chọn này. Cập nhật: mặc định **giữ cấu hình hiện có**.
4. Đóng ứng dụng trong tab trước khi cài/gỡ. Nút đóng có bước xác nhận, không tự
   đóng cả hai ứng dụng hoặc dịch vụ OpenCode nền.
5. Bấm **Cài đặt / Áp dụng lại**, rồi mở lại ứng dụng. Với OpenCode, vào
   **menu OpenCode → Harness** để tùy chỉnh tiếp.

Các lựa chọn chỉ cấu hình tính năng khởi động, không loại bỏ tài nguyên khỏi payload.
Bạn có thể đổi theme/bật lại pet sau này. Khi áp dụng lựa chọn mới, bộ cài sao lưu
`config.json.before-options-<timestamp>` trước khi ghi nguyên tử; giữ nguyên API key,
hội thoại, cấu hình theme khác và dữ liệu pet. Checkbox xóa dữ liệu chỉ có tác dụng
**khi gỡ harness của tab đang chọn**, kèm xác nhận.

## CLI Usage (Development / Manual)

Detect installed OpenCode directories and check status:

```bash
node patcher/install-engine.js detect
node patcher/install-engine.js status
```

Install or re-apply after an OpenCode update:

```bash
./scripts/install.sh                 # Production copy to user data dir
./scripts/install.sh --dev           # Use the workspace runtime/ directly
./scripts/install.sh --app-dir /path/to/OpenCode
```

Uninstall and restore the pristine `app.asar`:

```bash
./scripts/uninstall.sh               # Keep user config.json & backups
./scripts/uninstall.sh --purge       # Also remove config.json, logs, exported themes
```

On Windows, call the cross-platform engine directly with Node.js (or OpenCode's
Electron binary with `ELECTRON_RUN_AS_NODE=1`):

```powershell
node patcher\install-engine.js install
node patcher\install-engine.js uninstall
```

## Building installers

```bash
./scripts/build-installers.sh        # Linux .deb + AppImage (and Windows NSIS when wine/docker is available)
# or, Linux only:
cd installer && npm run build:linux
```

Artifacts are written to `installer/dist/` as `Custom-Harness-Setup-<version>-<os>-<arch>.*`.
The current Linux build includes `.deb` and `.AppImage`; Windows NSIS builds still
require a Windows build host, Wine, or the Docker builder image.

Verification (from `opencode/installer/`):

```bash
npm test
npm run test:ui                      # Requires a graphical session
```

## Emergency Bypass & Environment Flags

- `OCH_HARNESS_DISABLE=1` — Launch OpenCode with the harness completely disabled.
- `OCH_HARNESS_DEV=1` — Enable live file watching of `runtime/` and dynamic reload of `pet-brain.js`.
- `OCH_HARNESS_DEBUG=1` — Enable `userDataDir/debug/` screenshot/eval hooks (disabled by default).
- `OCH_HARNESS_DATA_DIR` / `OCH_HARNESS_RUNTIME_DIR` — Override default user data or runtime directories.

## Notes

- Installing into `/opt/OpenCode` requires write access (run the installer with
  `sudo`/`pkexec`, or install OpenCode per-user under `~/Applications`).
- The harness UI still calls the legacy `window.antigravityHarness` bridge as a
  fallback; `preload.js` exposes both names so shared components work unchanged.
