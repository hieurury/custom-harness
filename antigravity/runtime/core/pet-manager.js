'use strict';
/*
 * Antigravity Harness — Pet Manager.
 *
 * Scans runtime/pets/*, loads sprite sheets as base64 data URLs,
 * and packages pet-runtime.js + pet-runtime.css for injection into the Hub window.
 * Never exposes API keys to renderer windows.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const petBrain = require('./pet-brain.js');

let cache = null; // { pets: Map(id -> petData), runtimeCss, runtimeJs }

function toBase64DataUrl(file, mime = 'image/png') {
  try {
    const b64 = fs.readFileSync(file).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

function loadPet(id) {
  const dir = config.runtimePath('pets', id);
  const manifest = config.readJson(path.join(dir, 'manifest.json'), null);
  if (!manifest) return null;

  manifest.id = id;
  const persona = config.readJson(path.join(dir, 'persona.json'), {});

  // Encode all animation sprite strips
  const sprites = {};
  for (const [animName, animDef] of Object.entries(manifest.animations || {})) {
    const spriteFile = path.join(dir, animDef.file);
    const dataUrl = toBase64DataUrl(spriteFile, 'image/png');
    if (dataUrl) {
      sprites[animName] = {
        dataUrl,
        frames: animDef.frames || 1,
        fps: animDef.fps || 4,
        loop: animDef.loop !== false,
        desc: animDef.description || '',
      };
    }
  }

  const previewGif =
    toBase64DataUrl(path.join(dir, 'sprites', 'preview.gif'), 'image/gif') ||
    toBase64DataUrl(path.join(dir, 'sprites', 'previews', 'idle.gif'), 'image/gif');

  return {
    id,
    manifest,
    persona,
    sprites,
    previewGif,
  };
}

function scanPets() {
  const pets = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(config.runtimePath('pets'), { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return pets;
  }

  for (const d of entries) {
    const pet = loadPet(d.name);
    if (pet) {
      pets.set(d.name, pet);
    }
  }
  return pets;
}

function ensureCache(force = false) {
  if (cache && !force) return cache;
  cache = {
    pets: scanPets(),
    runtimeCss: config.readText(config.runtimePath('core', 'pet-runtime.css')),
    runtimeJs: config.readText(config.runtimePath('core', 'pet-runtime.js')),
  };
  return cache;
}

function init() {
  // Uses config module paths once config.init() has been called.
}

function getPetState(cfg) {
  const c = ensureCache();
  const petsCfg = (cfg && cfg.pets) || {};
  const activeIds = petsCfg.activePets || [];
  const petConfigMap = petsCfg.config || {};

  const petList = [];
  for (const [id, pet] of c.pets.entries()) {
    const m = pet.manifest;
    const userCfg = petConfigMap[id] || {};
    petList.push({
      id,
      name: m.name || id,
      englishName: m.englishName || id,
      version: m.version || '1.0.0',
      description: m.description || '',
      options: m.options || [],
      defaultScale: m.defaultScale || 2.5,
      config: userCfg,
      isActive: activeIds.includes(id),
      hasSprites: Object.keys(pet.sprites).length > 0,
      previewGif: pet.previewGif || null,
    });
  }

  const keyStatus = config.getApiKeyStatus();
  const provider = petsCfg.provider || 'gemini';

  return {
    enabled: petsCfg.enabled !== false,
    activePets: activeIds,
    provider,
    hasApiKey: Boolean(keyStatus[provider]),
    configuredProviders: keyStatus,
    petName: petsCfg.petName || 'Hooty',
    petLabel: petsCfg.petLabel || 'Cú',
    userLabel: petsCfg.userLabel || 'Sen',
    customDialogues: petsCfg.customDialogues || {},
    defaultDialogues: petBrain.getDefaultDialogues(petsCfg),
    defaultDialogueTemplates: petBrain.getDefaultDialogueTemplates(),
    browserMode: petsCfg.browserMode || 'floating',
    list: petList,
  };
}

function buildPetInjection(cfg) {
  const petsCfg = (cfg && cfg.pets) || {};
  if (petsCfg.enabled === false) {
    return {
      css: '',
      js: 'if (window.__hxPetCleanup) { try { window.__hxPetCleanup(); } catch(e){} }',
    };
  }

  const c = ensureCache();
  const activeIds = petsCfg.activePets || [];
  const petConfigMap = petsCfg.config || {};

  const activePayload = [];
  const seenIds = new Set();
  for (const id of activeIds) {
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    const pet = c.pets.get(id);
    if (!pet) continue;

    const userCfg = petConfigMap[id] || {};
    const scale = Number(userCfg.scale) || pet.manifest.defaultScale || 2.5;

    activePayload.push({
      id: pet.id,
      scale,
      manifest: pet.manifest,
      persona: pet.persona,
      sprites: pet.sprites,
      userConfig: userCfg,
    });
  }

  if (activePayload.length === 0) {
    return {
      css: '',
      js: 'if (window.__hxPetCleanup) { try { window.__hxPetCleanup(); } catch(e){} }',
    };
  }

  const safeGlobalConfig = {
    enabled: petsCfg.enabled !== false,
    activePets: activeIds,
    petName: petsCfg.petName || 'Hooty',
    petLabel: petsCfg.petLabel || 'Cú',
    userLabel: petsCfg.userLabel || 'Sen',
    customDialogues: petsCfg.customDialogues || {},
    browserMode: petsCfg.browserMode || 'floating',
  };

  const bootstrapCode = `
    window.__hxPets = {
      activePets: ${JSON.stringify(activePayload)},
      globalConfig: ${JSON.stringify(safeGlobalConfig)}
    };
    ${c.runtimeJs}
  `;

  return {
    css: c.runtimeCss,
    js: bootstrapCode,
  };
}

module.exports = {
  init,
  ensureCache,
  getPetState,
  buildPetInjection,
};
