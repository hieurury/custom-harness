'use strict';
/*
 * OpenCode Harness — main-process orchestrator.
 *
 * - Serves theme & pet state to the in-app Harness menu over IPC.
 * - Injects fonts + menu CSS + active theme CSS + pet runtime into Hub windows.
 * - Watches user config.json (and runtime sources when OCH_HARNESS_DEV=1).
 * - Gates debug capture IPC/watcher strictly behind config.debug / OCH_HARNESS_DEBUG=1.
 */
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const themeManager = require('./theme-manager.js');
const petManager = require('./pet-manager.js');
const petBrain = require('./pet-brain.js');
const world = require('./world/index.js');

let asarPath = '';
let reloadTimer = null;
const injected = new Map(); // wc.id -> [css keys]

function loadLogoDataUrl(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  } catch {
    return null;
  }
}

function getSystemInfo() {
  const manifest = config.readJson(config.runtimePath('manifest.json'), {}) || {};
  const installMeta = config.readJson(config.dataPath('install.json'), {}) || {};
  return {
    name: manifest.name || 'Custom Harness',
    version: manifest.version || installMeta.harnessVersion || '',
    appVersion: installMeta.version || '',
    author: manifest.author || 'hieurury',
    description: manifest.description || '',
    logo: loadLogoDataUrl(config.runtimePath('core', 'ui', 'assets', 'brand-logo.png')),
  };
}

function buildState() {
  const cfg = config.loadConfig();
  return {
    system: getSystemInfo(),
    ...themeManager.getThemeState(cfg),
    pets: petManager.getPetState(cfg),
  };
}

function isHubContents(wc) {
  try {
    if (!wc || wc.isDestroyed()) return false;
    const type = wc.getType();
    if (type === 'webview' || type === 'backgroundPage') return false;
    const url = wc.getURL() || '';
    if (url.startsWith('oc://renderer/')) return true;
    // Dev server (ELECTRON_RENDERER_URL) or file:// builds
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) return true;
    return url.startsWith('file://') && url.includes('/out/renderer/');
  } catch (err) {
    config.log('hub detection failed:', err.message);
    return false;
  }
}

async function applyTheme(wc, opts = {}) {
  const withUi = typeof opts === 'boolean' ? opts : Boolean(opts.withUi);
  const forceReloadPets = typeof opts === 'object' && Boolean(opts.reloadPets);

  if (!wc || wc.isDestroyed()) return;
  const tc = themeManager.ensureCache();
  const cfg = config.loadConfig();
  const inj = themeManager.buildThemeInjection(cfg);
  const petInj = petManager.buildPetInjection(cfg);

  try {
    const prev = injected.get(wc.id) || [];
    const keys = [];
    keys.push(await wc.insertCSS(tc.fonts.css, { cssOrigin: 'author' }));
    keys.push(await wc.insertCSS(tc.uiCss, { cssOrigin: 'author' }));
    if (inj.css) keys.push(await wc.insertCSS(inj.css, { cssOrigin: 'author' }));
    if (petInj.css) keys.push(await wc.insertCSS(petInj.css, { cssOrigin: 'author' }));
    for (const k of prev) await wc.removeInsertedCSS(k).catch(() => {});
    injected.set(wc.id, keys);

    // 1. World Layer Bootstrap (EventBus, LayoutRegistry, WorldRegistry)
    const worldBoot = world.getBootstrapScript();
    await wc.executeJavaScript(worldBoot).catch((e) => config.log('world boot error:', e.message));

    // 2. Effects (L1 / L2 / L3 / L4)
    const fx = inj.effects;
    const run = `(function(){try{
      if(window.__hxFx){try{window.__hxFx();}catch(e){} window.__hxFx=null;}
      ${fx ? `var f=(${fx.code || 'function(){}'})(${JSON.stringify({
        id: fx.id,
        colors: fx.colors,
        options: fx.options,
        surfaces: fx.surfaces || [],
        entities: fx.entities || [],
      })});
      window.__hxFx=typeof f==='function'?f:null;` : ''}
    }catch(e){console.error('[harness] effects',e);}})()`;
    await wc.executeJavaScript(run).catch((e) => config.log('effects error:', e.message));

    // 3. Custom Layout Script (L3 / L4)
    if (inj.layoutJs) {
      await wc.executeJavaScript(inj.layoutJs).catch((e) => config.log('layout error:', e.message));
    }

    // 4. UI Shell: Custom Shell (L4) or Default Harness UI
    if (withUi) {
      if (inj.overridesDefaultShell && inj.shellJs) {
        await wc.executeJavaScript(inj.shellJs).catch((e) => config.log('shell error:', e.message));
      } else {
        await wc.executeJavaScript(tc.uiJs).catch((e) => config.log('ui error:', e.message));
      }
    }

    // 5. Pet Runtime (Smart update without destroying/reloading living pets)
    const petStateCheck = await wc.executeJavaScript(
      'Boolean(window.__hxPetInstances && window.__hxPetInstances.length > 0)'
    ).catch(() => false);

    const safeGlobalConfig = {
      enabled: cfg.pets?.enabled !== false,
      activePets: cfg.pets?.activePets || [],
      petName: cfg.pets?.petName || 'Hooty',
      petLabel: cfg.pets?.petLabel || 'Cú',
      userLabel: cfg.pets?.userLabel || 'Sen',
      customDialogues: cfg.pets?.customDialogues || {},
      browserMode: cfg.pets?.browserMode || 'floating',
    };

    if (cfg.pets?.enabled === false) {
      if (petStateCheck) {
        await wc.executeJavaScript('if (window.__hxPetCleanup) { window.__hxPetCleanup(); }').catch(() => {});
      }
    } else if (petStateCheck && !forceReloadPets) {
      // Pet is already alive on screen! DO NOT reload or wipe it.
      // Update its global config and parameters in-place seamlessly.
      const updateScript = `(function() {
        if (window.__hxUpdatePetConfig) {
          window.__hxUpdatePetConfig(${JSON.stringify(safeGlobalConfig)}, ${JSON.stringify(cfg.pets?.config || {})});
        } else if (window.__hxPets) {
          window.__hxPets.globalConfig = ${JSON.stringify(safeGlobalConfig)};
        }
      })()`;
      await wc.executeJavaScript(updateScript).catch((e) => config.log('pet in-place update error:', e.message));
    } else if (petInj.js) {
      // Initial mount or explicit toggle reload
      await wc.executeJavaScript(petInj.js).catch((e) => config.log('pet runtime error:', e.message));
    }

    config.log(`applied theme=${cfg.activeTheme} scope=${inj.scope} wc=${wc.id} ui=${!!withUi} pets=${(cfg.pets.activePets || []).join(',')}`);
  } catch (err) {
    config.log('apply failed:', err.message);
  }
}

function applyAll(opts) {
  const { webContents } = require('electron');
  for (const wc of webContents.getAllWebContents()) {
    if (isHubContents(wc)) applyTheme(wc, opts);
  }
}

function scheduleReload(forceCache = false) {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    try {
      if (forceCache) {
        themeManager.ensureCache(true);
        petManager.ensureCache(true);
      }
      applyAll(forceCache);
    } catch (err) {
      config.log('reload failed:', err.message);
    }
  }, 250);
}

function setupDebug() {
  const dbg = config.dataPath('debug');
  fs.mkdirSync(dbg, { recursive: true });
  fs.watch(dbg, async (_e, name) => {
    const cfg = config.loadConfig();
    if (!config.isDebugAllowed(cfg) || !name || !name.startsWith('request-')) return;
    const f = path.join(dbg, name);
    if (!fs.existsSync(f)) return;
    const body = config.readText(f);
    try { fs.unlinkSync(f); } catch { return; }
    const { webContents } = require('electron');
    const hub = webContents.getAllWebContents().find(isHubContents);
    if (!hub) return;
    try {
      if (name === 'request-shot') {
        fs.writeFileSync(path.join(dbg, 'shot.png'), (await hub.capturePage()).toPNG());
      } else if (name === 'request-eval') {
        const r = await hub.executeJavaScript(body);
        const outStr = typeof r === 'string' ? r : (r === undefined ? 'undefined' : JSON.stringify(r, null, 2));
        fs.writeFileSync(path.join(dbg, 'eval.txt'), outStr);
      }
      config.log('debug done', name);
    } catch (err) {
      try { fs.writeFileSync(path.join(dbg, 'eval.txt'), 'ERROR: ' + err.message); } catch { /* ignore */ }
      config.log('debug failed', name, err.message);
    }
  });
}

function resolveBrain() {
  if (config.isDevMode()) {
    try {
      delete require.cache[require.resolve('./pet-brain.js')];
      return require('./pet-brain.js');
    } catch {
      return petBrain;
    }
  }
  return petBrain;
}

function registerIpc(ipcMain) {
  const commit = (cfg, opts = { withUi: false, reloadPets: false }) => {
    config.saveConfig(cfg);
    applyAll(opts);
    return buildState();
  };

  // Theme IPC
  ipcMain.handle('hx:get-state', () => buildState());
  ipcMain.handle('hx:set-active-theme', (_e, id) => {
    const cfg = config.loadConfig();
    cfg.activeTheme = String(id);
    return commit(cfg, { withUi: false, reloadPets: false });
  });
  ipcMain.handle('hx:set-theme-config', (_e, id, patch) => {
    const cfg = config.loadConfig();
    cfg.themes[id] = { ...(cfg.themes[id] || {}), ...(patch || {}) };
    return commit(cfg, { withUi: false, reloadPets: false });
  });
  ipcMain.handle('hx:reset-theme', (_e, id) => {
    const cfg = config.loadConfig();
    delete cfg.themes[id];
    return commit(cfg, { withUi: false, reloadPets: false });
  });
  ipcMain.handle('hx:get-theme-state', (_e, id) => config.loadThemeState(id));
  ipcMain.handle('hx:save-theme-state', (_e, id, data) => config.saveThemeState(id, data));

  // Pet Management IPC
  ipcMain.handle('hx:pet-toggle', (_e, id, enabled) => {
    const cfg = config.loadConfig();
    cfg.pets = cfg.pets || { enabled: true, activePets: [], config: {} };
    cfg.pets.activePets = cfg.pets.activePets || [];
    const idx = cfg.pets.activePets.indexOf(id);
    if (enabled && idx === -1) cfg.pets.activePets.push(id);
    else if (!enabled && idx !== -1) cfg.pets.activePets.splice(idx, 1);
    return commit(cfg, { withUi: false, reloadPets: true });
  });
  ipcMain.handle('hx:pet-set-config', (_e, id, patch) => {
    const cfg = config.loadConfig();
    cfg.pets = cfg.pets || { enabled: true, activePets: [], config: {} };
    cfg.pets.config = cfg.pets.config || {};
    cfg.pets.config[id] = { ...(cfg.pets.config[id] || {}), ...(patch || {}) };
    return commit(cfg, { withUi: false, reloadPets: false });
  });
  ipcMain.handle('hx:pet-set-global', (_e, patch) => {
    const cfg = config.loadConfig();
    const hasKeyPatch = Boolean(patch && Object.prototype.hasOwnProperty.call(patch, 'apiKey'));
    const { apiKey, ...restPatch } = patch || {};

    if (hasKeyPatch) {
      const targetProvider = restPatch.provider || cfg.pets?.provider || 'gemini';
      config.setApiKey(targetProvider, apiKey);
    }

    if (Object.keys(restPatch).length > 0) {
      cfg.pets = { ...(cfg.pets || {}), ...restPatch };
      return commit(cfg, { withUi: false, reloadPets: false });
    }

    return buildState();
  });

  // Pet AI & Brain IPC
  ipcMain.handle('hx:pet-get-dialogue', async (_e, id, category, context) => {
    const cfg = config.loadConfig();
    const petCache = petManager.ensureCache();
    const petObj = petCache.pets ? petCache.pets.get(id) : null;
    const petManifest = petObj ? petObj.manifest : { id, name: 'Hooty' };
    return resolveBrain().getDialogue(petManifest, category, cfg, context);
  });
  ipcMain.handle('hx:pet-get-prompt-steal', async (_e, id) => {
    const cfg = config.loadConfig();
    const petCache = petManager.ensureCache();
    const petObj = petCache.pets ? petCache.pets.get(id) : null;
    const petManifest = petObj ? petObj.manifest : { id, name: 'Hooty' };
    return resolveBrain().getPromptStealText(petManifest, cfg);
  });
}

function setupWatchers() {
  const cfg = config.loadConfig();
  try {
    fs.mkdirSync(config.getUserDataDir(), { recursive: true });
    fs.watch(config.getUserDataDir(), (_e, name) => {
      if (name === 'config.json' && Date.now() - config.getLastSelfWriteAt() > 600) {
        scheduleReload(false);
      }
    });
  } catch (err) {
    config.log('watch userDataDir failed:', err.message);
  }

  if (config.isDevMode()) {
    for (const dir of ['themes', 'core', 'fonts', 'pets']) {
      try {
        fs.watch(config.runtimePath(dir), { recursive: true }, () => scheduleReload(true));
      } catch (err) {
        config.log('watch failed', dir, err.message);
      }
    }
  }

  if (config.isDebugAllowed(cfg)) {
    try { setupDebug(); } catch (err) { config.log('debug setup failed:', err.message); }
  }
}

function init(opts) {
  const runtimeDir = opts.runtimeDir || opts.glassDir;
  const userDataDir = opts.userDataDir || runtimeDir;
  asarPath = opts.asarPath;

  config.init({ runtimeDir, userDataDir });
  petManager.init();

  const electron = require('electron');
  const { app, ipcMain } = electron;
  config.log(`init (Electron ${process.versions.electron}, runtime=${runtimeDir}, data=${userDataDir})`);

  registerIpc(ipcMain);

  const preloadFile = config.runtimePath('core', 'preload.js');
  const seen = new WeakSet();
  const register = (ses) => {
    if (!ses || seen.has(ses)) return;
    seen.add(ses);
    try {
      ses.registerPreloadScript({ type: 'frame', filePath: preloadFile });
    } catch (err) {
      config.log('registerPreloadScript failed:', err.message);
    }
  };
  app.on('session-created', register);

  app.on('web-contents-created', (_e, wc) => {
    const type = wc.getType();
    if (type === 'webview' || type === 'backgroundPage') return;
    const attach = () => {
      if (isHubContents(wc)) applyTheme(wc, true);
    };
    wc.on('dom-ready', attach);
    wc.on('did-finish-load', attach);
    wc.on('destroyed', () => injected.delete(wc.id));
  });

  app.whenReady().then(() => {
    config.migrateAndUpgradeSecrets();
    register(electron.session.defaultSession);
    setupWatchers();
    // Pick up windows created before the harness finished initialising.
    setTimeout(() => {
      try { applyAll(true); } catch (err) { config.log('initial sweep failed:', err.message); }
    }, 800);
  }).catch(() => {});
}

module.exports = { init };
