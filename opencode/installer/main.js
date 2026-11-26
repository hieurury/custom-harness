'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { createCatalog, readOptions, validateOptions, applyOptions, purgeOptionBackups, assertTargetApp } = require('./catalog.js');
const { checkForUpdate, downloadUpdate } = require('./updater.js');
const targets = createCatalog({ packaged: app.isPackaged, resourcesPath: process.resourcesPath });
let mainWindow = null;
let latestUpdate = null;
let downloadedUpdate = null;
const targetFor = (id) => {
  const target = targets.find(t => t.id === id);
  if (!target) throw new Error('Harness không được hỗ trợ.');
  return target;
};

function processInfo(target) {
  const name = target.id === 'opencode' ? 'OpenCode' : 'Antigravity';
  const linux = target.id === 'opencode' ? '/ai\\.opencode( |$)' : 'antigravity';
  return { name, linux, exact: target.id !== 'opencode' };
}

function isRunning(target) {
  const p = processInfo(target);
  try {
    if (process.platform === 'win32') {
      return execFileSync('tasklist', ['/FI', `IMAGENAME eq ${p.name}.exe`, '/NH'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).includes(`${p.name}.exe`);
    }
    return spawnSync('pgrep', process.platform === 'darwin' ? ['-x', p.name]
      : [p.exact ? '-x' : '-f', p.linux], { stdio: 'ignore' }).status === 0;
  } catch { return false; }
}

function buildStatus(target, appDir) {
  const status = target.engine.getInstallStatus({ appDir, runtimeSourceDir: target.runtimeDir });
  let writable = false;
  let targetError = '';
  if (status.targetAppDir) {
    try { assertTargetApp(target, status.targetAppDir); } catch (e) { targetError = e.message; }
    try {
      fs.accessSync(status.asarPath, fs.constants.R_OK | fs.constants.W_OK);
      fs.accessSync(path.dirname(status.asarPath), fs.constants.W_OK);
      writable = !targetError;
    } catch { /* protected installation */ }
  }
  return { ...status, targetId: target.id, targetName: target.name, appRunning: isRunning(target), writable, targetError, options: readOptions(target) };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 850, height: 860, minWidth: 650, minHeight: 600,
    title: 'Custom Harness Installer', backgroundColor: '#14161e',
    autoHideMenuBar: true, icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('installer:targets', () => targets.map(({ id, name }) => ({ id, name })));
  ipcMain.handle('installer:status', (_e, { targetId, appDir } = {}) => buildStatus(targetFor(targetId), appDir));
  ipcMain.handle('installer:browse-app-dir', async (_e, targetId) => {
    try {
      const target = targetFor(targetId);
      const res = await dialog.showOpenDialog(mainWindow, { title: `Chọn thư mục cài đặt ${target.name}`, properties: ['openDirectory'] });
      if (res.canceled || !res.filePaths?.length) return { canceled: true };
      assertTargetApp(target, res.filePaths[0]);
      return { canceled: false, status: buildStatus(target, res.filePaths[0]) };
    } catch (e) { return { error: e.message }; }
  });
  ipcMain.handle('installer:close-app', async (_e, targetId) => {
    const target = targetFor(targetId);
    const confirmation = await dialog.showMessageBox(mainWindow, {
      type: 'warning', buttons: ['Hủy', `Đóng ${target.name}`], defaultId: 0, cancelId: 0,
      message: `Đóng ${target.name}?`, detail: 'Hãy lưu công việc trước khi tiếp tục. Chỉ ứng dụng trong tab này sẽ được đóng.',
    });
    if (confirmation.response !== 1) return { canceled: true };
    const p = processInfo(target);
    if (process.platform === 'win32') spawnSync('taskkill', ['/IM', `${p.name}.exe`, '/T'], { stdio: 'ignore' });
    else spawnSync('pkill', process.platform === 'darwin' ? ['-x', p.name] : [p.exact ? '-x' : '-f', p.linux], { stdio: 'ignore' });
    return { running: isRunning(target) };
  });
  ipcMain.handle('installer:install', (_e, opts = {}) => {
    try {
      const target = targetFor(opts.targetId);
      const before = buildStatus(target, opts.appDir);
      if (!before.targetAppDir) throw new Error(`Chưa tìm thấy ${target.name}.`);
      if (before.targetError) throw new Error(before.targetError);
      if (before.appRunning) throw new Error(`Hãy đóng ${target.name} trước khi cài đặt.`);
      if (opts.applyOptions) validateOptions(target, opts.options || {});
      const result = target.engine.install({ appDir: before.targetAppDir, runtimeSourceDir: target.runtimeDir, devMode: false });
      if (opts.applyOptions) applyOptions(target, opts.options);
      return { ok: true, result, status: buildStatus(target, result.appDir) };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('installer:uninstall', (_e, opts = {}) => {
    try {
      const target = targetFor(opts.targetId);
      const before = buildStatus(target, opts.appDir);
      if (!before.targetAppDir || before.targetError) throw new Error(before.targetError || 'Chưa chọn thư mục ứng dụng.');
      if (before.appRunning) throw new Error(`Hãy đóng ${target.name} trước khi gỡ cài đặt.`);
      const result = target.engine.uninstall({ appDir: before.targetAppDir, purge: Boolean(opts.purge) });
      if (opts.purge) purgeOptionBackups(target);
      return { ok: true, result, status: buildStatus(target, result.appDir) };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('installer:open-data-dir', async (_e, targetId) => {
    const dir = targetFor(targetId).paths.getUserDataDir();
    fs.mkdirSync(dir, { recursive: true });
    const error = await shell.openPath(dir);
    return { ok: !error, error };
  });
  ipcMain.handle('installer:check-updates', async () => {
    try {
      latestUpdate = await checkForUpdate({ currentVersion: app.getVersion() });
      return { ok: true, ...latestUpdate };
    } catch (error) {
      latestUpdate = null;
      return { ok: false, error: error.message };
    }
  });
  ipcMain.handle('installer:download-update', async () => {
    try {
      if (!latestUpdate) latestUpdate = await checkForUpdate({ currentVersion: app.getVersion() });
      const result = await downloadUpdate({ update: latestUpdate, downloadDir: app.getPath('downloads') });
      downloadedUpdate = result.filePath;
      return { ok: true, fileName: result.fileName };
    } catch (error) { return { ok: false, error: error.message }; }
  });
  ipcMain.handle('installer:show-update', () => {
    if (!downloadedUpdate || !fs.existsSync(downloadedUpdate)) return { ok: false, error: 'Chưa có file cập nhật đã tải.' };
    shell.showItemInFolder(downloadedUpdate);
    return { ok: true };
  });
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
