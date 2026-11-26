'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCatalog, readOptions, validateOptions, applyOptions, purgeOptionBackups, assertTargetApp } = require('../installer/catalog.js');

const catalog = createCatalog();
test('catalog isolates both harnesses and reads real option manifests', () => {
  assert.deepEqual(catalog.map(t => t.id), ['opencode', 'antigravity']);
  assert.notEqual(catalog[0].runtimeDir, catalog[1].runtimeDir);
  for (const target of catalog) {
    const options = readOptions(target);
    assert(options.themes.some(t => t.id === 'pixel16'));
    assert(options.pets.some(p => p.id === 'pixel_owl'));
    assert(!JSON.stringify(options).includes('apiKey'));
  }
});
test('applying options preserves secrets, unrelated settings and backs up config', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-options-test-'));
  const target = { ...catalog[0], paths: { getUserDataDir: () => dir, getEffectiveUser: () => null } };
  const original = { activeTheme: 'pixel16', debug: true, themes: { pixel16: { palette: 'custom', customColors: { bg: '#123456' } }, primeval_forest: { weather: 'rain' } }, pets: { enabled: true, apiKey: 'secret-test-value', customDialogues: { hi: 'preserved' }, activePets: ['pixel_owl'] } };
  const file = path.join(dir, 'config.json'); fs.writeFileSync(file, JSON.stringify(original));
  try {
    const options = { activeTheme: 'pixel16', petsEnabled: false, activePets: ['pixel_owl'], themeOptions: { uiFont: 'system', pixelSize: 3 } };
    applyOptions(target, options);
    const changed = JSON.parse(fs.readFileSync(file));
    assert.equal(changed.pets.enabled, false);
    assert.equal(changed.themes.pixel16.pixelSize, 3);
    assert.equal(changed.themes.pixel16.palette, 'custom');
    assert.deepEqual(changed.themes.primeval_forest, original.themes.primeval_forest);
    assert.equal(changed.pets.apiKey, original.pets.apiKey);
    assert.deepEqual(changed.pets.customDialogues, original.pets.customDialogues);
    const backup = fs.readdirSync(dir).find(n => n.startsWith('config.json.before-options-'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, backup))), original);
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.throws(() => validateOptions(target, { ...options, activeTheme: '../other' }));
    assert.throws(() => validateOptions(target, { ...options, activePets: ['wrong'] }));
    assert.throws(() => validateOptions(target, { ...options, themeOptions: { uiFont: 'bad' } }));
    fs.writeFileSync(path.join(dir, 'unrelated-backup.json'), 'keep');
    purgeOptionBackups(target);
    assert(!fs.existsSync(path.join(dir, backup)));
    assert(fs.existsSync(path.join(dir, 'unrelated-backup.json')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('both engines install and restore isolated app fixtures with independent options', async () => {
  const asar = require('../installer/node_modules/@electron/asar');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-install-test-'));
  const keys = ['XDG_CONFIG_HOME', 'OCH_HARNESS_DATA_DIR', 'AGY_HARNESS_DATA_DIR'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  process.env.XDG_CONFIG_HOME = path.join(dir, 'xdg');
  process.env.OCH_HARNESS_DATA_DIR = path.join(dir, 'oc-data');
  process.env.AGY_HARNESS_DATA_DIR = path.join(dir, 'ag-data');
  try {
    for (const target of catalog) {
      const src = path.join(dir, target.id, 'source');
      const appDir = path.join(dir, target.id, 'app');
      const entry = target.id === 'opencode' ? 'out/main/index.js' : 'dist/main.js';
      fs.mkdirSync(path.dirname(path.join(src, entry)), { recursive: true });
      fs.mkdirSync(path.join(appDir, 'resources'), { recursive: true });
      fs.writeFileSync(path.join(src, entry), 'console.log("original");\n');
      fs.writeFileSync(path.join(src, 'package.json'), JSON.stringify({ name: target.id, version: '0.0.1', main: entry, ...(target.id === 'opencode' ? { type: 'module' } : {}) }));
      const file = path.join(appDir, 'resources/app.asar');
      await asar.createPackage(src, file);
      const original = fs.readFileSync(file);
      assertTargetApp(target, appDir);
      const installed = target.engine.install({ appDir, runtimeSourceDir: target.runtimeDir });
      assert.equal(installed.asarState, 'patched');
      applyOptions(target, { activeTheme: 'pixel16', themeOptions: { pixelSize: 3 }, petsEnabled: false, activePets: ['pixel_owl'] });
      assert.equal(readOptions(target).selected.themes.pixel16.pixelSize, 3);
      target.engine.uninstall({ appDir, purge: true });
      purgeOptionBackups(target);
      assert.deepEqual(fs.readFileSync(file), original);
      assert(!fs.existsSync(path.join(target.paths.getUserDataDir(), 'config.json')));
    }
  } finally {
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('ASAR identity rejects the wrong harness before mutation', () => {
  if (!fs.existsSync('/opt/OpenCode/resources/app.asar')) return;
  assert.doesNotThrow(() => assertTargetApp(catalog[0], '/opt/OpenCode'));
  assert.throws(() => assertTargetApp(catalog[1], '/opt/OpenCode'), /không phải Antigravity/);
});
