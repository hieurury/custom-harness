'use strict';
/*
 * OpenCode Harness — cross-platform user data and runtime path helpers.
 * Mirrors the path resolution used by runtime/boot/harness-boot.js, while
 * safely resolving the invoking desktop user when running elevated (sudo/pkexec).
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

function getHomeDir(platform = process.platform) {
  const eff = getEffectiveUser(platform);
  return (eff && eff.home) || os.homedir();
}

function getConfigBase(platform = process.platform) {
  const homeDir = getHomeDir(platform);
  if (platform === 'win32') {
    return process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
  }
  if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support');
  }
  let xdgConfig = process.env.XDG_CONFIG_HOME;
  if (getEffectiveUser(platform) && xdgConfig && path.resolve(xdgConfig).startsWith('/root')) {
    xdgConfig = '';
  }
  return xdgConfig || path.join(homeDir, '.config');
}

function getUserDataDir(platform = process.platform) {
  if (process.env.OCH_HARNESS_DATA_DIR && process.env.OCH_HARNESS_DATA_DIR.trim()) {
    return path.resolve(process.env.OCH_HARNESS_DATA_DIR.trim());
  }
  return path.join(getConfigBase(platform), 'opencode-harness');
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

/** Native OpenCode config root (~/.config/opencode on Linux). */
function getOpenCodeConfigDir(platform = process.platform) {
  return path.join(getConfigBase(platform), 'opencode');
}

/** Native OpenCode user themes directory. */
function getOpenCodeThemesDir(platform = process.platform) {
  return path.join(getOpenCodeConfigDir(platform), 'themes');
}

module.exports = {
  getEffectiveUser,
  getHomeDir,
  getConfigBase,
  getUserDataDir,
  getDefaultRuntimeDir,
  getBackupsDir,
  getInstallMetaPath,
  getSecretsPath,
  getOpenCodeConfigDir,
  getOpenCodeThemesDir,
};
