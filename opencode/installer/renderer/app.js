'use strict';

const api = window.harnessInstaller;
const $ = id => document.getElementById(id);
const sessions = new Map();
let targets = [];
let activeId = 'opencode';
let busy = false;
let loading = false;
let requestId = 0;
let updateBusy = false;
let updateState = null;

function result(ok, text) {
  $('result-box').className = 'result ' + (ok ? 'ok' : 'err');
  $('result-box').textContent = text;
}
function hideResult() { $('result-box').className = 'result hidden'; }
function setControls() {
  const st = sessions.get(activeId)?.status;
  for (const button of document.querySelectorAll('#target-tabs button, #btn-browse, #btn-refresh, #btn-close-app, #btn-open-data')) button.disabled = busy || loading;
  $('btn-install').disabled = busy || loading || !st?.targetAppDir || !st.writable || st.appRunning || Boolean(st.targetError);
  $('btn-uninstall').disabled = $('btn-install').disabled || st?.asarState === 'original';
  $('apply-options').disabled = busy || loading;
  $('options-fields').disabled = busy || loading || !$('apply-options').checked;
  $('chk-purge').disabled = busy || loading;
  $('btn-check-update').disabled = updateBusy;
  $('btn-download-update').disabled = updateBusy || !updateState?.hasUpdate || !updateState?.assetAvailable;
}
function choices(select, values, value) {
  select.replaceChildren(...values.map(c => {
    const option = document.createElement('option');
    option.value = JSON.stringify(c.value);
    option.textContent = c.label;
    return option;
  }));
  select.value = JSON.stringify(value);
  if (select.selectedIndex < 0) select.selectedIndex = 0;
}
function renderThemeOptions() {
  const session = sessions.get(activeId);
  const theme = session.status.options.themes.find(t => t.id === session.draft.activeTheme);
  $('theme-options').replaceChildren();
  for (const option of theme?.options || []) {
    let values;
    if (option.type === 'palette') values = option.palettes.map(p => ({ value: p.id, label: p.name }));
    else if (option.type === 'font') values = option.choices.map(id => ({ value: id, label: session.status.options.fonts.find(f => f.id === id)?.name || (id === 'system' ? 'Font hệ thống' : id) }));
    else if (option.type === 'segmented') values = option.choices;
    else if (option.type === 'toggle') values = [{ value: true, label: 'Bật' }, { value: false, label: 'Tắt' }];
    else continue;
    const label = document.createElement('label'); label.className = 'option-field'; label.textContent = option.label;
    const select = document.createElement('select'); select.dataset.optionId = option.id;
    const current = session.draft.themes[theme.id]?.[option.id] ?? option.default;
    // Preserve custom/saved values not editable here until explicitly changed.
    if (!values.some(c => c.value === current)) values = [{ value: current, label: 'Giữ giá trị hiện tại' }, ...values];
    choices(select, values, current);
    select.addEventListener('change', () => {
      session.draft.themes[theme.id] ||= {};
      session.draft.themes[theme.id][option.id] = JSON.parse(select.value);
      session.changed.add(`${theme.id}:${option.id}`);
    });
    label.append(select); $('theme-options').append(label);
  }
}
function renderOptions() {
  const s = sessions.get(activeId);
  $('apply-options').checked = s.apply;
  choices($('theme-select'), s.status.options.themes.map(t => ({ value: t.id, label: t.name })), s.draft.activeTheme);
  renderThemeOptions();
  $('pets-enabled').checked = s.draft.petsEnabled;
  $('pet-options').replaceChildren(...s.status.options.pets.map(p => {
    const label = document.createElement('label'); label.className = 'checkbox-row';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = s.draft.activePets.includes(p.id);
    input.disabled = !s.draft.petsEnabled;
    input.addEventListener('change', () => {
      s.draft.activePets = s.draft.activePets.filter(id => id !== p.id);
      if (input.checked) s.draft.activePets.push(p.id);
    });
    label.append(input, document.createTextNode(p.name)); return label;
  }));
  setControls();
}
function renderStatus(st, reset = false) {
  let session = sessions.get(st.targetId);
  if (!session || reset) {
    session = { status: st, draft: structuredClone(st.options.selected), apply: !st.options.configExists, changed: new Set(), purge: false };
    sessions.set(st.targetId, session);
  } else session.status = st;
  if (st.targetId !== activeId) return;
  $('app-dir').value = st.targetAppDir || '';
  $('app-dir').placeholder = `Chưa tìm thấy thư mục ${st.targetName}...`;
  $('app-label').textContent = `Ứng dụng ${st.targetName}`;
  $('harness-version').textContent = st.harnessVersion ? `v${st.harnessVersion}` : '';
  $('harness-version').classList.toggle('hidden', !st.harnessVersion);
  const installed = st.asarState === 'patched';
  $('status-pill').className = 'pill ' + (installed ? 'pill-ok' : 'pill-neutral');
  $('status-pill').textContent = st.targetError ? 'Sai ứng dụng' : !st.targetAppDir ? 'Chưa tìm thấy' : installed ? 'Đã cài đặt' : st.asarState === 'original' ? 'Chưa cài đặt' : 'Cần kiểm tra';
  $('meta-line').textContent = st.targetError || (st.targetAppDir ? `${st.targetName} ${st.appVersion || '?'} · ${st.asarState}` : `Chọn thư mục ${st.targetName} hoặc bấm Quét lại.`);
  $('running-title').textContent = `${st.targetName} đang mở`;
  $('running-banner').classList.toggle('hidden', !st.appRunning);
  $('perm-banner').classList.toggle('hidden', !st.targetAppDir || st.writable || Boolean(st.targetError));
  $('entry-hint').textContent = st.targetId === 'opencode' ? 'Menu OpenCode → Harness · Ctrl+Shift+H' : 'Thanh tiêu đề → Harness · Ctrl+Shift+H';
  $('chk-purge').checked = session.purge;
  renderOptions();
}
async function refresh({ scan = false, reset = false } = {}) {
  const id = activeId;
  const token = ++requestId;
  loading = true; setControls();
  try {
    const st = await api.getStatus({ targetId: id, appDir: scan ? undefined : sessions.get(id)?.status.targetAppDir });
    if (token === requestId) renderStatus(st, reset);
  } catch (e) { if (token === requestId) result(false, `Không kiểm tra được harness: ${e.message}`); }
  finally { if (token === requestId) { loading = false; setControls(); } }
}
async function selectTarget(id) {
  if (busy) return;
  activeId = id; hideResult();
  for (const button of $('target-tabs').children) {
    button.setAttribute('aria-selected', String(button.dataset.id === id));
    button.tabIndex = button.dataset.id === id ? 0 : -1;
  }
  $('target-panel').setAttribute('aria-labelledby', `tab-${id}`);
  if (sessions.has(id)) renderStatus(sessions.get(id).status);
  await refresh();
}
async function act(action) {
  const s = sessions.get(activeId);
  if (busy || loading || !s?.status.targetAppDir) return;
  if (action === 'uninstall' && !window.confirm(`Gỡ Harness khỏi ${s.status.targetName}?${s.purge ? ' Cấu hình cá nhân và API key cũng sẽ bị xóa.' : ' Cấu hình và API key sẽ được giữ lại.'}`)) return;
  busy = true; hideResult(); setControls();
  try {
    const theme = s.status.options.themes.find(t => t.id === s.draft.activeTheme);
    const themeOptions = {};
    for (const option of theme?.options || []) {
      if (s.changed.has(`${theme.id}:${option.id}`)) themeOptions[option.id] = s.draft.themes[theme.id][option.id];
    }
    const res = await api[action]({ targetId: activeId, appDir: s.status.targetAppDir, purge: s.purge, applyOptions: s.apply,
      options: { activeTheme: s.draft.activeTheme, petsEnabled: s.draft.petsEnabled, activePets: s.draft.activePets, themeOptions } });
    if (!res.ok) throw new Error(res.error);
    renderStatus(res.status, true);
    result(true, action === 'install'
      ? `Đã cài Harness cho ${res.status.targetName}. ${s.apply ? 'Đã áp dụng lựa chọn.' : 'Đã giữ nguyên cấu hình cá nhân và API key.'} Mở lại ứng dụng. ${activeId === 'opencode' ? 'Vào menu OpenCode → Harness' : 'Bấm Harness trên thanh tiêu đề'} hoặc nhấn Ctrl+Shift+H.`
      : `Đã khôi phục ${res.status.targetName} về bản gốc. ${s.purge ? 'Đã xóa cấu hình cá nhân.' : 'Đã giữ cấu hình và API key.'}`);
  } catch (e) { await refresh(); result(false, `Thao tác thất bại: ${e.message}`); }
  finally { busy = false; setControls(); }
}
$('btn-refresh').addEventListener('click', () => { hideResult(); refresh({ scan: true }); });
$('btn-browse').addEventListener('click', async () => {
  if (busy || loading) return;
  loading = true; setControls(); hideResult();
  try { const res = await api.browseAppDir(activeId); if (res.error) throw new Error(res.error); if (!res.canceled) renderStatus(res.status); }
  catch (e) { result(false, e.message); }
  finally { loading = false; setControls(); }
});
$('btn-close-app').addEventListener('click', async () => {
  loading = true; setControls();
  try { await api.closeApp(activeId); await refresh(); }
  catch (e) { result(false, e.message); }
  finally { loading = false; setControls(); }
});
$('apply-options').addEventListener('change', () => { sessions.get(activeId).apply = $('apply-options').checked; setControls(); });
$('theme-select').addEventListener('change', () => { sessions.get(activeId).draft.activeTheme = JSON.parse($('theme-select').value); renderThemeOptions(); });
$('pets-enabled').addEventListener('change', () => { sessions.get(activeId).draft.petsEnabled = $('pets-enabled').checked; renderOptions(); });
$('chk-purge').addEventListener('change', () => { sessions.get(activeId).purge = $('chk-purge').checked; });
$('btn-install').addEventListener('click', () => act('install'));
$('btn-uninstall').addEventListener('click', () => act('uninstall'));
$('btn-open-data').addEventListener('click', async () => { try { const res = await api.openDataDir(activeId); if (!res.ok) result(false, res.error); } catch (e) { result(false, e.message); } });
$('btn-check-update').addEventListener('click', () => checkUpdates());
$('btn-download-update').addEventListener('click', async () => {
  if (updateBusy) return;
  updateBusy = true; setControls(); $('update-note').textContent = 'Đang tải và xác minh checksum...';
  try {
    const res = await api.downloadUpdate();
    if (!res.ok) throw new Error(res.error);
    $('update-note').textContent = `Đã tải ${res.fileName}. Hãy mở file khi bạn sẵn sàng cập nhật.`;
    $('btn-show-update').classList.remove('hidden');
    updateState = { ...updateState, hasUpdate: false };
  } catch (e) { $('update-note').textContent = `Không tải được bản cập nhật: ${e.message}`; }
  finally { updateBusy = false; setControls(); }
});
$('btn-show-update').addEventListener('click', async () => {
  const res = await api.showDownloadedUpdate();
  if (!res.ok) $('update-note').textContent = res.error;
});
async function checkUpdates() {
  if (updateBusy) return;
  updateBusy = true; updateState = null; setControls();
  $('update-note').textContent = 'Đang kiểm tra GitHub Releases...';
  $('update-version').classList.add('hidden');
  $('btn-show-update').classList.add('hidden');
  try {
    const res = await api.checkForUpdates();
    if (!res.ok) throw new Error(res.error);
    updateState = res;
    if (!res.latestVersion) $('update-note').textContent = 'Chưa có bản phát hành ổn định.';
    else if (!res.hasUpdate) $('update-note').textContent = `Bạn đang dùng phiên bản mới nhất (v${res.currentVersion}).`;
    else {
      $('update-version').textContent = `v${res.latestVersion}`;
      $('update-version').classList.remove('hidden');
      $('update-note').textContent = res.assetAvailable
        ? 'Có bản cập nhật mới. Tải xuống khi bạn sẵn sàng.'
        : 'Có bản cập nhật, nhưng chưa có gói dành cho hệ điều hành này.';
    }
  } catch (e) {
    $('update-note').textContent = `Không kiểm tra được: ${e.message}`;
  } finally { updateBusy = false; setControls(); }
}
(async () => {
  try {
    targets = await api.getTargets();
    for (const target of targets) {
      const button = document.createElement('button'); button.type = 'button'; button.id = `tab-${target.id}`; button.dataset.id = target.id;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'target-panel'); button.textContent = target.name;
      button.addEventListener('click', () => selectTarget(target.id));
      button.addEventListener('keydown', e => {
        const index = targets.findIndex(t => t.id === activeId);
        const next = e.key === 'ArrowRight' ? (index + 1) % targets.length : e.key === 'ArrowLeft' ? (index + targets.length - 1) % targets.length : e.key === 'Home' ? 0 : e.key === 'End' ? targets.length - 1 : -1;
        if (next >= 0 && !busy && !loading) { e.preventDefault(); $('target-tabs').children[next].focus(); selectTarget(targets[next].id); }
      });
      $('target-tabs').append(button);
    }
    await selectTarget(activeId);
    checkUpdates();
  } catch (e) { result(false, `Không khởi tạo được bộ cài: ${e.message}`); }
})();
