// Procedural objects of a life. Each returns a Group with its origin at its resting point.
import * as THREE from 'three';
import { std, shade, rbox, mesh, lathe, contact, pillowGeo, drapeGeo, leafGeo, tube, fixNormals, C } from './build.js';
import { woodTexture, knitTexture, linenBump, spineTexture, toTex, canvas } from './tex.js';
import { rng } from './util.js';

const G = () => new THREE.Group();
const oakTex = woodTexture([30, 40, 42], 15, 512, 90);
const oak = () => std('#ffffff', 0.55, { map: oakTex });

// ------------------------------------------------------------------ chairs (front = +z)
export function chairSpindle(mat = oak()) {
  const g = G();
  const sh = 0.45, sw = 0.44, sd = 0.42;
  g.add(mesh(rbox(sw, 0.035, sd, 0.012), mat, 0, sh, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = mesh(new THREE.CylinderGeometry(0.016, 0.014, sh, 10), mat, x * (sw / 2 - 0.035), sh / 2, z * (sd / 2 - 0.035));
    leg.rotation.set(z * 0.04, 0, -x * 0.04); g.add(leg);
  }
  for (const x of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.52, 10), mat, x * (sw / 2 - 0.035), sh + 0.26, -sd / 2 + 0.03);
    post.rotation.x = -0.1; g.add(post);
  }
  const top = mesh(rbox(sw - 0.02, 0.07, 0.03, 0.012), mat, 0, sh + 0.5, -sd / 2 - 0.0); top.rotation.x = -0.1; g.add(top);
  for (let i = 0; i < 5; i++) {
    const sp = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.45, 6), mat, -0.12 + i * 0.06, sh + 0.24, -sd / 2 + 0.035);
    sp.rotation.x = -0.1; g.add(sp);
  }
  // stretchers
  for (const z of [-1, 1]) { const s = mesh(new THREE.CylinderGeometry(0.008, 0.008, sw - 0.07, 6), mat, 0, 0.14, z * (sd / 2 - 0.04)); s.rotation.z = Math.PI / 2; g.add(s); }
  shade(g);
  const c = contact(0.62, 0.6, 0.45); g.add(c);
  return g;
}

export function chairLadder(mat = std('#7f8e78', 0.6)) {
  const g = G();
  const sh = 0.46, sw = 0.44, sd = 0.41;
  g.add(mesh(rbox(sw, 0.04, sd, 0.01), std('#b39a76', 0.85, { bumpMap: linenBump(31), bumpScale: 0.6 }), 0, sh, 0)); // woven seat
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(0.032, sh, 0.032), mat, x * (sw / 2 - 0.02), sh / 2, z * (sd / 2 - 0.02)));
  for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.032, 0.5, 0.032), mat, x * (sw / 2 - 0.02), sh + 0.25, -sd / 2 + 0.02));
  for (let i = 0; i < 3; i++) g.add(mesh(rbox(sw - 0.03, 0.05, 0.016, 0.006), mat, 0, sh + 0.17 + i * 0.13, -sd / 2 + 0.02));
  for (const z of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(sw - 0.04, 0.018, 0.018), mat, 0, 0.16, z * (sd / 2 - 0.02)));
  shade(g);
  g.add(contact(0.62, 0.6, 0.45));
  return g;
}

// Adjustable child's chair (front = +z). Returns {g, guard, tray, seat}
export function kidChair() {
  const g = G();
  const mat = std('#ffffff', 0.5, { map: woodTexture([34, 30, 62], 44, 512, 60) });
  for (const x of [-0.2, 0.2]) {
    const side = mesh(rbox(0.035, 0.98, 0.05, 0.01), mat, x, 0.47, -0.05);
    side.rotation.x = -0.32; g.add(side);
    const foot = mesh(rbox(0.035, 0.04, 0.5, 0.01), mat, x, 0.02, -0.03); g.add(foot);
  }
  const seat = mesh(rbox(0.4, 0.022, 0.3, 0.008), mat, 0, 0.62, 0.06); g.add(seat);
  const step = mesh(rbox(0.4, 0.022, 0.3, 0.008), mat, 0, 0.28, 0.14); g.add(step);
  const back = mesh(rbox(0.4, 0.09, 0.022, 0.008), mat, 0, 0.92, -0.17); back.rotation.x = -0.32; g.add(back);
  const back2 = mesh(rbox(0.4, 0.07, 0.022, 0.008), mat, 0, 0.78, -0.12); back2.rotation.x = -0.32; g.add(back2);
  const guard = G();
  guard.add(mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28, Math.PI), std('#f1ece2', 0.6), 0, 0.7, 0.07));
  guard.children[0].rotation.x = -Math.PI / 2;
  const tray = mesh(rbox(0.46, 0.025, 0.2, 0.01), std('#f1ece2', 0.5), 0, 0.78, 0.25);
  guard.add(tray);
  g.add(guard);
  shade(g);
  g.add(contact(0.55, 0.65, 0.45));
  return { g, guard, seat };
}

// ------------------------------------------------------------------ tabletop things
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), roughness: 0.03, metalness: 0, transparent: true, opacity: 0.28, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false, specularIntensity: 1 });
export function wineGlass(filled = 0.5) {
  const g = G();
  const prof = [[0, 0], [0.036, 0.0], [0.036, 0.004], [0.006, 0.01], [0.004, 0.09], [0.012, 0.1], [0.036, 0.13], [0.043, 0.17], [0.04, 0.205], [0.036, 0.215]];
  const gl = mesh(lathe(prof, 32), glassMat()); gl.renderOrder = 6; g.add(gl);
  if (filled > 0) {
    const wine = mesh(lathe([[0, 0.104], [0.012, 0.104], [0.032, 0.125], [0.038, 0.142 + filled * 0.02], [0, 0.142 + filled * 0.02]], 24),
      std('#4a0610', 0.15, { emissive: C('#6a0a12'), emissiveIntensity: 0.35, transparent: true, opacity: 0.92 }));
    wine.renderOrder = 5; g.add(wine);
  }
  g.add(contact(0.12, 0.12, 0.35, 0.001));
  return g;
}
export function tumbler(color = '#f2a33a') {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.03, 0], [0.034, 0.1], [0.032, 0.1], [0.028, 0.004], [0, 0.004]], 28), glassMat()));
  g.add(mesh(new THREE.CylinderGeometry(0.029, 0.027, 0.06, 24), std(color, 0.2, { transparent: true, opacity: 0.85, emissive: C(color), emissiveIntensity: 0.15 }), 0, 0.034, 0));
  g.add(contact(0.1, 0.1, 0.35, 0.001));
  return g;
}
export function bottle() {
  const g = G();
  const b = mesh(lathe([[0, 0], [0.037, 0], [0.038, 0.2], [0.03, 0.24], [0.014, 0.27], [0.013, 0.32], [0.015, 0.325], [0, 0.325]], 32),
    new THREE.MeshPhysicalMaterial({ color: C('#1d3020'), roughness: 0.1, metalness: 0, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.05 }));
  g.add(b);
  const label = mesh(new THREE.CylinderGeometry(0.0385, 0.0385, 0.08, 32, 1, true), std('#e9dcc2', 0.8), 0, 0.11, 0); g.add(label);
  shade(g);
  g.add(contact(0.12, 0.12, 0.5, 0.001));
  return g;
}
export function mug(color = '#d8cfc2') {
  const g = G();
  const m = std(color, 0.35);
  g.add(mesh(lathe([[0, 0], [0.04, 0], [0.043, 0.005], [0.043, 0.095], [0.039, 0.095], [0.037, 0.012], [0, 0.012]], 32), m));
  const h = mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 20, Math.PI * 1.25), m, 0.045, 0.05, 0); h.rotation.z = -Math.PI * 0.62; g.add(h);
  g.add(mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.003, 24), std('#3a2014', 0.1), 0, 0.07, 0)); // tea/coffee
  shade(g); g.add(contact(0.13, 0.13, 0.4, 0.001));
  return g;
}
export function bowl(color = '#e7dfd2', r = 0.08, h = 0.05) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [r * 0.45, 0], [r * 0.5, 0.004], [r * 0.9, h * 0.6], [r, h], [r * 0.95, h], [r * 0.85, h * 0.62], [r * 0.4, h * 0.12], [0, h * 0.12]], 40), std(color, 0.3)));
  shade(g); g.add(contact(r * 2.6, r * 2.6, 0.4, 0.001));
  return g;
}
export function plate(color = '#efe9df', r = 0.13) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [r * 0.7, 0], [r * 0.75, 0.006], [r, 0.016], [r * 0.98, 0.019], [r * 0.72, 0.01], [0, 0.01]], 48), std(color, 0.3)));
  shade(g); g.add(contact(r * 2.3, r * 2.3, 0.35, 0.001));
  return g;
}
export function candle() {
  const g = G();
  const brass = std('#b08a4a', 0.28, { metalness: 0.85 });
  g.add(mesh(lathe([[0, 0], [0.045, 0], [0.047, 0.008], [0.02, 0.016], [0.014, 0.06], [0.022, 0.07], [0.022, 0.08], [0.012, 0.08], [0, 0.08]], 32), brass));
  const wax = mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 16), std('#efe6d6', 0.6, { emissive: C('#ffb060'), emissiveIntensity: 0.12 }));
  wax.position.y = 0.08; g.add(wax);
  const flame = mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color: C('#ffcc80').multiplyScalar(18) }));
  flame.scale.set(1, 2.4, 1); g.add(flame);
  shade(g); flame.castShadow = false;
  const light = new THREE.PointLight(C('#ffa050'), 0.0, 2.2, 2);
  g.add(light);
  g.add(contact(0.14, 0.14, 0.45, 0.001));
  g.userData = { wax, flame, light };
  return g;
}
export function laptop() {
  const g = G();
  const alu = std('#9a9da3', 0.32, { metalness: 0.75 });
  g.add(mesh(rbox(0.32, 0.012, 0.22, 0.006), alu, 0, 0.006, 0));
  const lid = G(); lid.position.set(0, 0.012, -0.11);
  lid.add(mesh(rbox(0.32, 0.22, 0.007, 0.006), alu, 0, 0.11, 0));
  const scr = mesh(new THREE.PlaneGeometry(0.29, 0.19), new THREE.MeshBasicMaterial({ color: C('#a9b7c8').multiplyScalar(0.6) }), 0, 0.11, 0.0045);
  lid.add(scr);
  lid.rotation.x = -0.32 - Math.PI / 2 + Math.PI / 2 - 0.0; // opened ~ 105deg
  lid.rotation.x = -0.28;
  g.add(lid);
  shade(g); g.add(contact(0.42, 0.32, 0.5, 0.001));
  g.userData.lid = lid;
  return g;
}

const spineCache = new Map();
function spineMat(color, seed) {
  const k = color + (seed % 7);
  if (!spineCache.has(k)) spineCache.set(k, std('#ffffff', 0.75, { map: spineTexture(color, seed) }));
  return spineCache.get(k);
}
const pageMat = std('#e9e0cc', 0.9);
// A book standing upright on shelf: spine faces +z. origin bottom centre.
export function bookUpright(color, h = 0.22, t = 0.03, d = 0.16, seed = 1) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), [pageMat, pageMat, pageMat, pageMat, spineMat(color, seed), pageMat]);
  b.position.y = h / 2;
  const g = G(); g.add(b);
  b.castShadow = b.receiveShadow = true;
  return g;
}
// Book lying flat: cover up.
export function bookFlat(color, w = 0.15, l = 0.22, t = 0.025) {
  const g = G();
  const cover = std(color, 0.7);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, t, l), [pageMat, cover, cover, cover, pageMat, pageMat]);
  b.position.y = t / 2; g.add(b);
  shade(g);
  return g;
}
export function bookStack(colors, seed = 1) {
  const g = G(); const r = rng(seed); let y = 0;
  colors.forEach((c) => {
    const t = 0.02 + r() * 0.02, w = 0.13 + r() * 0.05, l = 0.19 + r() * 0.05;
    const b = bookFlat(c, w, l, t); b.position.y = y; b.rotation.y = (r() - 0.5) * 0.35; g.add(b); y += t;
  });
  g.add(contact(0.3, 0.3, 0.45, 0.001));
  return g;
}

export function fruitBowl() {
  const g = bowl('#3d4a52', 0.14, 0.07);
  const r = rng(5);
  const cols = ['#e07a22', '#e8862a', '#c9421f', '#9bb34a', '#e07a22'];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + r(), rad = i === 4 ? 0 : 0.065;
    const f = mesh(new THREE.SphereGeometry(0.036 + r() * 0.008, 20, 14), std(cols[i], 0.45), Math.cos(a) * rad, 0.06 + (i === 4 ? 0.04 : 0), Math.sin(a) * rad);
    f.castShadow = true; g.add(f);
  }
  return g;
}

export function vaseStems(kind = 'euc') {
  const g = G();
  const glass = new THREE.MeshPhysicalMaterial({ color: C('#d9e4dc'), roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 2, depthWrite: false });
  g.add(mesh(lathe([[0, 0], [0.05, 0], [0.055, 0.06], [0.045, 0.16], [0.03, 0.2], [0.034, 0.215], [0, 0.215]], 32), glass));
  const r = rng(kind === 'euc' ? 9 : 19);
  const stemMat = std('#5d6b52', 0.6);
  const leafMat = std(kind === 'euc' ? '#8fa38f' : '#c48a5a', 0.6, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = r() * 6.28, lean = 0.15 + r() * 0.35, L = 0.35 + r() * 0.25;
    const tip = [Math.cos(a) * lean * L, 0.2 + L, Math.sin(a) * lean * L];
    const st = mesh(tube([[0, 0.05, 0], [tip[0] * 0.4, 0.2 + L * 0.5, tip[2] * 0.4], tip], 0.0025, 12, 4), stemMat); g.add(st);
    for (let k = 0; k < 7; k++) {
      const t = 0.35 + k * 0.1;
      const lf = mesh(kind === 'euc' ? new THREE.CircleGeometry(0.018 + r() * 0.006, 10) : leafGeo(0.05, 0.02, { shape: 'lance' }), leafMat,
        tip[0] * t, 0.2 + L * t, tip[2] * t);
      lf.rotation.set(r() * 3, r() * 3, r() * 3); g.add(lf);
    }
  }
  shade(g);
  g.add(contact(0.16, 0.16, 0.4, 0.001));
  return g;
}

export function paperSheets(texs) {
  const g = G(); const r = rng(3);
  texs.forEach((t, i) => {
    const s = mesh(new THREE.PlaneGeometry(0.297, 0.21).rotateX(-Math.PI / 2), std('#ffffff', 0.9, { map: t }), (r() - 0.5) * 0.12, 0.001 + i * 0.0008, (r() - 0.5) * 0.08);
    s.rotation.y = (r() - 0.5) * 0.8; s.receiveShadow = true; g.add(s);
  });
  const cols = ['#d8432f', '#3a7cc6', '#f1cf35', '#58a84a', '#7a4fb0'];
  cols.forEach((c, i) => {
    const cr = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), std(c, 0.5), 0.18 + (r() - 0.5) * 0.1, 0.004, (r() - 0.5) * 0.1);
    cr.rotation.set(Math.PI / 2, 0, r() * 3); cr.castShadow = true; g.add(cr);
  });
  return g;
}

export function babyBottle() {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.026, 0], [0.028, 0.1], [0.024, 0.11], [0, 0.11]], 24), new THREE.MeshPhysicalMaterial({ color: C('#f4f1ea'), roughness: 0.2, transparent: true, opacity: 0.6, depthWrite: false })));
  g.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 24), std('#f6f0e2', 0.5), 0, 0.03, 0));
  g.add(mesh(lathe([[0, 0.11], [0.027, 0.11], [0.027, 0.125], [0.012, 0.13], [0.008, 0.155], [0, 0.16]], 24), std('#e8c9a6', 0.5)));
  shade(g); g.add(contact(0.08, 0.08, 0.35, 0.001));
  return g;
}
export function sippyCup() {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.033, 0], [0.036, 0.09], [0, 0.09]], 24), std('#3f8fd0', 0.4)));
  g.add(mesh(lathe([[0, 0.09], [0.037, 0.09], [0.036, 0.105], [0.012, 0.115], [0.006, 0.13], [0, 0.13]], 24), std('#f2b437', 0.4)));
  for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), std('#f2b437', 0.4), s * 0.045, 0.06, 0); h.rotation.y = Math.PI / 2; g.add(h); }
  shade(g); g.add(contact(0.1, 0.1, 0.35, 0.001));
  return g;
}
export function pencilCase() {
  const g = G();
  g.add(mesh(rbox(0.2, 0.045, 0.07, 0.02), std('#2c4a6b', 0.8), 0, 0.022, 0));
  g.add(mesh(new THREE.BoxGeometry(0.17, 0.003, 0.004), std('#c9c2b4', 0.3, { metalness: 0.6 }), 0, 0.045, 0));
  shade(g); return g;
}

// ------------------------------------------------------------------ textiles
export function throwBlanket(color, seed = 1, w = 0.7, d = 1.4) {
  const g = G();
  const m = std('#ffffff', 0.95, { map: knitTexture(color, seed) });
  const t = mesh(drapeGeo(w, d, 0.28, { seg: 60, wr: 0.022, seed, freq: 1.4 }), m); t.castShadow = t.receiveShadow = true; g.add(t);
  return g;
}
export function cushion(color, s = 0.42) {
  const g = G();
  const c = mesh(pillowGeo(s, s * 0.5, s * 0.8), std(color, 0.95, { bumpMap: linenBump(12), bumpScale: 0.5 }));
  c.rotation.x = -Math.PI / 2 + 0.3; c.position.y = s * 0.38; c.castShadow = c.receiveShadow = true; g.add(c);
  return g;
}

// Hanging garment on a peg. origin at peg tip.
export function coat(color, len = 0.95, width = 0.46, seed = 1) {
  const g = G();
  const r = rng(seed);
  const pts = [[0.02, 0], [0.09, -0.03], [width * 0.42, -0.1], [width * 0.47, -0.25], [width * 0.45, -len * 0.5], [width * 0.5, -len * 0.85], [width * 0.53, -len]];
  const geo = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 40, 0, Math.PI * 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(z, x);
    const fold = Math.sin(ang * 9 + r() * 0.2) * 0.012 * (-y / len);
    x *= 1 + fold * 4; z = z * 0.32 + fold;
    p.setXYZ(i, x, y, z - 0.06);
  }
  geo.computeVertexNormals();
  const mat = std(color, 0.92, { bumpMap: linenBump(seed + 40), bumpScale: 0.6, side: THREE.DoubleSide });
  const body = mesh(geo, mat); g.add(body);
  // sleeves hanging along sides
  for (const s of [-1, 1]) {
    const sl = mesh(new THREE.CylinderGeometry(0.045, 0.055, len * 0.72, 12), mat, s * width * 0.43, -0.1 - len * 0.36, -0.03);
    sl.rotation.z = s * 0.06; sl.scale.z = 0.7; g.add(sl);
  }
  // collar
  const col = mesh(new THREE.TorusGeometry(0.06, 0.022, 8, 20), mat, 0, -0.04, -0.03); col.rotation.x = Math.PI / 2 - 0.4; g.add(col);
  shade(g);
  return g;
}
// A garment folded over a chair's backrest. origin = top of the backrest.
export function chairCoat(color, seed = 1, w = 0.44, drop = 0.5, wr = 0.02) {
  const g = G();
  const m = std(color, 0.92, { bumpMap: linenBump(seed + 40), bumpScale: 0.6, side: THREE.DoubleSide });
  const d = mesh(drapeGeo(w, 0.05, drop, { seg: 44, wr, seed, freq: 1.6 }), m);
  d.castShadow = d.receiveShadow = true;
  g.add(d);
  return g;
}
export function toteBag(color = '#d9cbb0') {
  const g = G();
  const m = std(color, 0.95, { bumpMap: linenBump(55), bumpScale: 0.6, side: THREE.DoubleSide });
  const body = mesh(rbox(0.34, 0.36, 0.05, 0.02), m, 0, -0.38, -0.03); g.add(body);
  for (const s of [-1, 1]) { const h = mesh(new THREE.BoxGeometry(0.02, 0.22, 0.004), m, s * 0.05, -0.1, -0.02); h.rotation.z = -s * 0.35; g.add(h); }
  shade(g); return g;
}
export function backpack(color = '#c4532e') {
  const g = G();
  const m = std(color, 0.85, { bumpMap: linenBump(66), bumpScale: 0.5 });
  g.add(mesh(rbox(0.28, 0.34, 0.14, 0.06, 4), m, 0, -0.25, -0.05));
  g.add(mesh(rbox(0.22, 0.14, 0.05, 0.03, 3), m, 0, -0.32, 0.03));
  const loop = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), std('#222', 0.6), 0, -0.06, -0.05); g.add(loop);
  shade(g); return g;
}
export function scarf(color = '#b5523b') {
  const g = G();
  const m = std('#ffffff', 0.95, { map: knitTexture(color, 77), side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const pts = [[0, 0.0, 0.015], [s * 0.06, -0.08, 0.03], [s * 0.08, -0.35, 0.04], [s * 0.07, -0.6, 0.035]];
    const t = mesh(tube(pts, 0.035, 20, 8), m); t.scale.z = 0.35; g.add(t);
  }
  shade(g); return g;
}

// ------------------------------------------------------------------ shoes (pair), origin floor centre, toes +z
export function shoes(kind = 'sneaker', color = '#efeae2', size = 1) {
  const g = G();
  const sole = std(kind === 'boot' ? '#2a1d16' : '#f4f1ea', 0.7);
  const up = std(color, kind === 'boot' ? 0.55 : 0.8);
  for (const s of [-1, 1]) {
    const sh = G();
    sh.add(mesh(rbox(0.095, 0.025, 0.27, 0.012), sole, 0, 0.0125, 0));
    const u = mesh(new THREE.SphereGeometry(0.06, 20, 14), up, 0, 0.035, 0.04); u.scale.set(0.78, 0.6, 2.0); sh.add(u);
    const heel = mesh(new THREE.SphereGeometry(0.05, 16, 12), up, 0, 0.05, -0.08); heel.scale.set(0.9, kind === 'boot' ? 2.4 : 1.1, 0.9); sh.add(heel);
    if (kind === 'boot') { const shaft = mesh(new THREE.CylinderGeometry(0.045, 0.048, 0.12, 16), up, 0, 0.12, -0.07); sh.add(shaft); }
    sh.position.x = s * 0.065; sh.rotation.y = s * 0.08 + (s > 0 ? 0.1 : 0);
    sh.position.z = s > 0 ? 0.02 : 0;
    g.add(sh);
  }
  g.scale.setScalar(size);
  shade(g);
  g.add(contact(0.34, 0.4, 0.55));
  return g;
}

// ------------------------------------------------------------------ toys
export function blocks(seed = 1) {
  const g = G(); const r = rng(seed);
  const cols = ['#d8432f', '#f1cf35', '#3a7cc6', '#58a84a', '#e9dcc2', '#ef8f2a'];
  for (let i = 0; i < 7; i++) {
    const s = 0.045;
    const b = mesh(rbox(s, s, s, 0.004, 2), std(cols[i % 6], 0.55), (r() - 0.5) * 0.5, s / 2 + (i === 6 ? s : 0), (r() - 0.5) * 0.4);
    if (i === 6) { b.position.x = g.children[5].position.x; b.position.z = g.children[5].position.z; }
    b.rotation.y = r() * 3; g.add(b);
  }
  shade(g); return g;
}
export function ball(colors = ['#d8432f', '#f4f1ea'], rad = 0.09) {
  const [c, x] = canvas(256, 128);
  colors.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, (i * 128) / colors.length, 256, 128 / colors.length); });
  const g = G();
  const b = mesh(new THREE.SphereGeometry(rad, 32, 20), std('#ffffff', 0.45, { map: toTex(c) }), 0, rad, 0);
  b.rotation.z = 0.6; g.add(b);
  shade(g); g.add(contact(rad * 3.2, rad * 3.2, 0.6));
  return g;
}
export function balanceBike() {
  const g = G();
  const frame = std('#c9442e', 0.4, { metalness: 0.2 });
  const tyre = std('#1b1b1b', 0.8);
  for (const z of [-0.28, 0.28]) {
    const w = mesh(new THREE.TorusGeometry(0.13, 0.025, 10, 32), tyre, 0, 0.155, z); w.rotation.y = Math.PI / 2; g.add(w);
    const hub = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), std('#ddd', 0.3, { metalness: 0.7 }), 0, 0.155, z); hub.rotation.z = Math.PI / 2; g.add(hub);
  }
  g.add(mesh(tube([[0, 0.155, -0.28], [0, 0.32, -0.08], [0, 0.34, 0.18], [0, 0.155, 0.28]], 0.018, 20, 8), frame));
  g.add(mesh(tube([[0, 0.34, 0.18], [0, 0.5, 0.22]], 0.016, 4, 8), frame));
  const bar = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), std('#222', 0.6), 0, 0.5, 0.22); bar.rotation.z = Math.PI / 2; g.add(bar);
  g.add(mesh(rbox(0.09, 0.03, 0.18, 0.012), std('#2a2a2a', 0.7), 0, 0.37, -0.1));
  shade(g); g.add(contact(0.3, 0.8, 0.45));
  return g;
}
export function bunny() {
  const g = G();
  const m = std('#e3d6c6', 1.0, { bumpMap: linenBump(88), bumpScale: 1 });
  const body = mesh(new THREE.SphereGeometry(0.07, 20, 14), m, 0, 0.07, 0); body.scale.set(1, 1.1, 0.85); g.add(body);
  const head = mesh(new THREE.SphereGeometry(0.05, 20, 14), m, 0, 0.17, 0.01); g.add(head);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.02, 12, 10), m, s * 0.025, 0.24, 0); ear.scale.set(0.8, 2.8, 0.5); ear.rotation.z = -s * 0.25; g.add(ear);
    const leg = mesh(new THREE.SphereGeometry(0.028, 12, 10), m, s * 0.04, 0.025, 0.05); leg.scale.set(1, 0.8, 1.5); g.add(leg);
  }
  shade(g); g.add(contact(0.2, 0.2, 0.5, 0.001));
  return g;
}
export function skateboard() {
  const g = G();
  const deck = mesh(rbox(0.2, 0.78, 0.014, 0.08, 4), std('#2f4858', 0.6), 0, 0.39, 0); g.add(deck);
  for (const y of [0.12, 0.66]) for (const s of [-1, 1]) {
    const w = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16), std('#e9d36a', 0.5), s * 0.07, y, 0.035); w.rotation.z = Math.PI / 2; g.add(w);
  }
  g.rotation.x = -0.22;
  shade(g); return g;
}

export function mosesBasket() {
  const g = G();
  const wick = std('#ffffff', 0.9, { map: knitTexture('#c9a774', 31) });
  const b = mesh(lathe([[0, 0], [0.3, 0], [0.33, 0.06], [0.35, 0.22], [0.33, 0.24], [0.31, 0.08], [0, 0.04]], 40), wick, 0, 0.42, 0);
  b.scale.set(0.62, 1, 1.22); g.add(b);
  const lin = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 32), std('#f4efe6', 0.95), 0, 0.6, 0); lin.scale.set(0.6, 1, 1.18); g.add(lin);
  const blanket = mesh(drapeGeo(0.3, 0.42, 0.04, { seg: 30, wr: 0.01, seed: 4 }), std('#cfd9cf', 0.95, { bumpMap: linenBump(3), bumpScale: 0.6 }), 0, 0.615, 0.08); g.add(blanket);
  const stand = std('#6b4a32', 0.5);
  for (const z of [-0.28, 0.28]) for (const s of [-1, 1]) {
    const l = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.58, 8), stand, 0, 0.27, z); l.rotation.x = s * 0.38; g.add(l);
  }
  shade(g); g.add(contact(0.6, 0.9, 0.5));
  return g;
}
export function babyMonitor() {
  const g = G();
  g.add(mesh(rbox(0.06, 0.09, 0.035, 0.015), std('#f2efe8', 0.4), 0, 0.045, 0));
  g.add(mesh(new THREE.CircleGeometry(0.004, 10), new THREE.MeshBasicMaterial({ color: C('#7dff9a').multiplyScalar(3) }), 0, 0.075, 0.0181));
  shade(g); g.add(contact(0.1, 0.08, 0.4, 0.001));
  return g;
}
export function radio() {
  const g = G();
  g.add(mesh(rbox(0.26, 0.15, 0.1, 0.02), std('#c9b28a', 0.6), 0, 0.075, 0));
  g.add(mesh(new THREE.CircleGeometry(0.045, 24), std('#3a332c', 0.9), -0.06, 0.075, 0.0505));
  const knob = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.01, 16), std('#7a6a50', 0.3, { metalness: 0.6 }), 0.07, 0.09, 0.052);
  knob.rotation.x = Math.PI / 2; g.add(knob);
  shade(g); return g;
}

// Picture frame hanging on the wall: faces +z, origin at centre.
export function frame(tex, w, h, { border = 0.025, mat = 0.04, color = '#1c1714', depth = 0.025 } = {}) {
  const g = G();
  const fm = std(color, 0.5);
  const W = w + 2 * (border + mat), H = h + 2 * (border + mat);
  for (const [fw, fh, x, y] of [[W, border, 0, H / 2 - border / 2], [W, border, 0, -H / 2 + border / 2], [border, H, -W / 2 + border / 2, 0], [border, H, W / 2 - border / 2, 0]])
    g.add(mesh(new THREE.BoxGeometry(fw, fh, depth), fm, x, y, depth / 2));
  g.add(mesh(new THREE.PlaneGeometry(W - border * 2, H - border * 2), std('#f1ebe0', 0.9), 0, 0, 0.004));
  g.add(mesh(new THREE.PlaneGeometry(w, h), std('#ffffff', 0.6, { map: tex }), 0, 0, 0.005));
  const glass = mesh(new THREE.PlaneGeometry(W - border * 2, H - border * 2), new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), roughness: 0.08, transparent: true, opacity: 0.08, envMapIntensity: 1.5, depthWrite: false }), 0, 0, depth - 0.002);
  g.add(glass);
  shade(g); glass.castShadow = false;
  return g;
}
// A drawing taped to the wall (slight curl)
export function tapedPaper(tex, w = 0.3, h = 0.225, seed = 1) {
  const g = G(); const r = rng(seed);
  const geo = new THREE.PlaneGeometry(w, h, 10, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, 0.004 + Math.pow(Math.abs(y) / (h / 2), 3) * 0.01 + Math.pow(Math.abs(x) / (w / 2), 4) * 0.004 * (y < 0 ? 1 : 0.3));
  }
  geo.computeVertexNormals();
  const s = mesh(geo, std('#ffffff', 0.9, { map: tex, side: THREE.DoubleSide })); s.receiveShadow = true; s.castShadow = true; g.add(s);
  const tape = std('#efe6c8', 0.6, { transparent: true, opacity: 0.75 });
  for (const [x, y] of [[-w / 2 + 0.02, h / 2 - 0.01], [w / 2 - 0.02, h / 2 - 0.01]]) {
    const t = mesh(new THREE.PlaneGeometry(0.05, 0.018), tape, x, y, 0.0065); t.rotation.z = (r() - 0.5) * 0.6; g.add(t);
  }
  g.rotation.z = (r() - 0.5) * 0.08;
  return g;
}

// ------------------------------------------------------------------ plants
const potMat = () => std('#b5674a', 0.85, { bumpMap: linenBump(70), bumpScale: 0.2 });
export function pot(r = 0.16, h = 0.3, mat = potMat()) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [r * 0.78, 0], [r * 0.8, 0.01], [r * 0.98, h * 0.85], [r * 1.06, h * 0.86], [r * 1.07, h], [r * 0.98, h], [r * 0.95, h * 0.92], [0, h * 0.92]], 40), mat));
  g.add(mesh(new THREE.CircleGeometry(r * 0.94, 32).rotateX(-Math.PI / 2), std('#2a1c14', 1), 0, h * 0.9, 0));
  shade(g);
  return g;
}
