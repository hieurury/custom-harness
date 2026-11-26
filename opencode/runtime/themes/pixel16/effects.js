(function (cfg) {
  var root = document.documentElement;
  var o = cfg.options || {};
  var c = cfg.colors || {};
  root.setAttribute('data-hx-theme', cfg.id);
  root.setAttribute('data-hx-anim', o.animation || 'low');
  root.setAttribute('data-hx-bg', o.background || 'none');
  root.removeAttribute('data-hx-scan');

  var timer = null, canvas = null;
  var bg = o.background;
  if ((bg === 'stars' || bg === 'dither') && o.animation !== undefined) {
    var CELL = 4;
    canvas = document.createElement('canvas');
    canvas.id = 'hx-fx-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;image-rendering:pixelated;opacity:' + (bg === 'stars' ? '.55' : '.07');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, stars = [];
    var size = function () {
      W = Math.ceil(window.innerWidth / CELL); H = Math.ceil(window.innerHeight / CELL);
      canvas.width = W; canvas.height = H;
      stars = [];
      var n = Math.round(W * H * 0.004);
      for (var i = 0; i < n; i++) stars.push({ x: (Math.random() * W) | 0, y: (Math.random() * H) | 0, a: Math.random() < 0.3, s: 1 + ((Math.random() * 3) | 0) });
    };
    size();
    window.addEventListener('resize', size);
    var draw = function (move) {
      ctx.clearRect(0, 0, W, H);
      if (bg === 'stars') {
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          if (move) { s.y += s.s > 2 ? 1 : (Math.random() < 0.5 ? 1 : 0); if (s.y >= H) { s.y = 0; s.x = (Math.random() * W) | 0; } }
          ctx.fillStyle = s.a ? c.accent : c.fg;
          ctx.fillRect(s.x, s.y, 1, 1);
        }
      } else {
        ctx.fillStyle = c.fg;
        for (var k = 0; k < W * H * 0.35; k++) ctx.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 1, 1);
      }
    };
    draw(false);
    if (o.animation !== 'off') {
      var ms = o.animation === 'full' ? (bg === 'stars' ? 110 : 140) : (bg === 'stars' ? 260 : 600);
      timer = setInterval(function () { if (!document.hidden) draw(true); }, ms);
    }
    var onResize = size;
  }

  return function cleanup() {
    clearInterval(timer);
    if (canvas) { window.removeEventListener('resize', onResize); canvas.remove(); }
    ['data-hx-theme', 'data-hx-anim', 'data-hx-bg', 'data-hx-scan'].forEach(function (a) { root.removeAttribute(a); });
  };
})
