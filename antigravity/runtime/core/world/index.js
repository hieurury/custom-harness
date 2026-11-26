'use strict';
/*
 * Antigravity Harness — World Bundle Loader (Node.js)
 * Packages the EventBus, LayoutRegistry, and WorldRegistry for injection
 * into Hub windows before themes, layout scripts, or pets execute.
 */

const fs = require('fs');
const path = require('path');

let cachedBootstrap = null;

function getBootstrapScript(force = false) {
  if (cachedBootstrap && !force) return cachedBootstrap;

  const eventBusCode = fs.readFileSync(path.join(__dirname, 'event-bus.js'), 'utf8');
  const layoutRegCode = fs.readFileSync(path.join(__dirname, 'layout-registry.js'), 'utf8');
  const worldRegCode = fs.readFileSync(path.join(__dirname, 'world-registry.js'), 'utf8');
  const themeStoreCode = fs.readFileSync(path.join(__dirname, 'theme-store.js'), 'utf8');

  cachedBootstrap = `(function() {
    try {
      ${eventBusCode}
      ${layoutRegCode}
      ${worldRegCode}
      ${themeStoreCode}
      if (!window.__hxBus) {
        window.__hxBus = window.createEventBus();
      }
      if (!window.__hxLayout) {
        window.__hxLayout = window.createLayoutRegistry(window.__hxBus);
      }
      if (!window.__hxWorld || !window.__hxWorld.registerSurface) {
        window.__hxWorld = window.createWorldRegistry(window.__hxBus, window.__hxWorld);
      }
      if (!window.__hxStore || !window.__hxStore.get) {
        window.__hxStore = window.createThemeStore();
      }
    } catch(err) {
      console.error('[Harness] Failed to bootstrap world runtime:', err);
    }
  })();`;

  return cachedBootstrap;
}

module.exports = {
  getBootstrapScript,
  createEventBus: require('./event-bus.js'),
  createLayoutRegistry: require('./layout-registry.js'),
  createWorldRegistry: require('./world-registry.js'),
  createThemeStore: require('./theme-store.js'),
};
