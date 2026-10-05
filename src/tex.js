// Procedural canvas textures. No image assets.
import * as THREE from 'three';
import { rng } from './util.js';

export function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function toTex(c, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

// time encoding for "history" maps: age -> byte. 255 = never.
export const encAge = (age) => Math.round(((age - 25) / 65) * 250);

function noiseFill(ctx, w, h, alpha, scale, r, light = false) {
  const n = Math.floor((w * h) / (scale * scale) * 0.9);
  for (let i = 0; i < n; i++) {
    const v = r();
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha * v})` : `rgba(0,0,0,${alpha * v})`;
    const s = scale * (0.5 + r());
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

// ---------------------------------------------------------------- floor
export function floorTextures() {
  const S = 2048, r = rng(7);
  const [c, x] = canvas(S);
  const [b, bx] = canvas(S);
  const cols = 22, pw = S / cols;
  bx.fillStyle = '#000'; bx.fillRect(0, 0, S, S);
  for (let i = 0; i < cols; i++) {
    let y = -r() * 900;
    while (y < S) {
      const len = 520 + r() * 640;
      const hue = 27 + r() * 7, sat = 28 + r() * 12, lit = 40 + r() * 13;
      x.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
      x.fillRect(i * pw, y, pw, len);
      // grain
      for (let g = 0; g < 26; g++) {
        const gx = i * pw + r() * pw;
        x.strokeStyle = `rgba(${60 + r() * 30},${30 + r() * 20},10,${0.05 + r() * 0.12})`;
        x.lineWidth = 0.6 + r() * 1.6;
        x.beginPath();
        const amp = 1 + r() * 4, fr = 0.004 + r() * 0.01, ph = r() * 6;
        for (let yy = y; yy < y + len; yy += 12) {
          const xx = gx + Math.sin(yy * fr + ph) * amp;
          yy === y ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
        }
        x.stroke();
      }
      // occasional knot
      if (r() < 0.25) {
        const kx = i * pw + pw * (0.2 + r() * 0.6), ky = y + r() * len;
        const grd = x.createRadialGradient(kx, ky, 0, kx, ky, 10 + r() * 8);
        grd.addColorStop(0, 'rgba(50,25,8,0.55)'); grd.addColorStop(1, 'rgba(50,25,8,0)');
        x.fillStyle = grd; x.beginPath(); x.ellipse(kx, ky, 14, 26, 0, 0, 7); x.fill();
      }
      // per-plank tone variation in bump (slight cupping)
      const bg = bx.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
      bg.addColorStop(0, '#9a9a9a'); bg.addColorStop(0.5, '#c8c8c8'); bg.addColorStop(1, '#9a9a9a');
      bx.fillStyle = bg; bx.fillRect(i * pw + 2, y + 2, pw - 4, len - 4);
      // gaps
      x.fillStyle = 'rgba(30,14,5,0.85)';
      x.fillRect(i * pw, y, pw, 2);
      y += len;
    }
    x.fillStyle = 'rgba(30,14,5,0.85)';
    x.fillRect(i * pw - 1, 0, 2.2, S);
  }
  noiseFill(x, S, S, 0.05, 3, r);
  const map = toTex(c, { repeat: [2, 2], aniso: 16 });
  const bump = toTex(b, { srgb: false, repeat: [2, 2] });
  return { map, bump };
}

// ---------------------------------------------------------------- plaster wall (seamless)
function wrapBlob(ctx, S, px, py, rad, c0) {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
    const x = px + ox, y = py + oy;
    if (x + rad < 0 || x - rad > S || y + rad < 0 || y - rad > S) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, c0); g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
export function plasterTextures() {
  const S = 1024, r = rng(11);
  const [c, x] = canvas(S);
  x.fillStyle = '#d6cabd'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const d = r() < 0.5;
    wrapBlob(x, S, r() * S, r() * S, 30 + r() * 120, d ? 'rgba(120,100,85,0.03)' : 'rgba(255,248,240,0.035)');
  }
  noiseFill(x, S, S, 0.025, 2, r);
  const [b, bx] = canvas(S);
  bx.fillStyle = '#808080'; bx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2200; i++) {
    const v = r() < 0.5 ? 0 : 255;
    wrapBlob(bx, S, r() * S, r() * S, 6 + r() * 36, `rgba(${v},${v},${v},0.05)`);
  }
  noiseFill(bx, S, S, 0.1, 1.5, r);
  return { map: toTex(c), bump: toTex(b, { srgb: false }) };
}

// ---------------------------------------------------------------- generic wood grain
export function woodTexture(base = [32, 42, 34], seed = 3, S = 1024, streaks = 160) {
  const r = rng(seed);
  const [c, x] = canvas(S);
  x.fillStyle = `hsl(${base[0]},${base[1]}%,${base[2]}%)`; x.fillRect(0, 0, S, S);
  for (let g = 0; g < streaks; g++) {
    const gy = r() * S;
    x.strokeStyle = r() < 0.7 ? `rgba(40,18,6,${0.04 + r() * 0.12})` : `rgba(255,220,170,${0.03 + r() * 0.06})`;
    x.lineWidth = 0.6 + r() * 3;
    x.beginPath();
    const amp = 2 + r() * 10, fr = 0.002 + r() * 0.008, ph = r() * 6;
    for (let xx = 0; xx <= S; xx += 10) {
      const yy = gy + Math.sin(xx * fr + ph) * amp + Math.sin(xx * fr * 3.1) * amp * 0.3;
      xx === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
    }
    x.stroke();
  }
  noiseFill(x, S, S, 0.04, 2, r);
  return toTex(c);
}

// ---------------------------------------------------------------- fabrics
export function linenBump(seed = 5, S = 512) {
  const r = rng(seed);
  const [c, x] = canvas(S);
  x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 2) {
    x.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; x.fillRect(0, i, S, 1);
    x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; x.fillRect(i, 0, 1, S);
  }
  noiseFill(x, S, S, 0.2, 1.2, r);
  return toTex(c, { srgb: false, repeat: [6, 6] });
}

export function knitTexture(color = '#8a4a32', seed = 9) {
  const S = 512, r = rng(seed);
  const [c, x] = canvas(S);
  x.fillStyle = color; x.fillRect(0, 0, S, S);
  const cw = 16, ch = 20;
  for (let j = 0; j < S / ch + 1; j++)
    for (let i = 0; i < S / cw; i++) {
      const cx = i * cw + cw / 2, cy = j * ch;
      for (const s of [-1, 1]) {
        x.save(); x.translate(cx + s * 3.5, cy); x.rotate(s * 0.5);
        const g = x.createLinearGradient(-3, 0, 3, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.5, 'rgba(255,240,220,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
        x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, 4, 10, 0, 0, 7); x.fill();
        x.restore();
      }
    }
  noiseFill(x, S, S, 0.08, 1.5, r);
  return toTex(c, { repeat: [3, 3] });
}

// ---------------------------------------------------------------- rug
export function rugTexture() {
  const W = 1024, H = 1536, r = rng(21);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#d9cdb8'; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0.10, 2, r);
  noiseFill(x, W, H, 0.10, 2, r, true);
  // hand-drawn diamond lattice
  x.strokeStyle = 'rgba(70,52,38,0.75)'; x.lineCap = 'round';
  const step = 128;
  for (let k = -H; k < W + H; k += step) {
    for (const dir of [1, -1]) {
      x.lineWidth = 7 + r() * 3;
      x.beginPath();
      for (let t = 0; t <= H; t += 16) {
        const px = k + dir * t * 0.5 + (r() - 0.5) * 4;
        t === 0 ? x.moveTo(px, t) : x.lineTo(px, t);
      }
      x.stroke();
    }
  }
  // border band
  x.fillStyle = 'rgba(70,52,38,0.8)';
  x.fillRect(40, 40, W - 80, 10); x.fillRect(40, H - 50, W - 80, 10);
  x.fillRect(40, 40, 10, H - 80); x.fillRect(W - 50, 40, 10, H - 80);
  // fibers
  for (let i = 0; i < 40000; i++) {
    x.strokeStyle = r() < 0.5 ? 'rgba(255,250,240,0.10)' : 'rgba(40,30,20,0.08)';
    x.lineWidth = 1;
    const px = r() * W, py = r() * H, a = r() * 6.28;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5); x.stroke();
  }
  return toTex(c);
}

// a later rug: flat-woven stripes, muted
export function rugTexture2() {
  const W = 1024, H = 1536, r = rng(23);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#b9a58c'; x.fillRect(0, 0, W, H);
  const cols = ['#7d8a8c', '#a4553a', '#d8cbb4', '#5c6670', '#c49a62'];
  let y = 60;
  while (y < H - 60) { const h = 14 + r() * 70; x.fillStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = 0.7 + r() * 0.3; x.fillRect(40, y, W - 80, h); y += h + 6 + r() * 20; }
  x.globalAlpha = 1;
  for (let i = 0; i < 40000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,250,240,0.08)' : 'rgba(30,20,10,0.08)'; x.fillRect(r() * W, r() * H, 3, 1); }
  return toTex(c);
}

// ---------------------------------------------------------------- art
export function inkPrint() {
  const W = 512, H = 640, r = rng(31);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#ece4d6'; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0.04, 2, r);
  x.fillStyle = '#16120f';
  // botanical ink silhouette: a few broad leaves around a stem
  x.save(); x.translate(W * 0.5, H * 0.78);
  x.lineWidth = 6; x.strokeStyle = '#16120f';
  x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(10, -120, -20, -220, 6, -360); x.stroke();
  const leaves = [[-0.9, 120, 150], [0.8, 170, 140], [-0.5, 250, 120], [0.4, 300, 105], [-1.4, 70, 120], [1.3, 60, 110]];
  for (const [a, d, L] of leaves) {
    x.save(); x.translate(0, -d); x.rotate(a);
    x.beginPath(); x.moveTo(0, 0);
    x.bezierCurveTo(L * 0.4, -L * 0.35, L * 0.9, -L * 0.25, L, 0);
    x.bezierCurveTo(L * 0.8, L * 0.25, L * 0.35, L * 0.3, 0, 0);
    x.fill(); x.restore();
  }
  x.restore();
  // ink bleed speckles
  for (let i = 0; i < 90; i++) {
    x.globalAlpha = 0.3 + r() * 0.5;
    x.beginPath(); x.arc(W * 0.5 + (r() - 0.5) * 320, H * 0.45 + (r() - 0.5) * 380, r() * 3, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  return toTex(c);
}

export function abstractPrint(seed = 41) {
  // second person's print: warm abstract shapes
  const W = 512, H = 400, r = rng(seed);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#e8dccb'; x.fillRect(0, 0, W, H);
  const cols = ['#c0643c', '#2f4a4f', '#d9a25a', '#7d8b6a'];
  for (let i = 0; i < 4; i++) {
    x.fillStyle = cols[i]; x.globalAlpha = 0.9;
    x.beginPath();
    x.arc(110 + i * 95 + r() * 20, 200 + (r() - 0.5) * 80, 50 + r() * 45, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  noiseFill(x, W, H, 0.05, 2, r);
  return toTex(c);
}

// "photographs": no people — places, the sea, light.
export function photoTexture(kind, seed = 50) {
  const W = 384, H = 288, r = rng(seed);
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  if (kind === 'sea') {
    g.addColorStop(0, '#f2b58a'); g.addColorStop(0.5, '#f7d2a2'); g.addColorStop(0.52, '#5f7f95'); g.addColorStop(1, '#2a3f52');
  } else if (kind === 'hills') {
    g.addColorStop(0, '#b9cfdc'); g.addColorStop(0.6, '#e9e1cf'); g.addColorStop(1, '#a3a07a');
  } else if (kind === 'beach') {
    g.addColorStop(0, '#9fc3d6'); g.addColorStop(0.45, '#d4e4e8'); g.addColorStop(0.55, '#4f8aa0'); g.addColorStop(0.7, '#e7d7b6'); g.addColorStop(1, '#d8c39c');
  } else if (kind === 'forest') {
    g.addColorStop(0, '#dfe7d5'); g.addColorStop(0.4, '#6f8a5a'); g.addColorStop(1, '#2c3b26');
  } else {
    g.addColorStop(0, '#f0d6b8'); g.addColorStop(1, '#a87454');
  }
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (kind === 'hills') {
    for (let k = 0; k < 3; k++) {
      x.fillStyle = ['#8f9a7a', '#6f7d5e', '#4f5c44'][k];
      x.beginPath(); x.moveTo(0, H);
      for (let i = 0; i <= W; i += 8) x.lineTo(i, H * (0.55 + k * 0.12) + Math.sin(i * 0.01 + k * 2) * 18 + Math.sin(i * 0.031 + k) * 6);
      x.lineTo(W, H); x.fill();
    }
  }
  if (kind === 'forest') {
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(30,45,25,${0.4 + r() * 0.5})`;
      const tx = r() * W, th = 90 + r() * 140;
      x.beginPath(); x.moveTo(tx, H - th); x.lineTo(tx - 18, H); x.lineTo(tx + 18, H); x.fill();
    }
  }
  if (kind === 'sea') {
    x.fillStyle = '#fff1d0'; x.beginPath(); x.arc(W * 0.62, H * 0.44, 18, 0, 7); x.fill();
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(255,220,170,${0.2 + r() * 0.4})`;
      x.fillRect(W * 0.62 - 20 + (r() - 0.5) * 40, H * 0.53 + r() * H * 0.4, 10 + r() * 30, 2);
    }
  }
  if (kind === 'beach') {
    x.fillStyle = '#c4532e'; x.beginPath(); x.moveTo(W * 0.3, H * 0.62); x.lineTo(W * 0.42, H * 0.58); x.lineTo(W * 0.36, H * 0.7); x.fill(); // a little kite/towel shape
  }
  // photographic softness + vignette
  x.filter = 'blur(1.2px)'; x.drawImage(c, 0, 0); x.filter = 'none';
  const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,10,0.35)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0.08, 1.5, r);
  return toTex(c);
}

// Child drawings — crayon on paper.
function crayon(x, r, pts, color, width = 6, passes = 3) {
  x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    x.globalAlpha = 0.45 + r() * 0.3;
    x.lineWidth = width * (0.7 + r() * 0.6);
    x.beginPath();
    pts.forEach(([px, py], i) => {
      const jx = px + (r() - 0.5) * width * 0.8, jy = py + (r() - 0.5) * width * 0.8;
      i ? x.lineTo(jx, jy) : x.moveTo(jx, jy);
    });
    x.stroke();
  }
  x.globalAlpha = 1;
}
export function childDrawing(kind, seed = 60) {
  const W = 400, H = 300, r = rng(seed);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#f6f1e7'; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0.03, 2, r);
  const arc = (cx, cy, rad, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / n); return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  });
  if (kind === 'rainbow') {
    ['#d8432f', '#ef8f2a', '#f1cf35', '#58a84a', '#3a7cc6', '#7a4fb0'].forEach((col, i) =>
      crayon(x, r, arc(200, 250, 150 - i * 17, Math.PI * 1.02, Math.PI * 1.98), col, 12, 4));
    crayon(x, r, arc(60, 250, 26, 0, 6.3, 16), '#6aa6d8', 8, 3);
    crayon(x, r, arc(340, 250, 26, 0, 6.3, 16), '#6aa6d8', 8, 3);
  } else if (kind === 'house') {
    crayon(x, r, [[110, 260], [110, 160], [290, 160], [290, 260], [110, 260]], '#c0392b', 7);
    crayon(x, r, [[95, 165], [200, 85], [305, 165]], '#7a3b1f', 8);
    crayon(x, r, [[185, 260], [185, 205], [220, 205], [220, 260]], '#3b6db3', 6);
    crayon(x, r, arc(340, 55, 28, 0, 6.3, 18), '#f0b52c', 9, 4);
    for (let i = 0; i < 9; i++) { const a = i * 0.7; crayon(x, r, [[340 + Math.cos(a) * 36, 55 + Math.sin(a) * 36], [340 + Math.cos(a) * 52, 55 + Math.sin(a) * 52]], '#f0b52c', 5, 2); }
    crayon(x, r, [[0, 275], [400, 270]], '#4e9a3c', 10, 4);
  } else if (kind === 'boat') {
    crayon(x, r, [[0, 190], [60, 180], [120, 195], [180, 182], [240, 196], [300, 184], [400, 192]], '#2f6fb3', 9, 4);
    crayon(x, r, [[0, 225], [70, 215], [140, 230], [210, 218], [280, 230], [400, 220]], '#2f6fb3', 9, 4);
    crayon(x, r, [[130, 175], [270, 175], [245, 205], [155, 205], [130, 175]], '#a5402a', 7);
    crayon(x, r, [[200, 175], [200, 70]], '#4a3020', 5);
    crayon(x, r, [[205, 75], [260, 160], [205, 160]], '#e8a03a', 7);
    crayon(x, r, arc(70, 70, 30, 0, 6.3, 18), '#ef7d2b', 9, 4);
  } else if (kind === 'cat') {
    crayon(x, r, arc(200, 190, 70, 0, 6.3, 28), '#e07b2c', 8, 3);
    crayon(x, r, [[150, 145], [160, 95], [185, 125]], '#e07b2c', 7);
    crayon(x, r, [[215, 125], [240, 95], [250, 145]], '#e07b2c', 7);
    crayon(x, r, arc(178, 180, 6, 0, 6.3, 8), '#222', 5, 2); crayon(x, r, arc(222, 180, 6, 0, 6.3, 8), '#222', 5, 2);
    crayon(x, r, [[190, 205], [200, 212], [210, 205]], '#c33', 4, 2);
  } else {
    // scribble flowers
    for (let i = 0; i < 4; i++) {
      const fx = 70 + i * 85, fy = 120 + r() * 50;
      crayon(x, r, [[fx, 280], [fx + (r() - 0.5) * 20, fy]], '#4e9a3c', 6, 2);
      crayon(x, r, arc(fx, fy, 22, 0, 6.3, 14), ['#d84b8a', '#f0b52c', '#7a4fb0', '#d8432f'][i], 10, 4);
    }
  }
  return toTex(c);
}

// Book spines atlas: each book picks a color; spine details drawn.
export const BOOK_COLORS = ['#8a3b2c', '#2f4858', '#c9a46a', '#4b5d3f', '#d9cbb0', '#6b2f3a', '#1f2a36', '#b8653c', '#e2dccb', '#5a6e7c', '#97845c', '#3d3a36', '#a8452f', '#cbb995'];
export const KID_BOOK_COLORS = ['#e2523a', '#f2b437', '#3f8fd0', '#5bb35a', '#e86fa0', '#f07c2a'];
export function spineTexture(color, seed) {
  const r = rng(seed);
  const [c, x] = canvas(64, 256);
  x.fillStyle = color; x.fillRect(0, 0, 64, 256);
  x.fillStyle = r() < 0.5 ? 'rgba(255,240,210,0.55)' : 'rgba(20,10,0,0.45)';
  const bands = Math.floor(r() * 3);
  for (let i = 0; i < bands; i++) x.fillRect(0, 20 + r() * 200, 64, 3 + r() * 6);
  x.fillRect(22, 70 + r() * 40, 20, 60 + r() * 50); // title block
  noiseFill(x, 64, 256, 0.15, 1.5, r);
  return toTex(c, { aniso: 4 });
}

// Soft radial blob for contact shadows
let _blob;
export function blobTexture() {
  if (_blob) return _blob;
  const [c, x] = canvas(128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  _blob = toTex(c, { srgb: false });
  return _blob;
}
