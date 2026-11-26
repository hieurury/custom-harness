# Installation

## Desktop installer (recommended)

1. Download the installer for your operating system from the project's GitHub
   Releases page.
2. Save your work and close the target application.
3. Start the installer, choose an available integration, and check the
   application location it detects. Use **Choose folder** if needed.
4. Choose whether to apply the displayed theme and feature settings. When
   updating an existing installation, the default is to keep your current
   preferences.
5. Select **Install / Apply again**, then reopen the target application.

The shared installer currently supports Windows and Linux packages (AppImage
and `.deb`). macOS packages are not currently produced by CI.

## Terminal installation

The scripts below are included with the source checkout. They install the
runtime and patch the selected application's startup archive; the installer
remains the recommended option for most users.

### Linux

From the project root, choose the supported target:

```bash
./opencode/scripts/install.sh
# or
./antigravity/scripts/install.sh
```

To inspect status or restore the original application archive:

```bash
node opencode/patcher/install-engine.js status
node opencode/patcher/install-engine.js uninstall
```

Use the matching `antigravity/patcher/install-engine.js` path for that target.
Applications installed in a system-owned directory may require an elevated
terminal; prefer a per-user installation where available.

### Windows

Install Node.js, open PowerShell in the project root, and run the engine for the
target you use:

```powershell
node .\opencode\patcher\install-engine.js install
# or
node .\antigravity\patcher\install-engine.js install
```

To restore the original application, use the corresponding engine with
`uninstall` instead of `install`.

## Restore or remove

Use the installer’s **Restore original** action, or run the matching
`install-engine.js uninstall` command. The normal restore keeps your user
configuration and backups. The installer offers a separate, explicitly
confirmed option to remove Harness data as well.

## After an application update

An update to the target application may replace its startup archive. If Harness
no longer loads, close the application and choose **Install / Apply again**.
The installer keeps a backup so you can restore the original application files.
