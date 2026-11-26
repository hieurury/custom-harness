'use strict';
/*
 * OpenCode Harness — configuration, secrets, paths, and logging manager.
 *
 * Strictly separates:
 *  - runtimeDir: immutable/upgradable code and built-in assets (themes, pets, fonts)
 *  - userDataDir: mutable user state (config.json, secrets.json, harness.log, backups/, debug/)
 */
const fs = require('fs');
const path = require('path');

const TAG = '[harness]';
const MAX_LOG_BYTES = 512 * 1024;
const VALID_PROVIDERS = ['gemini', 'openai', 'claude'];

let runtimeDir = '';
let userDataDir = '';
let selfWriteAt = 0;

function init(opts) {
  runtimeDir = path.resolve(opts.runtimeDir);
  userDataDir = path.resolve(opts.userDataDir);
}

function getRuntimeDir() {
  return runtimeDir;
}

function getUserDataDir() {
  return userDataDir;
}

function runtimePath(...segments) {
  return path.join(runtimeDir, ...segments);
}

function dataPath(...segments) {
  return path.join(userDataDir, ...segments);
}

function isDevMode() {
  return process.env.OCH_HARNESS_DEV === '1';
}

function isDebugAllowed(cfg) {
  return Boolean(cfg && cfg.debug) || process.env.OCH_HARNESS_DEBUG === '1';
}

function getLastSelfWriteAt() {
  return selfWriteAt;
}

function readJsonDetailed(file) {
  if (!file) return { ok: false, missing: true, data: null, error: null };
  try {
    if (!fs.existsSync(file)) {
      return { ok: false, missing: true, data: null, error: null };
    }
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, missing: false, data: null, error: new Error('Invalid JSON object') };
    }
    return { ok: true, missing: false, data, error: null };
  } catch (err) {
    return { ok: false, missing: false, data: null, error: err };
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function rotateLogIfNeeded(logFile) {
  try {
    const stat = fs.statSync(logFile);
    if (stat.size > MAX_LOG_BYTES) {
      const oldFile = `${logFile}.old`;
      try { fs.unlinkSync(oldFile); } catch { /* ignore */ }
      fs.renameSync(logFile, oldFile);
    }
  } catch {
    // Log file does not exist yet or cannot be rotated
  }
}

function log(...args) {
  console.log(TAG, ...args);
  if (!userDataDir) return;
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    const logFile = dataPath('harness.log');
    rotateLogIfNeeded(logFile);
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${args.map(String).join(' ')}\n`);
  } catch {
    // Ignore logging I/O failures so runtime is never interrupted
  }
}

function writeJsonFileAtomic(target, dataObj) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${process.pid}`;
  const payload = JSON.stringify(dataObj, null, 2) + '\n';
  const writeOpts = process.platform === 'win32'
    ? { encoding: 'utf8' }
    : { encoding: 'utf8', mode: 0o600 };

  fs.writeFileSync(tmp, payload, writeOpts);
  try {
    fs.renameSync(tmp, target);
  } catch {
    fs.writeFileSync(target, payload, writeOpts);
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
  if (process.platform !== 'win32') {
    try { fs.chmodSync(target, 0o600); } catch { /* ignore */ }
  }
}

/* --------------------------------------------------------------------------
 * Encrypted Secrets Store (secrets.json)
 * -------------------------------------------------------------------------- */
function normalizeProvider(provider) {
  const v = String(provider || 'gemini').trim().toLowerCase();
  return VALID_PROVIDERS.includes(v) ? v : 'gemini';
}

function tryGetSafeStorage() {
  try {
    const electron = require('electron');
    if (
      electron &&
      electron.app &&
      typeof electron.app.isReady === 'function' &&
      electron.app.isReady() &&
      electron.safeStorage &&
      typeof electron.safeStorage.isEncryptionAvailable === 'function' &&
      electron.safeStorage.isEncryptionAvailable()
    ) {
      return electron.safeStorage;
    }
  } catch {
    // Outside Electron main process or safeStorage unavailable
  }
  return null;
}

function readSecretsStore() {
  if (!userDataDir) return { version: 1, keys: {} };
  const res = readJsonDetailed(dataPath('secrets.json'));
  if (!res.ok || !res.data || typeof res.data.keys !== 'object' || Array.isArray(res.data.keys)) {
    return { version: 1, keys: {} };
  }
  return { version: 1, keys: { ...res.data.keys } };
}

function writeSecretsStoreAtomic(store) {
  if (!userDataDir) return false;
  try {
    const payload = { version: 1, keys: (store && store.keys) || {} };
    writeJsonFileAtomic(dataPath('secrets.json'), payload);
    return true;
  } catch (err) {
    log('save secrets failed:', err.message);
    return false;
  }
}

function encryptSecretValue(plainKey) {
  const trimmed = String(plainKey || '').trim();
  if (!trimmed) return null;
  const ss = tryGetSafeStorage();
  if (ss) {
    try {
      const buf = ss.encryptString(trimmed);
      return { enc: 'safeStorage', value: buf.toString('base64') };
    } catch (err) {
      log('safeStorage encrypt failed, using mode-0600 fallback:', err.message);
    }
  }
  return { enc: 'plain', value: trimmed };
}

function decryptSecretEntry(entry) {
  if (!entry || typeof entry !== 'object' || typeof entry.value !== 'string' || !entry.value) {
    return '';
  }
  if (entry.enc === 'safeStorage') {
    const ss = tryGetSafeStorage();
    if (!ss) {
      log('safeStorage unavailable when decrypting API key; preserving stored entry.');
      return '';
    }
    try {
      return ss.decryptString(Buffer.from(entry.value, 'base64')).trim();
    } catch (err) {
      log('safeStorage decrypt failed; preserving stored entry:', err.message);
      return '';
    }
  }
  if (entry.enc === 'plain') {
    return entry.value.trim();
  }
  return '';
}

function getApiKey(provider = 'gemini') {
  if (!userDataDir) return '';
  const prov = normalizeProvider(provider);
  const store = readSecretsStore();
  const val = decryptSecretEntry(store.keys && store.keys[prov]);
  if (val) return val;

  // Pre-migration fallback: read unmigrated legacy key in config.json without mutating it
  const cfgRes = readJsonDetailed(dataPath('config.json'));
  if (cfgRes.ok && cfgRes.data && cfgRes.data.pets) {
    const cfgProv = normalizeProvider(cfgRes.data.pets.provider || 'gemini');
    if (cfgProv === prov) {
      const legacy = String(cfgRes.data.pets.apiKey || cfgRes.data.pets.geminiApiKey || '').trim();
      if (legacy) return legacy;
    }
  }
  return '';
}

function setApiKey(provider = 'gemini', rawKey = '') {
  if (!userDataDir) return false;
  const prov = normalizeProvider(provider);
  const store = readSecretsStore();
  store.keys = store.keys || {};
  const trimmed = String(rawKey || '').trim();
  if (!trimmed) {
    delete store.keys[prov];
  } else {
    const encoded = encryptSecretValue(trimmed);
    if (encoded) store.keys[prov] = encoded;
  }
  return writeSecretsStoreAtomic(store);
}

function getApiKeyStatus() {
  const status = { gemini: false, openai: false, claude: false };
  if (!userDataDir) return status;
  const store = readSecretsStore();
  for (const p of VALID_PROVIDERS) {
    const entry = store.keys && store.keys[p];
    if (entry && typeof entry.value === 'string' && entry.value.length > 0) {
      status[p] = true;
    }
  }
  const cfgRes = readJsonDetailed(dataPath('config.json'));
  if (cfgRes.ok && cfgRes.data && cfgRes.data.pets) {
    const legacy = String(cfgRes.data.pets.apiKey || cfgRes.data.pets.geminiApiKey || '').trim();
    if (legacy) {
      status[normalizeProvider(cfgRes.data.pets.provider || 'gemini')] = true;
    }
  }
  return status;
}

/* --------------------------------------------------------------------------
 * Legacy Unaccented Auto-Dump Dialogue Cleanup
 * -------------------------------------------------------------------------- */
const LEGACY_DIALOGUE_PATTERNS = {
  idle: [
    /^(?:Chao buoi sang! Luc nay la|Bay gio la|Chieu|Toi|Dong ho diem) \d{1,2}:\d{2}.*hoot!$/,
    /^Hoot hoot\.\.\. code khong bug doi khong ne!$/,
    /^Hom nay .+ da commit code chua day\?$/,
    /^.+ dem khong ngu, canh git cung .+ ca dem\.\.\.$/,
    /^Uong mieng nuoc di .+ oi, giu suc khoe nhe!$/,
    /^Nhin .+ cham cham lam gi\? Code tiep di chu!$/,
  ],
  typing_fast: [
    /^.+ go phim nhu mua roi ay, hoot!$/,
    /^Tay nhanh hon mat roi day .+ oi!$/,
    /^Ban tay vang trong lang go code, hoot!$/,
    /^Chay ban phim roi! .+ dang cham chu nhin day hoot!$/,
  ],
  typing_pause: [
    /^Bi y tuong roi ha .+\? Lam ngum nuoc di!$/,
    /^Dang suy nghi gi ma dung phim the hoot\?$/,
    /^Bug o dong nao a\? De .+ soi phu cho!$/,
    /^Hit tho sau nao, sap tim ra loi thoat roi .+!$/,
  ],
  prompt_ready: [
    /^Prompt da san sang, .+ san sang ho tro, hoot!$/,
    /^Cau hoi rat ro rang, bat dau thuc thi thoi .+!$/,
    /^Goc nhin sac ben day, trien khai luon nao hoot!$/,
  ],
  agent_done: [
    /^Task da hoan thanh xuat sac! Chuc mung .+, hoot!$/,
    /^Code da chay ngon lanh! Commit va an mung thoi!$/,
    /^Tuyet voi! The la bot them duoc 1 bug lon roi!$/,
  ],
  agent_error: [
    /^Hoot! Co loi phat sinh roi, binh tinh xem lai log nao .+!$/,
    /^Bug nho thoi ma, .+ va .+ cung giai quyet nhe!$/,
    /^Kiem tra lai cu phap dong vua roi xem sao hoot!$/,
  ],
  hunger: [
    /^.+ doi bung qua roi, cho .+ xin tach ca phe hay chu sau di .+!$/,
    /^Bung .+ reo roi nay, sen oi thuong .+ chut do an di!$/,
    /^Doi qua mat het nang luong canh code roi hoot\.\.\.$/,
  ],
  petting: [
    /^Gai dung cho ngua duoi cam roi, thich qua .+ oi\.\.\.$/,
    /^Hoot hoot\.\.\. bo long muot ma vuot suong tay chua!$/,
    /^.+ mat tay qua, .+ sap lim di roi day\.\.\.$/,
  ],
  ate_coffee: [
    /^Ca phe dam da! Nang luong cu dem tang 100%, hoot!$/,
    /^Tinh tao han ra! Canh code thau dem nao .+!$/,
    /^Ca phe thom lung, canh .+ dap vui tuoi nhu chong chong!$/,
  ],
  ate_bug: [
    /^Da nuot tron 1 con bug beo ngay! Code sach bong!$/,
    /^Diet sau bo la nghe cua .+! Cam on .+!$/,
    /^Mam mam\.\.\. bug nay thom ngon gion rum, hoot!$/,
  ],
  curious_button: [
    /^Nut nay la gi ta\? .+ bam thu xem sao, hoot!$/,
    /^To mo qua, nut nay bam vao thi co chuyen gi nhi\?$/,
    /^Cho .+ nghich thu nut nay mot chut nhe .+!$/,
  ],
  inspect_code: [
    /^Cach cach cach\.\.\. .+ dang soi tung dong code giup .+!$/,
    /^Hoot! Dong code nay trong rat gon gang va chuan cu phap!$/,
    /^Code sach khong bug, .+ kiem duyet dong y nhe hoot!$/,
  ],
};

function cleanLegacyUnaccentedDialogues(customDialogues) {
  if (!customDialogues || typeof customDialogues !== 'object' || Array.isArray(customDialogues)) {
    return { cleaned: {}, changed: false };
  }
  const cleaned = {};
  let changed = false;
  for (const [catId, list] of Object.entries(customDialogues)) {
    if (!Array.isArray(list) || list.length === 0) {
      changed = true;
      continue;
    }
    const patterns = LEGACY_DIALOGUE_PATTERNS[catId];
    if (patterns && list.every((line) => typeof line === 'string' && patterns.some((re) => re.test(line.trim())))) {
      changed = true;
      continue;
    }
    cleaned[catId] = list;
  }
  return { cleaned, changed };
}

/* --------------------------------------------------------------------------
 * Configuration Loading, Merging, Backup, and Migration
 * -------------------------------------------------------------------------- */
function mergeThemes(defaults, overrides) {
  const out = {};
  const dThemes = defaults || {};
  const uThemes = overrides || {};
  for (const id of new Set([...Object.keys(dThemes), ...Object.keys(uThemes)])) {
    out[id] = { ...(dThemes[id] || {}), ...(uThemes[id] || {}) };
  }
  if (out.pixel16 && Object.prototype.hasOwnProperty.call(out.pixel16, 'scanlines')) {
    delete out.pixel16.scanlines;
  }
  return out;
}

function mergePets(defaults, overrides) {
  const dPets = defaults || {};
  const uPets = overrides || {};
  const dCfg = dPets.config || {};
  const uCfg = uPets.config || {};
  const petConfig = {};
  for (const id of new Set([...Object.keys(dCfg), ...Object.keys(uCfg)])) {
    petConfig[id] = { ...(dCfg[id] || {}), ...(uCfg[id] || {}) };
  }

  const merged = {
    enabled: true,
    activePets: ['pixel_owl'],
    provider: 'gemini',
    petName: 'Hooty',
    petLabel: 'Cú',
    userLabel: 'Sen',
    browserMode: 'floating',
    ...dPets,
    ...uPets,
    config: petConfig,
    customDialogues: { ...(dPets.customDialogues || {}), ...(uPets.customDialogues || {}) },
  };

  delete merged.apiKey;
  delete merged.geminiApiKey;
  delete merged.apiKeys;
  return merged;
}

function sanitizeForSave(cfg) {
  const copy = { ...(cfg || {}) };
  if (copy.themes && typeof copy.themes === 'object') {
    const themesCopy = {};
    for (const [id, tc] of Object.entries(copy.themes)) {
      themesCopy[id] = { ...(tc || {}) };
    }
    if (themesCopy.pixel16 && Object.prototype.hasOwnProperty.call(themesCopy.pixel16, 'scanlines')) {
      delete themesCopy.pixel16.scanlines;
    }
    copy.themes = themesCopy;
  }
  if (copy.pets && typeof copy.pets === 'object') {
    const petsCopy = { ...copy.pets };
    delete petsCopy.apiKey;
    delete petsCopy.geminiApiKey;
    delete petsCopy.apiKeys;
    copy.pets = petsCopy;
  }
  return copy;
}

function loadConfig() {
  const defaults = readJson(runtimePath('config', 'default.config.json'), {});
  const cfgPath = userDataDir ? dataPath('config.json') : '';
  const bakPath = userDataDir ? dataPath('config.json.bak') : '';

  const primaryRes = readJsonDetailed(cfgPath);
  let userCfg = {};
  let loadedFromPrimary = false;

  if (primaryRes.ok) {
    userCfg = primaryRes.data;
    loadedFromPrimary = true;
  } else if (!primaryRes.missing) {
    log('config.json corrupted or unreadable, falling back to config.json.bak:', primaryRes.error?.message || 'parse error');
    const bakRes = readJsonDetailed(bakPath);
    if (bakRes.ok) {
      userCfg = bakRes.data;
    }
  } else if (bakPath) {
    const bakRes = readJsonDetailed(bakPath);
    if (bakRes.ok) {
      userCfg = bakRes.data;
    }
  }

  const mergedPets = mergePets(defaults.pets, userCfg.pets);
  const { cleaned: cleanedDialogues, changed: cleanedChanged } = cleanLegacyUnaccentedDialogues(mergedPets.customDialogues);
  mergedPets.customDialogues = cleanedDialogues;

  const hadObsoleteScanlines = Boolean(
    userCfg.themes && userCfg.themes.pixel16 && Object.prototype.hasOwnProperty.call(userCfg.themes.pixel16, 'scanlines')
  );

  const result = {
    activeTheme: 'default',
    debug: false,
    ...defaults,
    ...userCfg,
    themes: mergeThemes(defaults.themes, userCfg.themes),
    pets: mergedPets,
  };

  if (loadedFromPrimary && userDataDir && (cleanedChanged || hadObsoleteScanlines)) {
    saveConfig(result);
  }

  return result;
}

function saveConfig(cfg) {
  if (!userDataDir) return;
  try {
    selfWriteAt = Date.now();
    fs.mkdirSync(userDataDir, { recursive: true });
    const target = dataPath('config.json');
    const bakTarget = dataPath('config.json.bak');

    const existing = readJsonDetailed(target);
    if (!existing.ok && !existing.missing) {
      try {
        const corruptCopy = dataPath(`config.json.corrupt-${Date.now()}`);
        fs.copyFileSync(target, corruptCopy);
      } catch { /* ignore */ }
    }

    const sanitized = sanitizeForSave(cfg);
    writeJsonFileAtomic(target, sanitized);
    writeJsonFileAtomic(bakTarget, sanitized);
  } catch (err) {
    log('save config failed:', err.message);
  }
}

function migrateAndUpgradeSecrets() {
  if (!userDataDir) return false;
  let store = readSecretsStore();
  let storeChanged = false;
  let stripConfig = false;

  const cfgRes = readJsonDetailed(dataPath('config.json'));
  if (cfgRes.ok && cfgRes.data && cfgRes.data.pets) {
    const pets = cfgRes.data.pets;
    const legacyProv = normalizeProvider(pets.provider || 'gemini');
    const legacyKey = String(pets.apiKey || pets.geminiApiKey || '').trim();
    if (legacyKey) {
      if (!store.keys[legacyProv] || !store.keys[legacyProv].value) {
        const encoded = encryptSecretValue(legacyKey);
        if (encoded) {
          store.keys[legacyProv] = encoded;
          storeChanged = true;
        }
      }
      stripConfig = true;
    }
    if (
      Object.prototype.hasOwnProperty.call(pets, 'apiKey') ||
      Object.prototype.hasOwnProperty.call(pets, 'geminiApiKey') ||
      Object.prototype.hasOwnProperty.call(pets, 'apiKeys')
    ) {
      stripConfig = true;
    }
  }

  const ss = tryGetSafeStorage();
  if (ss && store.keys) {
    for (const [prov, entry] of Object.entries(store.keys)) {
      if (entry && entry.enc === 'plain' && typeof entry.value === 'string' && entry.value.trim()) {
        const upgraded = encryptSecretValue(entry.value.trim());
        if (upgraded && upgraded.enc === 'safeStorage') {
          store.keys[prov] = upgraded;
          storeChanged = true;
        }
      }
    }
  }

  if (storeChanged) {
    writeSecretsStoreAtomic(store);
  }

  if (stripConfig && (!storeChanged || fs.existsSync(dataPath('secrets.json')))) {
    const loaded = loadConfig();
    saveConfig(loaded);
  }

  return storeChanged || stripConfig;
}

function sanitizeStateKey(key) {
  return String(key || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function loadThemeState(key) {
  if (!userDataDir) return null;
  const safeKey = sanitizeStateKey(key);
  if (!safeKey) return null;
  return readJson(dataPath('state', `${safeKey}.json`), null);
}

function saveThemeState(key, data) {
  if (!userDataDir) return false;
  const safeKey = sanitizeStateKey(key);
  if (!safeKey) return false;
  try {
    const stateDir = dataPath('state');
    fs.mkdirSync(stateDir, { recursive: true });
    const target = path.join(stateDir, `${safeKey}.json`);
    writeJsonFileAtomic(target, data || {});
    return true;
  } catch (err) {
    log('save theme state failed:', err.message);
    return false;
  }
}

module.exports = {
  init,
  getRuntimeDir,
  getUserDataDir,
  runtimePath,
  dataPath,
  isDevMode,
  isDebugAllowed,
  getLastSelfWriteAt,
  readJson,
  readText,
  log,
  loadConfig,
  saveConfig,
  loadThemeState,
  saveThemeState,
  getApiKey,
  setApiKey,
  getApiKeyStatus,
  migrateAndUpgradeSecrets,
  cleanLegacyUnaccentedDialogues,
};
