'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harnessInstaller', {
  getTargets: () => ipcRenderer.invoke('installer:targets'),
  getStatus: (opts) => ipcRenderer.invoke('installer:status', opts),
  browseAppDir: (targetId) => ipcRenderer.invoke('installer:browse-app-dir', targetId),
  closeApp: (targetId) => ipcRenderer.invoke('installer:close-app', targetId),
  install: (opts) => ipcRenderer.invoke('installer:install', opts),
  uninstall: (opts) => ipcRenderer.invoke('installer:uninstall', opts),
  openDataDir: (targetId) => ipcRenderer.invoke('installer:open-data-dir', targetId),
  checkForUpdates: () => ipcRenderer.invoke('installer:check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('installer:download-update'),
  showDownloadedUpdate: () => ipcRenderer.invoke('installer:show-update'),
});
