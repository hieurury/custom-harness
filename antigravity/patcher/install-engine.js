#!/usr/bin/env node
'use strict';
/*
 * Antigravity Harness — cross-platform (Linux / Windows / macOS) install engine.
 *
 * Zero external dependencies. Supports:
 *  - Auto-detecting Antigravity installations
 *  - Backing up app.asar with SHA-256 and preserving pristine per-version originals
 *  - Installing runtime payload to userDataDir/runtime (or dev-linking source tree)
 *  - Patching / unpatching app.asar cleanly and migrating legacy glass installs
 */
process.noAsar = true;

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const paths = require('./paths.js');
const patchAsar = require('./patch-asar.js');

function isValidAppDir(dir) {
  if (!dir || typeof dir !== 'string') return false;
  try {
    return fs.existsSync(path.join(dir, 'resources', 'app.asar'));
  } catch {
    return false;
  }
}

function addCandidate(list, seen, candidate) {
  if (!candidate) return;
  try {
    const resolved = path.resolve(candidate);
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) return;
    if (isValidAppDir(resolved)) {
      seen.add(key);
      list.push(resolved);
    }
  } catch {
    // Ignore invalid candidate paths
  }
}

function resolveBinToAppDirs(binPath) {
  const out = [];
  if (!binPath) return out;
  try {
    const real = fs.realpathSync(binPath);
    const dir = path.dirname(real);
    out.push(dir, path.dirname(dir), path.dirname(path.dirname(dir)));
  } catch {
    const dir = path.dirname(binPath);
    out.push(dir, path.dirname(dir));
  }
  return out;
}

function detectLinuxCandidates() {
  const candidates = [];
  const home = os.homedir();

  candidates.push(
    path.join(home, 'Applications', 'Antigravity', 'Antigravity-x64'),
    path.join(home, 'Applications', 'Antigravity'),
    '/opt/Antigravity',
    '/opt/antigravity',
    '/usr/share/antigravity',
    '/usr/lib/antigravity'
  );

  // Scan ~/Applications/Antigravity* (1 and 2 levels deep, skipping backup folders)
  const appsDir = path.join(home, 'Applications');
  try {
    for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/antigravity/i.test(entry.name) || /backup|\.bak/i.test(entry.name)) continue;
      const full = path.join(appsDir, entry.name);
      candidates.push(full);
      try {
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          if (sub.isDirectory() && !/backup|\.bak/i.test(sub.name)) {
            candidates.push(path.join(full, sub.name));
          }
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // Check PATH binary via `which antigravity`
  try {
    const bin = execFileSync('which', ['antigravity'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (bin) candidates.push(...resolveBinToAppDirs(bin.split(/\r?\n/)[0]));
  } catch { /* ignore */ }

  // Parse .desktop launchers
  const desktopDirs = [
    path.join(home, '.local', 'share', 'applications'),
    '/usr/share/applications',
  ];
  for (const dDir of desktopDirs) {
    try {
      for (const file of fs.readdirSync(dDir)) {
        if (!/antigravity/i.test(file) || !file.endsWith('.desktop')) continue;
        const text = fs.readFileSync(path.join(dDir, file), 'utf8');
        for (const line of text.split(/\r?\n/)) {
          const m = line.match(/^Exec=(.+)$/);
          if (!m) continue;
          let cmd = m[1].trim();
          const quoted = cmd.match(/^"([^"]+)"/);
          const exe = quoted ? quoted[1] : cmd.split(/\s+/)[0];
          candidates.push(...resolveBinToAppDirs(exe));
        }
      }
    } catch { /* ignore */ }
  }

  return candidates;
}

function detectWindowsCandidates() {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  candidates.push(
    path.join(localAppData, 'Programs', 'Antigravity'),
    path.join(localAppData, 'Antigravity'),
    path.join(programFiles, 'Antigravity'),
    path.join(programFilesX86, 'Antigravity')
  );

  // Squirrel-style app-* subdirectories under %LOCALAPPDATA%\Antigravity
  const squirrelRoot = path.join(localAppData, 'Antigravity');
  try {
    const appDirs = fs.readdirSync(squirrelRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^app-/i.test(d.name))
      .map((d) => path.join(squirrelRoot, d.name))
      .sort()
      .reverse();
    candidates.push(...appDirs);
  } catch { /* ignore */ }

  try {
    const bins = execFileSync('where', ['antigravity'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    for (const line of bins.split(/\r?\n/)) {
      if (line.trim()) candidates.push(...resolveBinToAppDirs(line.trim()));
    }
  } catch { /* ignore */ }

  return candidates;
}

function detectDarwinCandidates() {
  return [
    '/Applications/Antigravity.app/Contents/Resources',
    path.join(os.homedir(), 'Applications', 'Antigravity.app', 'Contents', 'Resources'),
    '/Applications/Antigravity.app/Contents',
  ];
}

function detectAntigravityDirs(platform = process.platform) {
  const found = [];
  const seen = new Set();
  const candidates = platform === 'win32'
    ? detectWindowsCandidates()
    : (platform === 'darwin' ? detectDarwinCandidates() : detectLinuxCandidates());

  for (const c of candidates) {
    addCandidate(found, seen, c);
  }
  return found;
}

function resolveAppDir(explicitAppDir, platform = process.platform) {
  if (explicitAppDir) {
    const resolved = path.resolve(explicitAppDir);
    if (!isValidAppDir(resolved)) {
      throw new Error(`Antigravity installation not found (missing resources/app.asar) at: ${resolved}`);
    }
    return resolved;
  }
  const detected = detectAntigravityDirs(platform);
  if (detected.length === 0) {
    throw new Error('Could not auto-detect an Antigravity installation. Please specify --app-dir <path>.');
  }
  return detected[0];
}

function resolveRuntimeSourceDir(explicitSourceDir) {
  const src = explicitSourceDir
    ? path.resolve(explicitSourceDir)
    : path.resolve(__dirname, '..', 'runtime');
  if (!fs.existsSync(path.join(src, 'boot', 'harness-boot.js')) ||
      !fs.existsSync(path.join(src, 'core', 'main.js'))) {
    throw new Error(`Invalid runtime source directory: ${src}`);
  }
  return src;
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

function deployRuntimeDir(srcDir, dstDir) {
  const parent = path.dirname(dstDir);
  fs.mkdirSync(parent, { recursive: true });
  const stageDir = path.join(parent, `runtime.staging-${process.pid}`);
  const oldDir = path.join(parent, `runtime.old-${process.pid}`);

  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.rmSync(oldDir, { recursive: true, force: true });
  copyDirRecursive(srcDir, stageDir);

  if (fs.existsSync(dstDir)) {
    fs.renameSync(dstDir, oldDir);
  }
  try {
    fs.renameSync(stageDir, dstDir);
    fs.rmSync(oldDir, { recursive: true, force: true });
  } catch (err) {
    if (fs.existsSync(oldDir) && !fs.existsSync(dstDir)) {
      try { fs.renameSync(oldDir, dstDir); } catch { /* ignore */ }
    }
    fs.rmSync(stageDir, { recursive: true, force: true });
    throw err;
  }
}

function writeJsonAtomic(file, obj, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  const payload = JSON.stringify(obj, null, 2) + '\n';
  const opts = process.platform === 'win32' || mode == null ? { encoding: 'utf8' } : { encoding: 'utf8', mode };
  fs.writeFileSync(tmp, payload, opts);
  fs.renameSync(tmp, file);
  if (process.platform !== 'win32' && mode != null) {
    try { fs.chmodSync(file, mode); } catch { /* ignore */ }
  }
}

function chownRecursiveIfElevated(targetPath, effUser) {
  if (!effUser || !targetPath || process.platform === 'win32') return;
  try {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      fs.lchownSync(targetPath, effUser.uid, effUser.gid);
      return;
    }
    fs.chownSync(targetPath, effUser.uid, effUser.gid);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
        chownRecursiveIfElevated(path.join(targetPath, entry.name), effUser);
      }
    }
  } catch {
    // Ignore chown errors
  }
}

function extractLegacySecretsFromConfigObj(cfgObj, secretsPath, platform) {
  if (!cfgObj || typeof cfgObj !== 'object') return { sanitized: cfgObj, changed: false };
  const copy = { ...cfgObj };
  let changed = false;

  if (copy.pets && typeof copy.pets === 'object') {
    const petsCopy = { ...copy.pets };
    const legacyKey = String(petsCopy.apiKey || petsCopy.geminiApiKey || '').trim();
    const provider = String(petsCopy.provider || 'gemini').trim().toLowerCase();
    const normalizedProv = ['gemini', 'openai', 'claude'].includes(provider) ? provider : 'gemini';

    if (legacyKey) {
      let store = { version: 1, keys: {} };
      try {
        if (fs.existsSync(secretsPath)) {
          const parsed = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
          if (parsed && typeof parsed.keys === 'object' && !Array.isArray(parsed.keys)) {
            store = { version: 1, keys: { ...parsed.keys } };
          }
        }
      } catch { /* start clean store */ }

      if (!store.keys[normalizedProv] || !store.keys[normalizedProv].value) {
        store.keys[normalizedProv] = { enc: 'plain', value: legacyKey };
        writeJsonAtomic(secretsPath, store, platform === 'win32' ? null : 0o600);
      }
    }

    for (const field of ['apiKey', 'geminiApiKey', 'apiKeys']) {
      if (Object.prototype.hasOwnProperty.call(petsCopy, field)) {
        delete petsCopy[field];
        changed = true;
      }
    }
    copy.pets = petsCopy;
  }

  return { sanitized: copy, changed };
}

function readHarnessVersion(runtimeDir) {
  if (!runtimeDir || typeof runtimeDir !== 'string') return null;
  try {
    const manifestPath = path.join(runtimeDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return (parsed && typeof parsed.version === 'string' && parsed.version.trim()) ? parsed.version.trim() : null;
  } catch {
    return null;
  }
}

function getInstallStatus(opts = {}) {
  const platform = opts.platform || process.platform;
  const userDataDir = paths.getUserDataDir(platform);
  const installMetaPath = paths.getInstallMetaPath(platform);
  const configPath = path.join(userDataDir, 'config.json');
  const secretsPath = paths.getSecretsPath(platform);
  const detectedDirs = detectAntigravityDirs(platform);

  let targetAppDir = null;
  let asarPath = null;
  let asarState = 'not-found';
  let appVersion = null;

  try {
    targetAppDir = opts.appDir ? resolveAppDir(opts.appDir, platform) : (detectedDirs[0] || null);
    if (targetAppDir) {
      asarPath = path.join(targetAppDir, 'resources', 'app.asar');
      asarState = patchAsar.status(asarPath).state;
      appVersion = patchAsar.getAppVersion(asarPath);
    }
  } catch (err) {
    asarState = `error: ${err.message}`;
  }

  let installMeta = null;
  try {
    if (fs.existsSync(installMetaPath)) {
      installMeta = JSON.parse(fs.readFileSync(installMetaPath, 'utf8'));
    }
  } catch { /* ignore */ }

  let harnessVersion = readHarnessVersion((installMeta && installMeta.runtimeDir) || paths.getDefaultRuntimeDir(platform));
  if (!harnessVersion) {
    try {
      harnessVersion = readHarnessVersion(resolveRuntimeSourceDir(opts.runtimeSourceDir));
    } catch { /* ignore */ }
  }

  return {
    platform,
    userDataDir,
    configExists: fs.existsSync(configPath),
    secretsExist: fs.existsSync(secretsPath),
    installMeta,
    detectedDirs,
    targetAppDir,
    asarPath,
    asarState,
    appVersion,
    harnessVersion,
  };
}

function install(opts = {}) {
  const platform = opts.platform || process.platform;
  const devMode = Boolean(opts.devMode);
  const appDir = resolveAppDir(opts.appDir, platform);
  const srcRuntime = resolveRuntimeSourceDir(opts.runtimeSourceDir);
  const harnessVersion = readHarnessVersion(srcRuntime);
  const asarPath = path.join(appDir, 'resources', 'app.asar');

  const userDataDir = paths.getUserDataDir(platform);
  const backupsDir = paths.getBackupsDir(platform);
  const installMetaPath = paths.getInstallMetaPath(platform);
  const configPath = path.join(userDataDir, 'config.json');
  const secretsPath = paths.getSecretsPath(platform);
  const effUser = paths.getEffectiveUser(platform);

  const patchInfo = patchAsar.status(asarPath);
  const appVersion = patchAsar.getAppVersion(asarPath);
  const ts = formatTimestamp();
  const snapshotDir = path.join(backupsDir, ts);

  fs.mkdirSync(snapshotDir, { recursive: true });
  const backupAsar = path.join(snapshotDir, `app.asar.${patchInfo.state}`);
  fs.copyFileSync(asarPath, backupAsar);
  fs.writeFileSync(path.join(snapshotDir, `app.asar.${patchInfo.state}.sha256`), `${sha256File(asarPath)}  app.asar\n`, 'utf8');

  const verFile = path.join(appDir, 'version');
  if (fs.existsSync(verFile)) {
    try { fs.copyFileSync(verFile, path.join(snapshotDir, 'electron-version')); } catch { /* ignore */ }
  }

  let pristinePath = null;
  if (patchInfo.state === 'original') {
    const origDir = path.join(backupsDir, 'original');
    fs.mkdirSync(origDir, { recursive: true });
    pristinePath = path.join(origDir, `app.asar.${appVersion}`);
    if (!fs.existsSync(pristinePath)) {
      fs.copyFileSync(asarPath, pristinePath);
    }
  }

  const targetRuntimeDir = devMode ? srcRuntime : paths.getDefaultRuntimeDir(platform);
  if (!devMode) {
    deployRuntimeDir(srcRuntime, targetRuntimeDir);
  }

  writeJsonAtomic(installMetaPath, {
    mode: devMode ? 'dev' : 'installed',
    runtimeDir: targetRuntimeDir,
    appDir,
    version: appVersion,
    harnessVersion,
    updatedAt: new Date().toISOString(),
  });

  // Migrate legacy glass config before cleaning legacy symlink
  let migratedLegacyConfig = false;
  const legacyLink = paths.getLegacyGlassLink(platform);
  if (!fs.existsSync(configPath) && legacyLink) {
    try {
      const legacyDir = fs.realpathSync(legacyLink);
      const legacyCfgPath = path.join(legacyDir, 'config.json');
      if (fs.existsSync(legacyCfgPath)) {
        const legacyCfg = JSON.parse(fs.readFileSync(legacyCfgPath, 'utf8'));
        const { sanitized } = extractLegacySecretsFromConfigObj(legacyCfg, secretsPath, platform);
        writeJsonAtomic(configPath, sanitized, platform === 'win32' ? null : 0o600);
        migratedLegacyConfig = true;
      }
    } catch { /* ignore missing/unreadable legacy config */ }
  }

  // Migrate any legacy plaintext keys from existing config.json into secrets.json without resetting preferences
  if (fs.existsSync(configPath)) {
    try {
      const existingCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const { sanitized, changed } = extractLegacySecretsFromConfigObj(existingCfg, secretsPath, platform);
      if (changed) {
        writeJsonAtomic(configPath, sanitized, platform === 'win32' ? null : 0o600);
      }
    } catch { /* preserve existing unreadable/custom file untouched */ }
  }

  let createdConfig = false;
  if (!fs.existsSync(configPath)) {
    const defaultCfg = path.join(targetRuntimeDir, 'config', 'default.config.json');
    if (fs.existsSync(defaultCfg)) {
      fs.copyFileSync(defaultCfg, configPath);
      if (platform !== 'win32') {
        try { fs.chmodSync(configPath, 0o600); } catch { /* ignore */ }
      }
      createdConfig = true;
    }
  }

  const bootFile = path.join(targetRuntimeDir, 'boot', 'harness-boot.js');
  const patchRes = patchAsar.patch(asarPath, bootFile);

  let legacyLinkCleaned = false;
  if (legacyLink) {
    try {
      if (fs.lstatSync(legacyLink).isSymbolicLink()) {
        fs.unlinkSync(legacyLink);
        legacyLinkCleaned = true;
      }
    } catch { /* not present */ }
  }

  if (effUser) {
    chownRecursiveIfElevated(userDataDir, effUser);
  }

  return {
    appDir,
    asarPath,
    appVersion,
    harnessVersion,
    mode: devMode ? 'dev' : 'installed',
    runtimeDir: targetRuntimeDir,
    userDataDir,
    backupDir: snapshotDir,
    pristinePath,
    createdConfig,
    migratedLegacyConfig,
    preservedConfig: !createdConfig && !migratedLegacyConfig,
    secretsPreserved: fs.existsSync(secretsPath),
    previousAsarState: patchRes.previousState,
    asarState: patchRes.state,
    legacyLinkCleaned,
  };
}

function restoreAsarBackup(asarPath, backupDir, pristinePath) {
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(asarPath, path.join(backupDir, 'app.asar.patched'));

  if (pristinePath && fs.existsSync(pristinePath)) {
    const tmp = `${asarPath}.restore-tmp-${process.pid}`;
    try {
      fs.copyFileSync(pristinePath, tmp);
      const check = patchAsar.status(tmp);
      if (check.state !== 'original') {
        throw new Error(`Pristine backup at ${pristinePath} is not original`);
      }
      fs.renameSync(tmp, asarPath);
      return 'restored-pristine';
    } catch (err) {
      try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      throw err;
    }
  }

  patchAsar.unpatch(asarPath);
  return 'unpatched-in-place';
}

function uninstall(opts = {}) {
  const platform = opts.platform || process.platform;
  const purge = Boolean(opts.purge);
  const userDataDir = paths.getUserDataDir(platform);
  const backupsDir = paths.getBackupsDir(platform);
  const installMetaPath = paths.getInstallMetaPath(platform);
  const runtimeDir = paths.getDefaultRuntimeDir(platform);

  let appDir = null;
  let asarPath = null;
  let restoreMethod = 'skipped';
  let backupDir = null;

  if (opts.appDir || detectAntigravityDirs(platform).length > 0) {
    appDir = resolveAppDir(opts.appDir, platform);
    asarPath = path.join(appDir, 'resources', 'app.asar');
    const info = patchAsar.status(asarPath);
    if (info.state !== 'original') {
      const appVersion = patchAsar.getAppVersion(asarPath);
      const pristine = path.join(backupsDir, 'original', `app.asar.${appVersion}`);
      backupDir = path.join(backupsDir, `uninstall-${formatTimestamp()}`);
      restoreMethod = restoreAsarBackup(asarPath, backupDir, pristine);
    } else {
      restoreMethod = 'already-original';
    }
  }

  fs.rmSync(installMetaPath, { force: true });
  fs.rmSync(runtimeDir, { recursive: true, force: true });

  if (purge) {
    fs.rmSync(path.join(userDataDir, 'config.json'), { force: true });
    fs.rmSync(path.join(userDataDir, 'config.json.bak'), { force: true });
    fs.rmSync(paths.getSecretsPath(platform), { force: true });
    fs.rmSync(path.join(userDataDir, 'state'), { recursive: true, force: true });
    fs.rmSync(path.join(userDataDir, 'harness.log'), { force: true });
    fs.rmSync(path.join(userDataDir, 'harness.log.old'), { force: true });
  }

  let legacyLinkMoved = false;
  const legacyLink = paths.getLegacyGlassLink(platform);
  if (legacyLink) {
    try {
      const stat = fs.lstatSync(legacyLink);
      if (stat.isSymbolicLink()) {
        const destDir = backupDir || path.join(backupsDir, `uninstall-${formatTimestamp()}`);
        fs.mkdirSync(destDir, { recursive: true });
        try {
          fs.renameSync(legacyLink, path.join(destDir, 'antigravity-glass.symlink'));
        } catch {
          const target = fs.readlinkSync(legacyLink);
          fs.writeFileSync(path.join(destDir, 'antigravity-glass.symlink.txt'), target + '\n', 'utf8');
          fs.unlinkSync(legacyLink);
        }
        legacyLinkMoved = true;
      }
    } catch { /* not present */ }
  }

  return {
    appDir,
    asarPath,
    restoreMethod,
    backupDir,
    userDataDir,
    purgedConfig: purge,
    legacyLinkMoved,
  };
}

function parseCliArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dev') flags.devMode = true;
    else if (a === '--purge') flags.purge = true;
    else if (a === '--json') flags.json = true;
    else if (a === '--app-dir' && argv[i + 1]) flags.appDir = argv[++i];
    else if (a === '--runtime-src' && argv[i + 1]) flags.runtimeSourceDir = argv[++i];
    else positional.push(a);
  }
  return { cmd: positional[0], extra: positional[1], flags };
}

if (require.main === module) {
  const { cmd, extra, flags } = parseCliArgs(process.argv.slice(2));
  const appDirArg = flags.appDir || extra;
  try {
    if (cmd === 'detect') {
      const dirs = detectAntigravityDirs();
      if (flags.json) console.log(JSON.stringify(dirs, null, 2));
      else if (dirs.length === 0) console.log('No Antigravity installations detected.');
      else dirs.forEach((d) => console.log(d));
    } else if (cmd === 'status') {
      console.log(JSON.stringify(getInstallStatus({ appDir: appDirArg }), null, 2));
    } else if (cmd === 'install') {
      const res = install({
        appDir: appDirArg,
        runtimeSourceDir: flags.runtimeSourceDir,
        devMode: flags.devMode,
      });
      console.log(JSON.stringify(res, null, 2));
    } else if (cmd === 'uninstall') {
      const res = uninstall({
        appDir: appDirArg,
        purge: flags.purge,
      });
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.error('Usage: install-engine.js detect|status|install|uninstall [--app-dir <dir>] [--dev] [--purge] [--json]');
      process.exit(2);
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  detectAntigravityDirs,
  getInstallStatus,
  install,
  uninstall,
};
