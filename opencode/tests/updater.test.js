'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { compareVersions, findReleaseAsset, checkForUpdate, downloadUpdate } = require('../installer/updater.js');

test('compares stable and prerelease versions using semantic ordering', () => {
  assert.equal(compareVersions('v1.2.0', '1.1.9'), 1);
  assert.equal(compareVersions('1.2.0-rc.2', '1.2.0-rc.10'), -1);
  assert.equal(compareVersions('1.2.0', '1.2.0-rc.10'), 1);
  assert.equal(compareVersions('1.2.0', 'v1.2.0'), 0);
  assert.throws(() => compareVersions('latest', '1.0.0'));
});

test('selects a platform installer without selecting an uninstaller', () => {
  const release = { assets: [
    { name: 'Custom-Harness-Setup-1.1.0-win-x64.exe__uninstaller.exe' },
    { name: 'Custom-Harness-Setup-1.1.0-win-x64.exe' },
    { name: 'Custom-Harness-Setup-1.1.0-linux-x86_64.AppImage' },
  ] };
  assert.equal(findReleaseAsset(release, 'win32', 'x64').name, 'Custom-Harness-Setup-1.1.0-win-x64.exe');
  assert.equal(findReleaseAsset(release, 'linux', 'x64').name, 'Custom-Harness-Setup-1.1.0-linux-x86_64.AppImage');
  assert.equal(findReleaseAsset(release, 'darwin', 'arm64'), null);
});

test('checks the latest stable GitHub release and ignores prereleases', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => [
      { tag_name: 'v1.3.0-rc.1', prerelease: true, draft: false, published_at: '2026-11-01T00:00:00Z', assets: [] },
      { tag_name: 'v1.2.0', prerelease: false, draft: false, published_at: '2026-10-01T00:00:00Z',
        html_url: 'https://github.com/hieurury/custom-harness/releases/tag/v1.2.0',
        assets: [{ id: 17, name: 'Custom-Harness-Setup-1.2.0-win-x64.exe', browser_download_url: 'https://github.com/hieurury/custom-harness/releases/download/v1.2.0/setup.exe' }] },
    ],
  });
  const result = await checkForUpdate({ currentVersion: '1.1.0', platform: 'win32', arch: 'x64', fetchImpl });
  assert.equal(result.hasUpdate, true);
  assert.equal(result.latestVersion, '1.2.0');
  assert.equal(result.tagName, 'v1.2.0');
  assert.equal(result.assetAvailable, true);
  assert.equal(result.assetId, 17);
});

test('reports inaccessible private or empty repositories without leaking credentials', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404 });
  await assert.rejects(checkForUpdate({ currentVersion: '1.0.0', fetchImpl }), /private|công khai/);
});

test('downloads only a release asset whose SHA-256 matches the published manifest', async () => {
  const bytes = Buffer.from('fixture installer payload');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const releaseData = { assets: [
    { name: 'SHA256SUMS.txt', browser_download_url: 'https://github.com/hieurury/custom-harness/releases/download/v1.2.0/SHA256SUMS.txt' },
    { name: 'Custom-Harness-Setup-1.2.0-linux-x86_64.AppImage', browser_download_url: 'https://github.com/hieurury/custom-harness/releases/download/v1.2.0/app.AppImage' },
  ] };
  const fetchImpl = async url => {
    if (url.includes('/releases/tags/')) return { ok: true, json: async () => releaseData };
    if (url.endsWith('SHA256SUMS.txt')) return { ok: true, text: async () => `${digest}  ${releaseData.assets[1].name}\n` };
    return { ok: true, url: 'https://objects.githubusercontent.com/file', arrayBuffer: async () => bytes };
  };
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-updater-test-'));
  try {
    const result = await downloadUpdate({
      update: { hasUpdate: true, assetAvailable: true, assetName: releaseData.assets[1].name, assetUrl: releaseData.assets[1].browser_download_url, latestVersion: '1.2.0', tagName: 'v1.2.0', repository: 'hieurury/custom-harness' },
      downloadDir,
      fetchImpl,
    });
    assert.equal(fs.readFileSync(result.filePath).toString(), bytes.toString());
    if (process.platform !== 'win32') assert.equal(fs.statSync(result.filePath).mode & 0o777, 0o700);
  } finally { fs.rmSync(downloadDir, { recursive: true, force: true }); }
});

test('rejects a release asset when its checksum differs', async () => {
  const releaseData = { assets: [
    { name: 'SHA256SUMS.txt', browser_download_url: 'https://github.com/hieurury/custom-harness/releases/download/v1.2.0/SHA256SUMS.txt' },
    { name: 'Custom-Harness-Setup-1.2.0-linux-x86_64.AppImage', browser_download_url: 'https://github.com/hieurury/custom-harness/releases/download/v1.2.0/app.AppImage' },
  ] };
  const fetchImpl = async url => {
    if (url.includes('/releases/tags/')) return { ok: true, json: async () => releaseData };
    if (url.endsWith('SHA256SUMS.txt')) return { ok: true, text: async () => `${'0'.repeat(64)}  ${releaseData.assets[1].name}\n` };
    return { ok: true, url: 'https://objects.githubusercontent.com/file', arrayBuffer: async () => Buffer.from('tampered') };
  };
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-updater-test-'));
  try {
    await assert.rejects(downloadUpdate({
      update: { hasUpdate: true, assetAvailable: true, assetName: releaseData.assets[1].name, assetUrl: releaseData.assets[1].browser_download_url, latestVersion: '1.2.0', tagName: 'v1.2.0', repository: 'hieurury/custom-harness' },
      downloadDir,
      fetchImpl,
    }), /Checksum/);
    assert.deepEqual(fs.readdirSync(downloadDir), []);
  } finally { fs.rmSync(downloadDir, { recursive: true, force: true }); }
});
