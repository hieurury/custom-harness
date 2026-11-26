'use strict';
/*
 * OpenCode Harness — LayoutRegistry
 * Single source of truth for all layout regions, slots, and interactive UI anchors.
 * Allows pets and environment entities to dynamically discover surfaces and elements
 * without relying on brittle, hardcoded CSS selectors.
 */

(function (root, factory) {
  const createFn = factory();
  if (typeof window !== 'undefined') {
    window.createLayoutRegistry = createFn;
    if (!window.__hxLayout) {
      window.__hxLayout = createFn(window.__hxBus);
    }
  } else if (typeof root !== 'undefined') {
    root.createLayoutRegistry = createFn;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = createFn;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createLayoutRegistry(eventBus) {
    const bus = () => eventBus || (typeof window !== 'undefined' ? window.__hxBus : null);
    const regions = new Map();
    const observedElements = new Map(); // element -> Set(regionId)
    let resizeObserver = null;

    function getBounds(el, fallbackRect) {
      if (el && typeof el.getBoundingClientRect === 'function') {
        try {
          const r = el.getBoundingClientRect();
          return {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        } catch {
          // Fallback if detached or failed
        }
      }
      return fallbackRect || { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }

    function initObserver() {
      if (resizeObserver || typeof ResizeObserver === 'undefined') return;
      try {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const el = entry.target;
            const regionIds = observedElements.get(el);
            if (!regionIds) continue;
            for (const id of regionIds) {
              const r = regions.get(id);
              if (r) {
                r.rect = getBounds(el, r.rect);
                bus()?.emit('layout:region_updated', { id, rect: r.rect, region: r });
              }
            }
          }
        });
      } catch (e) {
        console.warn('[LayoutRegistry] ResizeObserver setup failed:', e);
      }
    }

    return {
      registerRegion(def) {
        if (!def || !def.id) return null;
        initObserver();

        const id = def.id;
        const el = def.element || null;
        const rect = getBounds(el, def.rect);

        const region = {
          id,
          role: def.role || 'panel', // 'input' | 'nav' | 'sidebar' | 'panel' | 'overlay' | 'ambient'
          element: el,
          rect,
          perchable: def.perchable !== false,
          interactable: def.interactable !== false,
          source: def.source || 'default-shell',
          metadata: def.metadata || {},
          description: def.description || '',
        };

        regions.set(id, region);

        if (el && resizeObserver) {
          if (!observedElements.has(el)) {
            observedElements.set(el, new Set());
            try {
              resizeObserver.observe(el);
            } catch { /* ignore */ }
          }
          observedElements.get(el).add(id);
        }

        bus()?.emit('layout:region_registered', { id, region });
        return region;
      },

      updateRegion(id, patch) {
        const r = regions.get(id);
        if (!r) return null;

        Object.assign(r, patch);
        if (r.element) {
          r.rect = getBounds(r.element, r.rect);
        }
        bus()?.emit('layout:region_updated', { id, rect: r.rect, region: r });
        return r;
      },

      removeRegion(id) {
        const r = regions.get(id);
        if (!r) return false;

        if (r.element && resizeObserver) {
          const set = observedElements.get(r.element);
          if (set) {
            set.delete(id);
            if (set.size === 0) {
              observedElements.delete(r.element);
              try {
                resizeObserver.unobserve(r.element);
              } catch { /* ignore */ }
            }
          }
        }

        regions.delete(id);
        bus()?.emit('layout:region_removed', { id, region: r });
        return true;
      },

      getRegion(id) {
        const r = regions.get(id);
        if (!r) return null;
        if (r.element && r.element.isConnected) {
          r.rect = getBounds(r.element, r.rect);
        }
        return r;
      },

      queryRegions(filter = {}) {
        const results = [];
        const entries = Object.entries(filter);
        for (const r of regions.values()) {
          if (r.element && r.element.isConnected) {
            r.rect = getBounds(r.element, r.rect);
          }
          const matches = entries.every(([key, val]) => {
            if (Array.isArray(val)) {
              return val.includes(r[key]);
            }
            return r[key] === val;
          });
          if (matches) results.push(r);
        }
        return results;
      },

      clear(source) {
        if (!source || source === '*') {
          for (const id of Array.from(regions.keys())) {
            this.removeRegion(id);
          }
          return this;
        }

        for (const [id, r] of Array.from(regions.entries())) {
          if (r.source === source) {
            this.removeRegion(id);
          }
        }
        return this;
      },

      refreshAll() {
        for (const r of regions.values()) {
          if (r.element && r.element.isConnected) {
            r.rect = getBounds(r.element, r.rect);
          }
        }
      }
    };
  }

  return createLayoutRegistry;
});
