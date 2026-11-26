'use strict';
/*
 * OpenCode Harness — ThemeStore
 * Dual-tier persistent store for theme state (e.g., tree growth, world state):
 *  - Instant synchronous reads/writes backed by in-memory cache + localStorage
 *  - Debounced async disk persistence via window.opencodeHarness IPC
 */

(function (root, factory) {
  const createFn = factory();
  if (typeof window !== 'undefined') {
    window.createThemeStore = createFn;
    if (!window.__hxStore || !window.__hxStore.get) {
      window.__hxStore = createFn();
    }
  } else if (typeof root !== 'undefined') {
    root.createThemeStore = createFn;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = createFn;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PREFIX = 'hx_theme_store_v1:';
  const DEBOUNCE_MS = 400;

  function createThemeStore() {
    const cache = new Map();
    const timers = new Map();

    function getStorage() {
      try {
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
          return globalThis.localStorage;
        }
      } catch {
        // Ignore storage access errors
      }
      return null;
    }

    function getHarnessBridge() {
      try {
        if (typeof globalThis !== 'undefined' && globalThis.opencodeHarness) {
          return globalThis.opencodeHarness;
        }
        if (typeof globalThis !== 'undefined' && globalThis.antigravityHarness) {
          return globalThis.antigravityHarness;
        }
      } catch {
        // Ignore bridge access errors
      }
      return null;
    }

    function writeToDisk(key, value) {
      const bridge = getHarnessBridge();
      if (!bridge || typeof bridge.saveThemeStateData !== 'function') {
        return Promise.resolve(false);
      }
      try {
        return Promise.resolve(bridge.saveThemeStateData(key, value)).catch(() => false);
      } catch {
        return Promise.resolve(false);
      }
    }

    function get(key, fallback = null) {
      if (!key) return fallback;
      if (cache.has(key)) {
        return cache.get(key);
      }
      const storage = getStorage();
      if (storage) {
        try {
          const raw = storage.getItem(PREFIX + key);
          if (raw !== null && raw !== undefined) {
            const parsed = JSON.parse(raw);
            cache.set(key, parsed);
            return parsed;
          }
        } catch {
          // Ignore corrupted JSON or storage errors
        }
      }
      return fallback;
    }

    function set(key, value) {
      if (!key) return value;
      cache.set(key, value);

      const storage = getStorage();
      if (storage) {
        try {
          storage.setItem(PREFIX + key, JSON.stringify(value));
        } catch {
          // Ignore quota or serialization errors
        }
      }

      if (timers.has(key)) {
        clearTimeout(timers.get(key));
      }
      const timer = setTimeout(() => {
        timers.delete(key);
        writeToDisk(key, cache.get(key));
      }, DEBOUNCE_MS);
      timers.set(key, timer);
      return value;
    }

    function flush(key) {
      if (key) {
        if (timers.has(key)) {
          clearTimeout(timers.get(key));
          timers.delete(key);
        }
        if (cache.has(key)) {
          return writeToDisk(key, cache.get(key));
        }
        return Promise.resolve(false);
      }
      const pending = [];
      for (const [k, timer] of Array.from(timers.entries())) {
        clearTimeout(timer);
        timers.delete(k);
        if (cache.has(k)) {
          pending.push(writeToDisk(k, cache.get(k)));
        }
      }
      return Promise.all(pending);
    }

    function hydrate(key, onHydrated) {
      if (!key) return Promise.resolve(null);
      const bridge = getHarnessBridge();
      if (!bridge || typeof bridge.getThemeStateData !== 'function') {
        return Promise.resolve(null);
      }
      try {
        return Promise.resolve(bridge.getThemeStateData(key))
          .then((disk) => {
            if (!disk || typeof disk !== 'object') return null;
            const local = get(key, null);
            const diskTs = typeof disk.updatedAt === 'number' ? disk.updatedAt : 0;
            const localTs = local && typeof local.updatedAt === 'number' ? local.updatedAt : 0;
            if (!local || diskTs > localTs) {
              cache.set(key, disk);
              const storage = getStorage();
              if (storage) {
                try {
                  storage.setItem(PREFIX + key, JSON.stringify(disk));
                } catch {
                  // Ignore storage errors
                }
              }
              if (typeof onHydrated === 'function') {
                onHydrated(disk);
              }
              return disk;
            }
            return local;
          })
          .catch(() => null);
      } catch {
        return Promise.resolve(null);
      }
    }

    function remove(key) {
      if (!key) return;
      cache.delete(key);
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
        timers.delete(key);
      }
      const storage = getStorage();
      if (storage) {
        try {
          storage.removeItem(PREFIX + key);
        } catch {
          // Ignore storage errors
        }
      }
    }

    return {
      get,
      set,
      flush,
      hydrate,
      remove,
    };
  }

  return createThemeStore;
});
