/*
 * OpenCode Harness — ESM boot shim.
 *
 * Lives inside app.asar as out/harness/harness-boot.js; package.json "main"
 * points here. Resolves the user data + runtime directories, initializes the
 * harness core (CommonJS, loaded from the mutable runtime dir), then imports
 * the original OpenCode main entry.
 *
 *  - Any failure in the harness layer is caught; the app always starts.
 *  - OCH_HARNESS_DISABLE=1 bypasses the harness entirely.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.dirname(path.dirname(__dirname));

function resolveUserDataDir() {
  if (process.env.OCH_HARNESS_DATA_DIR && process.env.OCH_HARNESS_DATA_DIR.trim()) {
    return process.env.OCH_HARNESS_DATA_DIR.trim();
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'opencode-harness');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'opencode-harness');
  }
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'opencode-harness');
}

function resolveRuntimeDir(userDataDir) {
  if (process.env.OCH_HARNESS_RUNTIME_DIR && process.env.OCH_HARNESS_RUNTIME_DIR.trim()) {
    return process.env.OCH_HARNESS_RUNTIME_DIR.trim();
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

if (process.env.OCH_HARNESS_DISABLE !== '1') {
  try {
    const userDataDir = resolveUserDataDir();
    const runtimeDir = resolveRuntimeDir(userDataDir);
    const entry = path.join(runtimeDir, 'core', 'main.js');
    if (fs.existsSync(entry)) {
      require(entry).init({ runtimeDir, userDataDir, asarPath: appRoot });
    }
  } catch (err) {
    console.error('[opencode-harness] disabled due to boot error:', err);
  }
}

let originalMain = './out/main/index.js';
try {
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'harness-meta.json'), 'utf8'));
  if (meta && typeof meta.originalMain === 'string' && meta.originalMain.trim()) {
    originalMain = meta.originalMain.trim();
  }
} catch {
  // Use the known default entry
}

await import(new URL(originalMain, pathToFileURL(appRoot + path.sep)).href);
