'use strict';

const api = window.harnessInstaller;

const elAppDir = document.getElementById('app-dir');
const elHarnessVer = document.getElementById('harness-version');
const elMetaLine = document.getElementById('meta-line');
const elPill = document.getElementById('status-pill');
const elRunningBanner = document.getElementById('running-banner');
const elPermBanner = document.getElementById('perm-banner');
const elResult = document.getElementById('result-box');

const btnRefresh = document.getElementById('btn-refresh');
const btnBrowse = document.getElementById('btn-browse');
const btnCloseApp = document.getElementById('btn-close-app');
const btnInstall = document.getElementById('btn-install');
const btnUninstall = document.getElementById('btn-uninstall');
const btnOpenData = document.getElementById('btn-open-data');
const chkPurge = document.getElementById('chk-purge');

let currentAppDir = null;
let busy = false;

function showResult(ok, html) {
  elResult.className = 'result ' + (ok ? 'ok' : 'err');
  elResult.innerHTML = html;
}

function hideResult() {
  elResult.className = 'result hidden';
  elResult.innerHTML = '';
}

function renderStatus(st) {
  currentAppDir = st.targetAppDir || null;
  elAppDir.value = currentAppDir || '';

  if (elHarnessVer) {
    if (st.harnessVersion) {
      elHarnessVer.textContent = `v${st.harnessVersion}`;
      elHarnessVer.classList.remove('hidden');
    } else {
      elHarnessVer.classList.add('hidden');
    }
  }

  if (!currentAppDir) {
    elPill.className = 'pill pill-warn';
    elPill.textContent = 'Chưa tìm thấy';
    elMetaLine.textContent = 'Không tự động tìm thấy Antigravity. Hãy bấm "Chọn thư mục..." để chỉ định.';
  } else if (st.asarState === 'patched') {
    elPill.className = 'pill pill-ok';
    elPill.textContent = 'Đã cài đặt';
    elMetaLine.textContent = `Phiên bản Antigravity: ${st.appVersion || '?'} • Sẵn sàng sử dụng hoặc cập nhật lại.`;
  } else if (st.asarState === 'legacy-patched') {
    elPill.className = 'pill pill-warn';
    elPill.textContent = 'Bản cũ';
    elMetaLine.textContent = `Phiên bản Antigravity: ${st.appVersion || '?'} • Bấm "Cài đặt / Áp dụng lại" để nâng cấp.`;
  } else if (st.asarState === 'original') {
    elPill.className = 'pill pill-neutral';
    elPill.textContent = 'Chưa cài đặt';
    elMetaLine.textContent = `Phiên bản Antigravity: ${st.appVersion || '?'} • Bản gốc nguyên vẹn.`;
  } else {
    elPill.className = 'pill pill-warn';
    elPill.textContent = 'Lỗi kiểm tra';
    elMetaLine.textContent = st.asarState;
  }

  elRunningBanner.classList.toggle('hidden', !st.antigravityRunning);
  elPermBanner.classList.toggle('hidden', !currentAppDir || st.writable);

  const canAct = !busy && Boolean(currentAppDir) && st.writable;
  btnInstall.disabled = !canAct;
  btnUninstall.disabled = !canAct || st.asarState === 'original';
}

async function refreshStatus(appDir) {
  const st = await api.getStatus(appDir);
  renderStatus(st);
}

btnRefresh.addEventListener('click', () => {
  hideResult();
  refreshStatus(currentAppDir);
});

btnBrowse.addEventListener('click', async () => {
  hideResult();
  const res = await api.browseAppDir();
  if (res.canceled) return;
  if (res.error) {
    showResult(false, `<strong>Không hợp lệ:</strong> ${res.error}`);
    return;
  }
  renderStatus(res.status);
});

btnCloseApp.addEventListener('click', async () => {
  btnCloseApp.disabled = true;
  await api.closeAntigravity();
  setTimeout(async () => {
    await refreshStatus(currentAppDir);
    btnCloseApp.disabled = false;
  }, 600);
});

btnInstall.addEventListener('click', async () => {
  if (busy || !currentAppDir) return;
  busy = true;
  hideResult();
  btnInstall.textContent = 'Đang cài đặt...';
  btnInstall.disabled = true;
  btnUninstall.disabled = true;

  const res = await api.install({ appDir: currentAppDir });
  busy = false;
  btnInstall.textContent = 'Cài đặt / Áp dụng lại';

  if (res.ok) {
    renderStatus(res.status);
    let extraNote = '';
    if (res.result?.preservedConfig) {
      extraNote = ' Toàn bộ cấu hình cá nhân và API key hiện có đã được giữ nguyên.';
    } else if (res.result?.migratedLegacyConfig) {
      extraNote = ' Đã tự động giữ lại và chuyển đổi cấu hình từ phiên bản cũ.';
    }
    showResult(
      true,
      `<strong>Cài đặt thành công!</strong> Hãy mở lại Google Antigravity và nhấn <code>Ctrl + Shift + H</code> (hoặc nút Custom Harness trên thanh tiêu đề) để tùy biến giao diện và các tiện ích mở rộng.${extraNote}`
    );
  } else {
    await refreshStatus(currentAppDir);
    showResult(false, `<strong>Cài đặt thất bại:</strong> ${res.error}`);
  }
});

btnUninstall.addEventListener('click', async () => {
  if (busy || !currentAppDir) return;
  busy = true;
  hideResult();
  btnUninstall.textContent = 'Đang gỡ...';
  btnInstall.disabled = true;
  btnUninstall.disabled = true;

  const res = await api.uninstall({
    appDir: currentAppDir,
    purge: chkPurge.checked,
  });
  busy = false;
  btnUninstall.textContent = 'Gỡ cài đặt (Khôi phục gốc)';

  if (res.ok) {
    renderStatus(res.status);
    showResult(
      true,
      '<strong>Đã gỡ cài đặt và khôi phục bản gốc Antigravity!</strong> Khởi động lại Antigravity để trở về giao diện mặc định.'
    );
  } else {
    await refreshStatus(currentAppDir);
    showResult(false, `<strong>Gỡ cài đặt thất bại:</strong> ${res.error}`);
  }
});

btnOpenData.addEventListener('click', () => api.openDataDir());

refreshStatus();
