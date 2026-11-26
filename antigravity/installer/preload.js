'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harnessInstaller', {
  getStatus: (appDir) => ipcRenderer.invoke('installer:status', appDir),
  browseAppDir: () => ipcRenderer.invoke('installer:browse-app-dir'),
  closeAntigravity: () => ipcRenderer.invoke('installer:close-antigravity'),
  install: (opts) => ipcRenderer.invoke('installer:install', opts),
  uninstall: (opts) => ipcRenderer.invoke('installer:uninstall', opts),
  openDataDir: () => ipcRenderer.invoke('installer:open-data-dir'),
});
