'use strict';
// Registered as an extra session preload: never replaces OpenCode's own preload.
const { contextBridge, ipcRenderer } = require('electron');
try {
  const api = {
    // Theme APIs
    getState: () => ipcRenderer.invoke('hx:get-state'),
    setActiveTheme: (id) => ipcRenderer.invoke('hx:set-active-theme', id),
    setThemeConfig: (id, patch) => ipcRenderer.invoke('hx:set-theme-config', id, patch),
    resetTheme: (id) => ipcRenderer.invoke('hx:reset-theme', id),
    getThemeStateData: (id) => ipcRenderer.invoke('hx:get-theme-state', id),
    saveThemeStateData: (id, data) => ipcRenderer.invoke('hx:save-theme-state', id, data),

    // Pet Management APIs
    togglePet: (id, enabled) => ipcRenderer.invoke('hx:pet-toggle', id, enabled),
    setPetConfig: (id, patch) => ipcRenderer.invoke('hx:pet-set-config', id, patch),
    setPetGlobal: (patch) => ipcRenderer.invoke('hx:pet-set-global', patch),

    // Pet AI & Mischief APIs
    getPetDialogue: (id, category, context) => ipcRenderer.invoke('hx:pet-get-dialogue', id, category, context),
    getPromptStealText: (id) => ipcRenderer.invoke('hx:pet-get-prompt-steal', id),
  };
  // Keep the legacy bridge name so the shared Harness UI works unchanged.
  contextBridge.exposeInMainWorld('opencodeHarness', api);
  contextBridge.exposeInMainWorld('antigravityHarness', api);
} catch (err) {
  console.error('[harness] preload bridge failed:', err);
}
