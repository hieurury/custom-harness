'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('harnessInstaller', {
  getTargets: () => ipcRenderer.invoke('test:targets'),
  getStatus: opts => ipcRenderer.invoke('test:status', opts),
  browseAppDir: async () => ({ canceled: true }), closeApp: async () => ({ canceled: true }),
  openDataDir: async () => ({ ok: true }),
  checkForUpdates: async () => ({ ok: true, currentVersion: '1.0.0', latestVersion: '1.0.0', hasUpdate: false, assetAvailable: false }),
  downloadUpdate: async () => ({ ok: false, error: 'Test only' }),
  showDownloadedUpdate: async () => ({ ok: false, error: 'Test only' }),
  install: opts => ipcRenderer.invoke('test:install', opts),
  uninstall: async () => ({ ok: false, error: 'Test only' }),
});
