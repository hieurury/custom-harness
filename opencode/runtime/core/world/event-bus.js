'use strict';
/*
 * OpenCode Harness — EventBus
 * Core pub/sub event bus enabling decoupled communication between:
 * - Themes (effects, weather, hazards)
 * - Pets (behaviors, physics, dialogue triggers)
 * - UI Shell / Layout (region updates, prompt events)
 */

(function (root, factory) {
  const createFn = factory();
  if (typeof window !== 'undefined') {
    window.createEventBus = createFn;
    if (!window.__hxBus) {
      window.__hxBus = createFn();
    }
  } else if (typeof root !== 'undefined') {
    root.createEventBus = createFn;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = createFn;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createEventBus() {
    // Map<eventName, Set<{ handler: Function, owner: string }>>
    const events = new Map();

    return {
      on(event, handler, owner = 'default') {
        if (!event || typeof handler !== 'function') return this;
        if (!events.has(event)) {
          events.set(event, new Set());
        }
        events.get(event).add({ handler, owner });
        return this;
      },

      off(event, handler) {
        if (!event || !events.has(event)) return this;
        const listeners = events.get(event);
        if (!handler) {
          events.delete(event);
          return this;
        }
        for (const item of listeners) {
          if (item.handler === handler) {
            listeners.delete(item);
          }
        }
        if (listeners.size === 0) {
          events.delete(event);
        }
        return this;
      },

      emit(event, payload) {
        if (!event || !events.has(event)) return false;
        const listeners = Array.from(events.get(event));
        for (const item of listeners) {
          try {
            item.handler(payload, event);
          } catch (err) {
            console.error(`[EventBus] Error in listener for "${event}" (owner: ${item.owner}):`, err);
          }
        }
        return true;
      },

      clear(owner) {
        if (!owner || owner === '*') {
          events.clear();
          return this;
        }
        for (const [eventName, listeners] of events.entries()) {
          for (const item of listeners) {
            if (item.owner === owner) {
              listeners.delete(item);
            }
          }
          if (listeners.size === 0) {
            events.delete(eventName);
          }
        }
        return this;
      },

      has(event) {
        return events.has(event) && events.get(event).size > 0;
      },

      getListenersCount(event) {
        if (!event) {
          let count = 0;
          for (const set of events.values()) count += set.size;
          return count;
        }
        return events.has(event) ? events.get(event).size : 0;
      }
    };
  }

  return createEventBus;
});
