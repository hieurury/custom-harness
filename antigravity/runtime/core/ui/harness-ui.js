(() => {
  'use strict';
  if (window.__hxUiCleanup) { try { window.__hxUiCleanup(); } catch (e) { /* ignore */ } }

  const api = window.antigravityHarness;
  const ICONS = {
    theme: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="1" y="2" width="14" height="2"/><rect x="1" y="13" width="14" height="2"/><rect x="1" y="4" width="2" height="9"/><rect x="13" y="4" width="2" height="9"/><rect x="3" y="6" width="10" height="2"/><rect x="6" y="8" width="2" height="5"/></svg>',
    pet: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="3" y="2" width="3" height="3"/><rect x="10" y="2" width="3" height="3"/><rect x="2" y="6" width="12" height="7"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="3" y="3" width="2" height="2"/><rect x="5" y="5" width="2" height="2"/><rect x="7" y="7" width="2" height="2"/><rect x="9" y="9" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="5" y="9" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/></svg>',
    palette: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="4" y="2" width="8" height="2"/><rect x="2" y="4" width="2" height="8"/><rect x="12" y="4" width="2" height="4"/><rect x="4" y="12" width="6" height="2"/><rect x="9" y="8" width="5" height="2"/><rect x="9" y="10" width="2" height="3"/><rect x="5" y="5" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="5" y="9" width="2" height="2"/></svg>',
    sparkles: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="6" y="1" width="2" height="12"/><rect x="1" y="6" width="12" height="2"/><rect x="4" y="4" width="6" height="6"/><rect x="12" y="10" width="2" height="5"/><rect x="10" y="12" width="5" height="2"/></svg>',
    shield: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="2"/><rect x="2" y="4" width="2" height="6"/><rect x="12" y="4" width="2" height="6"/><rect x="4" y="10" width="2" height="2"/><rect x="10" y="10" width="2" height="2"/><rect x="6" y="12" width="4" height="2"/><rect x="5" y="7" width="2" height="2"/><rect x="7" y="8" width="2" height="2"/><rect x="9" y="5" width="2" height="3"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="4" y="2" width="2" height="12"/><rect x="6" y="3" width="2" height="10"/><rect x="8" y="4" width="2" height="8"/><rect x="10" y="6" width="2" height="4"/><rect x="12" y="7" width="1" height="2"/></svg>',
    info: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="3" y="2" width="10" height="2"/><rect x="3" y="12" width="10" height="2"/><rect x="2" y="4" width="2" height="8"/><rect x="12" y="4" width="2" height="8"/><rect x="7" y="5" width="2" height="2"/><rect x="7" y="8" width="2" height="3"/></svg>',
    brand: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="7" y="1" width="2" height="14" fill="#eef4ff"/><rect x="4" y="3" width="2" height="6" fill="#d5dae4"/><rect x="3" y="8" width="2" height="4" fill="#d5dae4"/><rect x="2" y="11" width="2" height="2" fill="#d5dae4"/><rect x="10" y="3" width="2" height="2" fill="#38e8ff"/><rect x="10" y="5" width="2" height="3" fill="#5e8bff"/><rect x="11" y="8" width="2" height="3" fill="#34d399"/><rect x="12" y="11" width="2" height="2" fill="#fbbf24"/></svg>',
    compass: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="3" y="2" width="10" height="2"/><rect x="3" y="12" width="10" height="2"/><rect x="2" y="4" width="2" height="8"/><rect x="12" y="4" width="2" height="8"/><rect x="9" y="5" width="2" height="2"/><rect x="7" y="7" width="2" height="2"/><rect x="5" y="9" width="2" height="2"/><rect x="7" y="5" width="2" height="2"/><rect x="7" y="9" width="2" height="2"/></svg>',
    sliders: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="2" y="3" width="12" height="2"/><rect x="4" y="2" width="3" height="4"/><rect x="2" y="7" width="12" height="2"/><rect x="9" y="6" width="3" height="4"/><rect x="2" y="11" width="12" height="2"/><rect x="5" y="10" width="3" height="4"/></svg>',
    prev: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="7" y="3" width="2" height="2"/><rect x="5" y="5" width="2" height="2"/><rect x="3" y="7" width="10" height="2"/><rect x="5" y="9" width="2" height="2"/><rect x="7" y="11" width="2" height="2"/></svg>',
    next: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="7" y="3" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="3" y="7" width="10" height="2"/><rect x="9" y="9" width="2" height="2"/><rect x="7" y="11" width="2" height="2"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges"><rect x="11" y="4" width="2" height="2"/><rect x="9" y="6" width="2" height="2"/><rect x="7" y="8" width="2" height="2"/><rect x="5" y="10" width="2" height="2"/><rect x="3" y="8" width="2" height="2"/></svg>',
  };
  const TABS = [
    { id: 'theme', label: 'Giao diện', icon: ICONS.theme },
    { id: 'pet', label: 'Pet', icon: ICONS.pet },
  ];

  let state = null;
  let tab = 'theme';
  let petSubTab = 'default';
  let dialogueModalOpen = false;
  let dirtyDialogueCats = new Set();
  let keyDebounceTimer = null;
  let open = false;
  let colorTimer = null;
  let flushPendingPersona = null;
  let flushPendingDialogues = null;
  let flushPendingApiKey = null;
  let pendingPersonaPromise = Promise.resolve();
  let welcomeOpen = false;
  let tourActive = false;
  let tourStep = 0;
  let tourSyncTimers = [];
  let tourRaf = null;
  let autoStartTimer = null;
  let tourListenersBound = false;

  const ONBOARDING_STATE_KEY = 'harness_onboarding';
  const ONBOARDING_LS_KEY = 'hx_onboarding_v1';

  const DIALOGUE_CATEGORIES = [
    { id: 'idle', label: 'Nhàn rỗi (Idle)' },
    { id: 'typing_fast', label: 'Gõ phím nhanh' },
    { id: 'typing_pause', label: 'Dừng phím suy nghĩ' },
    { id: 'prompt_ready', label: 'Prompt sẵn sàng' },
    { id: 'agent_done', label: 'Agent hoàn thành' },
    { id: 'agent_error', label: 'Agent báo lỗi' },
    { id: 'hunger', label: 'Pet đói bụng' },
    { id: 'petting', label: 'Được vuốt ve xoa cằm' },
    { id: 'ate_coffee', label: 'Uống cà phê' },
    { id: 'ate_bug', label: 'Bắt sâu bug' },
    { id: 'curious_button', label: 'Tò mò mổ nút an toàn' },
    { id: 'inspect_code', label: 'Soi khối code' },
  ];

  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  };

  const root = h('div', { class: 'hx-root', id: 'hx-root' });
  root.addEventListener('mousedown', (e) => { if (e.target === root && !tourActive) close(); });
  document.body.appendChild(root);

  const obRoot = h('div', { class: 'hx-ob-root', id: 'hx-ob-root' });
  document.body.appendChild(obRoot);

  /* ------------------------------------------------------------ state ops */
  async function refresh() {
    try { state = await api.getState(); } catch (e) { state = null; }
    render();
  }
  const activeTheme = () => (state && state.themes ? (state.themes.find((t) => t.id === state.activeTheme) || state.themes[0]) : null);

  async function setConfig(id, patch) {
    const t = state.themes.find((x) => x.id === id);
    if (t) {
      t.config = { ...t.config, ...patch };
      render();
    }
    state = await api.setThemeConfig(id, patch);
    render();
  }

  async function togglePet(id, enabled) {
    if (api && api.togglePet) {
      state = await api.togglePet(id, enabled);
      render();
    }
  }

  async function setPetConfig(id, patch) {
    const pet = (state && state.pets && state.pets.list ? state.pets.list : []).find((x) => x.id === id);
    if (pet) {
      pet.config = { ...pet.config, ...patch };
      render();
    }
    if (api && api.setPetConfig) {
      state = await api.setPetConfig(id, patch);
      render();
    }
  }

  async function setPetGlobal(patch, reRender = true) {
    if (state && state.pets) {
      const { apiKey: _ignored, ...safePatch } = patch || {};
      state.pets = { ...state.pets, ...safePatch };
      if (reRender) render();
    }
    if (api && api.setPetGlobal) {
      state = await api.setPetGlobal(patch);
      if (reRender) render();
    }
  }

  /* ------------------------------------------------------- theme renderer */
  function preview(t) {
    if (t.thumbnail) {
      return h('div', { class: 'hx-prev hx-prev-img' },
        h('img', { src: t.thumbnail, alt: t.name || t.id || '' })
      );
    }
    const c = t.colors || {};
    const el = h('div', { class: 'hx-prev', style: `--pv-b:${c.bg};--pv-f:${c.fg};--pv-a:${c.accent};--pv-s:color-mix(in srgb,${c.bg} 90%,${c.fg});--pv-l:color-mix(in srgb,${c.fg} 28%,${c.bg})` },
      h('div', { class: 's' }, h('b', { class: 'a n' }), h('b', { class: 'w' }), h('b', { class: 'w' })),
      h('div', { class: 'm' }, h('b', { class: 'n' }), h('b', { class: 'w' }), h('div', { class: 'box' })));
    return el;
  }

  function themeCards() {
    return h('div', { class: 'hx-cards' }, (state.themes || []).map((t) =>
      h('button', {
        class: 'hx-card' + (t.id === state.activeTheme ? ' hx-on' : ''),
        onclick: async () => { state = await api.setActiveTheme(t.id); render(); },
      }, preview(t), h('div', { class: 'hx-card-t' },
        h('div', { class: 'hx-card-n' }, h('span', {}, t.name), h('span', { class: 'hx-check' })),
        h('div', { class: 'hx-card-d' }, t.description || '')))));
  }

  function paletteOption(t, o) {
    const cur = t.config[o.id];
    const wrap = h('div', {});
    const mk = (id, name, c) => h('button', {
      class: 'hx-pal' + (cur === id ? ' hx-on' : ''),
      onclick: () => setConfig(t.id, { [o.id]: id, scheme: id === 'custom' ? (t.config.scheme || 'dark') : undefined }),
    }, h('div', { class: 'sw', style: `background:${c.bg};color:${c.fg}` }, h('span', {}, 'Aa'), h('i', { style: `background:${c.accent}` })),
      h('div', { class: 'nm' }, name));
    const grid = h('div', { class: 'hx-pals' }, o.palettes.map((p) => mk(p.id, p.name, p)),
      mk('custom', 'Tự chọn', t.config.customColors || o.customColors));
    wrap.append(grid);
    if (cur === 'custom') {
      const cc = t.config.customColors || o.customColors;
      const labels = o.customLabels || { bg: 'Nền', fg: 'Chữ', accent: 'Nhấn' };
      wrap.append(h('div', { class: 'hx-custom' }, ['bg', 'fg', 'accent'].map((k) => {
        const code = h('code', {}, cc[k]);
        const inp = h('input', { type: 'color', value: cc[k] });
        inp.addEventListener('input', () => {
          code.textContent = inp.value;
          clearTimeout(colorTimer);
          colorTimer = setTimeout(() => {
            const next = { ...(t.config.customColors || o.customColors), [k]: inp.value };
            api.setThemeConfig(t.id, { customColors: next }).then((s) => { state = s; });
          }, 80);
        });
        return h('label', { class: 'hx-color' }, labels[k] || k, h('div', {}, inp, code));
      })));
    }
    return wrap;
  }

  function fontOption(t, o) {
    const cur = t.config[o.id];
    const sample = o.kind === 'code' ? 'const x = 42; // Xin chào' : 'Aa Bb 0123 Xin chào';
    return h('div', { class: 'hx-fonts' }, o.choices.map((id) => {
      const f = (state.fonts || []).find((x) => x.id === id) || { name: id };
      const style = id === 'system' ? '' : `font-family:"HX-${id}","HX-jetbrains-mono",monospace`;
      return h('button', { class: 'hx-font' + (cur === id ? ' hx-on' : ''), onclick: () => setConfig(t.id, { [o.id]: id }) },
        h('div', { class: 'fn' }, f.name), h('div', { class: 'fs', style }, sample));
    }));
  }

  function segOption(t, o) {
    const cur = t.config[o.id];
    return h('div', { class: 'hx-seg' }, o.choices.map((c) =>
      h('button', { class: String(cur) === String(c.value) ? 'hx-on' : '', onclick: () => setConfig(t.id, { [o.id]: c.value }) }, c.label)));
  }

  function toggleOption(t, o) {
    const on = !!t.config[o.id];
    return h('div', { class: 'hx-toggle' }, h('div', { class: 'hx-label', style: 'margin:0' }, o.label),
      h('button', { class: 'hx-sw' + (on ? ' hx-on' : ''), 'aria-pressed': String(on), onclick: () => setConfig(t.id, { [o.id]: !on }) }));
  }

  function optionRow(t, o) {
    if (o.type === 'toggle') return h('div', { class: 'hx-row' }, toggleOption(t, o));
    const body = o.type === 'palette' ? paletteOption(t, o) : o.type === 'font' ? fontOption(t, o) : segOption(t, o);
    return h('div', { class: 'hx-row' }, h('div', { class: 'hx-label' }, o.label), body);
  }

  function themeTab() {
    const frag = h('div', {});
    frag.append(h('div', { class: 'hx-sec', 'data-hx-tour': 'theme-section' }, h('div', { class: 'hx-sec-h' }, 'Bộ giao diện'), themeCards()));
    const t = activeTheme();
    if (t && t.options && t.options.length) {
      const groups = [];
      for (const o of t.options) {
        let g = groups.find((x) => x.name === o.group);
        if (!g) groups.push(g = { name: o.group || 'Tuỳ chỉnh', items: [] });
        g.items.push(o);
      }
      groups.forEach((g, i) => frag.append(h('div', { class: 'hx-sec' },
        h('div', { class: 'hx-sec-h' }, h('span', {}, `${g.name}`),
          i === 0 ? h('button', { class: 'hx-btn', onclick: async () => { state = await api.resetTheme(t.id); render(); } }, 'Đặt lại theme') : null),
        g.items.map((o) => optionRow(t, o)))));
    }
    return frag;
  }

  /* --------------------------------------------------------- pet renderer */
  function petPreview(p) {
    return h('div', { class: 'hx-pet-prev' },
      p.previewGif
        ? h('img', { class: 'hx-pet-avatar', src: p.previewGif, alt: p.name })
        : h('div', { class: 'hx-pet-avatar', style: 'background:#ff9d00;border-radius:50%' })
    );
  }

  function petOptionRow(p, o) {
    const cur = p.config && p.config[o.id] !== undefined ? p.config[o.id] : o.default;
    if (o.type === 'toggle') {
      const on = !!cur;
      return h('div', { class: 'hx-row' },
        h('div', { class: 'hx-toggle' },
          h('div', { class: 'hx-label', style: 'margin:0' }, o.label),
          h('button', {
            class: 'hx-sw' + (on ? ' hx-on' : ''),
            'aria-pressed': String(on),
            onclick: () => setPetConfig(p.id, { [o.id]: !on }),
          })
        )
      );
    }
    // Segmented / Select choices
    return h('div', { class: 'hx-row' },
      h('div', { class: 'hx-label' }, o.label),
      h('div', { class: 'hx-seg' }, (o.choices || []).map((c) =>
        h('button', {
          class: String(cur) === String(c.value) ? 'hx-on' : '',
          onclick: () => setPetConfig(p.id, { [o.id]: c.value }),
        }, c.label)
      ))
    );
  }

  function petCards(petsData) {
    const pets = petsData.list || [];
    if (!pets.length) {
      return h('div', { style: 'color:var(--u-muted);padding:14px 0' }, 'Chưa tìm thấy thú cưng nào trong thư mục pets/.');
    }
    return h('div', { class: 'hx-cards' }, pets.map((p) => {
      const isActive = !!p.isActive;
      return h('div', {
        class: 'hx-pet-card' + (isActive ? ' hx-on' : ''),
        onclick: () => togglePet(p.id, !isActive),
      },
      petPreview(p),
      h('div', { class: 'hx-card-t' },
        h('div', { class: 'hx-card-n' },
          h('span', {}, p.name),
          h('button', {
            class: 'hx-sw' + (isActive ? ' hx-on' : ''),
            'aria-pressed': String(isActive),
            onclick: (e) => { e.stopPropagation(); togglePet(p.id, !isActive); },
          })
        ),
        h('div', { class: 'hx-card-d' }, p.description || '')
      ));
    }));
  }

  function petTab() {
    const frag = h('div', {});
    const petsData = (state && state.pets) || { enabled: true, activePets: [], list: [] };
    const isGloballyEnabled = petsData.enabled !== false;

    // 1. Master Toggle Banner
    frag.append(h('div', { class: 'hx-banner', 'data-hx-tour': 'pet-toggle' },
      h('div', { class: 'hx-banner-info' },
        h('div', { class: 'hx-banner-title' }, 'Hiển thị Thú cưng trên màn hình'),
        h('div', { class: 'hx-banner-sub' }, 'Bật hoặc tạm ẩn toàn bộ thú cưng mà không làm mất cấu hình.')
      ),
      h('button', {
        class: 'hx-sw' + (isGloballyEnabled ? ' hx-on' : ''),
        'aria-pressed': String(isGloballyEnabled),
        onclick: () => setPetGlobal({ enabled: !isGloballyEnabled }),
      })
    ));

    // 2. Pet selection grid
    frag.append(h('div', { class: 'hx-sec' },
      h('div', { class: 'hx-sec-h' },
        h('span', {}, 'Danh sách Thú cưng'),
        h('span', { class: 'hx-tag' }, `${petsData.activePets.length} đang hoạt động`)
      ),
      petCards(petsData)
    ));

    // 3. Configurations for each currently active pet
    const activePets = (petsData.list || []).filter((p) => petsData.activePets.includes(p.id));
    for (const p of activePets) {
      if (p.options && p.options.length) {
        frag.append(h('div', { class: 'hx-sec' },
          h('div', { class: 'hx-sec-h' }, `Tùy chỉnh: ${p.name}`),
          p.options.map((o) => petOptionRow(p, o))
        ));
      }
    }

    // 4. Advanced settings: two tabs (Manual and Automatic).
    const subTabNav = h('div', { class: 'hx-subtabs', 'data-hx-tour': 'pet-advanced' },
      h('button', {
        class: 'hx-subtab-btn' + (petSubTab === 'default' ? ' hx-subtab-on' : ''),
        onclick: () => { petSubTab = 'default'; render(); },
      }, 'Mặc định'),
      h('button', {
        class: 'hx-subtab-btn' + (petSubTab === 'auto' ? ' hx-subtab-on' : ''),
        onclick: () => { petSubTab = 'auto'; render(); },
      }, 'Tự động')
    );

    const subTabContent = h('div', {});

    if (petSubTab === 'default') {
      // Tab 1: Manual settings (persona and visual dialogue editor).
      const petName = petsData.petName || 'Hooty';
      const petLabel = petsData.petLabel || 'Cú';
      const userLabel = petsData.userLabel || 'Sen';
      const customDialogues = { ...(petsData.customDialogues || {}) };

      // Section: Persona and Custom Free-form Address
      const nameInput = h('input', {
        class: 'hx-dialogue-input',
        value: petName,
        placeholder: 'Hooty',
      });

      const petLabelInput = h('input', {
        class: 'hx-dialogue-input',
        value: petLabel,
        placeholder: 'Ví dụ: Cú, Tớ, Bé, Tôi...',
      });

      const userLabelInput = h('input', {
        class: 'hx-dialogue-input',
        value: userLabel,
        placeholder: 'Ví dụ: Sen, Cậu, Em, Bạn...',
      });

      let personaSaveTimer = null;
      const savePersona = (reRender = false) => {
        clearTimeout(personaSaveTimer);
        const nextName = nameInput.value.trim() || 'Hooty';
        const nextPetLabel = petLabelInput.value.trim() || 'Cú';
        const nextUserLabel = userLabelInput.value.trim() || 'Sen';
        if (
          state?.pets &&
          state.pets.petName === nextName &&
          state.pets.petLabel === nextPetLabel &&
          state.pets.userLabel === nextUserLabel
        ) {
          return pendingPersonaPromise;
        }
        pendingPersonaPromise = setPetGlobal({
          petName: nextName,
          petLabel: nextPetLabel,
          userLabel: nextUserLabel,
        }, reRender);
        return pendingPersonaPromise;
      };
      flushPendingPersona = () => savePersona(false);

      const onPersonaInput = () => {
        clearTimeout(personaSaveTimer);
        personaSaveTimer = setTimeout(() => savePersona(false), 350);
      };

      [nameInput, petLabelInput, userLabelInput].forEach((inp) => {
        inp.addEventListener('input', onPersonaInput);
        inp.addEventListener('blur', () => savePersona(false));
        inp.addEventListener('change', () => savePersona(false));
      });

      const savePersonaBtn = h('button', {
        class: 'hx-btn',
        style: 'background:var(--u-accent);color:var(--u-bg);font-weight:700;padding:6px 14px;border:none;font-size:12px;',
        onclick: async () => {
          await savePersona(false);
          savePersonaBtn.textContent = 'Đã lưu!';
          setTimeout(() => {
            if (savePersonaBtn.isConnected) savePersonaBtn.textContent = 'Lưu danh xưng';
          }, 1500);
        },
      }, 'Lưu danh xưng');

      const personaRow = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:10px;' },
        h('div', {},
          h('div', { class: 'hx-label' }, 'Tên Thú Cưng'),
          nameInput
        ),
        h('div', {},
          h('div', { class: 'hx-label' }, 'Pet Tự Xưng'),
          petLabelInput
        ),
        h('div', {},
          h('div', { class: 'hx-label' }, 'Pet Gọi Bạn'),
          userLabelInput
        )
      );

      // Compact Dialogue Launcher Card
      const dialogueCard = h('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--u-surface);border:1px solid var(--u-line);border-radius:var(--u-radius);margin-top:10px;'
      },
        h('div', {},
          h('div', { style: 'font-weight:700;font-size:13px;color:var(--u-fg);' }, 'Câu thoại thú cưng'),
          h('div', { style: 'font-size:11px;color:var(--u-muted);margin-top:3px;' },
            'Tùy biến câu thoại phản ứng theo 12 ngữ cảnh thực tế (offline).'
          )
        ),
        h('button', {
          class: 'hx-btn',
          style: 'background:var(--u-accent);color:var(--u-bg);font-weight:700;padding:8px 16px;border:none;',
          onclick: async () => {
            await savePersona(false);
            dirtyDialogueCats = new Set();
            dialogueModalOpen = true;
            render();
          },
        }, 'Cấu hình câu thoại')
      );

      subTabContent.append(
        h('div', { class: 'hx-sec' },
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;' },
            h('div', { class: 'hx-sec-h', style: 'margin:0;' }, 'Cấu hình Danh xưng & Tên Pet'),
            savePersonaBtn
          ),
          personaRow
        ),
        h('div', { class: 'hx-sec' },
          h('div', { class: 'hx-sec-h' }, 'Hội Thoại Mặc Định'),
          dialogueCard
        )
      );

      // Dialogue modal panel (opened from the dialogue configuration control).
      if (dialogueModalOpen) {
        const getDefaultTemplates = (catId) => (
          petsData.defaultDialogueTemplates && Array.isArray(petsData.defaultDialogueTemplates[catId])
            ? petsData.defaultDialogueTemplates[catId]
            : []
        );
        const resolveTemplatePreview = (tpl) => String(tpl || '')
          .replace(/\{pet\}|\{petLabel\}/g, petLabel)
          .replace(/\{user\}|\{userLabel\}/g, userLabel)
          .replace(/\{name\}|\{petName\}/g, petName);
        const getDefaultPhrases = (catId) => {
          const tpls = getDefaultTemplates(catId);
          if (tpls.length > 0) return tpls.map(resolveTemplatePreview);
          return petsData.defaultDialogues && Array.isArray(petsData.defaultDialogues[catId])
            ? petsData.defaultDialogues[catId]
            : [];
        };
        const arraysEqual = (a, b) => (
          Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, idx) => v === b[idx])
        );

        const catList = h('div', { class: 'hx-dialogue-modal-body' },
          h('div', { class: 'hx-dialogue-hint' },
            `Danh xưng hiện tại: Tên "${petName}" • Tự xưng "${petLabel}" • Gọi bạn "${userLabel}". `,
            'Dùng ', h('code', {}, '{name}'), ', ', h('code', {}, '{pet}'), ', ', h('code', {}, '{user}'), ', ', h('code', {}, '{time}'),
            ' để câu thoại luôn tự cập nhật khi đổi danh xưng.'
          )
        );

        const collectDialoguesFromDom = () => {
          const collected = { ...customDialogues };
          const catBoxes = catList.querySelectorAll('.hx-dialogue-cat');
          for (const box of catBoxes) {
            const catId = box.getAttribute('data-cat-id');
            if (!catId || !dirtyDialogueCats.has(catId)) continue;
            const inputs = box.querySelectorAll('.hx-dialogue-input');
            const phrases = [];
            for (const inp of inputs) {
              const val = inp.value.trim();
              if (val) phrases.push(val);
            }
            const defaultResolved = getDefaultPhrases(catId);
            const defaultTemplates = getDefaultTemplates(catId);
            if (phrases.length === 0 || arraysEqual(phrases, defaultResolved) || arraysEqual(phrases, defaultTemplates)) {
              delete collected[catId];
              continue;
            }
            collected[catId] = phrases.map((val) => {
              const matchIdx = defaultResolved.indexOf(val);
              return matchIdx !== -1 && defaultTemplates[matchIdx] ? defaultTemplates[matchIdx] : val;
            });
          }
          return collected;
        };

        let dialogueSaveTimer = null;
        const syncDialoguesLive = () => {
          clearTimeout(dialogueSaveTimer);
          dialogueSaveTimer = setTimeout(() => {
            if (dirtyDialogueCats.size === 0) return;
            const collected = collectDialoguesFromDom();
            setPetGlobal({ customDialogues: collected }, false);
          }, 350);
        };

        const saveAndCloseDialogues = async () => {
          clearTimeout(dialogueSaveTimer);
          const hadEdits = dirtyDialogueCats.size > 0;
          const collected = hadEdits ? collectDialoguesFromDom() : null;
          dialogueModalOpen = false;
          dirtyDialogueCats.clear();
          flushPendingDialogues = null;
          if (hadEdits) {
            await setPetGlobal({ customDialogues: collected }, true);
          } else {
            render();
          }
        };
        flushPendingDialogues = () => {
          clearTimeout(dialogueSaveTimer);
          if (dirtyDialogueCats.size === 0) return;
          const collected = collectDialoguesFromDom();
          dirtyDialogueCats.clear();
          setPetGlobal({ customDialogues: collected }, false);
        };

        for (const cat of DIALOGUE_CATEGORIES) {
          const isCustomized = Array.isArray(customDialogues[cat.id]) && customDialogues[cat.id].length > 0;
          const phrases = isCustomized ? customDialogues[cat.id] : getDefaultPhrases(cat.id);

          const catBox = h('div', { class: 'hx-dialogue-cat', 'data-cat-id': cat.id });
          const catHeader = h('div', { class: 'hx-dialogue-header' },
            h('div', { class: 'hx-dialogue-cat-title' },
              h('span', {}, cat.label),
              h('span', { class: 'hx-dialogue-cat-tag' }, `${phrases.length} câu`)
            ),
            isCustomized ? h('button', {
              class: 'hx-dialogue-cat-reset',
              onclick: () => {
                clearTimeout(dialogueSaveTimer);
                dirtyDialogueCats.delete(cat.id);
                const collected = collectDialoguesFromDom();
                delete collected[cat.id];
                setPetGlobal({ customDialogues: collected }, true);
              },
            }, 'Đặt lại') : null
          );

          const listContainer = h('div', { class: 'hx-dialogue-list' });
          phrases.forEach((phrase, idx) => {
            const phraseInput = h('input', {
              class: 'hx-dialogue-input',
              value: phrase,
            });
            phraseInput.addEventListener('input', () => {
              dirtyDialogueCats.add(cat.id);
              syncDialoguesLive();
            });
            phraseInput.addEventListener('change', () => {
              dirtyDialogueCats.add(cat.id);
              clearTimeout(dialogueSaveTimer);
              const collected = collectDialoguesFromDom();
              setPetGlobal({ customDialogues: collected }, false);
            });

            const delBtn = h('button', {
              class: 'hx-dialogue-del-btn',
              title: 'Xóa câu thoại này',
              onclick: () => {
                clearTimeout(dialogueSaveTimer);
                dirtyDialogueCats.add(cat.id);
                const collected = collectDialoguesFromDom();
                if (!collected[cat.id]) {
                  const baseTemplates = getDefaultTemplates(cat.id);
                  collected[cat.id] = baseTemplates.length ? [...baseTemplates] : [...getDefaultPhrases(cat.id)];
                }
                collected[cat.id].splice(idx, 1);
                if (collected[cat.id].length === 0) {
                  delete collected[cat.id];
                  dirtyDialogueCats.delete(cat.id);
                }
                setPetGlobal({ customDialogues: collected }, true);
              },
            }, 'x');

            listContainer.append(h('div', { class: 'hx-dialogue-row' }, phraseInput, delBtn));
          });

          const addBtn = h('button', {
            class: 'hx-dialogue-add-btn',
            onclick: () => {
              clearTimeout(dialogueSaveTimer);
              dirtyDialogueCats.add(cat.id);
              const collected = collectDialoguesFromDom();
              if (!collected[cat.id]) {
                const baseTemplates = getDefaultTemplates(cat.id);
                collected[cat.id] = baseTemplates.length ? [...baseTemplates] : [...getDefaultPhrases(cat.id)];
              }
              collected[cat.id].push('Hoot! {pet} có điều muốn nói với {user}...');
              setPetGlobal({ customDialogues: collected }, true);
            },
          }, '+ Thêm câu thoại');

          catBox.append(catHeader, listContainer, addBtn);
          catList.append(catBox);
        }

        const resetBtn = h('button', {
          class: 'hx-btn',
          style: 'font-size:11px;color:var(--u-muted);',
          onclick: async () => {
            clearTimeout(dialogueSaveTimer);
            dirtyDialogueCats.clear();
            await setPetGlobal({ customDialogues: {} }, true);
          },
        }, 'Khôi phục mặc định');

        const modalOverlay = h('div', {
          class: 'hx-dialogue-modal-overlay',
          onclick: (e) => { if (e.target === modalOverlay) { saveAndCloseDialogues(); } }
        },
          h('div', { class: 'hx-dialogue-modal-panel' },
            h('div', { class: 'hx-dialogue-modal-header' },
              h('div', { class: 'hx-dialogue-modal-title' }, 'Cấu hình câu thoại thú cưng'),
              h('div', { style: 'display:flex;align-items:center;gap:10px;' },
                resetBtn,
                h('button', {
                  class: 'hx-x',
                  style: 'width:24px;height:24px;',
                  onclick: () => saveAndCloseDialogues()
                }, h('span', { html: ICONS.close }))
              )
            ),
            catList,
            h('div', { class: 'hx-dialogue-modal-footer' },
              h('button', {
                class: 'hx-btn',
                style: 'background:var(--u-accent);color:var(--u-bg);font-weight:700;padding:6px 18px;',
                onclick: () => saveAndCloseDialogues()
              }, 'Hoàn tất & Lưu')
            )
          )
        );

        frag.append(modalOverlay);
      } else {
        flushPendingDialogues = null;
      }

    } else {
      flushPendingDialogues = null;
      // Tab 2: Automatic settings (AI cloud brain, single-row layout).
      const currentProvider = petsData.provider || 'gemini';
      const hasKey = Boolean(petsData && petsData.hasApiKey);

      const helpIcon = h('span', {
        class: 'hx-help-icon',
        title: 'API key được lưu tách biệt và mã hóa ở main process (không ghi vào config.json và không lộ ra giao diện). Key luôn được giữ nguyên khi cập nhật phiên bản mới. Hỗ trợ lưu riêng cho Gemini, ChatGPT và Claude.'
      }, '?');

      const titleWithHelp = h('span', { style: 'display:flex;align-items:center;' },
        'Trí tuệ nhân tạo',
        helpIcon
      );

      const statusBadge = hasKey
        ? h('span', { class: 'hx-tag', style: 'color:#4ade80;border-color:#4ade80;font-weight:700;' }, 'Đã lưu key')
        : h('span', { class: 'hx-tag', style: 'color:var(--u-muted);border-color:var(--u-line);' }, 'Chưa lưu key');

      const providerSelect = h('select', {
        class: 'hx-dialogue-input',
        style: 'width:120px;padding:8px 10px;font-weight:600;flex:none;',
      },
        h('option', { value: 'gemini', selected: currentProvider === 'gemini' }, 'Gemini'),
        h('option', { value: 'openai', selected: currentProvider === 'openai' }, 'ChatGPT'),
        h('option', { value: 'claude', selected: currentProvider === 'claude' }, 'Claude')
      );

      const keyInput = h('input', {
        type: 'password',
        placeholder: hasKey ? 'Đã lưu API Key (dán key mới để thay thế)...' : 'Dán API Key vào đây...',
        value: '',
        style: 'flex:1;min-width:0;padding:8px 12px;background:var(--u-surface);border:1px solid var(--u-line);border-radius:var(--u-radius);color:var(--u-fg);font-family:monospace;font-size:12px;',
      });

      const updateStatusUi = (saved) => {
        if (saved) {
          statusBadge.textContent = 'Đã lưu key';
          statusBadge.style.color = '#4ade80';
          statusBadge.style.borderColor = '#4ade80';
          statusBadge.style.fontWeight = '700';
          keyInput.placeholder = 'Đã lưu API Key (dán key mới để thay thế)...';
        } else {
          statusBadge.textContent = 'Chưa lưu key';
          statusBadge.style.color = 'var(--u-muted)';
          statusBadge.style.borderColor = 'var(--u-line)';
          statusBadge.style.fontWeight = '400';
          keyInput.placeholder = 'Dán API Key vào đây...';
        }
      };

      const saveKeyBtn = h('button', {
        class: 'hx-btn',
        style: 'background:var(--u-accent);color:var(--u-bg);font-weight:700;padding:8px 14px;border:none;flex:none;',
      }, 'Lưu');

      const commitApiKey = async (clearAfterSave = false) => {
        clearTimeout(keyDebounceTimer);
        const trimmed = keyInput.value.trim();
        if (!trimmed) return;
        await setPetGlobal({ provider: providerSelect.value, apiKey: trimmed }, false);
        const savedOk = Boolean(state && state.pets && state.pets.hasApiKey);
        updateStatusUi(savedOk);
        if (clearAfterSave || savedOk) {
          if (clearAfterSave || document.activeElement !== keyInput) {
            keyInput.value = '';
          }
          if (saveKeyBtn.isConnected) {
            saveKeyBtn.textContent = 'Đã lưu!';
            setTimeout(() => {
              if (saveKeyBtn.isConnected) saveKeyBtn.textContent = 'Lưu';
            }, 1500);
          }
        }
      };

      flushPendingApiKey = () => {
        clearTimeout(keyDebounceTimer);
        const trimmed = keyInput.value.trim();
        if (!trimmed) return;
        keyInput.value = '';
        setPetGlobal({ provider: providerSelect.value, apiKey: trimmed }, false);
      };

      providerSelect.addEventListener('change', async (e) => {
        clearTimeout(keyDebounceTimer);
        keyInput.value = '';
        await setPetGlobal({ provider: e.target.value }, true);
      });

      keyInput.addEventListener('paste', () => {
        clearTimeout(keyDebounceTimer);
        keyDebounceTimer = setTimeout(() => {
          commitApiKey(true);
        }, 400);
      });

      keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitApiKey(true);
        }
      });

      keyInput.addEventListener('blur', () => {
        commitApiKey(true);
      });

      saveKeyBtn.addEventListener('click', () => {
        commitApiKey(true);
      });

      const clearBtn = h('button', {
        class: 'hx-btn',
        style: 'color:#ff5555;padding:8px 14px;border-color:rgba(255,85,85,0.4);font-weight:600;flex:none;',
        onclick: async () => {
          keyInput.value = '';
          clearTimeout(keyDebounceTimer);
          await setPetGlobal({ provider: providerSelect.value, apiKey: '' });
        },
      }, 'Xóa');

      const singleRow = h('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:12px;' },
        providerSelect,
        keyInput,
        saveKeyBtn,
        clearBtn
      );

      subTabContent.append(
        h('div', { class: 'hx-sec' },
          h('div', { class: 'hx-sec-h' },
            titleWithHelp,
            statusBadge
          ),
          singleRow
        )
      );
    }

    if (petSubTab === 'default') {
      flushPendingApiKey = null;
    }

    frag.append(subTabNav, subTabContent);
    return frag;
  }

  /* ------------------------------------------------------------- main render */
  function render() {
    root.textContent = '';
    if (!state) { root.append(h('div', { class: 'hx-modal' }, h('div', { class: 'hx-body' }, 'Không kết nối được Custom Harness. Hãy khởi động lại ứng dụng.'))); return; }

    const sys = state.system || {};
    const petsData = state.pets || { activePets: [] };
    const petTag = petsData.activePets.length > 0 ? `${petsData.activePets.length} bật` : null;

    const navTabs = TABS.map((x) => ({
      ...x,
      tag: x.id === 'pet' ? petTag : x.tag,
    }));

    const cur = navTabs.find((x) => x.id === tab) || navTabs[0];

    const side = h('div', { class: 'hx-side' },
      h('div', { class: 'hx-brand' },
        sys.logo ? h('img', { class: 'hx-brand-logo', src: sys.logo, alt: sys.name || 'Custom Harness' }) : h('i', {}),
        sys.name || 'Custom Harness'
      ),
      h('div', { class: 'hx-nav' }, navTabs.map((x) => h('button', {
        class: 'hx-tab' + (x.id === tab ? ' hx-on' : ''),
        'data-hx-tour': 'tab-' + x.id,
        onclick: () => { tab = x.id; render(); },
      },
      h('span', { html: x.icon, style: 'display:flex' }), x.label, x.tag ? h('span', { class: 'hx-tag' }, x.tag) : null))),
      h('div', { class: 'hx-foot' },
        h('div', { class: 'hx-foot-hint' }, 'Ctrl+Shift+H để mở nhanh'),
        h('button', {
          type: 'button',
          class: 'hx-foot-link',
          onclick: () => {
            if (tourActive) finishTour('reopened-welcome');
            close({ keepTour: true });
            openWelcomeModal();
          },
        }, h('span', { html: ICONS.info, style: 'display:flex' }), h('span', {}, 'Giới thiệu & hướng dẫn'))));

    const main = h('div', { class: 'hx-main' },
      h('div', { class: 'hx-head' }, h('div', { class: 'hx-title' }, cur.label), h('button', { class: 'hx-x', title: 'Đóng (Esc)', html: ICONS.close, onclick: () => close() })),
      h('div', { class: 'hx-body' }, tab === 'pet' ? petTab() : themeTab()));

    root.append(h('div', { class: 'hx-modal' }, side, main));
  }

  async function openMenuAsync(forceRefresh = true) {
    open = true;
    root.classList.add('hx-open');
    navBtn()?.classList.add('hx-on');
    if (forceRefresh || !state) {
      await refresh();
    } else {
      render();
    }
  }
  function openMenu() { openMenuAsync(true); }
  function toggle() {
    if (tourActive && tourStep === 0) {
      goToTourStep(1);
      return;
    }
    open ? close() : openMenu();
  }
  function close(opts = {}) {
    const keepTour = Boolean(opts && opts.keepTour);
    if (!keepTour && tourActive) {
      finishTour('modal-closed');
    }
    if (dialogueModalOpen && flushPendingDialogues) {
      try { flushPendingDialogues(); } catch (e) { /* ignore */ }
      dialogueModalOpen = false;
      dirtyDialogueCats.clear();
    }
    if (flushPendingPersona) {
      try { flushPendingPersona(); } catch (e) { /* ignore */ }
    }
    if (flushPendingApiKey) {
      try { flushPendingApiKey(); } catch (e) { /* ignore */ }
      flushPendingApiKey = null;
    }
    open = false;
    root.classList.remove('hx-open');
    navBtn()?.classList.remove('hx-on');
  }

  /* --------------------------------------- onboarding: welcome & game tour */
  function readLocalOnboarding() {
    try {
      const raw = window.localStorage.getItem(ONBOARDING_LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeLocalOnboarding(payload) {
    try {
      window.localStorage.setItem(ONBOARDING_LS_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures
    }
  }

  async function isOnboardingCompleted() {
    const local = readLocalOnboarding();
    if (local && local.completed === true) return true;
    if (api && typeof api.getThemeStateData === 'function') {
      try {
        const disk = await api.getThemeStateData(ONBOARDING_STATE_KEY);
        if (disk && disk.completed === true) {
          writeLocalOnboarding(disk);
          return true;
        }
      } catch {
        // Ignore IPC errors
      }
    }
    return false;
  }

  function markOnboardingCompleted(source = 'completed') {
    const payload = {
      completed: true,
      version: (state && state.system && state.system.version) || null,
      source,
      updatedAt: Date.now(),
    };
    writeLocalOnboarding(payload);
    if (api && typeof api.saveThemeStateData === 'function') {
      try {
        Promise.resolve(api.saveThemeStateData(ONBOARDING_STATE_KEY, payload)).catch(() => {});
      } catch {
        // Ignore IPC errors
      }
    }
  }

  async function ensureStateLoaded() {
    if ((!state || !state.system || !state.system.version) && api && typeof api.getState === 'function') {
      try { state = await api.getState(); } catch { state = null; }
    }
    return state;
  }

  function clearTourTimers() {
    if (tourRaf) {
      cancelAnimationFrame(tourRaf);
      tourRaf = null;
    }
    for (const id of tourSyncTimers) clearTimeout(id);
    tourSyncTimers = [];
  }

  let tourRefs = null;
  let tourRunToken = 0;

  function scheduleTourReposition() {
    if (!tourActive) return;
    if (tourRaf) cancelAnimationFrame(tourRaf);
    tourRaf = requestAnimationFrame(() => {
      tourRaf = null;
      positionTourOverlay();
    });
  }

  function bindTourListeners() {
    if (tourListenersBound) return;
    tourListenersBound = true;
    window.addEventListener('resize', scheduleTourReposition);
    root.addEventListener('scroll', scheduleTourReposition, true);
  }

  function unbindTourListeners() {
    if (!tourListenersBound) return;
    tourListenersBound = false;
    window.removeEventListener('resize', scheduleTourReposition);
    root.removeEventListener('scroll', scheduleTourReposition, true);
  }

  function clearObRoot() {
    obRoot.textContent = '';
    tourRefs = null;
  }

  function dismissOnboarding(reason = 'welcome-later') {
    welcomeOpen = false;
    clearObRoot();
    markOnboardingCompleted(reason);
  }

  async function openWelcomeModal() {
    if (tourActive) finishTour('reopened-welcome');
    await ensureStateLoaded();
    welcomeOpen = true;
    clearObRoot();

    const sys = (state && state.system) || { name: 'Custom Harness', version: '', author: 'hieurury', logo: null };

    const features = [
      {
        icon: ICONS.palette,
        title: 'Giao diện linh hoạt',
        desc: 'Tùy biến đa dạng chủ đề, hiệu ứng môi trường, bảng màu và kiểu chữ theo sở thích.',
      },
      {
        icon: ICONS.sparkles,
        title: 'Tiện ích tương tác',
        desc: 'Bổ sung các thành phần và bạn đồng hành sống động trong không gian làm việc, dễ tùy chỉnh và mở rộng.',
      },
      {
        icon: ICONS.shield,
        title: 'An toàn & tách biệt',
        desc: 'Lưu tách riêng dữ liệu người dùng, bảo vệ thông tin nhạy cảm và hỗ trợ khôi phục bản gốc bất cứ lúc nào.',
      },
    ];

    const hero = h('div', { class: 'hx-ob-hero' },
      h('div', { class: 'hx-ob-hero-grid' }),
      h('button', {
        type: 'button',
        class: 'hx-ob-close',
        title: 'Đóng (Esc)',
        html: ICONS.close,
        onclick: () => dismissOnboarding('welcome-close'),
      }),
      h('div', { class: 'hx-ob-hero-head' },
        h('div', { class: 'hx-ob-brand-badge' },
          sys.logo
            ? h('img', { class: 'hx-ob-logo-img', src: sys.logo, alt: sys.name })
            : h('span', { html: ICONS.brand, style: 'display:flex' })
        ),
        h('div', { class: 'hx-ob-hero-meta' },
          h('span', { class: 'hx-ob-kicker' }, 'Chào mừng'),
          h('h2', { class: 'hx-ob-title' }, sys.name),
          h('p', { class: 'hx-ob-sub' }, 'Nền tảng mở rộng và cá nhân hóa trải nghiệm cho Antigravity')
        )
      )
    );

    const body = h('div', { class: 'hx-ob-body' },
      h('p', { class: 'hx-ob-desc' },
        'Tùy biến không gian làm việc theo phong cách riêng — từ giao diện, hiệu ứng thị giác đến các thành phần tương tác mở rộng, gọn nhẹ và luôn tách biệt an toàn với bản gốc.'
      ),
      h('div', { class: 'hx-ob-sec-label' }, 'Tính năng nổi bật'),
      h('div', { class: 'hx-ob-features' }, features.map((f) =>
        h('div', { class: 'hx-ob-feat' },
          h('div', { class: 'hx-ob-feat-icon', html: f.icon }),
          h('div', { class: 'hx-ob-feat-title' }, f.title),
          h('div', { class: 'hx-ob-feat-desc' }, f.desc)
        )
      )),
      h('div', { class: 'hx-ob-actions' },
        h('button', {
          type: 'button',
          class: 'hx-ob-btn-primary',
          onclick: () => startTour(),
        }, h('span', { html: ICONS.play, style: 'display:flex' }), h('span', {}, 'Bắt đầu hướng dẫn')),
        h('button', {
          type: 'button',
          class: 'hx-ob-btn-ghost',
          onclick: () => dismissOnboarding('welcome-later'),
        }, 'Để sau')
      )
    );

    const footer = h('div', { class: 'hx-ob-footer' },
      h('span', {}, sys.version ? `Phiên bản v${sys.version}` : 'Phiên bản —'),
      h('span', {}, `Tác giả: ${sys.author || 'hieurury'}`)
    );

    const modal = h('div', {
      class: 'hx-ob-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': sys.name,
    }, hero, body, footer);

    const backdrop = h('div', {
      class: 'hx-ob-backdrop',
      onmousedown: (e) => {
        if (e.target === backdrop) dismissOnboarding('welcome-backdrop');
      },
    }, modal);

    obRoot.append(backdrop);
  }

  const TOUR_STEPS = [
    {
      id: 'navbtn',
      selector: '#hx-navbtn',
      icon: ICONS.compass,
      preferredPlacement: 'bottom',
      title: 'Mở bảng cấu hình',
      body: 'Bấm nút Custom Harness trên thanh tiêu đề hoặc nhấn Ctrl + Shift + H bất cứ lúc nào để mở hoặc đóng bảng cài đặt.',
      hint: 'Mẹo: Bấm thẳng vào nút Custom Harness đang phát sáng hoặc chọn Tiếp theo.',
      prepare: async () => {
        if (open) close({ keepTour: true });
      },
    },
    {
      id: 'themes',
      selector: '[data-hx-tour="theme-section"]',
      clipSelector: '.hx-body',
      icon: ICONS.palette,
      preferredPlacement: 'bottom',
      title: 'Chọn & tùy biến giao diện',
      body: 'Chuyển đổi nhanh giữa các bộ giao diện có sẵn và điều chỉnh bảng màu, kiểu chữ cùng hiệu ứng hiển thị theo phong cách riêng.',
      prepare: async () => {
        tab = 'theme';
        dialogueModalOpen = false;
        await openMenuAsync(true);
        const bodyEl = root.querySelector('.hx-body');
        if (bodyEl) bodyEl.scrollTop = 0;
      },
    },
    {
      id: 'pets',
      selector: '[data-hx-tour="pet-toggle"]',
      clipSelector: '.hx-body',
      icon: ICONS.sparkles,
      preferredPlacement: 'bottom',
      title: 'Quản lý tiện ích đồng hành',
      body: 'Dùng công tắc này để bật hoặc tạm ẩn nhanh mà không làm mất thiết lập hiện tại. Bên dưới là danh sách lựa chọn và tùy chỉnh hành vi.',
      prepare: async () => {
        tab = 'pet';
        dialogueModalOpen = false;
        await openMenuAsync(false);
        const bodyEl = root.querySelector('.hx-body');
        if (bodyEl) bodyEl.scrollTop = 0;
      },
    },
    {
      id: 'pet-ai',
      selector: '[data-hx-tour="pet-advanced"]',
      clipSelector: '.hx-body',
      icon: ICONS.sliders,
      preferredPlacement: 'top',
      title: 'Cá nhân hóa & hội thoại',
      body: 'Tùy chỉnh cách xưng hô, lời thoại mặc định hoặc kết nối với các dịch vụ AI được hỗ trợ để mở rộng khả năng tương tác.',
      prepare: async () => {
        tab = 'pet';
        dialogueModalOpen = false;
        await openMenuAsync(false);
        const target = root.querySelector('[data-hx-tour="pet-advanced"]');
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      },
    },
  ];

  function getTargetSpotlightRect(step) {
    const el = document.querySelector(step.selector);
    if (!el) return null;
    const raw = el.getBoundingClientRect();
    if (!raw || raw.width < 2 || raw.height < 2) return null;

    let left = raw.left;
    let top = raw.top;
    let right = raw.right;
    let bottom = raw.bottom;

    if (step.clipSelector) {
      const clipEl = document.querySelector(step.clipSelector);
      if (clipEl) {
        const clip = clipEl.getBoundingClientRect();
        left = Math.max(left, clip.left);
        top = Math.max(top, clip.top);
        right = Math.min(right, clip.right);
        bottom = Math.min(bottom, clip.bottom);
      }
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 6;
    left = Math.max(4, left - pad);
    top = Math.max(4, top - pad);
    right = Math.min(vw - 4, right + pad);
    bottom = Math.min(vh - 4, bottom + pad);

    if (right - left < 8 || bottom - top < 8) return null;
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function positionTourOverlay() {
    if (!tourActive || !tourRefs || !tourRefs.card) return;
    const step = TOUR_STEPS[tourStep];
    if (!step) return;

    const { ring, card, arrow, fallback } = tourRefs;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 14;
    const rect = getTargetSpotlightRect(step);

    const cardRect = card.getBoundingClientRect();
    const cw = cardRect.width || Math.min(340, vw - margin * 2);
    const ch = cardRect.height || 190;

    if (!rect) {
      ring.classList.add('hx-hidden');
      fallback.classList.remove('hx-hidden');
      arrow.classList.add('hx-hidden');
      card.style.left = `${Math.max(margin, Math.round((vw - cw) / 2))}px`;
      card.style.top = `${Math.max(margin, Math.round((vh - ch) / 2))}px`;
      return;
    }

    fallback.classList.add('hx-hidden');
    ring.classList.remove('hx-hidden');
    ring.style.left = `${Math.round(rect.left)}px`;
    ring.style.top = `${Math.round(rect.top)}px`;
    ring.style.width = `${Math.round(rect.width)}px`;
    ring.style.height = `${Math.round(rect.height)}px`;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const candidates = {
      bottom: { left: centerX - cw / 2, top: rect.bottom + gap, space: vh - rect.bottom - margin, need: ch + gap },
      top: { left: centerX - cw / 2, top: rect.top - gap - ch, space: rect.top - margin, need: ch + gap },
      left: { left: rect.left - gap - cw, top: centerY - ch / 2, space: rect.left - margin, need: cw + gap },
      right: { left: rect.right + gap, top: centerY - ch / 2, space: vw - rect.right - margin, need: cw + gap },
    };

    const order = [step.preferredPlacement || 'bottom', 'bottom', 'top', 'left', 'right']
      .filter((v, i, arr) => arr.indexOf(v) === i);

    let chosen = order.find((dir) => {
      const c = candidates[dir];
      const clampedL = Math.max(margin, Math.min(c.left, vw - cw - margin));
      const clampedT = Math.max(margin, Math.min(c.top, vh - ch - margin));
      const overlaps = !(
        clampedL + cw <= rect.left ||
        clampedL >= rect.right ||
        clampedT + ch <= rect.top ||
        clampedT >= rect.bottom
      );
      return c.space >= c.need && !overlaps;
    });

    if (!chosen) {
      chosen = order.reduce((best, dir) => (candidates[dir].space > candidates[best].space ? dir : best), order[0]);
    }

    const pos = candidates[chosen];
    const finalLeft = Math.round(Math.max(margin, Math.min(pos.left, vw - cw - margin)));
    const finalTop = Math.round(Math.max(margin, Math.min(pos.top, vh - ch - margin)));

    card.style.left = `${finalLeft}px`;
    card.style.top = `${finalTop}px`;

    const overlapsTarget = !(
      finalLeft + cw <= rect.left + 2 ||
      finalLeft >= rect.right - 2 ||
      finalTop + ch <= rect.top + 2 ||
      finalTop >= rect.bottom - 2
    );

    if (overlapsTarget) {
      arrow.classList.add('hx-hidden');
      return;
    }

    arrow.classList.remove('hx-hidden');
    arrow.style.left = '';
    arrow.style.top = '';
    if (chosen === 'bottom') {
      arrow.setAttribute('data-side', 'top');
      arrow.style.left = `${Math.round(Math.max(18, Math.min(centerX - finalLeft - 6, cw - 30)))}px`;
    } else if (chosen === 'top') {
      arrow.setAttribute('data-side', 'bottom');
      arrow.style.left = `${Math.round(Math.max(18, Math.min(centerX - finalLeft - 6, cw - 30)))}px`;
    } else if (chosen === 'left') {
      arrow.setAttribute('data-side', 'right');
      arrow.style.top = `${Math.round(Math.max(18, Math.min(centerY - finalTop - 6, ch - 30)))}px`;
    } else {
      arrow.setAttribute('data-side', 'left');
      arrow.style.top = `${Math.round(Math.max(18, Math.min(centerY - finalTop - 6, ch - 30)))}px`;
    }
  }

  function renderTourStep() {
    clearObRoot();
    const step = TOUR_STEPS[tourStep];
    if (!step) return;

    const isLast = tourStep === TOUR_STEPS.length - 1;

    const fallback = h('div', { class: 'hx-tour-backdrop-fallback hx-hidden' });
    const ring = h('div', { class: 'hx-tour-ring' });
    const arrow = h('div', { class: 'hx-tour-arrow' });

    const card = h('div', { class: 'hx-tour-card', role: 'dialog', 'aria-label': step.title },
      arrow,
      h('div', { class: 'hx-tour-head' },
        h('div', { class: 'hx-tour-guide' },
          h('div', { class: 'hx-tour-avatar' },
            h('span', { html: step.icon || ICONS.compass, style: 'display:flex' })
          ),
          h('span', { class: 'hx-tour-badge' }, `Bước ${tourStep + 1} / ${TOUR_STEPS.length}`)
        ),
        h('button', {
          type: 'button',
          class: 'hx-tour-skip',
          onclick: () => finishTour('tour-skip'),
        }, h('span', { html: ICONS.close, style: 'display:flex' }), h('span', {}, 'Bỏ qua'))
      ),
      h('div', { class: 'hx-tour-title' }, step.title),
      h('div', { class: 'hx-tour-body' }, step.body),
      step.hint ? h('div', { class: 'hx-tour-hint' }, step.hint) : null,
      h('div', { class: 'hx-tour-foot' },
        h('div', { class: 'hx-tour-dots' }, TOUR_STEPS.map((_, idx) =>
          h('span', {
            class: 'hx-tour-dot' + (idx === tourStep ? ' hx-on' : idx < tourStep ? ' hx-done' : ''),
          })
        )),
        h('div', { class: 'hx-tour-nav' },
          tourStep > 0 ? h('button', {
            type: 'button',
            class: 'hx-tour-btn',
            onclick: () => goToTourStep(tourStep - 1),
          }, h('span', { html: ICONS.prev, style: 'display:flex' }), h('span', {}, 'Quay lại')) : null,
          h('button', {
            type: 'button',
            class: 'hx-tour-btn hx-tour-btn-primary',
            onclick: () => (isLast ? finishTour('completed') : goToTourStep(tourStep + 1)),
          },
          h('span', {}, isLast ? 'Hoàn tất' : 'Tiếp theo'),
          h('span', { html: isLast ? ICONS.check : ICONS.next, style: 'display:flex' }))
        )
      )
    );

    tourRefs = { ring, card, arrow, fallback };
    obRoot.append(fallback, ring, card);
    positionTourOverlay();
    scheduleTourReposition();
    tourSyncTimers.push(setTimeout(positionTourOverlay, 60));
    tourSyncTimers.push(setTimeout(positionTourOverlay, 180));
  }

  async function goToTourStep(idx) {
    if (!tourActive) return;
    const clamped = Math.max(0, Math.min(idx, TOUR_STEPS.length - 1));
    const token = ++tourRunToken;
    clearTourTimers();
    tourStep = clamped;
    const step = TOUR_STEPS[clamped];
    if (step && typeof step.prepare === 'function') {
      await step.prepare();
    }
    if (!tourActive || token !== tourRunToken) return;
    renderTourStep();
  }

  function finishTour(reason = 'completed') {
    tourRunToken += 1;
    tourActive = false;
    welcomeOpen = false;
    clearTourTimers();
    unbindTourListeners();
    clearObRoot();
    markOnboardingCompleted(reason);
  }

  async function startTour() {
    await ensureStateLoaded();
    welcomeOpen = false;
    tourActive = true;
    bindTourListeners();
    await goToTourStep(0);
  }

  /* --------------------------------------------------- title-bar button */
  const navBtn = () => document.getElementById('hx-navbtn');

  function publishDefaultRegions() {
    if (!window.__hxLayout) return;
    const L = window.__hxLayout;
    L.clear('default-shell');

    const regionDefs = [
      {
        id: 'prompt_bar',
        role: 'input',
        perchable: true,
        interactable: true,
        selectors: [
          '[data-testid="chat-input"]',
          '[data-testid="agent-input-box"]',
          '.antigravity-prompt-bar',
          'textarea.antigravity-prompt-textarea'
        ]
      },
      {
        id: 'nav_btn',
        role: 'nav',
        perchable: true,
        interactable: true,
        selectors: ['#hx-navbtn']
      },
      {
        id: 'title_bar',
        role: 'nav',
        perchable: true,
        interactable: false,
        selectors: ['[data-testid="title-menu-bar"]', 'header.antigravity-header', '.pane-titlebar']
      },
      {
        id: 'breadcrumb',
        role: 'nav',
        perchable: true,
        interactable: false,
        selectors: ['[data-testid="breadcrumb-bar"]', '[data-testid="breadcrumb-segment"]']
      },
      {
        id: 'sidebar',
        role: 'sidebar',
        perchable: false,
        interactable: false,
        selectors: ['[data-testid="new-conversation-button"]', '[data-testid="project-header"]']
      },
      {
        id: 'artifact_card',
        role: 'panel',
        perchable: true,
        interactable: true,
        selectors: ['[data-testid="artifact-card"]', '[data-testid="changed-files-card"]', '[data-testid="turn-cards-container"]']
      },
      {
        id: 'modal',
        role: 'overlay',
        perchable: true,
        interactable: true,
        selectors: ['.hx-modal']
      }
    ];

    for (const def of regionDefs) {
      for (const sel of def.selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          L.registerRegion({
            id: def.id,
            role: def.role,
            element: el,
            perchable: def.perchable,
            interactable: def.interactable,
            source: 'default-shell',
          });
          break;
        }
      }
    }

    window.__hxBus?.emit('layout:ready', { source: 'default-shell' });
  }

  function mountButton() {
    if (navBtn() && navBtn().isConnected) {
      publishDefaultRegions();
      return;
    }
    const bar = document.querySelector('[data-testid="title-menu-bar"]');
    if (!bar) return;
    const sibling = bar.querySelector('[data-testid="title-menu-bar-item"]');
    const btn = document.createElement('button');
    btn.id = 'hx-navbtn';
    btn.type = 'button';
    btn.className = (sibling ? sibling.className : '') + ' hx-navbtn';
    btn.textContent = 'Custom Harness';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); }, true);
    bar.appendChild(btn);
    publishDefaultRegions();
  }
  mountButton();
  const mountTimer = setInterval(mountButton, 1200);

  const onKey = (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) { e.preventDefault(); toggle(); return; }
    if (welcomeOpen) {
      if (e.key === 'Escape') { e.preventDefault(); dismissOnboarding('welcome-esc'); }
      return;
    }
    if (tourActive) {
      if (e.key === 'Escape') { e.preventDefault(); finishTour('tour-esc'); }
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (tourStep < TOUR_STEPS.length - 1) goToTourStep(tourStep + 1);
        else finishTour('completed');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (tourStep > 0) goToTourStep(tourStep - 1);
      } else if (e.key === 'Enter') {
        const tag = e.target && e.target.tagName;
        if (!['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tag)) {
          e.preventDefault();
          if (tourStep < TOUR_STEPS.length - 1) goToTourStep(tourStep + 1);
          else finishTour('completed');
        }
      }
      return;
    }
    if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
  };
  window.addEventListener('keydown', onKey, true);

  function maybeAutoStartOnboarding() {
    if (window.__hxOnboardingChecked) return;
    window.__hxOnboardingChecked = true;
    const startedAt = Date.now();
    const waitAndCheck = async () => {
      if (!obRoot.isConnected) return;
      const btn = navBtn();
      if ((!btn || !btn.isConnected) && Date.now() - startedAt < 2400) {
        autoStartTimer = setTimeout(waitAndCheck, 200);
        return;
      }
      const done = await isOnboardingCompleted();
      if (!obRoot.isConnected || done || open || welcomeOpen || tourActive) return;
      await openWelcomeModal();
    };
    autoStartTimer = setTimeout(waitAndCheck, 650);
  }
  maybeAutoStartOnboarding();

  window.__hxUiCleanup = () => {
    clearInterval(mountTimer);
    clearTimeout(autoStartTimer);
    clearTourTimers();
    unbindTourListeners();
    window.removeEventListener('keydown', onKey, true);
    window.__hxLayout?.clear('default-shell');
    root.remove();
    obRoot.remove();
    navBtn()?.remove();
  };
})();
