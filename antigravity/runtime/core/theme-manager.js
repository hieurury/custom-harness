'use strict';
/*
 * Antigravity Harness — Theme & Font Manager.
 *
 * Scans runtime/fonts/* and runtime/themes/*, builds CSS variables and
 * effect payloads, and caches UI assets (harness-ui.css / harness-ui.js).
 */
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

const THUMB_MIMES = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function loadThumbnailDataUrl(filePath) {
  if (!filePath) return null;
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mime = THUMB_MIMES[ext];
    if (!mime || !fs.existsSync(filePath)) return null;
    const b64 = fs.readFileSync(filePath).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

function resolveThemeThumbnail(themeId, manifest) {
  const candidates = [];
  if (manifest && typeof manifest.thumbnail === 'string' && manifest.thumbnail.trim()) {
    candidates.push(manifest.thumbnail.trim());
  }
  candidates.push('thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg');
  for (const rel of candidates) {
    const safeRel = path.basename(rel);
    const full = config.runtimePath('themes', themeId, safeRel);
    const dataUrl = loadThumbnailDataUrl(full);
    if (dataUrl) return dataUrl;
  }
  return null;
}

const GENERIC = {
  ui: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  code: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const RANGES = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  vietnamese: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
};

let cache = null;

function loadFonts() {
  const defs = config.readJson(config.runtimePath('fonts', 'fonts.json'), []);
  let css = '';
  for (const f of defs) {
    for (const file of f.files || []) {
      let b64;
      try {
        b64 = fs.readFileSync(config.runtimePath('fonts', file.file)).toString('base64');
      } catch {
        continue;
      }
      css += `@font-face{font-family:"HX-${f.id}";font-style:normal;font-weight:${file.weight || 400};` +
        `font-display:swap;${f.sizeAdjust ? `size-adjust:${f.sizeAdjust};` : ''}` +
        `src:url(data:font/woff2;base64,${b64}) format("woff2");unicode-range:${RANGES[file.subset] || RANGES.latin};}\n`;
    }
  }
  return { defs, css };
}

function fontStack(fontId, kind) {
  const generic = GENERIC[kind] || GENERIC.ui;
  if (!fontId || fontId === 'system') return generic;
  const fallback = fontId === 'jetbrains-mono' ? '' : '"HX-jetbrains-mono", ';
  return `"HX-${fontId}", ${fallback}${generic}`;
}

function loadThemes() {
  const out = [{
    id: 'default',
    builtin: true,
    name: 'Antigravity gốc',
    description: 'Giao diện tối giản nguyên bản của ứng dụng, giữ nguyên bố cục và màu sắc mặc định.',
    options: [],
    colors: { bg: '#131313', fg: '#fafafa', accent: '#7aa7ff' },
    thumbnail: loadThumbnailDataUrl(config.runtimePath('core', 'ui', 'assets', 'default-theme.png')),
  }];
  let dirs = [];
  try {
    dirs = fs.readdirSync(config.runtimePath('themes'), { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    // No custom themes directory
  }
  for (const d of dirs) {
    const m = config.readJson(config.runtimePath('themes', d.name, 'manifest.json'), null);
    if (!m) continue;
    m.id = d.name;
    m.scope = m.scope || 'visual';
    m.css = config.readText(config.runtimePath('themes', d.name, 'theme.css'));
    m.effects = config.readText(config.runtimePath('themes', d.name, 'effects.js'));
    m.layoutJs = config.readText(config.runtimePath('themes', d.name, 'layout.js'));
    m.shellJs = config.readText(config.runtimePath('themes', d.name, 'shell.js'));
    m.thumbnailDataUrl = resolveThemeThumbnail(d.name, m);
    out.push(m);
  }
  return out;
}

function optionDefaults(manifest) {
  const d = {};
  for (const o of manifest.options || []) {
    d[o.id] = o.default;
    if (o.type === 'palette') d.customColors = { ...o.customColors };
  }
  return d;
}

function themeConfig(manifest, cfg) {
  const saved = (cfg.themes && cfg.themes[manifest.id]) || {};
  const merged = { ...optionDefaults(manifest), ...saved };
  if (merged.customColors) {
    merged.customColors = { ...optionDefaults(manifest).customColors, ...(saved.customColors || {}) };
  }
  return merged;
}

function resolveColors(manifest, tc) {
  const po = (manifest.options || []).find((o) => o.type === 'palette');
  if (!po) return manifest.colors || null;
  if (tc.palette === 'custom') return { ...tc.customColors, scheme: tc.scheme || 'dark' };
  const pal = (po.palettes || []).find((x) => x.id === tc.palette) || po.palettes[0];
  return { bg: pal.bg, fg: pal.fg, accent: pal.accent, scheme: pal.scheme || 'dark' };
}

function ensureCache(force = false) {
  if (cache && !force) return cache;
  cache = {
    fonts: loadFonts(),
    uiCss: config.readText(config.runtimePath('core', 'ui', 'harness-ui.css')),
    uiJs: config.readText(config.runtimePath('core', 'ui', 'harness-ui.js')),
    themes: loadThemes(),
  };
  return cache;
}

function getThemeState(cfg) {
  const c = ensureCache();
  return {
    activeTheme: cfg.activeTheme,
    fonts: c.fonts.defs.map((f) => ({ id: f.id, name: f.name, kind: f.kind })),
    themes: c.themes.map((m) => {
      const tc = m.builtin ? {} : themeConfig(m, cfg);
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        builtin: !!m.builtin,
        scope: m.builtin ? 'visual' : (m.scope || 'visual'),
        surfaces: m.surfaces || [],
        entities: m.entities || [],
        options: m.options || [],
        config: tc,
        colors: m.builtin ? m.colors : resolveColors(m, tc),
        thumbnail: m.builtin ? (m.thumbnail || null) : (m.thumbnailDataUrl || null),
      };
    }),
  };
}

function buildThemeInjection(cfg) {
  const c = ensureCache();
  const m = c.themes.find((t) => t.id === cfg.activeTheme && !t.builtin);
  if (!m) return { css: '', effects: null, scope: 'visual', overridesDefaultShell: false };
  const scope = m.scope || 'visual';
  const tc = themeConfig(m, cfg);
  const colors = resolveColors(m, tc) || {};
  let vars = `:root{color-scheme:${colors.scheme || 'dark'};--hx-bg:${colors.bg};--hx-fg:${colors.fg};--hx-accent:${colors.accent};` +
    `--hx-px:${Number(tc.pixelSize) || 2}px;`;
  for (const o of m.options || []) {
    if (o.type === 'font') vars += `--hx-font-${o.id}:${fontStack(tc[o.id], o.kind)};`;
  }
  vars += '}\n';

  const effects = m.effects ? {
    id: m.id,
    colors,
    options: tc,
    code: m.effects,
    surfaces: m.surfaces || [],
    entities: m.entities || [],
  } : null;

  return {
    id: m.id,
    scope,
    css: vars + (m.css || ''),
    effects,
    layoutJs: m.layoutJs || null,
    shellJs: m.shellJs || null,
    overridesDefaultShell: Boolean(m.overridesDefaultShell),
    manifest: m,
  };
}

module.exports = {
  ensureCache,
  getThemeState,
  buildThemeInjection,
};
