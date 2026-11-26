'use strict';

const fs = require('fs');
const path = require('path');

// Each target keeps its own engine, payload, configuration and backups.
function createCatalog({ packaged = false, resourcesPath, installerDir = __dirname } = {}) {
  return ['opencode', 'antigravity'].map((id) => {
    const root = packaged
      ? (id === 'opencode' ? resourcesPath : path.join(resourcesPath, id))
      : path.resolve(installerDir, '..', '..', id);
    const patcherDir = path.join(root, 'patcher');
    return {
      id,
      name: id === 'opencode' ? 'OpenCode' : 'Antigravity',
      runtimeDir: path.join(root, 'runtime'),
      engine: require(path.join(patcherDir, 'install-engine.js')),
      paths: require(path.join(patcherDir, 'paths.js')),
    };
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readOptions(target) {
  const configFile = path.join(target.paths.getUserDataDir(), 'config.json');
  const exists = fs.existsSync(configFile);
  // Do not silently overwrite an unreadable/custom configuration.
  const config = readJson(exists ? configFile : path.join(target.runtimeDir, 'config', 'default.config.json'));
  const scan = (folder) => fs.readdirSync(path.join(target.runtimeDir, folder), { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(target.runtimeDir, folder, d.name, 'manifest.json')))
    .map(d => ({ ...readJson(path.join(target.runtimeDir, folder, d.name, 'manifest.json')), id: d.name }));
  const themes = [{ id: 'default', name: `${target.name} gốc`, options: [] }, ...scan('themes')];
  const fonts = readJson(path.join(target.runtimeDir, 'fonts', 'fonts.json'));
  // Only preferences needed by this screen cross IPC; never expose API keys.
  return {
    configExists: exists, themes, fonts,
    pets: scan('pets').map(p => ({ id: p.id, name: p.name })),
    selected: {
      activeTheme: config.activeTheme || 'default',
      themes: config.themes || {},
      petsEnabled: config.pets?.enabled !== false,
      activePets: config.pets?.activePets || [],
    },
  };
}

function validateOptions(target, options) {
  const catalog = readOptions(target);
  const theme = catalog.themes.find(t => t.id === options.activeTheme);
  if (!theme) throw new Error('Theme không được harness này hỗ trợ.');
  if (typeof options.petsEnabled !== 'boolean' || !Array.isArray(options.activePets) ||
      options.activePets.some(id => !catalog.pets.some(p => p.id === id))) {
    throw new Error('Lựa chọn pet không hợp lệ.');
  }
  const themeOptions = {};
  for (const [key, value] of Object.entries(options.themeOptions || {})) {
    const option = (theme.options || []).find(o => o.id === key);
    if (!option) throw new Error(`Tùy chọn theme không hợp lệ: ${key}`);
    const allowed = option.type === 'palette' ? option.palettes.map(p => p.id)
      : option.type === 'font' ? option.choices
      : option.type === 'toggle' ? [true, false] : (option.choices || []).map(c => c.value);
    if (!allowed.includes(value)) throw new Error(`Giá trị không hợp lệ: ${key}`);
    themeOptions[key] = value;
  }
  return { activeTheme: theme.id, themeOptions, petsEnabled: options.petsEnabled, activePets: [...new Set(options.activePets)] };
}

function applyOptions(target, options) {
  const selected = validateOptions(target, options);
  const file = path.join(target.paths.getUserDataDir(), 'config.json');
  const config = readJson(file);
  fs.copyFileSync(file, `${file}.before-options-${Date.now()}`);
  config.activeTheme = selected.activeTheme;
  config.themes = { ...(config.themes || {}), [selected.activeTheme]: {
    ...(config.themes?.[selected.activeTheme] || {}), ...selected.themeOptions,
  } };
  config.pets = { ...(config.pets || {}), enabled: selected.petsEnabled, activePets: selected.activePets };
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, file);
  const user = target.paths.getEffectiveUser();
  if (user) {
    fs.chownSync(file, user.uid, user.gid);
    for (const name of fs.readdirSync(path.dirname(file)).filter(n => n.startsWith('config.json.before-options-'))) {
      fs.chownSync(path.join(path.dirname(file), name), user.uid, user.gid);
    }
  }
}

function purgeOptionBackups(target) {
  const dir = target.paths.getUserDataDir();
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).filter(n => /^config\.json\.before-options-\d+$/.test(n))) {
    fs.unlinkSync(path.join(dir, name));
  }
}

function assertTargetApp(target, appDir) {
  const file = path.join(appDir, 'resources', 'app.asar');
  const fd = fs.openSync(file, 'r');
  try {
    const prefix = Buffer.alloc(16);
    fs.readSync(fd, prefix, 0, 16, 0);
    const length = prefix.readUInt32LE(12);
    if (!length || length > 32 * 1024 * 1024) throw new Error('ASAR header không hợp lệ.');
    const headerBuffer = Buffer.alloc(length);
    fs.readSync(fd, headerBuffer, 0, length, 16);
    const entry = JSON.parse(headerBuffer.toString()).files['package.json'];
    const bytes = Buffer.alloc(entry.size);
    fs.readSync(fd, bytes, 0, bytes.length, 8 + prefix.readUInt32LE(4) + Number(entry.offset));
    const pkg = JSON.parse(bytes.toString());
    if (!`${pkg.name || ''} ${pkg.productName || ''}`.toLowerCase().includes(target.id)) {
      throw new Error(`Thư mục đã chọn không phải ${target.name}.`);
    }
  } finally { fs.closeSync(fd); }
}

module.exports = { createCatalog, readOptions, validateOptions, applyOptions, purgeOptionBackups, assertTargetApp };
