'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');

function resolveDirs() {
  if (app.isPackaged) {
    return {
      runtimeDir: path.join(process.resourcesPath, 'runtime'),
      patcherDir: path.join(process.resourcesPath, 'patcher'),
    };
  }
  return {
    runtimeDir: path.resolve(__dirname, '..', 'runtime'),
    patcherDir: path.resolve(__dirname, '..', 'patcher'),
  };
}

const { runtimeDir, patcherDir } = resolveDirs();
const installEngine = require(path.join(patcherDir, 'install-engine.js'));
const paths = require(path.join(patcherDir, 'paths.js'));

let mainWindow = null;

function isAntigravityRunning() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq Antigravity.exe', '/NH'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return /Antigravity\.exe/i.test(out);
    }
    if (process.platform === 'darwin') {
      const res = spawnSync('pgrep', ['-x', 'Antigravity'], { stdio: 'ignore' });
      return res.status === 0;
    }
    const res = spawnSync('pgrep', ['-x', 'antigravity'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

function closeAntigravityProcesses() {
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/IM', 'Antigravity.exe', '/T', '/F'], { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      spawnSync('pkill', ['-x', 'Antigravity'], { stdio: 'ignore' });
    } else {
      spawnSync('pkill', ['-x', 'antigravity'], { stdio: 'ignore' });
    }
    return { ok: true, running: isAntigravityRunning() };
  } catch (err) {
    return { ok: false, error: err.message, running: isAntigravityRunning() };
  }
}

function canWriteAsar(asarPath) {
  if (!asarPath || !fs.existsSync(asarPath)) return false;
  try {
    fs.accessSync(asarPath, fs.constants.R_OK | fs.constants.W_OK);
    fs.accessSync(path.dirname(asarPath), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function buildStatus(appDir) {
  const status = installEngine.getInstallStatus({ appDir, runtimeSourceDir: runtimeDir });
  return {
    ...status,
    antigravityRunning: isAntigravityRunning(),
    writable: canWriteAsar(status.asarPath),
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 600,
    minWidth: 620,
    minHeight: 540,
    resizable: true,
    title: 'Custom Harness — Trình cài đặt',
    backgroundColor: '#14161e',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('installer:status', (_e, appDir) => buildStatus(appDir));

  ipcMain.handle('installer:browse-app-dir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn thư mục cài đặt Google Antigravity',
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { canceled: true };
    }
    const chosen = res.filePaths[0];
    if (!fs.existsSync(path.join(chosen, 'resources', 'app.asar'))) {
      return {
        canceled: false,
        error: 'Thư mục này không chứa "resources/app.asar". Vui lòng chọn đúng thư mục gốc của Antigravity.',
      };
    }
    return { canceled: false, appDir: chosen, status: buildStatus(chosen) };
  });

  ipcMain.handle('installer:close-antigravity', () => closeAntigravityProcesses());

  ipcMain.handle('installer:install', (_e, opts = {}) => {
    try {
      const result = installEngine.install({
        appDir: opts.appDir || undefined,
        runtimeSourceDir: runtimeDir,
        devMode: false,
      });
      return { ok: true, result, status: buildStatus(result.appDir) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('installer:uninstall', (_e, opts = {}) => {
    try {
      const result = installEngine.uninstall({
        appDir: opts.appDir || undefined,
        purge: Boolean(opts.purge),
      });
      return { ok: true, result, status: buildStatus(result.appDir || opts.appDir) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('installer:open-data-dir', async () => {
    const dir = paths.getUserDataDir();
    fs.mkdirSync(dir, { recursive: true });
    await shell.openPath(dir);
    return { ok: true };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
