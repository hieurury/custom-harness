'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_REPOSITORY = 'hieurury/custom-harness';
const API_ROOT = 'https://api.github.com';
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

function parseVersion(value) {
  const match = String(value || '').replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return { core: match.slice(1, 4).map(Number), prerelease: match[4] ? match[4].split('.') : null };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new Error('Phiên bản GitHub không hợp lệ.');
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  const count = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < count; i++) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    if (a.prerelease[i] === b.prerelease[i]) continue;
    const an = /^\d+$/.test(a.prerelease[i]);
    const bn = /^\d+$/.test(b.prerelease[i]);
    if (an && bn) return Number(a.prerelease[i]) < Number(b.prerelease[i]) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return a.prerelease[i].localeCompare(b.prerelease[i]);
  }
  return 0;
}

function findReleaseAsset(release, platform, arch) {
  const linuxArch = arch === 'x64' ? 'x86_64' : arch;
  const suffix = platform === 'win32' ? `-${arch}.exe`
    : platform === 'linux' ? `-${linuxArch}.AppImage` : null;
  if (!suffix) return null;
  return (release.assets || []).find(asset => asset.name.endsWith(suffix) && !asset.name.includes('__uninstaller')) || null;
}

function repositoryName(value) {
  const repo = String(value || DEFAULT_REPOSITORY);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('GitHub repository setting is invalid.');
  return repo;
}

async function checkForUpdate({ currentVersion, platform = process.platform, arch = process.arch,
  repository = process.env.CUSTOM_HARNESS_GITHUB_REPOSITORY || DEFAULT_REPOSITORY,
  fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('This runtime does not support secure HTTPS requests.');
  const repo = repositoryName(repository);
  const response = await fetchImpl(`${API_ROOT}/repos/${repo}/releases?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Custom-Harness-Installer' },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) throw new Error('Không đọc được Releases. Repo có thể đang private hoặc chưa có bản phát hành công khai.');
  if (response.status === 403) throw new Error('GitHub đang giới hạn yêu cầu. Hãy thử kiểm tra lại sau.');
  if (!response.ok) throw new Error(`GitHub trả về lỗi HTTP ${response.status}.`);
  const releases = await response.json();
  if (!Array.isArray(releases)) throw new Error('GitHub trả về danh sách release không hợp lệ.');
  const release = releases
    .filter(item => !item.draft && !item.prerelease && parseVersion(item.tag_name))
    .sort((a, b) => Date.parse(b.published_at || b.created_at || 0) - Date.parse(a.published_at || a.created_at || 0))[0];
  if (!release) return { currentVersion, latestVersion: null, hasUpdate: false, assetAvailable: false };
  const latestVersion = String(release.tag_name).replace(/^v/i, '');
  const asset = findReleaseAsset(release, platform, arch);
  return {
    currentVersion,
    latestVersion,
    tagName: release.tag_name,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    assetAvailable: Boolean(asset),
    assetName: asset?.name || null,
    assetId: asset?.id || null,
    assetUrl: asset?.browser_download_url || null,
    releaseUrl: release.html_url || null,
    repository: repo,
  };
}

async function downloadUpdate({ update, downloadDir, fetchImpl = globalThis.fetch } = {}) {
  if (!update?.hasUpdate || !update.assetAvailable || !update.assetUrl) throw new Error('Không có bộ cài mới phù hợp để tải.');
  const assetUrl = new URL(update.assetUrl);
  if (assetUrl.protocol !== 'https:' || assetUrl.hostname !== 'github.com') throw new Error('Địa chỉ tải bản cập nhật không an toàn.');
  const tagName = String(update.tagName || `v${update.latestVersion}`);
  if (!/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/i.test(tagName)) throw new Error('GitHub release tag is invalid.');
  const release = await fetchImpl(`${API_ROOT}/repos/${repositoryName(update.repository)}/releases/tags/${encodeURIComponent(tagName)}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Custom-Harness-Installer' },
    signal: AbortSignal.timeout(20000),
  });
  if (!release.ok) throw new Error(`Không thể xác minh bản phát hành (HTTP ${release.status}).`);
  const releaseData = await release.json();
  const checksumAsset = (releaseData.assets || []).find(item => item.name === 'SHA256SUMS.txt');
  const expectedAsset = (releaseData.assets || []).find(item => item.name === update.assetName);
  if (!checksumAsset || !expectedAsset) throw new Error('Bản phát hành thiếu file cài đặt hoặc SHA256SUMS.txt.');
  const checksumResponse = await fetchImpl(checksumAsset.browser_download_url, {
    headers: { 'User-Agent': 'Custom-Harness-Installer' }, signal: AbortSignal.timeout(30000),
  });
  if (!checksumResponse.ok) throw new Error('Không tải được SHA256SUMS.txt để xác minh.');
  const checksumText = await checksumResponse.text();
  const checksum = checksumText.split(/\r?\n/).map(line => line.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i))
    .find(match => match && match[2] === update.assetName)?.[1]?.toLowerCase();
  if (!checksum) throw new Error('Không tìm thấy checksum cho bộ cài trong SHA256SUMS.txt.');

  const response = await fetchImpl(expectedAsset.browser_download_url, {
    headers: { 'User-Agent': 'Custom-Harness-Installer' }, signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  if (!response.ok) throw new Error(`Không tải được bộ cài (HTTP ${response.status}).`);
  const finalHost = new URL(response.url || expectedAsset.browser_download_url).hostname;
  if (!ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) throw new Error('GitHub chuyển hướng đến máy chủ tải không được hỗ trợ.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 500 * 1024 * 1024) throw new Error('Kích thước bộ cài tải xuống không hợp lệ.');
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== checksum) throw new Error('Checksum không khớp; file tải xuống đã bị từ chối.');

  fs.mkdirSync(downloadDir, { recursive: true });
  const safeName = path.basename(update.assetName);
  if (!/^[A-Za-z0-9._-]+$/.test(safeName)) throw new Error('Tên bộ cài tải xuống không hợp lệ.');
  let destination = path.join(downloadDir, safeName);
  if (fs.existsSync(destination)) destination = path.join(downloadDir, `${path.parse(safeName).name}-${Date.now()}${path.extname(safeName)}`);
  const temporary = `${destination}.part-${process.pid}`;
  try {
    const mode = safeName.endsWith('.AppImage') ? 0o700 : 0o600;
    fs.writeFileSync(temporary, bytes, { flag: 'wx', mode });
    fs.renameSync(temporary, destination);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch { /* best-effort temporary-file cleanup */ }
    throw error;
  }
  return { filePath: destination, fileName: path.basename(destination) };
}

module.exports = { DEFAULT_REPOSITORY, compareVersions, findReleaseAsset, checkForUpdate, downloadUpdate };
