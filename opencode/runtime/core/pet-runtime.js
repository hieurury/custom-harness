(() => {
  'use strict';

  // 1. Aggressive cleanup of any previous stages, pets, menus, or world entities
  if (window.__hxPetCleanup) {
    try { window.__hxPetCleanup(); } catch (e) { /* ignore */ }
  }
  document.querySelectorAll('#hx-pet-stage, .hx-pet, .hx-playground-menu, .hx-radial-menu, .hx-pet-action-orbit, .hx-pet-radial-menu, .hx-pet-context-menu, .hx-pet-menu-backdrop, .hx-world-food, .hx-world-creature, .hx-held-hud, .hx-pet-laser-dot, .hx-laser-hud, .hx-pet-ball, .hx-pet-particle').forEach((el) => el.remove());

  const STAGE_ID = 'hx-pet-stage';
  const stage = document.createElement('div');
  stage.id = STAGE_ID;
  stage.style.position = 'fixed';
  stage.style.inset = '0';
  stage.style.pointerEvents = 'none';
  stage.style.zIndex = '2147483600';
  document.body.appendChild(stage);

  const petInstances = [];
  let animFrameId = null;

  // -----------------------------------------------------------
  // Vector SVG Icons (100% Emoji-Free)
  // -----------------------------------------------------------
  const SVGIcons = {
    food: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16a1 1 0 0 1 1 1 8 8 0 0 1-8 8 8 8 0 0 1-8-8 1 1 0 0 1 1-1z"/><path d="M7 8c1-1 2-1 3 0s2 1 3 0M14 7c1-1 2-1 3 0"/></svg>',
    toy: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></svg>',
    petting: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8a6 6 0 0 0 12 0v-4a2 2 0 0 0-2-2z"/></svg>',
    sleep: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><circle cx="18" cy="5" r="0.8" fill="currentColor"/><circle cx="20" cy="9" r="0.8" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    coffee: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
    bug: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2"/></svg>',
    beetle: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M8 5a4 4 0 0 1 8 0M5 10c0 5 3 9 7 9s7-4 7-9H5zM3 13l2-1M21 13l-2-1M4 19l3-2M20 19l-3-2M4 7l3 2M20 7l-3 2"/></svg>',
    cookie: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="10" cy="15" r="1"/><circle cx="14" cy="15" r="1"/></svg>',
    fish: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6z"/><path d="M18 12v.5M2 8l4.5 4L2 16"/><circle cx="16" cy="10" r="1"/></svg>',
    laser: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
    ball: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M3.6 9h16.8M3.6 15h16.8"/></svg>',
    broom: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3l3 3L8 19l-5 2 2-5L18 3zM14 7l3 3"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11a7.5 7.5 0 0 1 13.5-2"/><polyline points="19 4 19 9 14 9"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/></svg>',
    code: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="18" height="18" x="-9" y="-20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  };

  const PIXEL_ASSETS = {
  "bug": {
    "strip": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABPUlEQVR4nGNgGAWjYBSMgkEEfhaL/f9ZLPYfWYxfWeS/172G//zKIv9x6RsUAJvjSQEwjyJ7FiamdDSOJoHABGNQw/GB2VkMgdlZDOiORPYELg/wK4v8/3DnNcNRy1VYzb/Bvp3hxvN7eN1Ajh+YCDmeGIDN8cgett6dw7Dh3VS8Zny8+4ZRQEWUQXidCYpHP959w3jUdQpDgFA2w+fd9/G6gRw/MBFyPC42Pseje/j0or0EPQAz523cNobPu+8zsMVqonhkm1ID4+uGw4y4PE+RH/iVRf4rHY2D57NfZ0T/Kx2N+//rjCgGn1AyFm2w/S/aYIuRj5HV4A0FJDWkxCS5fmBENoAtVhNuoGmcM8PpRXsx2AwMDAy/Fl9n+Hj3Dc7YgMkhs+kBKPYDrpgiNQYHEgwHP4yCUTAK6AcAc/cstMUPPJcAAAAASUVORK5CYII=",
    "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAApElEQVR4nGNgGAWDCPwsFvv/s1jsP6n6GBkYGBj4lUX+W+/OYWBgYGA46jqF4ePdN4zEGsDEryzy/8Od1wxHLVfBBb3uNfxXOhr3n19Z5D8uNtyAj3ffMAqoiDIIrzNhuPH8HoP17hyGDe+mMjAwMDC8XglxyA327QzCi7zg4hhegHmDLVYTLmEa58xwetFeDDYDAwPDr8XXsXsT2WnEsEcBBAAA0qBG2bDGP0EAAAAASUVORK5CYII=",
    "frames": 4,
    "fps": 5,
    "isCreature": true
  },
  "beetle": {
    "strip": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABSElEQVR4nO2VsU7DMBiEz4jNQ4dMTZduDCnqA3Sp+gQszEgMfSBGBiqGMDCxsCKWjgghNarYWOpMlooiD0FBZmkq48aOW0W0Ebkpsfzd5f/t2ECjw1aYZGyZSrlMpQyTjFXtf1y1YZWiXiABxI9f37E6JnhEXPnrj7dYHRt3+22V32iAuKESAOilcAo5ZF7wiIy7fblgMwBAx+9Bb96R+rLq+Mazq2x8mGSsbAvr/KqAdj6mr55LvuAR6fi9wuIBgKjA+dUrAGD69AkAYA/DQsgUbuLVrWgqoozPi9kl3/bdJIdP71/A7xIAwGDU2srEhadeIBdsVrgSf5FvbAD1AumfPdv8rSZ153+dAYNRC+l8gnQ+sRqaVEd+/Qt4JxeFE/j7rdMWrDO/PjGLTlHX20Cfvw2/13x9wi5Xoc2jzGff+Y0aNfrf+gF0gDnCMzYGlwAAAABJRU5ErkJggg==",
    "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAk0lEQVR4nGNgGH7g6zzu/1/ncf8nVj0TModbWPs/NjY+wIisIXTSeQYGBgaGo/s+MjAwMDA82+DA8PXtVUbsWpEM4BbW/q+76izD22WfGRgYGBisnfiJNoSRW1j7v1TAAbzOxGcIShhYO/Ez/Lw+n+Hn9fl4DcTqBWH1eKwK3t5cSDAc4CGOLRYIxga6AnKicqQDANLFOzXlyrpnAAAAAElFTkSuQmCC",
    "frames": 4,
    "fps": 8,
    "isCreature": true
  },
  "fish": {
    "strip": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABSklEQVR4nO2WvU7DMBSFT6IOIFtZIyYegYG1D1A8s3Wju1+gMzNSZpotW8UYVV26dOUhWJCyx2KCyxASYuG/glIJNWeynXzn2tfOdYBRo0adsiLToMoZtW12p4zvuGTj2/F0vUBdZlbfoeKbFPc7XEjiQnZwul6g3/fJxYf4DBnfpkkffnp8AABc7JYAgHj+9QyguswiLiTZdi6ET9FMxuQRwvsWHzJ/Y3wuJBERnV3dUFJUlBQVbV/fu3ZSVNRm15TRQ3jb5I/Bq5yRypnmE3EhKZ4vNUO134BNZ13/o7hHdbsC0ByrfhZDedfJCeVNOxjKA9DW0HpM6jKLOKCZsOkMar/p2i75+POXZ2fBC43fFLZVtwGH8rZPUMvk2+W1ZgJ8Zy+kBvh4WxJCedct8tv4P0wAWI+7T0Pz1iL2h/hH/Q/4L/yoUSekT5RDjMecibgcAAAAAElFTkSuQmCC",
    "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAzklEQVR4nGNgGAWM2AS/zuP+D2NzJ33FqgYGWJA5PF55UI1zGRgYGBjE1yQz8Hgx/P+ybRJeQ+Cadz37+3/Xs7//+Za+RMEwgxEWoHmBxyvv/+etExk4DbwY2MoWMDAwMDCscRRhCNn/Bq7w39JWOBvZRYw8Xnn/maKrUUz9emQHA7eNB4rmlyEIbyEbwvRl2yRGZNMZGBgYuG08GL4e2cHw9cgOgl5ngZnGw8Dw/7u8MYohyE7nTvrKyOOVhxGgKBxYIOFyLjZAcToYBgAAUFNdllVj2oEAAAAASUVORK5CYII=",
    "frames": 4,
    "fps": 6,
    "isCreature": true
  },
  "coffee": {
    "strip": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAoElEQVR4nGNgoBW4c+fOpTt37lwiJEZ9zaQawoiu0UpO5P/uhu84DXZt4GRgYGBgOPboDSMDAwMDCzbNATU/cBqwu4WBoXk6CwMDg8j/Y4/eMLKgK9i/9R9DviUbXhfYif+G85lwqsQDOk5/hHudLAOs5ET+w9gYXjjyCLfzYQAWgBguOPboDeOhl6w4NR56yYqimYEBSzSiOxGXzaMAAQDsiVT85WJCewAAAABJRU5ErkJggg==",
    "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAoElEQVR4nGNgoBW4c+fOpTt37lwiJEZ9zaQawoiu0UpO5P/uhu84DXZt4GRgYGBgOPboDSMDAwMDCzbNATU/cBqwu4WBoXk6CwMDg8j/Y4/eMLKgK9i/9R9DviUbXhfYif+G85lwqsQDOk5/hHudLAOs5ET+w9gYXjjyCLfzYQAWgBguOPboDeOhl6w4NR56yYqimYEBSzSiOxGXzaMAAQDsiVT85WJCewAAAABJRU5ErkJggg==",
    "frames": 1,
    "fps": 3,
    "isCreature": false
  },
  "cookie": {
    "strip": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3klEQVR4nGNgGGjAiEuiwpT/PzK/4/RHrGpZcGlq7hJFVVnGAJfDaliFKf//3/tV/v/er/L/Zjnb/5vlbP9dpZhR+L/3q/zfEsz5H9kiRpjm5i5Rhns7HuHyEUPO4r8MU2KZGRgYGBhu32FmOPKIjaHj9EdGJpiCezseMeQs/ouhCQZgmtEBY4Up//9Ep+84bcYFYK5gQhZEdwEhcQYGpDBAdgWyf/HZjhIGt+8gNMA0Y7MZWTPcBTBX2Mj9wmkrDCBrZmBASkgdpz8yVjAg4hfdsCOP2LAaSHFSHngAADGLbuH3zlhjAAAAAElFTkSuQmCC",
    "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3klEQVR4nGNgGGjAiEuiwpT/PzK/4/RHrGpZcGlq7hJFVVnGAJfDaliFKf//3/tV/v/er/L/Zjnb/5vlbP9dpZhR+L/3q/zfEsz5H9kiRpjm5i5Rhns7HuHyEUPO4r8MU2KZGRgYGBhu32FmOPKIjaHj9EdGJpiCezseMeQs/ouhCQZgmtEBY4Up//9Ep+84bcYFYK5gQhZEdwEhcQYGpDBAdgWyf/HZjhIGt+8gNMA0Y7MZWTPcBTBX2Mj9wmkrDCBrZmBASkgdpz8yVjAg4hfdsCOP2LAaSHFSHngAADGLbuH3zlhjAAAAAElFTkSuQmCC",
    "frames": 1,
    "fps": 1,
    "isCreature": false
  }
};

  const FOOD_DEFS = {
    bug: { id: 'bug', name: 'Sâu Bug', icon: PIXEL_ASSETS.bug.icon, isCreature: true },
    beetle: { id: 'beetle', name: 'Bọ Cánh', icon: PIXEL_ASSETS.beetle.icon, isCreature: true },
    coffee: { id: 'coffee', name: 'Cà phê', icon: PIXEL_ASSETS.coffee.icon, isCreature: false },
    cookie: { id: 'cookie', name: 'Bánh Quy', icon: PIXEL_ASSETS.cookie.icon, isCreature: false },
    fish: { id: 'fish', name: 'Cá Nhỏ', icon: PIXEL_ASSETS.fish.icon, isCreature: true },
  };

  // -----------------------------------------------------------
  // Geometry: Polar to Cartesian & SVG Arc Wedges Generator
  // -----------------------------------------------------------
  function polarToCartesian(centerX, centerY, radius, angleInRadians) {
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  function describeArc(cx, cy, rIn, rOut, startAngle, endAngle) {
    const p1 = polarToCartesian(cx, cy, rOut, startAngle);
    const p2 = polarToCartesian(cx, cy, rOut, endAngle);
    const p3 = polarToCartesian(cx, cy, rIn, endAngle);
    const p4 = polarToCartesian(cx, cy, rIn, startAngle);
    const angleDiff = endAngle - startAngle;
    const largeArc = angleDiff > Math.PI ? 1 : 0;

    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${rOut} ${rOut} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${rIn} ${rIn} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  // -----------------------------------------------------------
  // Universal Physics & Environment Manager
  // (Surfaces, Platforms, Ceilings, Walls & Floor Scanner)
  // -----------------------------------------------------------
  const EnvironmentManager = {
    platforms: [],
    lastScanTime: 0,
    scanInterval: 250,

    scan() {
      const now = performance.now();
      if (now - this.lastScanTime < this.scanInterval && this.platforms.length > 0) {
        return this.platforms;
      }
      this.lastScanTime = now;

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const platforms = [];

      // 1. Primary Bottom Floor: always present, touches absolute bottom border of app
      platforms.push({
        id: 'ground_floor',
        name: 'Mặt đất đáy ứng dụng',
        type: 'floor',
        left: 0,
        right: winW,
        top: winH,
        bottom: winH,
        surfaceY: winH, // Pet feet rest at Y = winH (pet.y = winH - pet.height)
        isFloor: true,
      });

      // 2. Surfaces from WorldRegistry (Theme surfaces: bank, river, custom platforms)
      if (window.__hxWorld && typeof window.__hxWorld.querySurfaces === 'function') {
        const registeredSurfaces = window.__hxWorld.querySurfaces();
        for (const s of registeredSurfaces) {
          if (s.id === 'ground_floor') continue;
          platforms.push({
            id: s.id,
            name: s.name || s.id,
            category: s.category || s.type,
            type: s.type === 'ground' ? 'floor' : (s.type === 'water' ? 'water' : 'ui'),
            left: s.left,
            right: s.right,
            top: s.top,
            bottom: s.bottom,
            surfaceY: s.surfaceY,
            isFloor: s.isFloor,
            _fromRegistry: true,
          });
        }
      }
      if (!platforms.some((p) => p.id === 'forest_ground_bank') && window.__hxEnv && typeof window.__hxEnv.getBankBounds === 'function') {
        // Fallback for legacy environment or if WorldRegistry bank surface is not yet published
        const bank = window.__hxEnv.getBankBounds();
        if (bank && bank.y > 0) {
          platforms.push({
            id: 'forest_ground_bank',
            name: 'Mặt đất Bờ Rừng Nguyên Sinh',
            category: 'ground',
            type: 'floor',
            left: 0,
            right: winW,
            top: bank.y,
            bottom: bank.y + (bank.height || 34),
            surfaceY: bank.y,
            isFloor: true,
          });
        }
      }

      // 3. Dynamic UI Perchable Regions from LayoutRegistry
      if (window.__hxLayout && typeof window.__hxLayout.queryRegions === 'function') {
        const perchableRegions = window.__hxLayout.queryRegions({ perchable: true });
        for (const r of perchableRegions) {
          if (!r.element || !r.rect) continue;
          if (r.rect.width < 20 || r.rect.height < 14) continue;
          if (r.rect.bottom <= 0 || r.rect.top >= winH) continue;
          if (r.rect.right <= 0 || r.rect.left >= winW) continue;
          if (platforms.some((p) => p.id === r.id)) continue;

          platforms.push({
            id: r.id,
            name: r.description || r.id,
            category: r.role || 'button',
            type: 'ui',
            left: Math.max(0, r.rect.left),
            right: Math.min(winW, r.rect.right),
            top: r.rect.top,
            bottom: r.rect.bottom,
            surfaceY: r.rect.top,
            isFloor: false,
            el: r.element,
            _fromRegistry: true,
          });
        }
      }

      // 4. Legacy DOM Scanner (fallback for any UI elements not yet registered in LayoutRegistry)
      const candidates = [
        // OpenCode (desktop v2) surfaces
        { sel: '[data-slot="input-wrapper"]', name: 'Khung nhập prompt', category: 'prompt' },
        { sel: '[data-slot="header"]', name: 'Thanh Header', category: 'bar' },
        { sel: '[data-slot="sidebar-header"]', name: 'Header Sidebar', category: 'sidebar' },
        { sel: '[data-slot="tab-status"]', name: 'Trạng thái Tab', category: 'tab' },
        { sel: '[data-component="terminal"]', name: 'Terminal', category: 'terminal' },
        { sel: '[data-component="markdown-code"]', name: 'Khối Code Block', category: 'code' },
        { sel: '[data-component="home-session-row"]', name: 'Hàng Hội Thoại Sidebar', category: 'sidebar' },
        { sel: '[data-component="button-v2"]', name: 'Nút hành động', category: 'button' },

        // Prompt & Chat Input
        { sel: '[data-testid="agent-input-box"]', name: 'Khung nhập prompt', category: 'prompt' },
        { sel: '.antigravity-prompt-bar', name: 'Khung nhập prompt', category: 'prompt' },
        { sel: '[data-testid="chat-input"]', name: 'Khung chat', category: 'prompt' },
        { sel: 'textarea.antigravity-prompt-textarea', name: 'Textarea prompt', category: 'prompt' },
        { sel: '[data-testid="send-button"]', name: 'Nút gửi prompt', category: 'button' },
        { sel: '[data-testid="input-cancel-button"]', name: 'Nút hủy input', category: 'button' },
        { sel: '[data-testid="voice-start-button"]', name: 'Nút Voice', category: 'button' },
        { sel: '[data-testid="settings-button"]', name: 'Nút Settings', category: 'button' },
        { sel: '#hx-navbtn', name: 'Nút Harness Menu', category: 'button' },

        // Top Header & Title Bar & Navigation
        { sel: '[data-testid="title-menu-bar"]', name: 'Thanh Menu Bar', category: 'bar' },
        { sel: '[data-testid="title-menu-bar-item"]', name: 'Mục Menu Bar', category: 'button' },
        { sel: '[data-testid="titlebar-more-actions"]', name: 'Nút More Actions', category: 'button' },
        { sel: '[data-testid="toggle-overview-panel"]', name: 'Nút Overview Panel', category: 'button' },
        { sel: 'header.antigravity-header', name: 'Thanh Header', category: 'bar' },
        { sel: '.pane-titlebar', name: 'Thanh Tiêu Đề', category: 'bar' },
        { sel: '[data-testid="breadcrumb-segment"]', name: 'Thanh Breadcrumb', category: 'breadcrumb' },
        { sel: '[data-testid="breadcrumb-bar"]', name: 'Thanh Breadcrumb', category: 'breadcrumb' },

        // Sidebar Actions & Project Items
        { sel: '[data-testid="new-conversation-button"]', name: 'Nút Hội Thoại Mới', category: 'sidebar' },
        { sel: '[data-testid="automations-button"]', name: 'Nút Automations', category: 'sidebar' },
        { sel: '[data-testid="customizations-button"]', name: 'Nút Customizations', category: 'sidebar' },
        { sel: '[data-testid="project-header"]', name: 'Thư mục Dự án', category: 'sidebar' },
        { sel: '[data-testid="conversation-row-sidebar"]', name: 'Hàng Hội Thoại Sidebar', category: 'sidebar' },

        // Central Chat Cards & Artifacts
        { sel: '[data-testid="artifact-card"]', name: 'Thẻ Artifact Kế Hoạch', category: 'card' },
        { sel: '[data-testid="changed-files-card"]', name: 'Thẻ Files Changed', category: 'card' },
        { sel: '[data-testid="changed-files-card-review"]', name: 'Nút Review Code', category: 'button' },
        { sel: '[data-testid="turn-cards-container"]', name: 'Khung Thẻ Tác Vụ', category: 'card' },
        { sel: '[data-testid="user-message"]', name: 'Tin Nhắn Người Dùng', category: 'message' },
        { sel: 'pre', name: 'Khối Code Block', category: 'code' },

        // Custom Platform Markers & Tabs
        { sel: '[data-pet-platform="true"]', name: 'Custom Platform', category: 'custom' },
        { sel: '.hx-pet-platform', name: 'Custom Platform', category: 'custom' },
        { sel: '[role="tab"]', name: 'Thẻ Tab', category: 'tab' },
      ];

      const seenKeys = new Set();
      for (const p of platforms) {
        const key = `${Math.round(p.left / 12)}_${Math.round(p.top / 12)}_${Math.round((p.right - p.left) / 12)}`;
        seenKeys.add(key);
      }

      for (const item of candidates) {
        try {
          const els = document.querySelectorAll(item.sel);
          for (const el of els) {
            if (!el || el.offsetParent === null) continue;
            if (el.closest('#hx-pet-stage') || el.closest('.hx-pet-action-orbit') || 
                el.closest('.hx-radial-menu') || el.closest('.hx-playground-menu')) continue;

            const rect = el.getBoundingClientRect();
            if (rect.width < 22 || rect.height < 14) continue;
            if (rect.bottom <= 0 || rect.top >= winH) continue;
            if (rect.right <= 0 || rect.left >= winW) continue;

            // Deduplicate overlapping bounding boxes
            const key = `${Math.round(rect.left / 12)}_${Math.round(rect.top / 12)}_${Math.round(rect.width / 12)}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            platforms.push({
              id: el.getAttribute('data-testid') || el.getAttribute('data-slot') ||
                  el.getAttribute('data-component') || el.id || item.sel,
              name: item.name,
              category: item.category || 'button',
              type: 'ui',
              left: Math.max(0, rect.left),
              right: Math.min(winW, rect.right),
              top: rect.top,
              bottom: rect.bottom,
              surfaceY: rect.top, // Exact top surface of the block
              isFloor: false,
              el,
            });
          }
        } catch { /* ignore invalid query */ }
      }

      this.platforms = platforms;
      return platforms;
    },

    getActiveFloor() {
      const platforms = this.platforms.length > 0 ? this.platforms : this.scan();
      const themeFloor = platforms.find((p) => p.isFloor && p.id !== 'ground_floor' && p.type !== 'water');
      if (themeFloor) return this.validatePlatform(themeFloor) || themeFloor;
      return platforms.find((p) => p.id === 'ground_floor') || platforms[0] || null;
    },

    validatePlatform(platform) {
      if (!platform) return null;

      // Handle surfaces registered without DOM elements (e.g. riverbank, water surface, ground floor)
      if (platform._fromRegistry && !platform.el) {
        if (window.__hxWorld && typeof window.__hxWorld.querySurfaces === 'function') {
          const surfaces = window.__hxWorld.querySurfaces({ id: platform.id });
          if (surfaces.length > 0) {
            const s = surfaces[0];
            platform.left = s.left;
            platform.right = s.right;
            platform.top = s.top;
            platform.bottom = s.bottom;
            platform.surfaceY = s.surfaceY;
            return platform;
          }
        }
        if (platform.id === 'forest_ground_bank' && window.__hxEnv && typeof window.__hxEnv.getBankBounds === 'function') {
          const bank = window.__hxEnv.getBankBounds();
          if (bank && bank.y > 0) {
            platform.left = 0;
            platform.right = window.innerWidth;
            platform.top = bank.y;
            platform.bottom = bank.y + (bank.height || 34);
            platform.surfaceY = bank.y;
            return platform;
          }
        }
        return null;
      }

      if (platform.isFloor) {
        const winH = window.innerHeight;
        platform.left = 0;
        platform.right = window.innerWidth;
        if (platform.id === 'forest_ground_bank') {
          const bank = window.__hxEnv?.getBankBounds?.();
          if (bank && bank.y > 0) {
            platform.top = bank.y;
            platform.bottom = bank.y + (bank.height || 34);
            platform.surfaceY = bank.y;
            return platform;
          }
          return null;
        }
        platform.top = winH;
        platform.bottom = winH;
        platform.surfaceY = winH;
        return platform;
      }

      if (!platform.el || !platform.el.isConnected) return null;
      if (platform.el.offsetParent === null) return null;

      try {
        const style = window.getComputedStyle(platform.el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return null;
        }

        const rect = platform.el.getBoundingClientRect();
        if (rect.width < 16 || rect.height < 10) return null;
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return null;

        platform.left = Math.max(0, rect.left);
        platform.right = Math.min(window.innerWidth, rect.right);
        platform.top = rect.top;
        platform.bottom = rect.bottom;
        platform.surfaceY = rect.top;
        return platform;
      } catch {
        return null;
      }
    },

    isOnPlatform(footX, footY, platform) {
      const valid = this.validatePlatform(platform);
      if (!valid) return false;
      if (footX < valid.left - 6 || footX > valid.right + 6) return false;
      return Math.abs(footY - valid.surfaceY) <= 8;
    },

    findSurfaceBelow(footX, footY) {
      const platforms = this.scan();
      let best = null;
      let minDistance = Infinity;

      for (const p of platforms) {
        if (p.type === 'water') continue;
        const valid = this.validatePlatform(p);
        if (!valid) continue;
        if (footX >= valid.left - 6 && footX <= valid.right + 6) {
          const dist = valid.surfaceY - footY;
          if (dist >= -4 && dist < minDistance) {
            minDistance = dist;
            best = valid;
          }
        }
      }
      return best;
    }
  };

  // -----------------------------------------------------------
  // Helper: DOM Input detection
  // -----------------------------------------------------------
  function findPromptInput() {
    // 1. Check LayoutRegistry first (role: 'input')
    if (window.__hxLayout && typeof window.__hxLayout.queryRegions === 'function') {
      const inputRegions = window.__hxLayout.queryRegions({ role: 'input' });
      for (const r of inputRegions) {
        if (!r.element || !r.element.isConnected) continue;
        const textarea = r.element.tagName === 'TEXTAREA' ? r.element : r.element.querySelector('textarea');
        if (textarea && textarea.offsetParent !== null) return textarea;
        if (r.element.offsetParent !== null && !r.element.closest('#hx-root') && !r.element.closest('#hx-pet-stage') && !r.element.closest('.hx-playground-menu')) {
          return r.element;
        }
      }
    }

    // 2. Legacy selectors fallback
    const candidates = [
      'textarea',
      '[data-testid="chat-input"] textarea',
      '[data-testid="chat-input"]',
      '.antigravity-prompt-bar textarea',
      '[contenteditable="true"]',
    ];
    for (const sel of candidates) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el && el.offsetParent !== null && !el.closest('#hx-root') && !el.closest('#hx-pet-stage') && !el.closest('.hx-playground-menu')) {
            return el;
          }
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  // -----------------------------------------------------------
  // World Entity Manager (Physical Foods, Toys, Auto-Cleanup)
  // -----------------------------------------------------------
  const WorldEntityManager = {
    foods: [],
    activeBall: null,
    laserActive: false,
    laserDot: null,
    laserHud: null,
    lastLaserMoveTime: Date.now(),

    spawnFood(type, x, y, options = {}) {
      const foodDef = FOOD_DEFS[type] || FOOD_DEFS.cookie;
      const asset = PIXEL_ASSETS[type] || PIXEL_ASSETS.cookie;
      const isCreature = !!foodDef.isCreature;
      const el = document.createElement('div');

      if (isCreature) {
        el.className = `hx-world-creature hx-creature-${type}`;
        el.innerHTML = `
          <div class="hx-creature-sprite" style="background-image: url('${asset.strip}');"></div>
          <div class="hx-creature-shadow"></div>
        `;
      } else {
        el.className = `hx-world-food hx-food-${type}`;
        el.innerHTML = `
          <div class="hx-food-sprite" style="background-image: url('${asset.icon}');"></div>
          <div class="hx-food-shadow"></div>
        `;
      }

      const rawX = typeof x === 'number' ? x : (SensoryEngine.mouseX || window.innerWidth / 2);
      const rawY = typeof y === 'number' ? y : (SensoryEngine.mouseY || window.innerHeight / 2);
      const startX = Math.max(10, Math.min(window.innerWidth - 30, rawX - 10));
      const startY = Math.max(10, Math.min(window.innerHeight - 30, rawY - 10));

      const food = {
        id: 'food_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type,
        name: foodDef.name,
        icon: foodDef.icon,
        isCreature,
        el,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        facing: Math.random() < 0.5 ? 1 : -1,
        crawlSpeed: type === 'bug' ? 0.75 : (type === 'beetle' ? 1.15 : 0.6),
        pauseTicks: 0,
        hopCooldown: 0,
        isDragging: false,
        isLanded: false,
        isHeld: !!options.isHeld,
        cleanupTimeout: null,
      };

      this.attachFoodDrag(food);
      document.body.appendChild(el);
      this.updateFoodPos(food);
      this.foods.push(food);

      if (options.isHeld) {
        el.classList.add('is-held');
        SensoryEngine.setHeldEntity(food);
      } else {
        this.resetFoodIdleTimer(food);
        this.notifyPetsOfFood(food);
      }

      return food;
    },

    attachFoodDrag(food) {
      let startX = 0, startY = 0;
      let lastX = 0, lastY = 0;

      const onMouseDown = (e) => {
        if (e.button !== 0 || food.isHeld) return;
        e.preventDefault();
        e.stopPropagation();

        food.isDragging = true;
        food.isLanded = false;
        food.vx = 0;
        food.vy = 0;
        food.el.classList.add('is-dragging');
        this.resetFoodIdleTimer(food);

        startX = e.clientX - food.x;
        startY = e.clientY - food.y;
        lastX = e.clientX;
        lastY = e.clientY;

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!food.isDragging) return;
        food.vx = (e.clientX - lastX) * 0.6;
        food.vy = (e.clientY - lastY) * 0.6;
        lastX = e.clientX;
        lastY = e.clientY;

        food.x = e.clientX - startX;
        food.y = e.clientY - startY;
        this.updateFoodPos(food);

        this.checkFoodFeedProximity(food);
      };

      const onMouseUp = () => {
        if (!food.isDragging) return;
        food.isDragging = false;
        food.el.classList.remove('is-dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        this.resetFoodIdleTimer(food);
        this.notifyPetsOfFood(food);
      };

      food.el.addEventListener('mousedown', onMouseDown);
      food._cleanupEvents = () => {
        food.el.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    },

    updateFoodPhysics() {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const foodFloor = winH - 20; // 20px food bottom rests on bottom of app

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        if (f.isDragging || f.isHeld) continue;

        if (!f.isLanded) {
          f.vy += 0.45; // gravity
          const prevFootY = f.y + 20;
          f.x += f.vx;
          f.y += f.vy;
          f.vx *= 0.94;
          if (Math.abs(f.vx) < 0.08) f.vx = 0;

          // Wall and ceiling boundaries
          if (f.x < 0) { f.x = 0; f.vx = -f.vx * 0.35; }
          if (f.x > winW - 20) { f.x = winW - 20; f.vx = -f.vx * 0.35; }
          if (f.y < 0) { f.y = 0; f.vy = Math.abs(f.vy) * 0.35; }

          // Platform landing check (e.g. food landing on prompt box or floor)
          const footX = f.x + 10;
          const footY = f.y + 20;
          const platforms = EnvironmentManager.scan();
          let landedOn = null;

          if (f.vy >= 0) {
            for (const p of platforms) {
              if (p.type === 'water') continue;
              if (footX >= p.left - 2 && footX <= p.right + 2) {
                if (prevFootY <= p.surfaceY + 4 && footY >= p.surfaceY - 4) {
                  if (!landedOn || p.surfaceY < landedOn.surfaceY) {
                    landedOn = p;
                  }
                }
              }
            }
          }

          if (landedOn) {
            f.y = landedOn.surfaceY - 20;
            if (f.vy > 3.5) {
              f.vy = -f.vy * 0.25;
            } else {
              f.vy = 0;
              f.vx = 0;
              f.isLanded = true;
            }
          } else if (f.y >= foodFloor) {
            f.y = foodFloor;
            if (f.vy > 3.5) {
              f.vy = -f.vy * 0.25;
            } else {
              f.vy = 0;
              f.vx = 0;
              f.isLanded = true;
            }
          }

          this.updateFoodPos(f);
        } else if (f.isCreature) {
          // Living creature autonomous locomotion on floor
          if (f.pauseTicks > 0) {
            f.pauseTicks--;
          } else {
            // Predator avoidance: check proximity to any pet
            let fleeing = false;
            for (const pet of petInstances) {
              if (pet.state === 'sleep') continue;
              const dist = Math.hypot((pet.x + pet.width / 2) - (f.x + 10), (pet.y + pet.height / 2) - (f.y + 10));
              if (dist < 140) {
                fleeing = true;
                f.facing = (pet.x + pet.width / 2 > f.x) ? -1 : 1;
                f.crawlSpeed = (f.type === 'bug' ? 1.5 : 2.2);
                this.resetFoodIdleTimer(f); // don't despawn while actively chased!
                break;
              }
            }

            if (!fleeing) {
              f.crawlSpeed = (f.type === 'bug' ? 0.75 : 1.15);
              if (Math.random() < 0.015) {
                f.pauseTicks = Math.floor(20 + Math.random() * 40);
                if (Math.random() < 0.5) f.facing *= -1;
              }
            }

            f.x += f.facing * f.crawlSpeed;

            if (f.x <= 15) {
              f.x = 15;
              f.facing = 1;
            } else if (f.x >= window.innerWidth - 30) {
              f.x = window.innerWidth - 30;
              f.facing = -1;
            }

            const spriteEl = f.el.querySelector('.hx-creature-sprite');
            if (spriteEl) {
              spriteEl.style.transform = f.facing < 0 ? 'scaleX(-1)' : 'scaleX(1)';
            }

            // Beetle flutter hop
            if (f.type === 'beetle') {
              f.hopCooldown = (f.hopCooldown || 0) + 1;
              if (f.hopCooldown > 120 && Math.random() < 0.02) {
                f.hopCooldown = 0;
                f.vy = -3.8 - Math.random() * 2;
                f.vx = f.facing * (1.5 + Math.random());
                f.isLanded = false;
              }
            } else if (f.type === 'fish') {
              // Fish flop on floor
              if (Math.random() < 0.03) {
                f.vy = -2.2 - Math.random() * 1.5;
                f.vx = (Math.random() - 0.5) * 2;
                f.isLanded = false;
              }
            }

            this.updateFoodPos(f);
          }
        }
      }
    },

    updateFoodPos(food) {
      food.el.style.transform = `translate3d(${Math.round(food.x)}px, ${Math.round(food.y)}px, 0)`;
    },

    resetFoodIdleTimer(food) {
      clearTimeout(food.cleanupTimeout);
      // Auto-cleanup: After 14s idle, smooth fade out and despawns
      food.cleanupTimeout = setTimeout(() => {
        if (!food.isDragging && !food.isHeld) {
          food.el.style.opacity = '0';
          food.el.style.transform += ' scale(0.6)';
          food.el.style.transition = 'all 0.6s ease-out';
          setTimeout(() => this.removeFood(food), 600);
        }
      }, 14000);
    },

    removeFood(food) {
      const idx = this.foods.indexOf(food);
      if (idx !== -1) {
        this.foods.splice(idx, 1);
        clearTimeout(food.cleanupTimeout);
        if (food._cleanupEvents) food._cleanupEvents();
        try { food.el.remove(); } catch { /* ignore */ }
      }
    },

    checkFoodFeedProximity(food) {
      for (const pet of petInstances) {
        const petCenterX = pet.x + pet.width / 2;
        const petCenterY = pet.y + pet.height / 2;
        const foodCenterX = food.x + 10;
        const foodCenterY = food.y + 10;
        const dist = Math.hypot(petCenterX - foodCenterX, petCenterY - foodCenterY);

        if (dist < 48) {
          const pref = pet.getFoodPreference(food.type);
          if (pref.preference === 'love' || pref.preference === 'like') {
            if (food.isHeld) {
              SensoryEngine.clearHeldEntity();
            }
            pet.eatFood(food, pref);
            this.removeFood(food);
            break;
          } else if (pref.preference === 'dislike' && !pet.isBusy) {
            pet.refuseFood(food, pref);
            break;
          }
        }
      }
    },

    notifyPetsOfFood(food) {
      for (const pet of petInstances) {
        if (pet.isDragging) continue;
        const pref = pet.getFoodPreference(food.type);
        if (pref.preference === 'love' || pref.preference === 'like') {
          pet.approachFood(food, pref);
          break; // First pet to claim
        } else if (pref.preference === 'dislike') {
          const dist = Math.hypot((pet.x + pet.width / 2) - food.x, (pet.y + pet.height / 2) - food.y);
          if (dist < 180 && Math.random() < 0.6) {
            pet.approachDislikedFood(food, pref);
          }
        }
      }
    },

    // ---------------- Toys ----------------
    spawnBall(x, y) {
      this.removeBall();

      const ballEl = document.createElement('div');
      ballEl.className = 'hx-pet-ball';
      document.body.appendChild(ballEl);

      const startX = x || SensoryEngine.mouseX || window.innerWidth / 2;
      const startY = y || Math.max(80, SensoryEngine.mouseY - 40);

      this.activeBall = {
        el: ballEl,
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 6,
        vy: -5,
        radius: 10,
        lastInteractionTime: Date.now(),
        isCleaningUp: false,
        isDragging: false,
      };

      let startXOffset = 0, startYOffset = 0;
      let lastX = 0, lastY = 0;

      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        if (!this.activeBall) return;
        this.activeBall.isDragging = true;
        this.activeBall.lastInteractionTime = Date.now();
        this.activeBall.vx = 0;
        this.activeBall.vy = 0;

        startXOffset = e.clientX - this.activeBall.x;
        startYOffset = e.clientY - this.activeBall.y;
        lastX = e.clientX;
        lastY = e.clientY;

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!this.activeBall || !this.activeBall.isDragging) return;
        this.activeBall.vx = (e.clientX - lastX) * 0.8;
        this.activeBall.vy = (e.clientY - lastY) * 0.8;
        lastX = e.clientX;
        lastY = e.clientY;

        this.activeBall.x = e.clientX - startXOffset;
        this.activeBall.y = e.clientY - startYOffset;
        this.activeBall.lastInteractionTime = Date.now();
        this.activeBall.el.style.left = `${Math.round(this.activeBall.x)}px`;
        this.activeBall.el.style.top = `${Math.round(this.activeBall.y)}px`;
      };

      const onMouseUp = () => {
        if (!this.activeBall || !this.activeBall.isDragging) return;
        this.activeBall.isDragging = false;
        this.activeBall.lastInteractionTime = Date.now();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      ballEl.addEventListener('mousedown', onMouseDown);
      this.activeBall._cleanupEvents = () => {
        ballEl.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      petInstances.forEach((p) => p.noticeBall?.(this.activeBall));
    },

    updateBallPhysics() {
      const ball = this.activeBall;
      if (!ball || ball.isCleaningUp) return;

      const now = Date.now();
      // Requirement: 10 seconds of no play -> auto cleanup with smooth fade out
      if (now - ball.lastInteractionTime > 10000) {
        ball.isCleaningUp = true;
        ball.el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        ball.el.style.opacity = '0';
        ball.el.style.transform = 'translate(-50%, -50%) scale(0.2)';
        setTimeout(() => this.removeBall(), 600);
        return;
      }

      if (ball.isDragging) return;

      const gravity = 0.32;
      ball.vy += gravity;
      const prevBallY = ball.y + 10;
      ball.x += ball.vx;
      ball.y += ball.vy;

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const floor = winH - 10;

      // Platform bounces for ball
      const platforms = EnvironmentManager.scan();
      let ballLandedOn = null;
      for (const p of platforms) {
        if (p.type === 'water') continue;
        if (ball.x >= p.left - 4 && ball.x <= p.right + 4) {
          const ballBottom = ball.y + 10;
          if (prevBallY <= p.surfaceY + 4 && ballBottom >= p.surfaceY - 4 && ball.vy >= 0) {
            if (!ballLandedOn || p.surfaceY < ballLandedOn.surfaceY) {
              ballLandedOn = p;
            }
          }
        }
      }
      if (ballLandedOn) {
        ball.y = ballLandedOn.surfaceY - 10;
        ball.vy = -Math.abs(ball.vy) * 0.75;
        ball.vx *= 0.94;
        if (Math.abs(ball.vy) < 1.0) ball.vy = 0;
      }

      if (ball.y >= floor) {
        ball.y = floor;
        ball.vy = -Math.abs(ball.vy) * 0.75;
        ball.vx *= 0.94;
        if (Math.abs(ball.vy) < 1) ball.vy = 0;
      }
      if (ball.x <= 10) {
        ball.x = 10;
        ball.vx = Math.abs(ball.vx) * 0.8;
      } else if (ball.x >= winW - 10) {
        ball.x = winW - 10;
        ball.vx = -Math.abs(ball.vx) * 0.8;
      }
      if (ball.y <= 10) {
        ball.y = 10;
        ball.vy = Math.abs(ball.vy) * 0.75;
      }

      ball.el.style.left = `${Math.round(ball.x)}px`;
      ball.el.style.top = `${Math.round(ball.y)}px`;

      for (const pet of petInstances) {
        if (pet.isDragging) continue;
        const pCenterX = pet.x + pet.width / 2;
        const pCenterY = pet.y + pet.height / 2;
        const dx = ball.x - pCenterX;
        const dy = ball.y - pCenterY;
        const dist = Math.hypot(dx, dy);

        if (dist < 46) {
          ball.lastInteractionTime = Date.now(); // Reset 10s inactivity timer
          pet.interactWithBall(ball, dx, dy);
        }
      }
    },

    removeBall() {
      if (this.activeBall) {
        if (this.activeBall._cleanupEvents) this.activeBall._cleanupEvents();
        try { this.activeBall.el.remove(); } catch { /* ignore */ }
        this.activeBall = null;
        petInstances.forEach((p) => {
          if (p.state === 'ball_play') p.setIdle();
        });
      }
    },

    startLaser() {
      this.stopLaser();
      this.laserActive = true;
      this.lastLaserMoveTime = Date.now();

      const dot = document.createElement('div');
      dot.className = 'hx-pet-laser-dot';
      dot.style.left = `${SensoryEngine.mouseX}px`;
      dot.style.top = `${SensoryEngine.mouseY}px`;
      document.body.appendChild(dot);
      this.laserDot = dot;

      const hud = document.createElement('div');
      hud.className = 'hx-laser-hud';
      hud.innerHTML = `<span>[TIA LASER ĐỎ ĐANG BẬT] Tự tắt sau 10s nghỉ, ESC hoặc click để dừng</span>`;
      document.body.appendChild(hud);
      this.laserHud = hud;

      petInstances.forEach((p) => p.startLaserChase?.());
    },

    updateLaserActivity() {
      if (!this.laserActive) return;
      const now = Date.now();
      // Requirement: 10s without mouse movement -> auto cleanup laser
      if (now - this.lastLaserMoveTime > 10000) {
        this.stopLaser();
      }
    },

    stopLaser() {
      if (!this.laserActive) return;
      this.laserActive = false;
      try { this.laserDot?.remove(); } catch { /* ignore */ }
      try { this.laserHud?.remove(); } catch { /* ignore */ }
      this.laserDot = null;
      this.laserHud = null;

      petInstances.forEach((p) => {
        if (p.state === 'laser_chase') p.setIdle();
      });
    },

    clearAllEntities() {
      for (let i = this.foods.length - 1; i >= 0; i--) {
        this.removeFood(this.foods[i]);
      }
      this.removeBall();
      this.stopLaser();
    }
  };

  // -----------------------------------------------------------
  // Radial Menu Definition (Multi-Level SVG Wedges)
  // -----------------------------------------------------------
  const RADIAL_MENUS = {
    root: {
      title: 'SÂN CHƠI',
      sub: 'CLICK ĐÓNG',
      isBack: false,
      items: [
        { id: 'cat_food', label: 'Thức ăn', icon: SVGIcons.food, sub: '5 MÓN THỰC THỂ', action: 'submenu:food' },
        { id: 'cat_toy', label: 'Đồ chơi', icon: SVGIcons.toy, sub: 'LASER & BÓNG', action: 'submenu:toy' },
        { id: 'act_cleanup', label: 'Dọn dẹp', icon: SVGIcons.broom, sub: 'XÓA ĐỒ CHƠI', action: 'cleanup' }
      ]
    },
    food: {
      title: 'QUAY LẠI',
      sub: 'CLICK ĐỂ VỀ',
      isBack: true,
      items: [
        { id: 'food_bug', label: 'Sâu Bug', icon: PIXEL_ASSETS.bug.icon, sub: 'BÒ TRÊN SÀN', action: 'food:bug' },
        { id: 'food_beetle', label: 'Bọ Cánh', icon: PIXEL_ASSETS.beetle.icon, sub: 'ĐẬP CÁNH BAY', action: 'food:beetle' },
        { id: 'food_coffee', label: 'Cà phê', icon: PIXEL_ASSETS.coffee.icon, sub: 'TỈNH TÁO X1.6', action: 'food:coffee' },
        { id: 'food_cookie', label: 'Bánh Quy', icon: PIXEL_ASSETS.cookie.icon, sub: 'THƠM GIÒN RỤM', action: 'food:cookie' },
        { id: 'food_fish', label: 'Cá Nhỏ', icon: PIXEL_ASSETS.fish.icon, sub: 'CÚ CHÊ MÈO MÊ', action: 'food:fish' }
      ]
    },
    toy: {
      title: 'QUAY LẠI',
      sub: 'CLICK ĐỂ VỀ',
      isBack: true,
      items: [
        { id: 'toy_laser', label: 'Tia Laser', icon: SVGIcons.laser, sub: 'CHẤM ĐỎ 10S', action: 'toy:laser' },
        { id: 'toy_ball', label: 'Bóng Nảy', icon: SVGIcons.ball, sub: 'BÓNG VẬT LÝ', action: 'toy:ball' }
      ]
    }
  };

  // -----------------------------------------------------------
  // Sensory Perception Engine (Mouse, Keyboard, Radial Menu, Held Items)
  // -----------------------------------------------------------
  const SensoryEngine = {
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    mouseSpeed: 0,
    lastMouseTime: performance.now(),
    lastTypingTime: 0,
    recentKeys: [],
    typingCadence: 'idle',
    activeInputEl: null,
    activeRadialMenu: null,
    activePetMenu: null,
    heldEntity: null,
    heldHud: null,

    init() {
      this.onMouseMove = (e) => {
        const now = performance.now();
        const dt = Math.max(1, now - this.lastMouseTime);
        const dx = e.clientX - this.mouseX;
        const dy = e.clientY - this.mouseY;
        const distMoved = Math.hypot(dx, dy);

        this.mouseSpeed = distMoved / dt;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.lastMouseTime = now;

        // Update cursor-held entity position and feeding proximity
        if (this.heldEntity) {
          this.heldEntity.x = this.mouseX - 10;
          this.heldEntity.y = this.mouseY - 10;
          WorldEntityManager.updateFoodPos(this.heldEntity);
          WorldEntityManager.checkFoodFeedProximity(this.heldEntity);
        }

        if (distMoved > 2 && WorldEntityManager.laserActive) {
          WorldEntityManager.lastLaserMoveTime = Date.now();
          if (WorldEntityManager.laserDot) {
            WorldEntityManager.laserDot.style.left = `${this.mouseX}px`;
            WorldEntityManager.laserDot.style.top = `${this.mouseY}px`;
          }
        }
      };

      this.onMouseDown = (e) => {
        if (e.button !== 0) return;
        // If holding food item: click drops it to the floor!
        if (this.heldEntity) {
          e.stopPropagation();
          this.releaseHeldEntity();
        }
      };

      this.onKeyDown = (e) => {
        // Hotkey Alt+P: Opens Circular Radial Menu right at mouse position!
        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          e.stopPropagation();
          if (this.activeRadialMenu) this.closeRadialMenu();
          else this.openRadialMenu(this.mouseX, this.mouseY, 'root');
          return;
        }

        // Escape: Drops held food or closes active menu
        if (e.key === 'Escape') {
          if (this.heldEntity) {
            this.releaseHeldEntity();
            return;
          }
          if (this.activeRadialMenu) {
            if (this.activeRadialMenu.level !== 'root') {
              this.openRadialMenu(this.activeRadialMenu.x, this.activeRadialMenu.y, 'root');
            } else {
              this.closeRadialMenu();
            }
            return;
          }
          if (this.activePetMenu) {
            this.closePetMenu();
            return;
          }
          if (WorldEntityManager.laserActive) {
            WorldEntityManager.stopLaser();
            return;
          }
          if (WorldEntityManager.activeBall) {
            WorldEntityManager.removeBall();
            return;
          }
        }

        const now = Date.now();
        this.lastTypingTime = now;
        this.recentKeys.push(now);
        this.recentKeys = this.recentKeys.filter((t) => now - t <= 2500);

        const target = e.target;
        if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable || target.closest?.('[contenteditable="true"]'))) {
          this.activeInputEl = target;
        }

        if (this.recentKeys.length >= 7) {
          this.typingCadence = 'burst';
        } else if (this.recentKeys.length >= 2) {
          this.typingCadence = 'typing';
        }
      };

      this.onContextMenu = (e) => {
        // Trigger 1: Alt + Right-Click anywhere opens Circular Radial Menu!
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          this.closePetMenu();
          this.openRadialMenu(e.clientX, e.clientY, 'root');
          return;
        }

        // Trigger 2: Right-click on empty screen closes menus or stops laser
        if (!e.target.closest('.hx-pet') && !e.target.closest('.hx-radial-menu') && !e.target.closest('.hx-pet-context-menu')) {
          this.closeRadialMenu();
          this.closePetMenu();
        }
      };

      this.onClick = (e) => {
        if (WorldEntityManager.laserActive && !e.target.closest('.hx-laser-hud')) {
          WorldEntityManager.stopLaser();
        }
      };

      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
      window.addEventListener('mousedown', this.onMouseDown, true);
      window.addEventListener('keydown', this.onKeyDown, { capture: true, passive: false });
      window.addEventListener('contextmenu', this.onContextMenu, { capture: true, passive: false });
      window.addEventListener('click', this.onClick, true);
    },

    updateCadence() {
      const now = Date.now();
      const elapsed = now - this.lastTypingTime;
      if (elapsed > 6000 && this.typingCadence === 'burst') {
        this.typingCadence = 'paused';
      } else if (elapsed > 10000) {
        this.typingCadence = 'idle';
      }
    },

    // ---------------- Cursor-Held Item Mode ----------------
    setHeldEntity(food) {
      this.clearHeldEntity();
      this.heldEntity = food;

      const isPixel = food.icon && food.icon.startsWith('data:');
      const iconMarkup = isPixel
        ? `<img src="${food.icon}" style="width:20px;height:20px;image-rendering:pixelated;vertical-align:middle;" />`
        : `<span class="hx-chip-icon">${food.icon || SVGIcons.food}</span>`;

      const hud = document.createElement('div');
      hud.className = 'hx-held-hud';
      hud.innerHTML = `
        ${iconMarkup}
        <span>[Đang cầm: ${food.name}] Đưa lại gần Thú Cưng để cho ăn hoặc CLICK để thả xuống sàn</span>
      `;
      document.body.appendChild(hud);
      this.heldHud = hud;
    },

    releaseHeldEntity() {
      if (!this.heldEntity) return;
      const food = this.heldEntity;
      food.isHeld = false;
      food.el.classList.remove('is-held');
      food.vx = (Math.random() - 0.5) * 2;
      food.vy = 1;
      food.isLanded = false;

      this.clearHeldHud();
      this.heldEntity = null;

      WorldEntityManager.resetFoodIdleTimer(food);
      WorldEntityManager.notifyPetsOfFood(food);
    },

    clearHeldHud() {
      if (this.heldHud) {
        try { this.heldHud.remove(); } catch { /* ignore */ }
        this.heldHud = null;
      }
    },

    clearHeldEntity() {
      this.clearHeldHud();
      this.heldEntity = null;
    },

    // ---------------- Circular Radial Sector Menu (Pie / Wedges) ----------------
    openRadialMenu(x, y, level = 'root') {
      this.closeRadialMenu();
      this.closePetMenu();

      const menuDef = RADIAL_MENUS[level] || RADIAL_MENUS.root;
      const items = menuDef.items;
      const n = items.length;

      const backdrop = document.createElement('div');
      backdrop.className = 'hx-pet-menu-backdrop';
      backdrop.addEventListener('click', () => this.closeRadialMenu());

      const menu = document.createElement('div');
      menu.className = 'hx-radial-menu';

      // Clamp so 270x270 circle stays completely within viewport
      const targetX = Math.max(145, Math.min(window.innerWidth - 145, x));
      const targetY = Math.max(145, Math.min(window.innerHeight - 145, y));
      menu.style.left = `${Math.round(targetX)}px`;
      menu.style.top = `${Math.round(targetY)}px`;

      const cx = 135, cy = 135;
      const rIn = 44, rOut = 126;
      const step = (2 * Math.PI) / n;
      const gap = 0.05;
      const baseOffset = (n === 2) ? -Math.PI : (-Math.PI / 2 - step / 2);

      let sectorsHtml = '';
      for (let i = 0; i < n; i++) {
        const item = items[i];
        const startAngle = baseOffset + i * step + gap / 2;
        const endAngle = baseOffset + (i + 1) * step - gap / 2;
        const pathD = describeArc(cx, cy, rIn, rOut, startAngle, endAngle);

        const midAngle = (startAngle + endAngle) / 2;
        const midRadius = (rIn + rOut) / 2;
        const mx = cx + midRadius * Math.cos(midAngle);
        const my = cy + midRadius * Math.sin(midAngle);

        const isPixelIcon = item.icon && item.icon.startsWith('data:');
        const iconMarkup = isPixelIcon
          ? `<image href="${item.icon}" x="-10" y="-20" width="20" height="20" preserveAspectRatio="none" style="image-rendering: pixelated;" />`
          : `<g class="hx-sector-icon">${item.icon}</g>`;

        sectorsHtml += `
          <g class="hx-sector-group" data-idx="${i}" data-action="${item.action}">
            <path class="hx-sector-path" d="${pathD}" />
            <g class="hx-sector-content" transform="translate(${mx.toFixed(2)}, ${my.toFixed(2)})">
              ${iconMarkup}
              <text class="hx-sector-label" x="0" y="12">${item.label}</text>
            </g>
          </g>
        `;
      }

      const isBack = !!menuDef.isBack;
      const centerContentHtml = isBack
        ? `
          <g class="hx-center-icon">${SVGIcons.back}</g>
          <text class="hx-center-title" x="0" y="12" style="font-size:9.5px;">${menuDef.title}</text>
        `
        : `
          <text class="hx-center-title" x="0" y="-3">${menuDef.title}</text>
          <text class="hx-center-sub" x="0" y="13">${menuDef.sub}</text>
        `;

      menu.innerHTML = `
        <svg class="hx-radial-svg" viewBox="0 0 270 270">
          <circle class="hx-radial-bg-circle" cx="135" cy="135" r="128"></circle>
          <circle class="hx-radial-rim-circle" cx="135" cy="135" r="126"></circle>
          ${sectorsHtml}
          <circle class="hx-center-ring" cx="135" cy="135" r="41"></circle>
          <g class="hx-center-btn is-clickable">
            <circle class="hx-center-circle is-clickable" cx="135" cy="135" r="38"></circle>
            <g class="hx-center-content is-clickable" transform="translate(135, 135)">
              ${centerContentHtml}
            </g>
          </g>
        </svg>
      `;

      const centerTitleEl = menu.querySelector('.hx-center-title');
      const centerSubEl = menu.querySelector('.hx-center-sub');

      menu.querySelectorAll('.hx-sector-group').forEach((sectorEl) => {
        const idx = parseInt(sectorEl.getAttribute('data-idx'), 10);
        const item = items[idx];

        sectorEl.addEventListener('mouseenter', () => {
          if (centerTitleEl) centerTitleEl.textContent = item.label;
          if (centerSubEl) centerSubEl.textContent = item.sub;
        });

        sectorEl.addEventListener('mouseleave', () => {
          if (centerTitleEl) centerTitleEl.textContent = menuDef.title;
          if (centerSubEl) centerSubEl.textContent = menuDef.sub || '';
        });

        sectorEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = sectorEl.getAttribute('data-action');
          const mx = this.mouseX || SensoryEngine.mouseX || x;
          const my = this.mouseY || SensoryEngine.mouseY || y;

          if (action.startsWith('submenu:')) {
            const subKey = action.split(':')[1];
            this.openRadialMenu(x, y, subKey);
          } else if (action === 'cleanup') {
            this.closeRadialMenu();
            WorldEntityManager.clearAllEntities();
          } else if (action === 'close') {
            this.closeRadialMenu();
          } else if (action.startsWith('food:')) {
            const foodType = action.split(':')[1];
            this.closeRadialMenu();
            // Cursor-held food mode: spawns directly held by mouse!
            WorldEntityManager.spawnFood(foodType, mx, my, { isHeld: true });
          } else if (action.startsWith('toy:')) {
            const toyType = action.split(':')[1];
            this.closeRadialMenu();
            if (toyType === 'laser') {
              WorldEntityManager.startLaser();
            } else if (toyType === 'ball') {
              WorldEntityManager.spawnBall(mx, my);
            }
          }
        });
      });

      const centerBtn = menu.querySelector('.hx-center-btn');
      if (centerBtn) {
        centerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isBack) {
            this.openRadialMenu(x, y, 'root');
          } else {
            this.closeRadialMenu();
          }
        });

        if (!isBack) {
          centerBtn.addEventListener('mouseenter', () => {
            if (centerTitleEl) centerTitleEl.textContent = 'ĐÓNG';
            if (centerSubEl) centerSubEl.textContent = 'CLICK THOÁT';
          });
          centerBtn.addEventListener('mouseleave', () => {
            if (centerTitleEl) centerTitleEl.textContent = menuDef.title;
            if (centerSubEl) centerSubEl.textContent = menuDef.sub || '';
          });
        }
      }

      document.body.appendChild(backdrop);
      document.body.appendChild(menu);
      this.activeRadialMenu = { backdrop, menu, level, x, y };
    },

    closeRadialMenu() {
      if (this.activeRadialMenu) {
        try { this.activeRadialMenu.backdrop.remove(); } catch { /* ignore */ }
        try { this.activeRadialMenu.menu.remove(); } catch { /* ignore */ }
        this.activeRadialMenu = null;
      }
    },

    // ---------------- Pet Specific Context Menu (Adaptive Action Arc Near Pet) ----------------
    openPetMenu(pet) {
      this.closePetMenu();
      this.closeRadialMenu();

      // Pet stands completely still and awaits command - DO NOT MOVE OR DISPLACE PET
      pet.pauseForMenu();

      const backdrop = document.createElement('div');
      backdrop.className = 'hx-pet-menu-backdrop';
      backdrop.addEventListener('click', () => this.closePetMenu());

      const menu = document.createElement('div');
      const petTheme = (pet.manifest?.id === 'pixel_owl' || (pet.manifest?.name || '').toLowerCase().includes('cú'))
        ? 'hx-pet-theme-owl'
        : 'hx-pet-theme-generic';
      menu.className = `hx-pet-action-orbit ${petTheme}`;

      // Menu origin is placed EXACTLY at pet's current center, leaving pet untouched
      const petCenterX = pet.x + pet.width / 2;
      const petCenterY = pet.y + pet.height / 2;

      menu.style.left = `${Math.round(petCenterX)}px`;
      menu.style.top = `${Math.round(petCenterY)}px`;

      // Elevate pet above backdrop so it's 100% sharp and visible
      pet.el.classList.add('is-in-orbit-menu');

      const customActions = pet.persona?.customActions || [
        { id: 'inspect_code', name: 'Soi code', sub: 'MỔ BÀN PHÍM DEBUG', anim: 'typing', dialogue: 'inspect_code', icon: SVGIcons.code },
        { id: 'rotate_head', name: 'Xoay đầu 180 độ', sub: 'QUAY 180 ĐỘ QUAN SÁT', anim: 'look_around', dialogue: 'rotate_head', icon: SVGIcons.rotate },
      ];

      const items = [
        {
          id: 'petting',
          label: 'Vuốt ve',
          sub: 'GÃI CẰM CÚ MÈO',
          icon: SVGIcons.petting,
          action: 'petting'
        },
        {
          id: 'sleep_toggle',
          label: pet.state === 'sleep' ? 'Đánh thức' : 'Đi ngủ',
          sub: pet.state === 'sleep' ? 'DẬY CHƠI NÀO' : 'NGỦ LẤY SỨC',
          icon: SVGIcons.sleep,
          action: 'sleep_toggle'
        },
        {
          id: 'rotate_head',
          label: 'Xoay đầu 180 độ',
          sub: 'QUAY 180 ĐỘ QUAN SÁT',
          icon: SVGIcons.rotate,
          action: 'custom:rotate_head'
        },
        {
          id: 'inspect_code',
          label: 'Soi code',
          sub: 'MỔ BÀN PHÍM DEBUG',
          icon: SVGIcons.code,
          action: 'custom:inspect_code'
        }
      ];

      // If pet has extra custom actions beyond inspect_code and rotate_head, add them
      for (const act of customActions) {
        if (act.id !== 'inspect_code' && act.id !== 'rotate_head') {
          items.push({
            id: act.id,
            label: act.name,
            sub: act.sub || 'HÀNH ĐỘNG ĐẶC BIỆT',
            icon: act.icon || SVGIcons.code,
            action: `custom:${act.id}`
          });
        }
      }

      const n = items.length;
      const R = 48; // Compact radius: gives perfect clearance around 40px pet

      // Adaptive arc direction based on pet screen position
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const spaceTop = petCenterY;
      const spaceBottom = winH - petCenterY;
      const spaceLeft = petCenterX;
      const spaceRight = winW - petCenterX;

      let ux = 0.0;
      if (spaceLeft < 75) {
        ux = 1.0; // pet near left edge -> arc towards right
      } else if (spaceRight < 75) {
        ux = -1.0; // pet near right edge -> arc towards left
      }

      let uy = -1.0; // default: arc above head (ideal for floor standing)
      if (spaceTop < 75 && spaceBottom >= 75) {
        uy = 1.0; // pet near ceiling -> arc below feet
      }

      const midAngle = Math.atan2(uy, ux);
      // Span of arc in radians: 130 degrees (~2.27 rad) for 4 items -> chord distance 35.4px, gap between 28px buttons is 7.4px, ZERO overlap!
      const span = (n <= 1) ? 0 : Math.min(Math.PI * 0.78, Math.max(Math.PI * 0.65, 0.75 * (n - 1)));
      const startAngle = (uy < 0) ? (midAngle - span / 2) : (midAngle + span / 2);
      const step = (n > 1) ? ((uy < 0) ? (span / (n - 1)) : (-span / (n - 1))) : 0;

      // Calculate SVG arc path (pad 0.12 rad so arc extends slightly past outer buttons)
      const pad = 0.12;
      let arcStart, arcEnd, sweep;
      if (uy < 0) {
        arcStart = midAngle - span / 2 - pad;
        arcEnd = midAngle + span / 2 + pad;
        sweep = 1;
      } else {
        arcStart = midAngle + span / 2 + pad;
        arcEnd = midAngle - span / 2 - pad;
        sweep = 0;
      }
      const x1 = (R * Math.cos(arcStart)).toFixed(2);
      const y1 = (R * Math.sin(arcStart)).toFixed(2);
      const x2 = (R * Math.cos(arcEnd)).toFixed(2);
      const y2 = (R * Math.sin(arcEnd)).toFixed(2);
      const arcPathD = `M ${x1} ${y1} A ${R} ${R} 0 0 ${sweep} ${x2} ${y2}`;

      let buttonsHtml = `
        <svg class="hx-pet-orbit-svg" viewBox="-70 -70 140 140">
          <path class="hx-pet-orbit-ring" d="${arcPathD}"></path>
        </svg>
      `;

      for (let i = 0; i < n; i++) {
        const item = items[i];
        const angle = (n === 1) ? midAngle : (startAngle + i * step);
        const bx = Math.round(R * Math.cos(angle));
        const by = Math.round(R * Math.sin(angle));
        const absX = petCenterX + bx;
        const absY = petCenterY + by;
        const uxBtn = Math.cos(angle);
        const uyBtn = Math.sin(angle);

        // Tooltip position: oriented outward away from neighboring buttons and pet
        let tooltipPos = 'pos-top';
        if (uxBtn < -0.45 && absX >= 120) {
          tooltipPos = 'pos-left';
        } else if (uxBtn > 0.45 && absX <= winW - 120) {
          tooltipPos = 'pos-right';
        } else if (uyBtn > 0 && absY <= winH - 60) {
          tooltipPos = 'pos-bottom';
        } else if (uyBtn <= 0 && absY >= 60) {
          tooltipPos = 'pos-top';
        } else {
          tooltipPos = (absY < winH / 2) ? 'pos-bottom' : 'pos-top';
        }

        const cleanIcon = (item.icon || '')
          .replace(/\bwidth="[^"]*"/, 'width="14"')
          .replace(/\bheight="[^"]*"/, 'height="14"')
          .replace(/\s\bx="[^"]*"/g, '')
          .replace(/\s\by="[^"]*"/g, '');

        buttonsHtml += `
          <div class="hx-pet-orbit-item" style="left: ${bx}px; top: ${by}px;">
            <button class="hx-pet-orbit-btn" data-action="${item.action}">
              <span class="hx-pet-btn-icon">${cleanIcon}</span>
            </button>
            <div class="hx-pet-btn-tooltip ${tooltipPos}">
              <span class="hx-tooltip-title">${item.label}</span>
              <span class="hx-tooltip-sub">${item.sub}</span>
            </div>
          </div>
        `;
      }

      menu.innerHTML = buttonsHtml;

      menu.querySelectorAll('.hx-pet-orbit-btn').forEach((btnEl) => {
        btnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btnEl.getAttribute('data-action');
          this.closePetMenu();

          if (action === 'petting') {
            pet.doPetting();
          } else if (action === 'sleep_toggle') {
            pet.toggleSleep();
          } else if (action.startsWith('custom:')) {
            const actId = action.split(':')[1];
            if (actId === 'inspect_code') {
              pet.fly_and_inspect_code();
            } else {
              const found = customActions.find((a) => a.id === actId);
              if (found) {
                pet.performCustomAction(found);
              }
            }
          }
        });
      });

      document.body.appendChild(backdrop);
      document.body.appendChild(menu);
      this.activePetMenu = { backdrop, menu, pet };
    },

    closePetMenu() {
      if (this.activePetMenu) {
        if (this.activePetMenu.pet) {
          const pet = this.activePetMenu.pet;
          try {
            pet.el.classList.remove('is-in-orbit-menu');
            pet.resumeFromMenu();
          } catch { /* ignore */ }
        }
        try { this.activePetMenu.backdrop.remove(); } catch { /* ignore */ }
        try { this.activePetMenu.menu.remove(); } catch { /* ignore */ }
        this.activePetMenu = null;
      }
    },

    spawnParticle(x, y, type = 'heart', count = 3) {
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'hx-pet-particle';
        const dx = (Math.random() - 0.5) * 40;
        const dy = -25 - Math.random() * 35;
        p.style.setProperty('--p-dx', `${Math.round(dx)}px`);
        p.style.setProperty('--p-dy', `${Math.round(dy)}px`);
        p.style.left = `${Math.round(x + (Math.random() - 0.5) * 16)}px`;
        p.style.top = `${Math.round(y)}px`;

        if (type === 'heart') {
          p.className += ' hx-pet-heart';
          p.innerHTML = SVGIcons.heart;
        } else if (type === 'coffee') {
          p.style.width = '6px';
          p.style.height = '6px';
          p.style.background = '#8d5b4c';
          p.style.borderRadius = '2px';
        } else if (type === 'bug') {
          p.style.width = '5px';
          p.style.height = '5px';
          p.style.background = '#4ade80';
          p.style.borderRadius = '50%';
        } else {
          p.style.width = '4px';
          p.style.height = '4px';
          p.style.background = '#f59e0b';
        }

        document.body.appendChild(p);
        setTimeout(() => { try { p.remove(); } catch { /* ignore */ } }, 900);
      }
    },

    destroy() {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mousedown', this.onMouseDown, true);
      window.removeEventListener('keydown', this.onKeyDown, { capture: true });
      window.removeEventListener('contextmenu', this.onContextMenu, { capture: true });
      window.removeEventListener('click', this.onClick, true);
      this.closeRadialMenu();
      this.closePetMenu();
      this.clearHeldEntity();
      WorldEntityManager.clearAllEntities();
    }
  };

  // -----------------------------------------------------------
  // Screen Context Observer (Phase 3: Agent & Screen Awareness)
  // -----------------------------------------------------------
  const ScreenContextObserver = {
    agentState: 'idle',
    promptState: 'empty',
    hasChangedFiles: false,
    lastAgentStateChangeTime: 0,
    pollTimer: null,

    init() {
      this.poll();
      this.pollTimer = setInterval(() => this.poll(), 450);
    },

    poll() {
      // 1. Detect Agent State
      const cancelBtn = document.querySelector('[data-testid="input-cancel-button"], [data-slot="input-wrapper"] [aria-label*="Stop"], [data-slot="input-wrapper"] [aria-label*="stop"]');
      const spinner = document.querySelector('[data-testid="status-loading-spinner"], .animate-spin, [data-slot="tab-prompt-pulse"], [data-slot="tab-status-dot"][data-working="true"]');
      const isWorking = (cancelBtn && cancelBtn.offsetParent !== null) || (spinner && spinner.offsetParent !== null);
      const hasErrorBanner = document.querySelector('.bg-destructive, [data-testid*="error-banner"], .antigravity-error-banner, [data-slot="error-banner"]') !== null;

      let newAgentState = 'idle';
      if (hasErrorBanner) {
        newAgentState = 'error';
      } else if (isWorking) {
        const textInCard = document.querySelector('[data-testid="agent-response"], [data-slot="message-assistant"]')?.innerText || '';
        if (textInCard.includes('Thinking') || document.querySelector('[data-testid="status-loading-spinner"], [data-slot="tab-prompt-pulse"]')) {
          newAgentState = 'thinking';
        } else {
          newAgentState = 'working';
        }
      } else {
        newAgentState = 'idle';
      }

      if (newAgentState !== this.agentState) {
        const prevState = this.agentState;
        this.agentState = newAgentState;
        this.lastAgentStateChangeTime = Date.now();
        this.notifyAgentState(newAgentState, prevState);
      }

      // 2. Detect Prompt State
      const contentEditable = document.querySelector('[data-testid="agent-input-box"] [contenteditable="true"]') ||
                             document.querySelector('.antigravity-prompt-bar [contenteditable="true"]') ||
                             document.querySelector('[data-slot="input-wrapper"] [contenteditable="true"]') ||
                             document.querySelector('[data-slot="input-wrapper"] textarea') ||
                             document.querySelector('textarea');
      const promptText = contentEditable ? (contentEditable.innerText || '').trim() : '';

      let newPromptState = 'empty';
      if (promptText.length > 5) {
        const timeSinceTyping = Date.now() - SensoryEngine.lastTypingTime;
        if (timeSinceTyping > 2200 && this.agentState === 'idle') {
          newPromptState = 'ready';
        } else {
          newPromptState = 'typing';
        }
      }

      if (newPromptState !== this.promptState) {
        this.promptState = newPromptState;
        if (newPromptState === 'ready') {
          this.notifyPromptReady(promptText);
        }
      }

      // 3. Detect Changed Files Card
      const reviewCard = document.querySelector('[data-testid="changed-files-card"], [data-slot="changed-files-card"], [data-component="review-card"]');
      const hasReview = reviewCard !== null && reviewCard.offsetParent !== null;
      if (hasReview && !this.hasChangedFiles) {
        this.hasChangedFiles = true;
        this.notifyChangedFiles(reviewCard);
      } else if (!hasReview) {
        this.hasChangedFiles = false;
      }
    },

    notifyAgentState(newState, prevState) {
      for (const pet of petInstances) {
        pet.handleAgentStateReaction(newState, prevState);
      }
    },

    notifyPromptReady(promptText) {
      for (const pet of petInstances) {
        pet.handlePromptReadyReaction(promptText);
      }
    },

    notifyChangedFiles(cardEl) {
      for (const pet of petInstances) {
        pet.handleChangedFilesReaction(cardEl);
      }
    },

    destroy() {
      clearInterval(this.pollTimer);
    }
  };

  // -----------------------------------------------------------
  // Layout Change Observer (Scroll, Resize, DOM Reflow Watcher)
  // Ensures pet never floats when UI scrolls or transforms abruptly
  // -----------------------------------------------------------
  const LayoutChangeObserver = {
    mutationObserver: null,
    throttleTimer: null,

    init() {
      this.onScroll = () => this.scheduleVerify();
      this.onResize = () => this.scheduleVerify();

      window.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });

      // Observe DOM tree additions/removals across chat and containers
      this.mutationObserver = new MutationObserver((mutations) => {
        let significant = false;
        for (const m of mutations) {
          if (m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
            significant = true;
            break;
          }
        }
        if (significant) this.scheduleVerify();
      });

      this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    },

    scheduleVerify() {
      if (this.throttleTimer) return;
      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null;
        EnvironmentManager.lastScanTime = 0; // Invalidate scan cache immediately
        for (const pet of petInstances) {
          if (pet && pet.verifyGrounding) {
            pet.verifyGrounding();
          }
        }
      }, 40);
    },

    destroy() {
      window.removeEventListener('scroll', this.onScroll, { capture: true });
      window.removeEventListener('resize', this.onResize);
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      clearTimeout(this.throttleTimer);
    }
  };

  SensoryEngine.init();
  ScreenContextObserver.init();
  LayoutChangeObserver.init();
  window.__hxSensory = SensoryEngine;
  window.__hxScreenObserver = ScreenContextObserver;
  window.__hxLayoutObserver = LayoutChangeObserver;

  if (window.__hxWorld && typeof window.__hxWorld.setLegacyManager === 'function') {
    window.__hxWorld.setLegacyManager(WorldEntityManager);
  } else if (typeof window.createWorldRegistry === 'function') {
    const prevSurfaces = (window.__hxWorld && typeof window.__hxWorld.querySurfaces === 'function')
      ? window.__hxWorld.querySurfaces()
      : [];
    window.__hxWorld = window.createWorldRegistry(window.__hxBus, WorldEntityManager);
    for (const s of prevSurfaces) {
      window.__hxWorld.registerSurface(s);
    }
  } else {
    window.__hxWorld = window.__hxWorld || WorldEntityManager;
  }
  window.__hxPetInstances = petInstances;

  window.__hxUpdatePetConfig = function(newGlobalConfig, newPetConfigMap) {
    if (!window.__hxPets) window.__hxPets = {};
    window.__hxPets.globalConfig = newGlobalConfig || window.__hxPets.globalConfig || {};

    for (const pet of petInstances) {
      if (!pet) continue;
      pet.globalConfig = window.__hxPets.globalConfig;
      if (newPetConfigMap && pet.manifest?.id) {
        const petCfg = newPetConfigMap[pet.manifest.id];
        if (petCfg && petCfg.scale) {
          const newScale = Number(petCfg.scale);
          if (newScale && newScale !== pet.scale && typeof pet.updateScale === 'function') {
            pet.updateScale(newScale);
          }
        }
      }
    }
    if (window.__hxBus) {
      window.__hxBus.emit('pet:config_updated', { globalConfig: window.__hxPets.globalConfig });
    }
  };

  // Listen for layout and world surface/entity events via EventBus
  if (window.__hxBus) {
    window.__hxBus.on('layout:region_updated', () => {
      EnvironmentManager.lastScanTime = 0;
      for (const pet of petInstances) pet?.verifyGrounding?.();
    }, 'pet-runtime');

    window.__hxBus.on('layout:region_registered', () => {
      EnvironmentManager.lastScanTime = 0;
      for (const pet of petInstances) pet?.verifyGrounding?.();
    }, 'pet-runtime');

    window.__hxBus.on('layout:region_removed', () => {
      EnvironmentManager.lastScanTime = 0;
    }, 'pet-runtime');

    window.__hxBus.on('world:surface_registered', (evt) => {
      EnvironmentManager.lastScanTime = 0;
      const platforms = EnvironmentManager.scan();
      if (evt && evt.surface && evt.surface.isFloor && evt.surface.id !== 'ground_floor') {
        const themeFloor = EnvironmentManager.getActiveFloor();
        if (themeFloor && themeFloor.id === evt.surface.id) {
          for (const pet of petInstances) {
            if (!pet || pet.isDragging || pet.state === 'swim') continue;
            if (pet.isGrounded && (!pet.currentPlatform || pet.currentPlatform.id === 'ground_floor')) {
              pet.currentPlatform = themeFloor;
              pet.y = themeFloor.surfaceY - pet.height;
              pet.updatePosition();
            }
          }
        }
      } else if (platforms.length > 0) {
        for (const pet of petInstances) pet?.verifyGrounding?.();
      }
      for (const pet of petInstances) pet?.verifyGrounding?.();
    }, 'pet-runtime');

    window.__hxBus.on('world:surface_updated', () => {
      EnvironmentManager.lastScanTime = 0;
      for (const pet of petInstances) pet?.verifyGrounding?.();
    }, 'pet-runtime');

    window.__hxBus.on('world:surface_removed', () => {
      EnvironmentManager.lastScanTime = 0;
      for (const pet of petInstances) pet?.verifyGrounding?.();
    }, 'pet-runtime');

    window.__hxBus.on('entity:hit_pet', (evt) => {
      if (!evt) return;
      for (const pet of petInstances) {
        if (pet.manifest?.id === evt.petId || !evt.petId) {
          pet.onEntityHit?.(evt);
        }
      }
    }, 'pet-runtime');
  }

  // -----------------------------------------------------------
  // PixelPet Class (With Species Preferences & Physical Entity Awareness)
  // -----------------------------------------------------------
  class PixelPet {
    constructor(data, stageEl) {
      this.data = data;
      this.manifest = data.manifest || {};
      this.persona = data.persona || {};
      this.sprites = data.sprites || {};
      this.userConfig = data.userConfig || {};
      this.stage = stageEl;

      if (window.__hxWorld && typeof window.__hxWorld.registerPet === 'function') {
        window.__hxWorld.registerPet(this.manifest.id || 'pixel_owl', () => {
          return {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height,
            width: this.width,
            height: this.height,
          };
        }, { id: this.manifest.id, name: this.name, species: this.persona?.species });
      }

      this.species = String(this.persona.species || 'Owl').toLowerCase();
      this.scale = Number(this.userConfig.scale) || data.scale || this.manifest.defaultScale || 2.5;
      this.gridW = (this.manifest.grid && this.manifest.grid.width) || 16;
      this.gridH = (this.manifest.grid && this.manifest.grid.height) || 16;

      EnvironmentManager.lastScanTime = 0;
      EnvironmentManager.scan();
      this.width = this.gridW * this.scale;
      this.height = this.gridH * this.scale;
      this.x = Math.max(50, Math.min(window.innerWidth - 100, Math.random() * (window.innerWidth - 200)));
      this.currentPlatform = EnvironmentManager.getActiveFloor();
      this.y = this.getFloor();
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.isGrounded = true;
      this.isFlung = false;

      // State machine & Stuck Prevention
      this.state = 'idle';
      this.stateTimer = 0;
      this.stateDuration = 3000;
      this.targetX = this.x;
      this.targetY = this.y;
      this.isBusy = false;
      this._busyWatchdog = null;
      this.isAwaitingCommand = false;

      // Dynamic Living Modifiers & Phase 3 Drives
      this.speedMultiplier = 1.0;
      this.speedBoostTimer = null;
      this.lastTypingReactionTime = 0;
      this.lastCursorMischiefTime = 0;
      this.drives = {
        hunger: 100,
        affection: 50,
        energy: 100
      };
      this.lastHungerDecayTime = Date.now();
      this.lastHungerNoticeTime = 0;
      this.lastPromptNoticeTime = 0;
      this.lastDiffNoticeTime = 0;

      // Animation system
      this.currentAnim = null;
      this.animName = '';
      this.frameIndex = 0;
      this.frameTimer = 0;

      // Drag system
      this.isDragging = false;
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.mouseDownTime = 0;
      this.mouseDownPos = { x: 0, y: 0 };

      // Speech bubble timer
      this.bubbleTimer = null;

      this.buildDOM();
      this.attachEvents();
      this.play('idle');
    }

    buildDOM() {
      this.el = document.createElement('div');
      this.el.className = 'hx-pet';
      this.el.style.width = `${this.width}px`;
      this.el.style.height = `${this.height}px`;
      this.el.style.setProperty('--pet-scale', this.scale);

      this.shadow = document.createElement('div');
      this.shadow.className = 'hx-pet-shadow';
      this.shadow.style.width = `${Math.round(this.width * 0.45)}px`;

      this.sprite = document.createElement('div');
      this.sprite.className = 'hx-pet-sprite';
      this.sprite.style.width = `${this.gridW}px`;
      this.sprite.style.height = `${this.gridH}px`;

      this.bubble = document.createElement('div');
      this.bubble.className = 'hx-pet-bubble';

      this.el.appendChild(this.shadow);
      this.el.appendChild(this.sprite);
      this.el.appendChild(this.bubble);
      this.stage.appendChild(this.el);

      this.updatePosition();
    }

    setBusy(timeoutMs = 12000) {
      this.isBusy = true;
      clearTimeout(this._busyWatchdog);
      this._busyWatchdog = setTimeout(() => {
        if (this.isBusy) {
          console.warn('[harness-pet] Watchdog recovered stuck action');
          this.clearBusy();
          this.setIdle();
        }
      }, timeoutMs);
    }

    clearBusy() {
      this.isBusy = false;
      clearTimeout(this._busyWatchdog);
    }

    play(name, force = false) {
      const isAirborne = !this.isGrounded || this.state === 'fly' || this.state === 'glide' || this.state === 'falling';
      const airborneAnims = ['fly', 'glide', 'falling', 'electrocuted'];

      if (isAirborne && !airborneAnims.includes(name) && !force) {
        // Maintain active wing-flapping mid-air and queue ground expression for touchdown
        this.pendingGroundAnim = name;
        return;
      }

      if (this.animName === name && this.currentAnim) return;
      const anim = this.sprites[name];
      if (!anim) {
        if (name !== 'idle' && this.sprites['idle']) this.play('idle', force);
        return;
      }
      this.animName = name;
      this.currentAnim = anim;
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.sprite.style.backgroundImage = `url(${anim.dataUrl})`;
      this.updateFrame();
    }

    flushPendingGroundAnim() {
      if (this.pendingGroundAnim) {
        const next = this.pendingGroundAnim;
        this.pendingGroundAnim = null;
        this.play(next, true);
      }
    }

    updateFrame() {
      if (!this.currentAnim) return;
      const offset = -(this.frameIndex * this.gridW);
      this.sprite.style.backgroundPosition = `${offset}px 0px`;
      this.sprite.style.transform = `translateX(-50%) scale(${this.scale}) scaleX(${this.facing})`;
    }

    checkBoundariesAndCollisions() {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const restitution = 0.35;

      // 1. Left Wall (x <= 0)
      if (this.x < 0) {
        this.x = 0;
        if (this.vx < 0) {
          this.vx = -this.vx * restitution;
          this.vy *= 0.85;
          if (Math.abs(this.vx) < 1.0) this.vx = 0;
          if (this.isFlung) {
            this.isFlung = false;
            SensoryEngine.spawnParticle(8, this.y + this.height / 2, 'cookie', 2);
          }
        }
      }

      // 2. Right Wall (x >= winW - this.width)
      if (this.x > winW - this.width) {
        this.x = winW - this.width;
        if (this.vx > 0) {
          this.vx = -this.vx * restitution;
          this.vy *= 0.85;
          if (Math.abs(this.vx) < 1.0) this.vx = 0;
          if (this.isFlung) {
            this.isFlung = false;
            SensoryEngine.spawnParticle(this.x + this.width - 8, this.y + this.height / 2, 'cookie', 2);
          }
        }
      }

      // 3. Ceiling (y <= 0)
      if (this.y < 0) {
        this.y = 0;
        if (this.vy < 0) {
          this.vy = Math.abs(this.vy) * restitution;
          this.vx *= 0.85;
          if (Math.abs(this.vy) < 1.0) this.vy = 0;
          if (this.isFlung) this.isFlung = false;
        }
      }

      // 4. Ground Floor (y >= winH - this.height)
      const floorY = winH - this.height;
      if (this.y >= floorY) {
        this.y = floorY;
        if (this.vy > 4.5) {
          this.vy = -this.vy * 0.22;
          this.vx *= 0.65;
          if (Math.abs(this.vy) < 1.2) this.vy = 0;
        } else {
          this.vy = 0;
          this.vx = 0;
          this.isGrounded = true;
          this.isFlung = false;
          this.currentPlatform = EnvironmentManager.platforms.find((p) => p.id === 'ground_floor') || EnvironmentManager.getActiveFloor();
          this.flushPendingGroundAnim();
          if (this.state === 'falling') {
            if (this.isElectrocuted) {
              this.state = 'idle';
              this.play('electrocuted', true);
            } else {
              this.setIdle();
            }
          }
        }
      }
    }

    enterWater() {
      const env = window.__hxEnv;
      if (!env || env.effectLevel === 'off') return;
      if (this.state === 'swim') return;
      const impact = Math.max(1.2, Math.abs(this.vy) * 0.45);
      if (typeof env.emitSplash === 'function') {
        env.emitSplash(this.x + this.width / 2, impact);
      }
      this.isGrounded = false;
      this.currentPlatform = null;
      this.isFlung = false;
      this.vy = 0;
      this.vx *= 0.35;
      this.state = 'swim';
      this.swimTimer = 0;
      this.swimDir = this.facing || (Math.random() < 0.5 ? -1 : 1);
      this.isWet = true;
      this.wetTimer = 180;
      if (this.manifest.animations && this.manifest.animations.swim) {
        this.play('swim', true);
      } else {
        this.play(this.manifest.physics?.canFly ? 'fly' : 'idle', true);
      }
    }

    verifyGrounding() {
      if (!this.isGrounded) return;
      if (this.state === 'fly' || this.state === 'glide' || this.state === 'swim' || this.state === 'ball_play' || this.state === 'hunting' || this.state === 'laser_chase' || this.state === 'eating' || this.state === 'refuse' || this.isDragging) return;

      const footX = this.x + this.width / 2;
      const footY = this.y + this.height;

      if (!this.currentPlatform) {
        const floorY = this.getFloor() + this.height;
        if (Math.abs(footY - floorY) > 8) {
          this.isGrounded = false;
          this.state = 'falling';
          this.vy = 1.0;
          this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
          this.updatePosition();
        }
        return;
      }

      const valid = EnvironmentManager.validatePlatform(this.currentPlatform);
      if (!valid) {
        this.isGrounded = false;
        this.currentPlatform = null;
        this.state = 'falling';
        this.vy = 1.0;
        this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
        this.updatePosition();
        return;
      }

      const inX = footX >= valid.left - 6 && footX <= valid.right + 6;
      const dy = Math.abs(footY - valid.surfaceY);

      if (inX && dy <= 24 && (this.state === 'perch' || this.state === 'idle')) {
        this.y = valid.surfaceY - this.height;
        this.updatePosition();
      } else if (!EnvironmentManager.isOnPlatform(footX, footY, valid)) {
        this.isGrounded = false;
        this.currentPlatform = null;
        this.state = 'falling';
        this.vy = 1.0;
        this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
        this.updatePosition();
      }
    }

    updatePosition() {
      if (isNaN(this.x) || isNaN(this.y)) {
        this.x = 80;
        this.y = this.getFloor();
      }

      this.checkBoundariesAndCollisions();
      this.el.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`;
      if (this.state !== 'dragged') {
        const footY = Math.round(this.y + (this.height || 0));
        this.el.style.zIndex = String(2147483605 + Math.max(0, Math.min(30, Math.round(footY / 45))));
      }
    }

    updateScale(newScale) {
      if (!newScale || isNaN(newScale) || newScale === this.scale) return;
      this.scale = newScale;
      this.width = this.gridW * this.scale;
      this.height = this.gridH * this.scale;
      this.el.style.width = `${this.width}px`;
      this.el.style.height = `${this.height}px`;
      const sprite = this.el.querySelector('.hx-pet-sprite');
      if (sprite) {
        sprite.style.width = `${this.width}px`;
        sprite.style.height = `${this.height}px`;
      }
      this.updatePosition();
      this.verifyGrounding();
    }

    formatDialogue(text) {
      if (!text || typeof text !== 'string') return text;
      const globalCfg = (window.__hxPets && window.__hxPets.globalConfig) || {};
      const petLabel = (globalCfg.petLabel || '').trim() || 'Cú';
      const userLabel = (globalCfg.userLabel || '').trim() || 'Sen';
      const petName = (globalCfg.petName || '').trim() || this.manifest?.name || 'Hooty';
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

      return text
        .replace(/\{pet\}|\{petLabel\}/g, petLabel)
        .replace(/\{user\}|\{userLabel\}/g, userLabel)
        .replace(/\{name\}|\{petName\}/g, petName)
        .replace(/\{time\}/g, timeStr)
        .replace(/(^|[^\p{L}\p{N}_])Sen(?=$|[^\p{L}\p{N}_])/gu, `$1${userLabel}`)
        .replace(/(^|[^\p{L}\p{N}_])sen(?=$|[^\p{L}\p{N}_])/gu, `$1${userLabel}`)
        .replace(/(^|[^\p{L}\p{N}_])Cú(?=(?:$|[^\p{L}\p{N}_])(?!\s*(?:mèo|đêm|Mèo|Đêm)))/gu, `$1${petLabel}`)
        .replace(/(^|[^\p{L}\p{N}_])Hooty(?=$|[^\p{L}\p{N}_])/gu, `$1${petName}`);
    }

    say(text, duration = 3500) {
      if (!this.bubble || !text) return;
      text = this.formatDialogue(text);
      clearTimeout(this.bubbleTimer);
      this.bubble.textContent = text;

      const needFlipBottom = this.y < 90;
      this.bubble.classList.toggle('is-flipped-bottom', needFlipBottom);

      this.bubble.classList.remove('is-visible');
      this.bubble.classList.add('is-measuring');
      const bubbleRect = this.bubble.getBoundingClientRect();
      this.bubble.classList.remove('is-measuring');

      const bubbleW = bubbleRect.width || 160;
      const petCenterX = this.x + this.width / 2;
      const halfW = bubbleW / 2;

      let shiftX = 0;
      const minLeft = 14;
      const maxRight = window.innerWidth - 14;

      if (petCenterX - halfW < minLeft) {
        shiftX = minLeft - (petCenterX - halfW);
      } else if (petCenterX + halfW > maxRight) {
        shiftX = maxRight - (petCenterX + halfW);
      }

      this.bubble.style.setProperty('--bubble-shift-x', `${Math.round(shiftX)}px`);
      const maxArrowShift = Math.max(-halfW + 12, Math.min(halfW - 12, -shiftX));
      this.bubble.style.setProperty('--arrow-shift-x', `${Math.round(maxArrowShift)}px`);

      requestAnimationFrame(() => {
        this.bubble.classList.add('is-visible');
      });

      this.bubbleTimer = setTimeout(() => {
        this.bubble.classList.remove('is-visible');
      }, duration);
    }

    async randomDialogue(category = 'idle', context = {}) {
      let text = null;

      // 1. Check customDialogues in globalConfig first for immediate reactivity
      const globalCfg = (window.__hxPets && window.__hxPets.globalConfig) || {};
      const customList = globalCfg.customDialogues?.[category];
      if (Array.isArray(customList) && customList.length > 0) {
        text = customList[Math.floor(Math.random() * customList.length)];
      }

      // 2. Query IPC brain dialogue
      if (!text) {
        try {
          const bridge = window.opencodeHarness || window.antigravityHarness;
          if (bridge && bridge.getPetDialogue) {
            text = await bridge.getPetDialogue(this.manifest.id, category, context);
          }
        } catch { /* ignore */ }
      }

      // 3. Fallback to persona dialogues
      if (!text) {
        const dialogues = this.persona.dialogues || {};
        const list = dialogues[category] || dialogues['idle'];
        if (list && list.length) {
          text = list[Math.floor(Math.random() * list.length)];
        }
      }

      if (text) this.say(text);
    }

    applyPlatformImpact(platform, intensity = 'land') {
      if (!platform || !platform.el || platform.isFloor) return;
      try {
        const el = platform.el;
        el.classList.remove('hx-platform-landed', 'hx-platform-pecked');
        void el.offsetWidth; // force reflow
        if (intensity === 'land') {
          el.classList.add('hx-platform-landed');
          setTimeout(() => el.classList.remove('hx-platform-landed'), 240);
        } else if (intensity === 'peck') {
          el.classList.add('hx-platform-pecked');
          setTimeout(() => el.classList.remove('hx-platform-pecked'), 180);
        }
      } catch { /* ignore */ }
    }

    onLandOnPlatform(platform) {
      this.flushPendingGroundAnim();
      if (!platform) return;
      if (!platform.isFloor) {
        const footX = this.x + this.width / 2;
        const footY = this.y + this.height;
        SensoryEngine.spawnParticle(footX - 6, footY - 2, 'cookie', 2);
        SensoryEngine.spawnParticle(footX + 6, footY - 2, 'cookie', 2);
        this.applyPlatformImpact(platform, 'land');
        this.sayPlatformDialogue(platform);
      }
    }

    sayPlatformDialogue(platform) {
      if (!platform || platform.isFloor || this.isBusy || this.state === 'sleep') return;
      const now = Date.now();
      if (!this.lastPlatformDialogueTime) this.lastPlatformDialogueTime = 0;
      if (now - this.lastPlatformDialogueTime < 14000) return; // cooldown 14s

      const cat = platform.category || 'button';
      const name = platform.name || '';

      const lines = {
        prompt: [
          'Hoot! Soi xem {user} đang tính gõ prompt gì...',
          'Hóng xem {user} yêu cầu AI làm gì tiếp!',
          'Đậu ngay khung chat hóng việc cùng {user} nè!'
        ],
        button: [
          `Hoot! Canh giữ ${name} cẩn thận giúp {user}!`,
          `Nút ${name} ở ngay dưới chân {pet} nè!`,
          'Đậu chắc chắn rồi nha {user}!'
        ],
        sidebar: [
          'Hoot! Dự án này {user} code chăm chỉ ghê!',
          'Lịch sử trò chuyện dài ghê nha {user}!',
          'Mở hội thoại mới không {user} ơi?'
        ],
        card: [
          'Hoot! Thẻ nhiệm vụ này chi tiết quá!',
          'Có code thay đổi kìa {user} ơi!',
          'Đậu ở đây soi tiến độ dự án cùng {user}!'
        ],
        bar: [
          'Hoot! Tít trên cao mát mẻ và thoáng đãng ghê!',
          'Bao quát toàn cảnh màn hình luôn!',
          'Đậu trên thanh menu ngắm {user} code!'
        ],
        breadcrumb: [
          'Hoot! Đang ở đúng nhánh làm việc rồi nè {user}!'
        ],
        message: [
          'Hoot! Tin nhắn {user} gửi AI đây rồi!'
        ],
        tree: [
          'Hoot! Đậu trên ngọn cây ngắm rừng xanh mát quá!',
          'Cành cây này vững chắc ghê, hoot!',
          'Từ trên cao nhìn xuống thấy hết cả khu rừng luôn!'
        ]
      };

      const pool = lines[cat] || lines.button;
      const quote = pool[Math.floor(Math.random() * pool.length)];
      this.lastPlatformDialogueTime = now;
      this.say(quote, 2800);
    }

    // ---------------- Phase 3: Screen Context Reactions & Living Drives ----------------
    handleAgentStateReaction(newState, prevState) {
      if (this.isBusy || this.state === 'sleep' || this.isAwaitingCommand || this.isDragging) return;

      if (newState === 'thinking') {
        this.play('curious');
        this.facing = this.x > window.innerWidth / 2 ? -1 : 1;
        this.updateFrame();
        const quotes = [
          'Hoot! Agent đang vắt óc suy nghĩ...',
          'Đang phân tích phương án giải quyết nè {user}!',
          'Chăm chú theo dõi Agent tính toán cùng {user}...'
        ];
        this.say(quotes[Math.floor(Math.random() * quotes.length)], 3200);
      } else if (newState === 'working') {
        if (Math.random() < 0.6) {
          this.play('look_around');
        }
      } else if (prevState === 'working' || prevState === 'thinking') {
        if (newState === 'idle') {
          this.play('happy');
          this.drives.affection = Math.min(100, this.drives.affection + 5);
          this.randomDialogue('agent_done');
          setTimeout(() => { if (!this.isBusy && this.state !== 'sleep') this.setIdle(); }, 3000);
        }
      } else if (newState === 'error') {
        this.play('curious');
        this.randomDialogue('agent_error');
      }
    }

    handlePromptReadyReaction(promptText) {
      if (this.isBusy || this.state === 'sleep' || this.isAwaitingCommand || this.isDragging) return;
      const now = Date.now();
      if (now - this.lastPromptNoticeTime < 25000) return;
      this.lastPromptNoticeTime = now;

      this.play('curious');
      this.randomDialogue('prompt_ready');
    }

    handleChangedFilesReaction(cardEl) {
      if (this.isBusy || this.state === 'sleep' || this.isAwaitingCommand || this.isDragging) return;
      const now = Date.now();
      if (now - this.lastDiffNoticeTime < 30000) return;
      this.lastDiffNoticeTime = now;

      this.play('look_around');
      this.say('Hoot! Có code mới thay đổi kìa {user} ơi, bấm Review xem thử!', 3500);
    }

    sayHungerCue() {
      this.randomDialogue('hunger');
      this.play('curious');
    }

    getFloor() {
      const floor = EnvironmentManager.getActiveFloor();
      if (floor && floor.id !== 'ground_floor' && floor.surfaceY > 0) {
        return floor.surfaceY - this.height;
      }
      if (window.__hxEnv && typeof window.__hxEnv.getBankBounds === 'function') {
        const bank = window.__hxEnv.getBankBounds();
        if (bank && bank.y > 0) {
          return bank.y - this.height;
        }
      }
      return window.innerHeight - this.height;
    }

    // ---------------- Species Preferences System ----------------
    getFoodPreference(foodType) {
      const prefs = this.persona.preferences?.foods || {};
      if (prefs[foodType]) {
        return {
          preference: prefs[foodType].reaction || 'like',
          dialogue: prefs[foodType].dialogue || ('ate_' + foodType),
          speedBoost: prefs[foodType].speedBoost || 1.0,
        };
      }

      // Default species profile
      if (this.species === 'owl') {
        if (foodType === 'coffee') return { preference: 'love', dialogue: 'ate_coffee', speedBoost: 1.6 };
        if (foodType === 'bug') return { preference: 'love', dialogue: 'ate_bug', speedBoost: 1.0 };
        if (foodType === 'cookie') return { preference: 'like', dialogue: 'ate_cookie', speedBoost: 1.0 };
        if (foodType === 'fish') return { preference: 'dislike', dialogue: 'dislike_fish', speedBoost: 1.0 };
      } else if (this.species === 'cat') {
        if (foodType === 'fish') return { preference: 'love', dialogue: 'ate_fish', speedBoost: 1.4 };
        if (foodType === 'cookie') return { preference: 'like', dialogue: 'ate_cookie', speedBoost: 1.0 };
        if (foodType === 'coffee') return { preference: 'dislike', dialogue: 'dislike_coffee', speedBoost: 1.0 };
        if (foodType === 'bug') return { preference: 'dislike', dialogue: 'dislike_bug', speedBoost: 1.0 };
      }

      return { preference: 'like', dialogue: 'ate_cookie', speedBoost: 1.0 };
    }

    eatFood(food, pref) {
      this.clearBusy();
      this.setBusy(4500);
      this.state = 'eating';
      this.play('eat');

      const cx = this.x + this.width / 2;
      const cy = this.y + 10;

      if (food.type === 'coffee') {
        SensoryEngine.spawnParticle(cx, cy, 'coffee', 6);
        this.speedMultiplier = pref.speedBoost || 1.6;
        clearTimeout(this.speedBoostTimer);
        this.speedBoostTimer = setTimeout(() => { this.speedMultiplier = 1.0; }, 35000);
      } else if (food.type === 'bug' || food.type === 'beetle') {
        SensoryEngine.spawnParticle(cx, cy, 'bug', 6);
        if (pref.speedBoost) {
          this.speedMultiplier = pref.speedBoost;
          clearTimeout(this.speedBoostTimer);
          this.speedBoostTimer = setTimeout(() => { this.speedMultiplier = 1.0; }, 25000);
        }
      } else {
        SensoryEngine.spawnParticle(cx, cy, 'cookie', 6);
      }

      this.randomDialogue(pref.dialogue || 'ate_cookie');

      this.drives.hunger = 100;
      this.drives.affection = Math.min(100, this.drives.affection + (pref.preference === 'love' ? 15 : 8));

      setTimeout(() => {
        this.play('happy');
        SensoryEngine.spawnParticle(cx, cy, 'heart', 4);
        setTimeout(() => this.setIdle(), 2200);
      }, 1800);
    }

    refuseFood(food, pref) {
      this.clearBusy();
      this.setBusy(3000);
      this.state = 'refuse';
      this.play('refuse');
      this.randomDialogue(pref.dialogue || 'dislike_fish');
      setTimeout(() => this.setIdle(), 2800);
    }

    approachFood(food, pref) {
      this.clearBusy();
      this.setBusy(12000);
      this.isGrounded = false;
      this.currentPlatform = null;
      this.state = 'hunting';
      this.huntingTarget = { food, pref };
      this.el.classList.add('is-flying');
      this.play('fly');
      const foodDialogues = [
        'Hoot! Phát hiện món ngon rồi!',
        'Mồi ngon xuất hiện rồi {user} ơi!',
        '{name} tới ngay đây, ngon quá!'
      ];
      this.say(foodDialogues[Math.floor(Math.random() * foodDialogues.length)], 2000);
    }

    updateHunting() {
      if (!this.huntingTarget || !this.huntingTarget.food || !this.huntingTarget.food.el || !this.huntingTarget.food.el.isConnected || isNaN(this.huntingTarget.food.x) || isNaN(this.huntingTarget.food.y)) {
        this.huntingTarget = null;
        this.clearBusy();
        this.setIdle();
        return;
      }

      this.isGrounded = false;
      this.currentPlatform = null;
      this.el.classList.add('is-flying');

      const food = this.huntingTarget.food;
      const pref = this.huntingTarget.pref;
      const tx = food.x + 10 - this.width / 2;
      const ty = food.y + 10 - this.height;

      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
      this.updateFrame();

      const speed = Math.min(dist, 5.5 * this.speedMultiplier);
      if (dist <= 38) {
        this.huntingTarget = null;
        if (food.isCreature) {
          this.play('pounce');
          setTimeout(() => {
            this.eatFood(food, pref);
            WorldEntityManager.removeFood(food);
          }, 450);
        } else {
          this.eatFood(food, pref);
          WorldEntityManager.removeFood(food);
        }
      } else {
        this.play('fly');
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
        this.updatePosition();
      }
    }

    approachDislikedFood(food, pref) {
      this.clearBusy();
      this.setBusy(3500);
      this.state = 'refuse';
      this.play('refuse');
      this.facing = (food.x > this.x) ? 1 : -1;
      this.updateFrame();
      this.randomDialogue(pref.dialogue || 'dislike_fish');
      setTimeout(() => this.setIdle(), 3200);
    }

    // ---------------- Custom Species Actions ----------------
    performCustomAction(actionDef) {
      if (actionDef && actionDef.id === 'inspect_code') {
        this.fly_and_inspect_code();
        return;
      }
      this.clearBusy();
      this.setBusy(4000);
      this.play(actionDef.anim || 'look_around');
      this.randomDialogue(actionDef.dialogue || 'rotate_head');
      setTimeout(() => this.setIdle(), 3500);
    }

    doPetting() {
      this.clearBusy();
      this.setBusy(3500);
      this.state = 'petting';
      this.drives.affection = Math.min(100, this.drives.affection + 12);
      this.play('happy');
      const cx = this.x + this.width / 2;
      const cy = this.y + 10;
      SensoryEngine.spawnParticle(cx, cy, 'heart', 5);
      this.randomDialogue('petting');
      setTimeout(() => this.setIdle(), 3000);
    }

    toggleSleep() {
      this.clearBusy();
      if (this.state === 'sleep') {
        this.setIdle();
        this.drives.energy = 100;
        this.play('look_around');
        this.say('Oáp... {pet} đã nạp đầy năng lượng rồi!', 3000);
      } else {
        this.state = 'sleep';
        this.play('sleep');
        this.say('Khò khò... Gọi {pet} dậy sau nhé {user}...', 3000);
      }
    }

    pauseForMenu() {
      this.isAwaitingCommand = true;
      this.el.classList.remove('is-flying');
      this.vx = 0;
      this.vy = 0;
      if (this.state !== 'sleep') {
        this.play('idle');
        const dx = SensoryEngine.mouseX - (this.x + this.width / 2);
        if (Math.abs(dx) > 10) {
          this.facing = dx > 0 ? 1 : -1;
          this.updateFrame();
        }
      }
    }

    resumeFromMenu() {
      this.isAwaitingCommand = false;
      if (this.state !== 'sleep') {
        this.setIdle();
      }
    }

    // ---------------- Toys Interaction (Species Differences) ----------------
    startLaserChase() {
      this.clearBusy();
      this.isBusy = true;
      this.state = 'laser_chase';
      this.play('fly');
      this.say('A! Điểm đỏ kìa! Đứng lại đó mau!', 2500);
    }

    updateLaserChase() {
      if (!WorldEntityManager.laserActive) {
        this.setIdle();
        return;
      }

      const tx = SensoryEngine.mouseX - this.width / 2;
      const ty = SensoryEngine.mouseY - this.height / 2;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
      this.updateFrame();

      const speed = 4.2 * this.speedMultiplier;
      if (dist <= 26) {
        this.play('pounce');
        if (Math.random() < 0.08) {
          this.randomDialogue('laser_chase');
        }
      } else {
        this.play('fly');
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
      }
      this.updatePosition();
    }

    noticeBall(ball) {
      if (this.isDragging) return;
      this.clearBusy();
      this.isBusy = true;
      this.isGrounded = false;
      this.currentPlatform = null;
      this.state = 'ball_play';
      this.el.classList.add('is-flying');
      this.play('fly');
      this.say('Hoot! Chơi bóng nào {user}!', 2000);
    }

    interactWithBall(ball, dx, dy) {
      ball.lastInteractionTime = Date.now();
      if (this.species === 'owl') {
        // Owl does aerial header!
        ball.vy = -9 - Math.random() * 4;
        const pushDir = dx !== 0 ? Math.sign(dx) : (this.facing || 1);
        ball.vx = pushDir * (5 + Math.random() * 5);
        this.play('pounce');
        SensoryEngine.spawnParticle(ball.x, ball.y, 'cookie', 4);
        const dialogues = [
          'Tưng tưng! Húc trúng bóng rồi!',
          '{name} bắt bóng siêu đẳng chưa!',
          'Bóng bay cao quá {user} ơi, hoot!',
          'Hoot hoot! Chuyền bóng tiếp nào!'
        ];
        this.say(dialogues[Math.floor(Math.random() * dialogues.length)], 2000);
        setTimeout(() => {
          if (this.state === 'ball_play') this.play('fly');
        }, 450);
      } else {
        // Ground pet / cat runs & swats sideways!
        const pushDir = dx !== 0 ? Math.sign(dx) : (this.facing || 1);
        ball.vx = pushDir * (6 + Math.random() * 3);
        ball.vy = -5 - Math.random() * 3;
        this.play('walk');
        this.say('Chụp trúng bóng rồi!', 2000);
      }
    }

    updateBallPlay() {
      const ball = WorldEntityManager.activeBall;
      if (!ball || ball.isCleaningUp || !ball.el || !ball.el.isConnected) {
        this.clearBusy();
        this.setIdle();
        return;
      }

      this.isGrounded = false;
      this.currentPlatform = null;
      this.el.classList.add('is-flying');

      const pCenterX = this.x + this.width / 2;
      const pCenterY = this.y + this.height / 2;

      // Don dau huong qua bong (Anticipation / Interception)
      const targetX = ball.x + (ball.vx || 0) * 3;
      const targetY = ball.y + (ball.vy || 0) * 3;

      const dx = targetX - pCenterX;
      const dy = targetY - pCenterY;
      const dist = Math.hypot(dx, dy);

      const speed = Math.min(dist, 6.5 * this.speedMultiplier);
      if (dist > 1) {
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
        this.facing = dx > 0 ? 1 : -1;
      }
      this.play('fly');
      this.updatePosition();

      // Kiem tra va cham truc tiep voi bong
      const realDist = Math.hypot(ball.x - pCenterX, ball.y - pCenterY);
      if (realDist < 46) {
        ball.lastInteractionTime = Date.now();
        this.interactWithBall(ball, ball.x - pCenterX, ball.y - pCenterY);
      }
    }

    findPerchTarget() {
      const platforms = EnvironmentManager.scan().filter((p) => !p.isFloor && p.type !== 'water');
      if (platforms.length > 0 && Math.random() < 0.75) {
        const choice = platforms[Math.floor(Math.random() * platforms.length)];
        const minX = Math.max(0, choice.left + 4);
        const maxX = Math.max(minX, Math.min(window.innerWidth - this.width, choice.right - this.width - 4));
        const tx = minX < maxX ? minX + Math.random() * (maxX - minX) : minX;
        const ty = Math.max(0, choice.surfaceY - this.height);

        return { x: tx, y: ty, isPerch: true, platform: choice };
      }

      const floorPlat = EnvironmentManager.getActiveFloor();
      const tx = Math.max(0, Math.min(window.innerWidth - this.width, Math.random() * (window.innerWidth - this.width)));
      const ty = floorPlat ? Math.max(0, floorPlat.surfaceY - this.height) : this.getFloor();
      return { x: tx, y: ty, isPerch: false, platform: floorPlat };
    }

    checkActiveWorldEntities() {
      if (this.isDragging || this.isAwaitingCommand) return false;

      // 1. Qua bong nay (Uu tien so 1 khi bat do choi)
      const ball = WorldEntityManager.activeBall;
      if (ball && !ball.isCleaningUp && ball.el && ball.el.isConnected) {
        if (this.state !== 'ball_play') {
          this.clearBusy();
          this.isBusy = true;
          this.isGrounded = false;
          this.currentPlatform = null;
          this.state = 'ball_play';
          this.el.classList.add('is-flying');
          this.play('fly');
          this.say('Hoot! Chơi bóng nào {user}!', 2000);
        }
        this.updateBallPlay();
        return true;
      }

      // 2. Con tro laser
      if (WorldEntityManager.laserActive) {
        if (this.state !== 'laser_chase') {
          this.clearBusy();
          this.isBusy = true;
          this.isGrounded = false;
          this.currentPlatform = null;
          this.state = 'laser_chase';
          this.el.classList.add('is-flying');
          this.play('fly');
          this.say('Á! Đốm sáng đỏ kỳ lạ kìa!', 2000);
        }
        this.updateLaserChase();
        return true;
      }

      // 3. Do an tren man hinh (Thuc an, sau, bo, ca phe, banh...)
      if (WorldEntityManager.foods && WorldEntityManager.foods.length > 0) {
        if (this.state === 'eating' || this.state === 'refuse') {
          return true;
        }

        if (this.state === 'hunting' && this.huntingTarget && this.huntingTarget.food && this.huntingTarget.food.el && this.huntingTarget.food.el.isConnected) {
          this.updateHunting();
          return true;
        }

        const targetFood = WorldEntityManager.foods.find(f => f && f.el && f.el.isConnected && !f.isHeld && !isNaN(f.x) && !isNaN(f.y));
        if (targetFood) {
          const pref = this.getFoodPreference(targetFood.type);
          this.approachFood(targetFood, pref);
          this.updateHunting();
          return true;
        }
      }

      return false;
    }

    think(dt) {
      if (this.isDragging || this.isAwaitingCommand) return;

      // Active World Object Seeking Loop: Luon kiem tra vat the hien huu va san sang tuong tac
      if (this.checkActiveWorldEntities()) {
        return;
      }

      // Stuck recovery watchdog: if any state lasts longer than 18s (except sleep), force reset
      if (this.stateTimer > 18000 && this.state !== 'sleep') {
        this.clearBusy();
        this.setIdle();
        return;
      }

      // Look-at mouse facing if idle or perched and mouse is near (< 260px)
      if ((this.state === 'idle' || this.state === 'perch') && !this.isBusy) {
        const dx = SensoryEngine.mouseX - (this.x + this.width / 2);
        const dist = Math.hypot(dx, SensoryEngine.mouseY - (this.y + this.height / 2));
        if (dist < 260 && Math.abs(dx) > 16) {
          const desiredFacing = dx > 0 ? 1 : -1;
          if (this.facing !== desiredFacing) {
            this.facing = desiredFacing;
            this.updateFrame();
          }
        }
      }

      // Check typing cadence reactions
      SensoryEngine.updateCadence();
      const now = Date.now();
      if (SensoryEngine.typingCadence === 'burst' && now - this.lastTypingReactionTime > 25000 && !this.isBusy && this.state !== 'sleep') {
        this.lastTypingReactionTime = now;
        this.watchTyping();
        return;
      } else if (SensoryEngine.typingCadence === 'paused' && now - this.lastTypingReactionTime > 15000 && !this.isBusy && this.state !== 'sleep') {
        this.lastTypingReactionTime = now;
        this.randomDialogue('typing_pause');
      }

      // Phase 3: Living Drives decay & Hunger cues
      if (now - this.lastHungerDecayTime >= 12000) {
        this.lastHungerDecayTime = now;
        this.drives.hunger = Math.max(0, this.drives.hunger - 1);
        if (this.state === 'sleep') {
          this.drives.energy = Math.min(100, this.drives.energy + 2);
        } else {
          this.drives.energy = Math.max(0, this.drives.energy - 0.5);
        }
      }

      if (this.drives.hunger < 25 && now - this.lastHungerNoticeTime > 40000 && !this.isBusy && this.state !== 'sleep') {
        this.lastHungerNoticeTime = now;
        this.sayHungerCue();
      }

      if (this.isBusy) {
        if (this.state === 'laser_chase') {
          this.updateLaserChase();
        } else if (this.state === 'ball_play') {
          this.updateBallPlay();
        } else if (this.state === 'hunting') {
          this.updateHunting();
        }
        return;
      }

      this.stateTimer += dt;

      // 1. Comprehensive Grounded & Platform Surface Integrity Check
      const footX = this.x + this.width / 2;
      const footY = this.y + this.height;
      const isAirborne = this.state === 'fly' || this.state === 'glide' || this.state === 'swim' || this.state === 'sleep' || this.state === 'ball_play' || this.state === 'hunting' || this.state === 'laser_chase' || this.state === 'eating' || this.state === 'refuse';

      const env = window.__hxEnv;
      if (env && env.effectLevel !== 'off') {
        if (this._lightningEnv !== env && typeof env.onLightning === 'function') {
          if (typeof this._lightningUnsub === 'function') {
            this._lightningUnsub();
            this._lightningUnsub = null;
          }
          this._lightningEnv = env;
          this._lightningUnsub = env.onLightning(() => {
            if (this.isBusy || this.isDragging || this.state === 'sleep') return;
            if (this.isGrounded && this.state !== 'swim') {
              this.vy = -3.2;
              this.isGrounded = false;
              this.currentPlatform = null;
              this.play('curious');
            }
          });
        }
        if (this.isGrounded && this.state !== 'swim' && footY >= env.waterLevelY + 2) {
          this.enterWater();
          this.updatePosition();
          return;
        }
      } else if (this._lightningUnsub) {
        this._lightningUnsub();
        this._lightningUnsub = null;
        this._lightningEnv = null;
      }
      if (this.isWet && this.wetTimer > 0) {
        this.wetTimer--;
        if (this.wetTimer % 18 === 0 && env && typeof env.emitSplash === 'function' && this.state !== 'swim') {
          // Nhỏ giọt nước khi vừa lên bờ
          SensoryEngine.spawnParticle(this.x + this.width / 2, this.y + this.height - 4, 'water', 1);
        }
        if (this.wetTimer <= 0) this.isWet = false;
      }

      if (this.isGrounded) {
        if (!this.currentPlatform) {
          // Pet is marked grounded, but has no platform reference!
          const floorY = this.getFloor() + this.height;
          if (Math.abs(footY - floorY) > 8) {
            // Pet is in mid-air with NO platform! Fall immediately under gravity!
            this.isGrounded = false;
            this.currentPlatform = null;
            if (!isAirborne) {
              this.state = 'falling';
              this.vy = 1.0;
              this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
            }
          } else {
            this.currentPlatform = EnvironmentManager.getActiveFloor();
          }
        } else {
          // Validate existing platform
          const validPlatform = EnvironmentManager.validatePlatform(this.currentPlatform);
          if (!validPlatform) {
            // Platform was deleted from DOM, scrolled out of view, or hidden!
            this.isGrounded = false;
            this.currentPlatform = null;
            if (!isAirborne) {
              this.state = 'falling';
              this.vy = 1.0;
              this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
            }
          } else {
            // Check vertical & horizontal alignment with live moving platform
            const dy = Math.abs(footY - validPlatform.surfaceY);
            const inX = footX >= validPlatform.left - 6 && footX <= validPlatform.right + 6;

            if (inX && dy <= 24 && (this.state === 'perch' || this.state === 'idle')) {
              // Surface moved gently (e.g. smooth scroll or UI panel resize): snap pet to stay on surface!
              this.y = validPlatform.surfaceY - this.height;
            } else if (!EnvironmentManager.isOnPlatform(footX, footY, validPlatform)) {
              // Stepped off, platform jumped away, or pet was displaced: trigger natural fall!
              this.isGrounded = false;
              this.currentPlatform = null;
              if (!isAirborne) {
                this.state = 'falling';
                this.vy = 1.0;
                this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
              }
            }
          }
        }
      }

      // 2. Air Physics: Gravity always pulls pet if not grounded and not flying
      if (!this.isGrounded && !isAirborne) {
        if (this.state !== 'falling') {
          this.state = 'falling';
          this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
        }

        const gravity = (this.manifest.physics && this.manifest.physics.gravity) || 0.45;
        this.vy += gravity;
        if (this.vy > 18) this.vy = 18;
        if (env && env.effectLevel !== 'off' && Math.abs(env.windX || 0) > 0.25) {
          this.vx += env.windX * 0.03;
        }

        const prevFootY = this.y + this.height;
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.94;
        if (Math.abs(this.vx) < 0.08) this.vx = 0;

        // Solid platform landing checks BEFORE water check (e.g. forest_ground_bank is above waterY)
        const newFootX = this.x + this.width / 2;
        const newFootY = this.y + this.height;
        let landedOn = null;

        if (this.vy >= 0) {
          const platforms = EnvironmentManager.scan();
          for (const p of platforms) {
            if (p.type === 'water') continue;
            if (newFootX >= p.left - 4 && newFootX <= p.right + 4) {
              if (prevFootY <= p.surfaceY + 4 && newFootY >= p.surfaceY - 4) {
                if (!landedOn || p.surfaceY < landedOn.surfaceY) {
                  landedOn = p;
                }
              }
            }
          }

          if (landedOn) {
            this.y = landedOn.surfaceY - this.height;
            if (this.vy > 4.5) {
              this.vy = -this.vy * 0.22;
              this.vx *= 0.6;
              if (Math.abs(this.vy) < 1.2) this.vy = 0;
            } else {
              this.vy = 0;
              this.vx = 0;
              this.isGrounded = true;
              this.currentPlatform = landedOn;
              this.isFlung = false;
              this.onLandOnPlatform(landedOn);
              this.setIdle();
            }
          }
        }

        // Water surface entry check only if no solid surface caught the pet above water
        if (!landedOn && env && env.effectLevel !== 'off' && env.waterLevelY && (this.y + this.height) >= env.waterLevelY && this.vy >= 0) {
          this.enterWater();
          this.updatePosition();
          return;
        }

        // Wall, ceiling & bottom-floor bounce checks
        this.checkBoundariesAndCollisions();

        this.updatePosition();
        return;
      }

      switch (this.state) {
        case 'idle':
          if (this.stateTimer >= this.stateDuration) {
            this.decideNextAction();
          }
          break;

        case 'swim': {
          const swimEnv = window.__hxEnv;
          if (!swimEnv) {
            this.state = 'falling';
            this.play(this.manifest.physics?.canFly ? 'glide' : 'falling', true);
            this.updatePosition();
            break;
          }
          this.stateTimer = 0; // Prevent stuck watchdog during active swimming
          this.swimTimer = (this.swimTimer || 0) + 1;
          this.wetTimer = Math.max(this.wetTimer || 0, 160);
          const isAquatic = !!(this.manifest.physics && this.manifest.physics.isAquatic);
          const targetY = swimEnv.waterLevelY - this.height + (isAquatic ? 10 : 6);
          this.y += (targetY - this.y) * 0.18 + Math.sin(this.swimTimer * 0.16) * 0.45;

          const swimSpeed = isAquatic ? 1.5 : 0.85;
          this.x += (this.swimDir || 1) * swimSpeed;
          this.facing = this.swimDir || 1;
          if (this.x <= 12) {
            this.x = 12;
            this.swimDir = 1;
            this.facing = 1;
          } else if (this.x >= window.innerWidth - this.width - 12) {
            this.x = window.innerWidth - this.width - 12;
            this.swimDir = -1;
            this.facing = -1;
          }

          // Smooth real-time update of position and animation frame every tick
          this.updatePosition();
          this.updateFrame();

          if (this.swimTimer % 24 === 0 && typeof swimEnv.emitSplash === 'function') {
            swimEnv.emitSplash(this.x + this.width / 2, isAquatic ? 0.9 : 0.6);
          }

          if (!isAquatic && this.manifest.physics?.canFly && this.swimTimer > 180) {
            // Hooty vỗ cánh bay vọt lên khỏi mặt nước
            if (typeof swimEnv.emitSplash === 'function') {
              swimEnv.emitSplash(this.x + this.width / 2, 1.8);
            }
            this.vy = -7.5;
            this.y -= 12;
            this.state = 'falling';
            this.play('fly', true);
            this.updatePosition();
          } else if (isAquatic && this.swimTimer > 420 && Math.random() < 0.02) {
            this.swimDir = -(this.swimDir || 1);
          }
          break;
        }

        case 'sleep':
          // Sleeping peacefully, do not disturb
          break;

        case 'look_around':
        case 'curious':
          if (this.stateTimer >= this.stateDuration) {
            this.setIdle();
          }
          break;

        case 'walk': {
          const dx = this.targetX - this.x;
          const baseSpeed = (this.manifest.physics && this.manifest.physics.walkSpeed) || 1.3;
          const speed = baseSpeed * this.speedMultiplier;
          if (Math.abs(dx) <= speed + 1) {
            this.x = this.targetX;
            this.setIdle();
          } else {
            this.facing = dx > 0 ? 1 : -1;
            this.x += Math.sign(dx) * speed;
            this.updateFrame();
          }

          // Check if walked off elevated platform edge
          if (this.currentPlatform && !this.currentPlatform.isFloor) {
            const curFootX = this.x + this.width / 2;
            if (curFootX < this.currentPlatform.left - 2 || curFootX > this.currentPlatform.right + 2) {
              this.isGrounded = false;
              this.currentPlatform = null;
              this.state = 'falling';
              this.vy = 0.8;
              this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
            }
          }

          this.updatePosition();
          break;
        }

        case 'fly': {
          const dx = this.targetX - this.x;
          const dy = this.targetY - this.y;
          const dist = Math.hypot(dx, dy);
          const baseFlight = (this.manifest.physics && this.manifest.physics.flightSpeed) || 2.4;
          const flightSpeed = baseFlight * this.speedMultiplier;

          this.el.classList.add('is-flying');
          if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
          this.updateFrame();

          if (dist <= 25) {
            this.state = 'glide';
            this.play('glide');
          } else {
            this.x += (dx / dist) * flightSpeed;
            this.y += (dy / dist) * flightSpeed;
          }
          this.updatePosition();
          break;
        }

        case 'glide': {
          const dx = this.targetX - this.x;
          const dy = this.targetY - this.y;
          const dist = Math.hypot(dx, dy);
          const glideSpeed = 1.5 * this.speedMultiplier;

          if (dist <= glideSpeed + 1) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.el.classList.remove('is-flying');

            const footX = this.x + this.width / 2;
            const footY = this.y + this.height;
            const livePlatform = this.targetPlatform
              ? EnvironmentManager.validatePlatform(this.targetPlatform)
              : EnvironmentManager.findSurfaceBelow(footX, footY);

            if (livePlatform && Math.abs(footY - livePlatform.surfaceY) <= 8) {
              this.y = livePlatform.surfaceY - this.height;
              this.isGrounded = true;
              this.currentPlatform = livePlatform;
              this.onLandOnPlatform(livePlatform);
              if (this.pendingGroundAnim) {
                this.flushPendingGroundAnim();
              } else if (this.targetIsPerch) {
                this.state = 'perch';
                this.stateTimer = 0;
                this.stateDuration = 4000 + Math.random() * 8000;
                this.play('perch');
              } else {
                this.setIdle();
              }
            } else {
              // Target platform moved or disappeared during flight! Fall safely under gravity!
              this.isGrounded = false;
              this.currentPlatform = null;
              this.state = 'falling';
              this.vy = 1.0;
              this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
            }
          } else {
            this.x += (dx / dist) * glideSpeed;
            this.y += (dy / dist) * glideSpeed;
          }
          this.updatePosition();
          break;
        }

        case 'perch':
          if (this.stateTimer >= this.stateDuration) {
            this.decideNextAction();
          } else {
            if (!this.perchSubTimer) this.perchSubTimer = 0;
            this.perchSubTimer += dt;
            if (this.perchSubTimer >= 2800) {
              this.perchSubTimer = 0;
              const r = Math.random();
              if (r < 0.45) {
                this.play('look_around');
              } else if (r < 0.75) {
                this.play('curious');
                if (this.currentPlatform && this.currentPlatform.el) {
                  this.applyPlatformImpact(this.currentPlatform, 'peck');
                }
              }
            }
          }
          break;

        case 'falling':
          break;
      }
    }

    decideNextAction() {
      const mischiefRate = this.userConfig.mischiefRate !== undefined ? Number(this.userConfig.mischiefRate) : 0.3;
      const now = Date.now();

      // Check mischief
      if (mischiefRate > 0 && Math.random() < mischiefRate) {
        const rollMischief = Math.random();
        if (rollMischief < 0.35) {
          this.fly_and_inspect_code();
          return;
        } else if (rollMischief < 0.65) {
          this.curious_button_peck();
          return;
        } else if (rollMischief < 0.85) {
          this.doMischiefPrompt();
          return;
        } else if (now - this.lastCursorMischiefTime > 25000) {
          this.lastCursorMischiefTime = now;
          this.doMischiefCursor();
          return;
        } else {
          this.curious_button_peck();
          return;
        }
      }

      const roll = Math.random();
      const hour = new Date().getHours();
      const isNight = hour >= 22 || hour < 5;

      if (roll < 0.25) {
        this.state = 'walk';
        this.stateTimer = 0;
        const maxDist = 80 + Math.random() * 80;
        const dir = Math.random() < 0.5 ? 1 : -1;

        if (this.currentPlatform && !this.currentPlatform.isFloor) {
          const minX = Math.max(0, this.currentPlatform.left);
          const maxX = Math.min(window.innerWidth - this.width, this.currentPlatform.right - this.width);
          if (maxX > minX + 10) {
            this.targetX = Math.max(minX, Math.min(maxX, this.x + dir * maxDist));
            this.play('walk');
            return;
          }
        }

        this.targetX = Math.max(0, Math.min(window.innerWidth - this.width, this.x + dir * maxDist));
        this.play('walk');
      } else if (roll < 0.60 && this.manifest.physics?.canFly) {
        const target = this.findPerchTarget();
        this.state = 'fly';
        this.stateTimer = 0;
        this.targetX = target.x;
        this.targetY = target.y;
        this.targetIsPerch = target.isPerch;
        this.targetPlatform = target.platform || null;
        this.play('fly');
      } else if (roll < 0.75) {
        this.state = 'look_around';
        this.stateTimer = 0;
        this.stateDuration = 2000;
        this.play('look_around');
      } else if (roll < 0.88) {
        this.state = 'curious';
        this.stateTimer = 0;
        this.stateDuration = 1800;
        this.play('curious');
      } else {
        this.setIdle();
        if (isNight && Math.random() < 0.5) {
          this.randomDialogue('night_owl');
        } else {
          this.randomDialogue('idle');
        }
      }
    }

    setIdle() {
      this.clearBusy();
      this.state = 'idle';
      this.stateTimer = 0;
      this.stateDuration = 2500 + Math.random() * 4500;
      this.el.classList.remove('is-flying');
      if (this.pendingGroundAnim) {
        this.flushPendingGroundAnim();
      } else {
        this.play('idle');
      }
    }

    async watchTyping() {
      const input = SensoryEngine.activeInputEl || findPromptInput();
      if (!input || !input.isConnected) return;

      this.setBusy(10000);
      const rect = input.getBoundingClientRect();
      const tx = Math.max(8, Math.min(window.innerWidth - this.width - 8, rect.left + Math.min(80, rect.width / 4)));
      const ty = Math.max(8, rect.top - this.height + 2);

      this.state = 'fly';
      this.targetX = tx;
      this.targetY = ty;
      this.targetIsPerch = true;
      this.play('fly');

      const arriveInterval = setInterval(() => {
        if (!this.isBusy) { clearInterval(arriveInterval); return; }
        if (Math.hypot(this.x - tx, this.y - ty) < 25) {
          clearInterval(arriveInterval);
          this.state = 'perch';
          this.play('curious');
          this.randomDialogue('typing_fast');
          setTimeout(() => {
            if (this.isBusy) this.setIdle();
          }, 4500);
        }
      }, 100);
      setTimeout(() => clearInterval(arriveInterval), 3500);
    }

    async doMischiefCursor() {
      this.setBusy(8000);
      const mx = SensoryEngine.mouseX;
      const my = SensoryEngine.mouseY;

      const tx = Math.max(10, Math.min(window.innerWidth - this.width - 10, mx - this.width / 2));
      const ty = Math.max(10, Math.min(window.innerHeight - this.height - 10, my - this.height / 2));

      this.state = 'fly';
      this.targetX = tx;
      this.targetY = ty;
      this.targetIsPerch = false;
      this.play('fly');

      let arrived = false;
      const checkArrival = setInterval(() => {
        if (!this.isBusy) { clearInterval(checkArrival); return; }
        if (!arrived && Math.hypot(this.x - tx, this.y - ty) < 26) {
          arrived = true;
          clearInterval(checkArrival);
          this.play('pounce');
          this.randomDialogue('cursor_troll');
          setTimeout(() => {
            if (this.isBusy) this.play('curious');
          }, 600);

          const fleeCheck = setInterval(() => {
            if (!this.isBusy) { clearInterval(fleeCheck); return; }
            if (SensoryEngine.mouseSpeed > 1.2) {
              clearInterval(fleeCheck);
              this.play('look_around');
              this.say('Chạy nhanh thế! Lần sau {pet} sẽ bắt lại, hoot!', 2500);
              setTimeout(() => this.setIdle(), 2000);
            }
          }, 120);

          setTimeout(() => {
            clearInterval(fleeCheck);
            if (this.isBusy) this.setIdle();
          }, 3500);
        }
      }, 100);
      setTimeout(() => clearInterval(checkArrival), 3000);
    }

    async doMischiefPrompt() {
      const input = findPromptInput();
      if (!input) {
        this.setIdle();
        return;
      }

      this.setBusy(12000);
      const rect = input.getBoundingClientRect();
      const tx = Math.max(8, Math.min(window.innerWidth - this.width - 8, rect.left + Math.min(100, rect.width / 3)));
      const ty = Math.max(8, rect.top - this.height + 2);

      this.state = 'fly';
      this.targetX = tx;
      this.targetY = ty;
      this.targetIsPerch = true;
      this.play('fly');

      const checkArrival = setInterval(() => {
        if (!this.isBusy) {
          clearInterval(checkArrival);
          return;
        }
        if (this.state === 'perch' || Math.hypot(this.x - tx, this.y - ty) < 22) {
          clearInterval(checkArrival);
          const liveRect = input.getBoundingClientRect();
          this.currentPlatform = {
            id: input.getAttribute('data-testid') || 'Khung Nhập Prompt',
            name: 'Khung Nhập Prompt',
            type: 'ui',
            left: liveRect.left,
            right: liveRect.right,
            top: liveRect.top,
            bottom: liveRect.bottom,
            surfaceY: liveRect.top,
            isFloor: false,
            el: input,
          };
          this.isGrounded = true;
          this.startTypingMischief(input);
        }
      }, 120);
      setTimeout(() => clearInterval(checkArrival), 4000);
    }

    async startTypingMischief(input) {
      this.state = 'perch';
      this.play('typing');
      this.say('Hoot! Để {pet} gõ phụ {user} nhé...', 3000);

      let phrase = 'hoot hoot giải lao chút đi {user} ơi...';
      try {
        const bridge = window.opencodeHarness || window.antigravityHarness;
        if (bridge?.getPromptStealText) {
          phrase = await bridge.getPromptStealText(this.manifest.id);
        }
      } catch { /* use default */ }
      phrase = this.formatDialogue(phrase);

      let idx = 0;
      const typeTimer = setInterval(() => {
        if (this.isDragging || !input.isConnected || !this.isBusy) {
          clearInterval(typeTimer);
          this.setIdle();
          return;
        }

        if (idx < phrase.length) {
          const ch = phrase[idx++];
          if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            input.value = (input.value || '') + ch;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (input.isContentEditable) {
            input.textContent = (input.textContent || '') + ch;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else {
          clearInterval(typeTimer);
          this.play('curious');
          this.say('{pet} vừa viết prompt giúp {user} đấy, hoot!', 3500);
          setTimeout(() => {
            this.setIdle();
          }, 3000);
        }
      }, 130);
    }

    async doMischiefMenu() {
      const navBtn = document.getElementById('hx-navbtn');
      if (!navBtn) {
        this.setIdle();
        return;
      }
      this.setBusy(8000);
      const rect = navBtn.getBoundingClientRect();

      this.state = 'fly';
      this.targetX = Math.max(8, rect.left);
      this.targetY = Math.max(8, rect.bottom + 6);
      this.targetIsPerch = true;
      this.currentPlatform = {
        id: 'hx-navbtn',
        name: 'Nút Harness Menu',
        type: 'ui',
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        surfaceY: rect.bottom + 4,
        isFloor: false,
        el: navBtn,
      };
      this.play('fly');

      setTimeout(() => {
        this.play('look_around');
        this.say('Hoot! Ghé thăm menu kiểm tra {user} có chăm code không...', 3000);
        setTimeout(() => this.setIdle(), 3500);
      }, 2500);
    }

    async fly_and_inspect_code() {
      const candidates = Array.from(document.querySelectorAll('pre, [data-component="markdown-code"] pre, [data-testid="agent-input-box"], .antigravity-prompt-bar, [data-slot="input-wrapper"] textarea, .code-block, code, [data-testid="breadcrumb-segment"]'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 30 && r.height > 15 && r.top >= 0 && r.bottom <= window.innerHeight;
        });

      let targetEl = candidates[0];
      const preEl = candidates.find((el) => el.tagName === 'PRE' || el.classList.contains('code-block'));
      if (preEl) targetEl = preEl;

      if (!targetEl) {
        targetEl = document.querySelector('[data-testid="agent-input-box"]') ||
                   document.querySelector('[data-slot="input-wrapper"] textarea') ||
                   document.querySelector('textarea');
      }

      if (!targetEl) {
        this.play('look_around');
        this.say('Hoot! Chưa tìm thấy khối code nào trên màn hình...', 3000);
        setTimeout(() => this.setIdle(), 3000);
        return;
      }

      this.setBusy(14000);
      const rect = targetEl.getBoundingClientRect();
      const tx = Math.max(12, Math.min(window.innerWidth - this.width - 12, rect.left + Math.min(80, rect.width / 3)));
      const ty = Math.max(12, rect.top - this.height + 2);

      this.state = 'fly';
      this.targetX = tx;
      this.targetY = ty;
      this.targetIsPerch = true;
      this.speedMultiplier = 2.4;
      this.play('fly');

      let arrived = false;
      const arrivalCheck = setInterval(() => {
        if (!this.isBusy) {
          clearInterval(arrivalCheck);
          this.speedMultiplier = 1.0;
          return;
        }
        if (!arrived && (this.state === 'perch' || Math.hypot(this.x - tx, this.y - ty) < 36)) {
          arrived = true;
          clearInterval(arrivalCheck);
          this.speedMultiplier = 1.0;
          this.x = tx;
          this.y = ty;
          this.isGrounded = true;
          const liveRect = targetEl.getBoundingClientRect();
          this.currentPlatform = {
            id: targetEl.getAttribute('data-testid') || targetEl.tagName.toLowerCase(),
            name: targetEl.getAttribute('data-testid') || 'Khối Code Đang Soi',
            type: 'ui',
            left: liveRect.left,
            right: liveRect.right,
            top: liveRect.top,
            bottom: liveRect.bottom,
            surfaceY: liveRect.top,
            isFloor: false,
            el: targetEl,
          };
          this.state = 'perch';
          this.play('typing');

          targetEl.classList.add('hx-platform-pecked');
          SensoryEngine.spawnParticle(this.x + this.width / 2, this.y + this.height - 2, 'cookie', 3);

          const snippet = (targetEl.textContent || '').trim().slice(0, 100);
          this.randomDialogue('inspect_code', { codeSnippet: snippet });

          setTimeout(() => {
            targetEl.classList.remove('hx-platform-pecked');
          }, 1800);

          setTimeout(() => {
            if (this.isBusy) {
              this.play('happy');
              setTimeout(() => this.setIdle(), 2000);
            }
          }, 4000);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(arrivalCheck);
        this.speedMultiplier = 1.0;
        if (!arrived && this.isBusy) this.setIdle();
      }, 8000);
    }

    async curious_button_peck() {
      const safeSelectors = [
        '[data-testid="toggle-overview-panel"]',
        '[data-testid="project-header"]',
        '[data-testid="automations-button"]',
        '[data-testid="customizations-button"]',
        '[data-testid="breadcrumb-segment"]',
        '[data-slot="sidebar-header"]',
        '[data-slot="header"]',
        '[data-component="terminal"]',
        '#hx-navbtn',
      ];

      const allSafeEls = Array.from(document.querySelectorAll(safeSelectors.join(',')))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 12 || r.height < 12 || r.top < 0 || r.bottom > window.innerHeight) return false;
          const testId = (el.getAttribute('data-testid') || '').toLowerCase();
          const txt = (el.textContent || '').toLowerCase();
          if (testId.includes('send') || testId.includes('cancel') || testId.includes('delete') || testId.includes('remove') || testId.includes('archive') || testId.includes('stop') || testId.includes('kill')) {
            return false;
          }
          if (txt.includes('xóa') || txt.includes('hủy') || txt.includes('gửi') || txt.includes('delete') || txt.includes('cancel')) {
            return false;
          }
          return true;
        });

      if (!allSafeEls.length) {
        this.setIdle();
        return;
      }

      const targetBtn = allSafeEls[Math.floor(Math.random() * allSafeEls.length)];
      const rect = targetBtn.getBoundingClientRect();

      this.setBusy(12000);
      const tx = Math.max(10, Math.min(window.innerWidth - this.width - 10, rect.left + rect.width / 2 - this.width / 2));
      const ty = Math.max(10, rect.top - this.height + 2);

      this.state = 'fly';
      this.targetX = tx;
      this.targetY = ty;
      this.targetIsPerch = true;
      this.speedMultiplier = 2.4;
      this.play('fly');

      let arrived = false;
      const arrivalCheck = setInterval(() => {
        if (!this.isBusy) {
          clearInterval(arrivalCheck);
          this.speedMultiplier = 1.0;
          return;
        }
        if (!arrived && (this.state === 'perch' || Math.hypot(this.x - tx, this.y - ty) < 34)) {
          arrived = true;
          clearInterval(arrivalCheck);
          this.speedMultiplier = 1.0;
          this.x = tx;
          this.y = ty;
          this.isGrounded = true;
          const liveRect = targetBtn.getBoundingClientRect();
          this.currentPlatform = {
            id: targetBtn.getAttribute('data-testid') || targetBtn.id || 'Nút UI',
            name: targetBtn.getAttribute('data-testid') || targetBtn.textContent?.slice(0, 20) || 'Nút UI',
            type: 'ui',
            left: liveRect.left,
            right: liveRect.right,
            top: liveRect.top,
            bottom: liveRect.bottom,
            surfaceY: liveRect.top,
            isFloor: false,
            el: targetBtn,
          };
          this.state = 'perch';
          this.play('pounce');

          this.randomDialogue('curious_button');

          targetBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          targetBtn.classList.add('hx-platform-pecked');

          setTimeout(() => {
            this.play('typing');
            SensoryEngine.spawnParticle(this.x + this.width / 2, this.y + this.height - 2, 'cookie', 2);
            targetBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, 600);

          setTimeout(() => {
            targetBtn.classList.remove('hx-platform-pecked');
            targetBtn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            if (this.isBusy) this.setIdle();
          }, 3200);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(arrivalCheck);
        this.speedMultiplier = 1.0;
        if (!arrived && this.isBusy) this.setIdle();
      }, 8000);
    }

    tick(dt) {
      if (this.currentAnim) {
        const fps = this.currentAnim.fps || 4;
        const frameInterval = 1000 / fps;
        this.frameTimer += dt;
        if (this.frameTimer >= frameInterval) {
          this.frameTimer -= frameInterval;
          if (this.currentAnim.loop) {
            this.frameIndex = (this.frameIndex + 1) % this.currentAnim.frames;
          } else {
            if (this.frameIndex < this.currentAnim.frames - 1) {
              this.frameIndex++;
            }
          }
          this.updateFrame();
        }
      }

      this.think(dt);
    }

    attachEvents() {
      let mouseHistory = [];

      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        this.clearBusy();
        this.isDragging = true;
        this.isGrounded = false;
        this.currentPlatform = null;
        this.isFlung = false;
        this.mouseDownTime = Date.now();
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
        this.dragOffsetX = e.clientX - this.x;
        this.dragOffsetY = e.clientY - this.y;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.vx = 0;
        this.vy = 0;
        mouseHistory = [{ x: e.clientX, y: e.clientY, time: performance.now() }];

        this.el.classList.add('is-dragged');
        this.play('dragged');

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!this.isDragging) return;
        const now = performance.now();
        mouseHistory.push({ x: e.clientX, y: e.clientY, time: now });
        if (mouseHistory.length > 5) mouseHistory.shift();

        this.x = e.clientX - this.dragOffsetX;
        this.y = e.clientY - this.dragOffsetY;
        this.updatePosition();
      };

      const onMouseUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.el.classList.remove('is-dragged');

        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const duration = Date.now() - this.mouseDownTime;
        const dist = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);

        // Compute smooth release velocity from last few mouse movements
        const now = performance.now();
        let releaseVx = 0;
        let releaseVy = 0;
        if (mouseHistory.length >= 2) {
          const first = mouseHistory[0];
          const last = mouseHistory[mouseHistory.length - 1];
          const dt = Math.max(16, last.time - first.time);
          if (now - last.time < 80) {
            releaseVx = ((last.x - first.x) / dt) * 16.6;
            releaseVy = ((last.y - first.y) / dt) * 16.6;
          }
        }

        // Clamp max fling velocity to prevent glitching (max 26 px/frame)
        const maxV = 26;
        this.vx = Math.max(-maxV, Math.min(maxV, releaseVx));
        this.vy = Math.max(-maxV, Math.min(maxV, releaseVy));

        // Tap vs Drag / Fling handling
        if (duration < 250 && dist < 6) {
          this.vx = 0;
          this.vy = 0;
          this.randomDialogue('clicked');

          // Check if pet was tapped while resting on a platform
          const footX = this.x + this.width / 2;
          const footY = this.y + this.height;
          const sup = EnvironmentManager.findSurfaceBelow(footX, footY);
          if (sup && Math.abs(footY - sup.surfaceY) <= 8) {
            this.y = sup.surfaceY - this.height;
            this.isGrounded = true;
            this.currentPlatform = sup;
            this.state = 'curious';
            this.stateTimer = 0;
            this.stateDuration = 2200;
            this.play('curious');
          } else {
            // Airborne tap: fall back under gravity, NEVER freeze in mid-air!
            this.isGrounded = false;
            this.currentPlatform = null;
            this.state = 'falling';
            this.play(this.manifest.physics?.canFly ? 'glide' : 'idle');
          }
        } else {
          // Pet was dragged or flung
          const speed = Math.hypot(this.vx, this.vy);
          this.isGrounded = false;
          this.currentPlatform = null;
          this.state = 'falling';
          this.isFlung = speed > 4.5;
          this.randomDialogue('dragged');
          this.play(this.manifest.physics?.canFly ? 'glide' : 'falling');
        }
      };

      // Right-click directly on this pet -> opens the Pet Context Menu (Specific to this pet!)
      const onContextMenu = (e) => {
        if (e.altKey) return; // Let Alt+Right-Click open the radial menu!
        e.preventDefault();
        e.stopPropagation();
        SensoryEngine.openPetMenu(this);
      };

      this.el.addEventListener('mousedown', onMouseDown);
      this.el.addEventListener('contextmenu', onContextMenu);

      this._cleanupEvents = () => {
        this.el.removeEventListener('mousedown', onMouseDown);
        this.el.removeEventListener('contextmenu', onContextMenu);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }

    onEntityHit(evt) {
      if (this.isBusy) return;
      const entityType = evt?.entity?.type || evt?.entityType || 'lightning_bolt';
      const reacts = this.manifest.reactsTo?.entities?.[entityType]?.hit;
      const anim = reacts?.animation || evt?.payload?.animation || (this.manifest.animations?.electrocuted ? 'electrocuted' : 'dragged');

      if (entityType === 'lightning_bolt') {
        this.isElectrocuted = true;
        // If flying or perched above the ground, get knocked down and fall
        const isHigh = !this.isGrounded || this.state === 'fly' || this.state === 'glide' ||
          this.state === 'diving' || this.state === 'laser_chase' || this.state === 'ball_play' ||
          (this.state === 'perch' && this.currentPlatform && !this.currentPlatform.isFloor);
        if (isHigh) {
          this.currentPlatform = null;
          this.isGrounded = false;
          this.state = 'falling';
          this.vy = 2.5;
          this.vx = (Math.random() - 0.5) * 3.0;
          this.el.classList.remove('is-flying');
        }
      }

      this.play(anim, true);
      const text = reacts?.dialogue || evt?.payload?.text || 'Oái! Sét đánh cháy đen lông cánh {pet} rồi!';
      this.say(text, 2600);
      this.isBusy = true;
      setTimeout(() => {
        this.isElectrocuted = false;
        this.isBusy = false;
        if (this.isGrounded) {
          this.play('idle', true);
        }
      }, reacts?.pauseMs || 2600);
    }

    destroy() {
      if (window.__hxWorld && typeof window.__hxWorld.unregisterPet === 'function') {
        window.__hxWorld.unregisterPet(this.manifest.id || 'pixel_owl');
      }
      this.clearBusy();
      clearTimeout(this.speedBoostTimer);
      if (typeof this._lightningUnsub === 'function') {
        this._lightningUnsub();
        this._lightningUnsub = null;
      }
      this._lightningEnv = null;
      if (this._cleanupEvents) this._cleanupEvents();
      clearTimeout(this.bubbleTimer);
      this.el.remove();
    }
  }

  // -----------------------------------------------------------
  // Lifecycle & Master Loop
  // -----------------------------------------------------------
  const rawPetsData = (window.__hxPets && window.__hxPets.activePets) || [];
  const seenPetIds = new Set();
  for (const petData of rawPetsData) {
    if (!petData || !petData.id || seenPetIds.has(petData.id)) continue;
    seenPetIds.add(petData.id);
    try {
      petInstances.push(new PixelPet(petData, stage));
    } catch (e) {
      console.error('[harness-pet] failed to instantiate pet:', petData.id, e);
    }
  }

  let lastTime = performance.now();
  function loop(time) {
    const dt = Math.min(100, time - lastTime);
    lastTime = time;

    // Update physical world entities (foods falling, ball bouncing, laser idle check)
    WorldEntityManager.updateFoodPhysics();
    WorldEntityManager.updateBallPhysics();
    WorldEntityManager.updateLaserActivity();

    for (const pet of petInstances) {
      pet.tick(dt);
    }
    animFrameId = requestAnimationFrame(loop);
  }
  animFrameId = requestAnimationFrame(loop);

  window.__hxPetCleanup = () => {
    cancelAnimationFrame(animFrameId);
    window.__hxBus?.clear('pet-runtime');
    window.__hxWorld?.unregisterPet?.('*');
    for (const pet of petInstances) pet.destroy();
    petInstances.length = 0;
    SensoryEngine.destroy();
    if (typeof ScreenContextObserver !== 'undefined' && ScreenContextObserver.destroy) {
      ScreenContextObserver.destroy();
    }
    if (typeof LayoutChangeObserver !== 'undefined' && LayoutChangeObserver.destroy) {
      LayoutChangeObserver.destroy();
    }
    delete window.__hxSensory;
    delete window.__hxScreenObserver;
    delete window.__hxLayoutObserver;
    delete window.__hxPetInstances;
    delete window.__hxUpdatePetConfig;
    stage.remove();
    document.querySelectorAll(
      '.hx-pet, .hx-playground-menu, .hx-radial-menu, .hx-pet-action-orbit, .hx-pet-radial-menu, .hx-pet-context-menu, .hx-pet-menu-backdrop, .hx-world-food, .hx-world-creature, .hx-held-hud, .hx-pet-laser-dot, .hx-laser-hud, .hx-pet-ball, .hx-pet-particle'
    ).forEach((el) => el.remove());
    console.log('[harness-pet] cleaned up');
  };

  console.log(`[harness-pet] initialized with ${petInstances.length} unique pet(s)`);
})();
