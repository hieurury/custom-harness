'use strict';
/*
 * Antigravity Harness — WorldRegistry
 * Coordinates physical surfaces (ground, water, platforms), world entities
 * (lightning hazards, weather props, toys, foods), and pet spatial registration.
 *
 * Provides a unified environment representation shared between theme effects,
 * interactive hazards, and multi-pet awareness.
 */

(function (root, factory) {
  const createFn = factory();
  if (typeof window !== 'undefined') {
    window.createWorldRegistry = createFn;
    if (!window.__hxWorld || !window.__hxWorld.registerSurface) {
      window.__hxWorld = createFn(window.__hxBus, window.__hxWorld);
    }
  } else if (typeof root !== 'undefined') {
    root.createWorldRegistry = createFn;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = createFn;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createWorldRegistry(eventBus, legacyManager) {
    const bus = () => eventBus || (typeof window !== 'undefined' ? window.__hxBus : null);
    let legacy = legacyManager || null;
    let proxied = null;
    const surfaces = new Map();
    const entities = new Map();
    const pets = new Map(); // petId -> { getBounds: Function, meta: Object }

    const registry = {
      setLegacyManager(manager) {
        legacy = manager || null;
        return proxied || registry;
      },

      // --- Surfaces API ---
      registerSurface(s) {
        if (!s || !s.id) return null;
        const surface = {
          id: s.id,
          name: s.name || s.id,
          category: s.category || s.type || 'platform',
          type: s.type || 'platform', // 'ground' | 'platform' | 'water' | 'wall' | 'ceiling'
          left: typeof s.left === 'number' ? s.left : 0,
          right: typeof s.right === 'number' ? s.right : (typeof window !== 'undefined' ? window.innerWidth : 1000),
          top: typeof s.top === 'number' ? s.top : 0,
          bottom: typeof s.bottom === 'number' ? s.bottom : 0,
          surfaceY: typeof s.surfaceY === 'number' ? s.surfaceY : (s.top || 0),
          isFloor: Boolean(s.isFloor),
          source: s.source || 'theme',
          metadata: s.metadata || {},
        };
        surfaces.set(surface.id, surface);
        bus()?.emit('world:surface_registered', { id: surface.id, surface });
        return surface;
      },

      updateSurface(id, patch) {
        const s = surfaces.get(id);
        if (!s) return null;
        Object.assign(s, patch);
        bus()?.emit('world:surface_updated', { id, surface: s });
        return s;
      },

      removeSurface(id) {
        const s = surfaces.get(id);
        if (!s) return false;
        surfaces.delete(id);
        bus()?.emit('world:surface_removed', { id, surface: s });
        return true;
      },

      querySurfaces(filter = {}) {
        const results = [];
        const entries = Object.entries(filter);
        for (const s of surfaces.values()) {
          const matches = entries.every(([key, val]) => {
            if (Array.isArray(val)) return val.includes(s[key]);
            return s[key] === val;
          });
          if (matches) results.push(s);
        }
        return results;
      },

      findSurfaceBelow(footX, footY) {
        let best = null;
        let minDistance = Infinity;
        for (const s of surfaces.values()) {
          if (footX >= s.left - 6 && footX <= s.right + 6) {
            const dist = s.surfaceY - footY;
            if (dist >= -4 && dist < minDistance) {
              minDistance = dist;
              best = s;
            }
          }
        }
        return best;
      },

      // --- Entity API (Lightning, Hazards, Weather Props, Particles) ---
      spawnEntity(entityDef) {
        if (!entityDef || !entityDef.id) return null;
        const entity = {
          id: entityDef.id,
          type: entityDef.type || 'prop',
          x: entityDef.x || 0,
          y: entityDef.y || 0,
          w: entityDef.w || 16,
          h: entityDef.h || 16,
          hitbox: entityDef.hitbox || { w: entityDef.w || 16, h: entityDef.h || 16 },
          source: entityDef.source || 'theme',
          metadata: entityDef.metadata || {},
          el: entityDef.el || null,
        };
        entities.set(entity.id, entity);
        bus()?.emit('world:entity_spawned', { id: entity.id, entity });
        return entity;
      },

      despawnEntity(id) {
        const e = entities.get(id);
        if (!e) return false;
        if (e.el && e.el.parentNode) {
          e.el.parentNode.removeChild(e.el);
        }
        entities.delete(id);
        bus()?.emit('world:entity_despawned', { id, entity: e });
        return true;
      },

      queryEntitiesNear(x, y, radius = 50, filter = {}) {
        const results = [];
        for (const e of entities.values()) {
          const dist = Math.hypot(e.x - x, e.y - y);
          if (dist <= radius) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (e[k] !== v) { match = false; break; }
            }
            if (match) results.push({ entity: e, distance: dist });
          }
        }
        return results;
      },

      // --- Pets Spatial Registry ---
      registerPet(petId, getBounds, meta = {}) {
        if (!petId) return;
        pets.set(petId, { getBounds, meta });
        bus()?.emit('world:pet_registered', { petId, meta });
      },

      unregisterPet(petId) {
        if (!petId || petId === '*') {
          pets.clear();
          return;
        }
        pets.delete(petId);
        bus()?.emit('world:pet_unregistered', { petId });
      },

      queryPetsNear(x, y, radius = 80, excludePetId = null) {
        const results = [];
        for (const [id, item] of pets.entries()) {
          if (excludePetId && id === excludePetId) continue;
          let bounds = null;
          try {
            bounds = typeof item.getBounds === 'function' ? item.getBounds() : null;
          } catch { /* ignore */ }
          if (!bounds) continue;
          const centerX = bounds.left + bounds.width / 2;
          const centerY = bounds.top + bounds.height / 2;
          const dist = Math.hypot(centerX - x, centerY - y);
          if (dist <= radius) {
            results.push({ petId: id, distance: dist, bounds, meta: item.meta });
          }
        }
        return results;
      },

      clear(source) {
        if (!source || source === '*') {
          surfaces.clear();
          for (const id of Array.from(entities.keys())) {
            this.despawnEntity(id);
          }
          return this;
        }
        for (const [id, s] of Array.from(surfaces.entries())) {
          if (s.source === source) this.removeSurface(id);
        }
        for (const [id, e] of Array.from(entities.entries())) {
          if (e.source === source) this.despawnEntity(id);
        }
        return this;
      }
    };

    // Always wrap in Proxy so setLegacyManager() can attach/swap legacyManager later without recreating registry
    proxied = new Proxy(registry, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (legacy && prop in legacy) {
          const val = legacy[prop];
          return typeof val === 'function' ? val.bind(legacy) : val;
        }
        return undefined;
      },
      set(target, prop, value) {
        if (prop in target) {
          target[prop] = value;
          return true;
        }
        if (legacy) {
          legacy[prop] = value;
          return true;
        }
        target[prop] = value;
        return true;
      }
    });

    return proxied;
  }

  return createWorldRegistry;
});
