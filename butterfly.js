/**
 * Butterfly Starfield Animation
 * Realistic Blue Morpho & Golden Amber butterflies starting from TOP MIDDLE
 * and flying around the entire screen in a smooth circular orbit.
 */

// ─── Canvas Setup ──────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let W, H;
let _initialized = false;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  if (_initialized) initStars();
}
window.addEventListener('resize', resize);

// ─── Utility ───────────────────────────────────────────────────────────────
const rand    = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));
const lerp    = (a, b, t) => a + (b - a) * t;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── Star ──────────────────────────────────────────────────────────────────
class Star {
  constructor(firstTime = false) {
    this.x          = rand(0, W);
    this.y          = rand(0, H);
    this.baseR      = rand(0.2, 1.6);
    this.baseAlpha  = rand(0.4, 1.0);
    this.phase      = firstTime ? rand(0, Math.PI * 2) : 0;
    this.speed      = rand(0.003, 0.022);
    this.offset     = rand(0, Math.PI * 2);
    this.isBright   = Math.random() < 0.035;
    if (this.isBright) { this.baseR = rand(1.4, 2.6); this.baseAlpha = rand(0.75, 1.0); }
    const t = Math.random();
    this.r = Math.round(lerp(210, 255, t));
    this.g = Math.round(lerp(220, 255, t));
    this.b = Math.round(lerp(230, 255, t));
  }

  update(dt) {
    this.phase += this.speed * dt;
  }

  get alpha()  { return this.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(this.phase + this.offset))); }
  get radius() { return this.baseR * (0.8 + 0.2 * Math.sin(this.phase * 1.4)); }

  draw() {
    const a = clamp(this.alpha, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;

    if (this.isBright) {
      ctx.shadowBlur  = 10;
      ctx.shadowColor = `rgba(${this.r},${this.g},${this.b},0.9)`;
      ctx.strokeStyle = `rgba(${this.r},${this.g},${this.b},${a * 0.5})`;
      ctx.lineWidth   = 0.6;
      const fl = this.radius * 3;
      ctx.beginPath();
      ctx.moveTo(this.x - fl, this.y); ctx.lineTo(this.x + fl, this.y);
      ctx.moveTo(this.x, this.y - fl); ctx.lineTo(this.x, this.y + fl);
      ctx.stroke();
    }

    ctx.shadowBlur  = this.isBright ? 8 : 1.5;
    ctx.shadowColor = `rgba(${this.r},${this.g},${this.b},0.8)`;
    ctx.fillStyle   = `rgba(${this.r},${this.g},${this.b},${a})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Particle ──────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, hslColor = 'hsl(45, 100%, 70%)') {
    this.x      = x + rand(-6, 6);
    this.y      = y + rand(-4, 4);
    const spd   = rand(0.3, 1.8);
    const ang   = rand(0, Math.PI * 2);
    this.vx     = Math.cos(ang) * spd;
    this.vy     = Math.sin(ang) * spd - rand(0.2, 0.8);
    this.r0     = rand(1.5, 3.5);
    this.life   = 1.0;
    this.decay  = rand(0.008, 0.020);
    this.grav   = rand(0.010, 0.025);
    this.hsl    = hslColor;
    this.core   = '#ffffff';
  }

  update(dt) {
    const f  = dt * 0.055;
    this.vy += this.grav * f;
    this.x  += this.vx * f;
    this.y  += this.vy * f;
    this.life -= this.decay * dt * 0.055;
  }

  get dead() { return this.life <= 0; }
  get r()    { return this.r0 * clamp(this.life, 0, 1); }

  draw() {
    if (this.r < 0.1) return;
    const a = clamp(this.life, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha  = a * 0.85;
    ctx.shadowBlur   = 12;
    ctx.shadowColor  = this.hsl;
    ctx.fillStyle    = this.hsl;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.shadowBlur  = 3;
    ctx.fillStyle   = this.core;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Butterfly ───────────────────────────────────────────────────────────
class Butterfly {
  constructor(opts = {}) {
    const {
      colorScheme = 'blue',
      orbitDir    = 1,
      orbitSpeed  = 0.00048,
      orbitRX     = 0.75,
      orbitRY     = 0.65,
      orbitCX     = 0.5,
      orbitCY     = 0.5,
      startAngle  = 0,
      leader      = null,
    } = opts;

    this.leader     = leader;
    this.orbitAngle = startAngle;
    this.orbitSpeed = orbitSpeed;
    this.orbitDir   = orbitDir;
    this.orbitRX    = orbitRX;
    this.orbitRY    = orbitRY;
    this.orbitCX    = orbitCX;
    this.orbitCY    = orbitCY;

    // Wing flap
    this.flapPhase = rand(0, Math.PI * 2);
    this.flapRate  = 0.040;
    this.flapValue = 0;

    // Position at top-middle of circular orbit
    const cx = W * orbitCX;
    const cy = H * orbitCY;
    const rx = W * 0.5 * orbitRX;
    const ry = H * 0.5 * orbitRY;

    this.x = cx + rx * Math.sin(startAngle);
    this.y = cy - ry * Math.cos(startAngle * orbitDir);

    // Tangent derivative angle
    const idx = rx * Math.cos(startAngle);
    const idy = ry * Math.sin(startAngle) * orbitDir;
    this.angle     = Math.atan2(idy, idx);
    this.drawAngle = this.angle;

    this.bobY = 0;
    this.particles = [];
    this.pTimer = rand(0, 3);
    this.lastFlap = 0;

    // Color scheme
    this.scheme = colorScheme;
    if (colorScheme === 'gold') {
      this.wingHighlight  = '#ffd44a';
      this.wingColorInner = '#ff9d00';
      this.wingColorOuter = '#cc7700';
      this.wingDark       = '#4a2500';
      this.particleColor  = 'hsl(45, 100%, 70%)';
    } else {
      this.wingHighlight  = '#8ec6ff';
      this.wingColorInner = '#3d9eff';
      this.wingColorOuter = '#0d5cff';
      this.wingDark       = '#021060';
      this.particleColor  = 'hsl(45, 100%, 75%)';
    }

    this.s = 1;
  }

  _scale() { return Math.min(W, H) * 0.0011; }

  update(dt) {
    this.s = this._scale();
    const f = dt * 0.06;

    const cx = W * this.orbitCX;
    const cy = H * this.orbitCY;
    const rx = W * 0.5 * this.orbitRX;
    const ry = H * 0.5 * this.orbitRY;

    // ── Circular orbit tracking — Physical Arc Distance Lag (240px constant gap everywhere!)
    if (this.leader) {
      const targetLagPx = 240;
      const leaderR = Math.sqrt(rx * rx * Math.cos(this.leader.orbitAngle) ** 2 + ry * ry * Math.sin(this.leader.orbitAngle) ** 2);
      const lagAngle = targetLagPx / leaderR;
      this.orbitAngle = this.leader.orbitAngle - lagAngle * this.orbitDir;
    } else {
      const speedScale = Math.sqrt(rx * rx * Math.cos(this.orbitAngle) ** 2 + ry * ry * Math.sin(this.orbitAngle) ** 2);
      const avgR = (rx + ry) * 0.5;
      const dAngle = (this.orbitSpeed * avgR / speedScale) * dt;
      this.orbitAngle += dAngle;
    }

    // Pure mathematical parametric circle starting from TOP MIDDLE
    this.x = cx + rx * Math.sin(this.orbitAngle);
    this.y = cy - ry * Math.cos(this.orbitAngle * this.orbitDir);

    // Tangent derivative for facing angle
    const dx = rx * Math.cos(this.orbitAngle);
    const dy = ry * Math.sin(this.orbitAngle) * this.orbitDir;
    this.drawAngle = Math.atan2(dy, dx);

    // ── Wing flap & body bob
    this.flapPhase += 0.038 * dt;
    const rawSin = Math.sin(this.flapPhase);
    const absRaw = Math.abs(rawSin);
    const shaped = rawSin >= 0 ? Math.pow(absRaw, 0.75) : -Math.pow(absRaw, 1.25);
    this.flapValue = shaped;
    this.bobY = -shaped * 1.8;

    // ── Particles on downstroke
    const prevFlap = this.lastFlap || shaped;
    if (prevFlap <= 0.1 && shaped > 0.1) {
      const n = randInt(2, 3);
      for (let i = 0; i < n; i++)
        this.particles.push(new Particle(this.x, this.y + this.bobY, this.particleColor));
    }
    this.pTimer += dt;
    if (this.pTimer > 4.0) {
      this.particles.push(new Particle(this.x, this.y + this.bobY, this.particleColor));
      this.pTimer = 0;
    }
    this.lastFlap = shaped;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
  }

  // ── Wing drawing helpers ────────────────────────────────────────────────
  _gradUpper(s) {
    const g = ctx.createRadialGradient(s * 55, -s * 35, s * 4, s * 85, -s * 65, s * 165);
    g.addColorStop(0,    this.wingHighlight);
    g.addColorStop(0.25, this.wingColorInner);
    g.addColorStop(0.6,  this.wingColorOuter);
    g.addColorStop(0.85, this.wingDark);
    g.addColorStop(1,    this.wingDark);
    return g;
  }
  _gradLower(s) {
    const g = ctx.createRadialGradient(s * 35, s * 28, s * 4, s * 75, s * 65, s * 120);
    g.addColorStop(0,   this.wingHighlight);
    g.addColorStop(0.3, this.wingColorInner);
    g.addColorStop(0.7, this.wingColorOuter);
    g.addColorStop(1,   this.wingDark);
    return g;
  }
  _shadowColor() {
    return this.scheme === 'gold'
      ? 'rgba(255,160,0,0.55)'
      : 'rgba(60,140,255,0.55)';
  }

  _upperWing(s) {
    ctx.shadowBlur  = 22;
    ctx.shadowColor = this._shadowColor();

    ctx.fillStyle   = this._gradUpper(s);
    ctx.strokeStyle = 'rgba(0,8,60,0.5)';
    ctx.lineWidth   = s * 1.2;

    ctx.beginPath();
    ctx.moveTo(0, -s * 8);
    ctx.bezierCurveTo( s*25, -s*85,  s*120, -s*108, s*158, -s*52);
    ctx.bezierCurveTo( s*172, -s*18,  s*148,  s*22,  s*105,  s*38);
    ctx.bezierCurveTo( s*68,  s*52,   s*18,   s*28,   0,     s*8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,8,90,0.28)';
    ctx.beginPath(); ctx.ellipse(s*98,  -s*48, s*38, s*20, -0.35, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s*58,  -s*18, s*16, s*9,   0.2,  0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s*130, -s*22, s*18, s*9,   0.4,  0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    const spots = [[s*132,-s*72,s*3.8],[s*146,-s*52,s*3],[s*152,-s*32,s*2.4],[s*148,-s*12,s*2]];
    for (const [sx,sy,sr] of spots) { ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill(); }

    ctx.fillStyle = 'rgba(180,220,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(s*80, -s*40, s*55, s*12, -0.5, 0, Math.PI*2);
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.strokeStyle = 'rgba(0,12,80,0.45)';
    ctx.lineWidth   = s * 0.8;
    const veins = [
      [[0,-s*2],[s*70,-s*58],[s*142,-s*54]],
      [[0, s*2],[s*55,-s*28],[s*128,  s*14]],
      [[0, s*5],[s*38,-s*8 ],[s*108,  s*34]],
      [[0,-s*5],[s*45,-s*72],[s*98, -s*82]],
    ];
    for (const [[x0,y0],[x1,y1],[x2,y2]] of veins) {
      ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke();
    }
  }

  _lowerWing(s) {
    ctx.shadowBlur  = 18;
    ctx.shadowColor = this._shadowColor();

    ctx.fillStyle   = this._gradLower(s);
    ctx.strokeStyle = 'rgba(0,8,60,0.45)';
    ctx.lineWidth   = s * 1.2;

    ctx.beginPath();
    ctx.moveTo(0, s*8);
    ctx.bezierCurveTo( s*18, s*42,  s*85, s*82, s*118, s*68);
    ctx.bezierCurveTo( s*142,s*56,  s*128,s*22, s*98,  s*16);
    ctx.bezierCurveTo( s*68, s*10,  s*28, s*5,   0,   -s*8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(12,60,200,0.9)';
    ctx.beginPath(); ctx.ellipse(s*112, s*70, s*16, s*10, 0.5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(0,8,80,0.25)';
    ctx.beginPath(); ctx.ellipse(s*72, s*50, s*26, s*14, -0.3, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    [[s*104,s*60,s*2.8],[s*110,s*50,s*2.2],[s*114,s*40,s*1.6]].forEach(([sx,sy,sr]) => {
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = 'rgba(255,120,0,0.14)';
    ctx.beginPath(); ctx.ellipse(s*52, s*38, s*34, s*8, -0.22, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(160,210,255,0.14)';
    ctx.beginPath(); ctx.ellipse(s*60, s*42, s*42, s*10, -0.3, 0, Math.PI*2); ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.strokeStyle = 'rgba(0,12,80,0.4)';
    ctx.lineWidth   = s * 0.75;
    [[[ 0,s*4],[s*45,s*45],[s*105,s*60]],
     [[ 0,s*6],[s*28,s*32],[s*80, s*65]],
     [[s*50,s*30],[s*80,s*52],[s*108,s*50]]].forEach(([[x0,y0],[x1,y1],[x2,y2]])=>{
      ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke();
    });
  }

  _body(s) {
    const tg = ctx.createLinearGradient(-s*5,-s*18, s*5, s*12);
    tg.addColorStop(0,  '#1c1c3e');
    tg.addColorStop(0.5,'#2e2e60');
    tg.addColorStop(1,  '#090922');
    ctx.fillStyle   = tg;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = 'rgba(90,140,255,0.45)';
    ctx.beginPath(); ctx.ellipse(0, -s*5, s*4.8, s*17, 0, 0, Math.PI*2); ctx.fill();

    for (let i = 0; i < 6; i++) {
      const ey = s*(8 + i*9), ew = s*(3.8 - i*0.22);
      ctx.fillStyle = i%2===0 ? '#14143a' : '#1a1a4a';
      ctx.beginPath(); ctx.ellipse(0, ey, ew, s*5, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(70,110,255,0.2)';
      ctx.lineWidth   = s*0.6;
      ctx.beginPath(); ctx.ellipse(0, ey, ew, s*5, 0, 0, Math.PI*2); ctx.stroke();
    }

    ctx.fillStyle   = '#0c0c28';
    ctx.shadowColor = 'rgba(90,140,255,0.55)';
    ctx.shadowBlur  = 8;
    ctx.beginPath(); ctx.arc(0, -s*22, s*5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(130,190,255,0.95)';
    ctx.shadowColor = 'rgba(130,190,255,0.8)';
    ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(-s*3.2, -s*23.5, s*1.7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( s*3.2, -s*23.5, s*1.7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(-s*3.2, -s*23.5, s*0.7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( s*3.2, -s*23.5, s*0.7, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = 'rgba(160,195,255,0.85)';
    ctx.lineWidth   = s * 0.85;
    ctx.shadowColor = 'rgba(100,170,255,0.5)';
    ctx.shadowBlur  = 4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s*2.5, -s*26);
      ctx.bezierCurveTo(side*s*14, -s*54, side*s*20, -s*70, side*s*17, -s*80);
      ctx.stroke();
      ctx.fillStyle   = 'rgba(180,215,255,0.9)';
      ctx.shadowColor = 'rgba(140,200,255,0.7)';
      ctx.shadowBlur  = 7;
      ctx.beginPath(); ctx.arc(side*s*17, -s*80, s*2.8, 0, Math.PI*2); ctx.fill();
    }
  }

  draw() {
    for (const p of this.particles) p.draw();

    ctx.save();
    ctx.translate(this.x, this.y + this.bobY);
    ctx.rotate(this.drawAngle + Math.PI / 2);

    const s    = this.s;
    const flap = this.flapValue || 0;
    const open = Math.abs(flap) * 0.85 + 0.15;
    const tilt = flap * 0.22;

    // Right upper wing
    ctx.save();
    ctx.scale(open, 1 + tilt * 0.16);
    this._upperWing(s);
    ctx.restore();

    // Left upper wing
    ctx.save();
    ctx.scale(-open, 1 + tilt * 0.16);
    this._upperWing(s);
    ctx.restore();

    // Right lower wing
    ctx.save();
    ctx.scale(open * 0.9, 1 - tilt * 0.12);
    this._lowerWing(s);
    ctx.restore();

    // Left lower wing
    ctx.save();
    ctx.scale(-open * 0.9, 1 - tilt * 0.12);
    this._lowerWing(s);
    ctx.restore();

    // Body
    this._body(s);
    ctx.restore();

    // Glow aura
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.08;
    const auraColor = this.scheme === 'gold' ? 'rgba(255,180,40,1)' : 'rgba(80,160,255,1)';
    const aura = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, s * 90);
    aura.addColorStop(0,   auraColor);
    aura.addColorStop(0.5, 'rgba(40,100,255,0.3)');
    aura.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(this.x, this.y, s * 90, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─── Stars Setup ───────────────────────────────────────────────────────────
let stars = [];
function initStars() {
  const count = clamp(Math.floor(W * H / 2400), 320, 620);
  stars = Array.from({ length: count }, () => new Star(true));
}

// ─── Init ──────────────────────────────────────────────────────────────────
W = canvas.width  = window.innerWidth;
H = canvas.height = window.innerHeight;
initStars();
_initialized = true;

// Lead Butterfly (Blue Morpho) — Starts at EXACT TOP MIDDLE of screen
const butterfly1 = new Butterfly({
  colorScheme: 'blue',
  orbitDir:    1,
  orbitSpeed:  0.00048,
  orbitRX:     0.75,
  orbitRY:     0.65,
  orbitCX:     0.5,
  orbitCY:     0.5,
  startAngle:  0,
});

// Follower Butterfly (Golden Amber) — Starts behind Lead Butterfly at top middle
const butterfly2 = new Butterfly({
  colorScheme: 'gold',
  orbitDir:    1,
  orbitSpeed:  0.00048,
  orbitRX:     0.75,
  orbitRY:     0.65,
  orbitCX:     0.5,
  orbitCY:     0.5,
  startAngle:  -0.45,
  leader:      butterfly1,
});

const butterflies = [butterfly1, butterfly2];

let lastTime = performance.now();
let firstFrame = true;

// ─── Animation Loop ────────────────────────────────────────────────────────
function loop(now) {
  if (firstFrame) {
    lastTime = now;
    firstFrame = false;
  }
  const dt = clamp(now - lastTime, 12, 22);
  lastTime = now;

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle   = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const s of stars) { s.update(dt); s.draw(); }

  // Butterflies
  for (const b of butterflies) { b.update(dt); b.draw(); }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
