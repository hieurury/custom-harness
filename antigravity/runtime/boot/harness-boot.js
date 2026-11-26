'use strict';
/*
 * Antigravity Harness — boot file (lives inside app.asar as dist/harnessBoot.js;
 * package.json "main" points here). Resolves the user data and runtime directories
 * across Linux, Windows, and macOS, initializes the harness core, and then starts
 * the original dist/main.js.
 *
 *  - Any failure in the harness layer is caught; the app always starts.
 *  - AGY_HARNESS_DISABLE=1 (or AGY_GLASS_DISABLE=1) bypasses the harness.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

function resolveUserDataDir() {
  if (process.env.AGY_HARNESS_DATA_DIR && process.env.AGY_HARNESS_DATA_DIR.trim()) {
    return process.env.AGY_HARNESS_DATA_DIR.trim();
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'antigravity-harness');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'antigravity-harness');
  }
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'antigravity-harness');
}

function resolveRuntimeDir(userDataDir) {
  if (process.env.AGY_HARNESS_RUNTIME_DIR && process.env.AGY_HARNESS_RUNTIME_DIR.trim()) {
    return process.env.AGY_HARNESS_RUNTIME_DIR.trim();
  }
  const installMetaPath = path.join(userDataDir, 'install.json');
  try {
    if (fs.existsSync(installMetaPath)) {
      const meta = JSON.parse(fs.readFileSync(installMetaPath, 'utf8'));
      if (meta && typeof meta.runtimeDir === 'string' && meta.runtimeDir.trim()) {
        return meta.runtimeDir.trim();
      }
    }
  } catch {
    // Fall back to default runtime path below
  }
  return path.join(userDataDir, 'runtime');
}

if (process.env.AGY_HARNESS_DISABLE !== '1' && process.env.AGY_GLASS_DISABLE !== '1') {
  try {
    const userDataDir = resolveUserDataDir();
    const runtimeDir = resolveRuntimeDir(userDataDir);
    const entry = path.join(runtimeDir, 'core', 'main.js');
    if (fs.existsSync(entry)) {
      require(entry).init({
        runtimeDir,
        userDataDir,
        asarPath: path.join(__dirname, '..'),
      });
    }
  } catch (err) {
    console.error('[antigravity-harness] disabled due to boot error:', err);
  }
}

require('./main.js');
