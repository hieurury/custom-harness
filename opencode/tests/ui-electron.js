'use strict';
// Run with: installer/node_modules/.bin/electron tests/ui-electron.js
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { createCatalog, readOptions } = require('../installer/catalog.js');
let recorded;
app.whenReady().then(async () => {
  let win;
  try {
    const targets = createCatalog();
    const states = new Map(targets.map(t => [t.id, {
      targetId: t.id, targetName: t.name, targetAppDir: `/test/${t.name}`,
      asarState: 'original', appVersion: 'test', harnessVersion: '1.0.0', writable: true, appRunning: false,
      options: { ...readOptions(t), configExists: t.id === 'opencode' },
    }]));
    ipcMain.handle('test:targets', () => targets.map(({ id, name }) => ({ id, name })));
    ipcMain.handle('test:status', (_e, { targetId }) => states.get(targetId));
    ipcMain.handle('test:install', (_e, opts) => { recorded = opts; return { ok: true, status: { ...states.get(opts.targetId), asarState: 'patched' } }; });
    win = new BrowserWindow({ show: false, width: 850, height: 1050, webPreferences: { preload: path.join(__dirname, 'ui-preload.js'), sandbox: false, contextIsolation: true } });
    const errors = [];
    win.webContents.on('preload-error', (_e, file, error) => console.error(file, error.stack));
    win.webContents.on('console-message', (_e, level, text) => { if (level >= 3) { errors.push(text); console.error('Renderer:', text); } });
    await win.loadFile(path.resolve(__dirname, '../installer/renderer/index.html'));
    const evaluate = code => win.webContents.executeJavaScript(code);
    // Resolve after IPC-driven DOM updates, rather than sleeping.
    const settled = () => evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    await evaluate(`new Promise(resolve => {const check=()=>document.querySelectorAll('[role=tab]').length===2 || !document.getElementById('result-box').classList.contains('hidden');if(check())return resolve();const observer=new MutationObserver(()=>{if(check()){observer.disconnect();resolve();}});observer.observe(document.body,{childList:true,subtree:true,attributes:true});})`);
    console.log(await evaluate(`document.getElementById('result-box').textContent`));
    assert.equal(await evaluate(`document.querySelectorAll('[role=tab]').length`), 2);
    assert.equal(await evaluate(`document.getElementById('apply-options').checked`), false);
    await evaluate(`document.getElementById('apply-options').click(); document.getElementById('theme-select').value = JSON.stringify('primeval_forest'); document.getElementById('theme-select').dispatchEvent(new Event('change')); document.getElementById('chk-purge').click(); document.getElementById('tab-antigravity').click();`);
    await settled();
    assert.equal(await evaluate(`document.getElementById('chk-purge').checked`), false);
    assert.equal(await evaluate(`document.getElementById('apply-options').checked`), true);
    await evaluate(`document.getElementById('tab-opencode').click()`); await settled();
    assert.equal(await evaluate(`JSON.parse(document.getElementById('theme-select').value)`), 'primeval_forest');
    assert.equal(await evaluate(`document.getElementById('chk-purge').checked`), true);
    assert.equal(await evaluate(`document.querySelectorAll('#theme-options select').length`), 5);
    await evaluate(`const s=document.querySelector('[data-option-id=weather]');s.value=JSON.stringify('light_rain');s.dispatchEvent(new Event('change'));document.getElementById('btn-install').click();`);
    await settled();
    assert.equal(recorded.targetId, 'opencode');
    assert.equal(recorded.options.activeTheme, 'primeval_forest');
    assert.equal(recorded.options.themeOptions.weather, 'light_rain');
    fs.mkdirSync('/tmp/opencode/harness-ui-qa', { recursive: true });
    fs.writeFileSync('/tmp/opencode/harness-ui-qa/installer.png', (await win.webContents.capturePage()).toPNG());
    assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);

    // Execute the actual menu integration block against the real 2.x portal shape.
    const ui = fs.readFileSync(path.resolve(__dirname, '../runtime/core/ui/harness-ui.js'), 'utf8');
    const block = ui.slice(ui.indexOf('  function mountButton()'), ui.indexOf('\n  const onKey ='));
    await evaluate(`document.body.innerHTML='<button id="outside">App menu</button>'; window.__testToggles=0; window.__testCleanup=null;
      (()=>{const navBtn=()=>document.getElementById('hx-navbtn'); const publishDefaultRegions=()=>{}; const toggle=()=>window.__testToggles++; ${block}
      window.__testCleanup=()=>{menuObserver.disconnect();clearInterval(mountTimer);menuListenerCleanup?.();navBtn()?.remove();};})();`);
    assert.equal(await evaluate(`Boolean(document.getElementById('hx-navbtn'))`), false);
    await evaluate(`const menu=document.createElement('div');menu.className='desktop-app-menu';menu.setAttribute('role','menu');menu.innerHTML='<button role="menuitem" id="first">File</button><button role="menuitem" id="last">Help</button>';menu.addEventListener('keydown',e=>{if(e.key==='Escape')menu.remove()});document.body.append(menu);`);
    await settled();
    assert.equal(await evaluate(`document.querySelectorAll('.desktop-app-menu #hx-navbtn').length`), 1);
    assert.equal(await evaluate(`document.getElementById('hx-navbtn').textContent`), 'Harness');
    assert.equal(await evaluate(`document.getElementById('hx-navbtn').getAttribute('aria-keyshortcuts')`), 'Control+Shift+H');
    await evaluate(`document.getElementById('last').focus();document.getElementById('last').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));`);
    assert.equal(await evaluate(`document.activeElement.id`), 'hx-navbtn');
    await evaluate(`document.getElementById('hx-navbtn').click()`); await settled();
    assert.equal(await evaluate(`window.__testToggles`), 1);
    assert.equal(await evaluate(`Boolean(document.querySelector('.desktop-app-menu'))`), false);
    await evaluate(`(()=>{const menu=document.createElement('div');menu.className='desktop-app-menu';document.body.append(menu);})()`); await settled();
    assert.equal(await evaluate(`document.querySelectorAll('#hx-navbtn').length`), 1);
    await evaluate(`window.__testCleanup()`);
    assert.equal(await evaluate(`Boolean(document.getElementById('hx-navbtn'))`), false);
    assert.deepEqual(errors, []);
    console.log('PASS: installer tabs/options/isolation/install IPC; menu mount/reopen/keyboard/cleanup; no overflow or renderer errors');
    console.log('Screenshot: /tmp/opencode/harness-ui-qa/installer.png');
    app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
});
