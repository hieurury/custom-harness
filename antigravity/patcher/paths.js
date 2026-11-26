'use strict';
/*
 * Antigravity Harness — cross-platform user data and runtime path helpers.
 * Mirrors the exact path resolution used by runtime/boot/harness-boot.js,
 * while safely resolving the invoking desktop user when running elevated (sudo/pkexec).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

function parsePasswdEntry({ username, uid }) {
  try {
    const content = fs.readFileSync('/etc/passwd', 'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(':');
      if (parts.length < 6) continue;
      const uName = parts[0];
      const uUid = Number(parts[2]);
      const uGid = Number(parts[3]);
      const uHome = parts[5];
      if (!uHome || !Number.isFinite(uUid) || !Number.isFinite(uGid)) continue;
      if (uid !== undefined && uUid === uid && uUid !== 0) {
        return { username: uName, uid: uUid, gid: uGid, home: uHome };
      }
      if (username && uName === username && uUid !== 0) {
        return { username: uName, uid: uUid, gid: uGid, home: uHome };
      }
    }
  } catch {
    // Ignore /etc/passwd lookup errors
  }
  return null;
}

function getEffectiveUser(platform = process.platform) {
  if (platform === 'win32') return null;
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) return null;

  const pkexecUid = (process.env.PKEXEC_UID || '').trim();
  if (/^\d+$/.test(pkexecUid)) {
    const uid = Number(pkexecUid);
    if (uid > 0) {
      const entry = parsePasswdEntry({ uid });
      if (entry) return entry;
    }
  }

  const sudoUser = (process.env.SUDO_USER || '').trim();
  if (sudoUser && sudoUser !== 'root') {
    const entry = parsePasswdEntry({ username: sudoUser });
    if (entry) return entry;
  }

  return null;
}

function getUserDataDir(platform = process.platform) {
  if (process.env.AGY_HARNESS_DATA_DIR && process.env.AGY_HARNESS_DATA_DIR.trim()) {
    return path.resolve(process.env.AGY_HARNESS_DATA_DIR.trim());
  }
  const eff = getEffectiveUser(platform);
  const homeDir = (eff && eff.home) || os.homedir();

  if (platform === 'win32') {
    const base = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return path.join(base, 'antigravity-harness');
  }
  if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'antigravity-harness');
  }

  let xdgConfig = process.env.XDG_CONFIG_HOME;
  if (eff && xdgConfig && path.resolve(xdgConfig).startsWith('/root')) {
    xdgConfig = '';
  }
  const base = xdgConfig || path.join(homeDir, '.config');
  return path.join(base, 'antigravity-harness');
}

function getDefaultRuntimeDir(platform = process.platform) {
  return path.join(getUserDataDir(platform), 'runtime');
}

function getBackupsDir(platform = process.platform) {
  return path.join(getUserDataDir(platform), 'backups');
}

function getInstallMetaPath(platform = process.platform) {
  return path.join(getUserDataDir(platform), 'install.json');
}

function getSecretsPath(platform = process.platform) {
  return path.join(getUserDataDir(platform), 'secrets.json');
}

function getLegacyGlassLink(platform = process.platform) {
  if (process.env.AGY_HARNESS_DATA_DIR && process.env.AGY_HARNESS_DATA_DIR.trim()) {
    return null;
  }
  if (platform === 'win32' || platform === 'darwin') return null;
  const eff = getEffectiveUser(platform);
  const homeDir = (eff && eff.home) || os.homedir();
  let xdgConfig = process.env.XDG_CONFIG_HOME;
  if (eff && xdgConfig && path.resolve(xdgConfig).startsWith('/root')) {
    xdgConfig = '';
  }
  const base = xdgConfig || path.join(homeDir, '.config');
  return path.join(base, 'antigravity-glass');
}

module.exports = {
  getEffectiveUser,
  getUserDataDir,
  getDefaultRuntimeDir,
  getBackupsDir,
  getInstallMetaPath,
  getSecretsPath,
  getLegacyGlassLink,
};
