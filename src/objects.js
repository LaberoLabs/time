// Procedural objects of a life. Each returns a Group with its origin at its resting point.
import * as THREE from 'three';
import { std, shade, rbox, mesh, lathe, contact, pillowGeo, drapeGeo, leafGeo, tube, fixNormals, fabric, glazed, C } from './build.js';
import { woodTexture, knitTexture, linenBump, spineTexture, toTex, canvas, garmentMap } from './tex.js';
import { rng } from './util.js';

const G = () => new THREE.Group();
const oakTex = woodTexture([30, 40, 42], 15, 512, 90);
const oak = () => std('#ffffff', 0.55, { map: oakTex });

// ------------------------------------------------------------------ chairs (front = +z)
export const rboxGeo = (w, h, d, r) => rbox(w, h, d, r, 2);
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
    wine.renderOrder = 5; g.add(wine); g.userData.wine = wine;
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
  const m = glazed(color);
  g.add(mesh(lathe([[0, 0], [0.04, 0], [0.043, 0.005], [0.043, 0.095], [0.039, 0.095], [0.037, 0.012], [0, 0.012]], 32), m));
  const h = mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 20, Math.PI * 1.25), m, 0.045, 0.05, 0); h.rotation.z = -Math.PI * 0.62; g.add(h);
  g.add(mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.003, 24), std('#3a2014', 0.1), 0, 0.07, 0)); // tea/coffee
  shade(g); g.add(contact(0.13, 0.13, 0.4, 0.001));
  return g;
}
export function bowl(color = '#e7dfd2', r = 0.08, h = 0.05) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [r * 0.45, 0], [r * 0.5, 0.004], [r * 0.9, h * 0.6], [r, h], [r * 0.95, h], [r * 0.85, h * 0.62], [r * 0.4, h * 0.12], [0, h * 0.12]], 40), glazed(color)));
  shade(g); g.add(contact(r * 2.6, r * 2.6, 0.4, 0.001));
  return g;
}
export function plate(color = '#efe9df', r = 0.13) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [r * 0.7, 0], [r * 0.75, 0.006], [r, 0.016], [r * 0.98, 0.019], [r * 0.72, 0.01], [0, 0.01]], 48), glazed(color, { roughness: 0.3 })));
  shade(g); g.add(contact(r * 2.3, r * 2.3, 0.35, 0.001));
  return g;
}
export function candle() {
  const g = G();
  const brass = std('#b08a4a', 0.28, { metalness: 0.85 });
  g.add(mesh(lathe([[0, 0], [0.045, 0], [0.047, 0.008], [0.02, 0.016], [0.014, 0.06], [0.022, 0.07], [0.022, 0.08], [0.012, 0.08], [0, 0.08]], 32), brass));
  const wax = mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 16), std('#efe6d6', 0.6, { emissive: C('#ffb060'), emissiveIntensity: 0.12 }));
  wax.scale.y = 0.2; wax.position.y = 0.18; g.add(wax);
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
  if (!spineCache.has(k)) {
    const jitter = C(color).offsetHSL(((seed * 37) % 11 - 5) * 0.004, ((seed * 13) % 7 - 3) * 0.02, ((seed * 29) % 9 - 4) * 0.012);
    spineCache.set(k, std('#ffffff', 0.62 + (seed % 5) * 0.06, { map: spineTexture('#' + jitter.getHexString(), seed) }));
  }
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

export function vaseStems(kind = 'euc', spread = 1) {
  const g = G();
  const glass = new THREE.MeshPhysicalMaterial({ color: C('#d9e4dc'), roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 2, depthWrite: false });
  g.add(mesh(lathe([[0, 0], [0.05, 0], [0.055, 0.06], [0.045, 0.16], [0.03, 0.2], [0.034, 0.215], [0, 0.215]], 32), glass));
  const r = rng(kind === 'euc' ? 9 : 19);
  const stemMat = std('#5d6b52', 0.6);
  const leafMat = std(kind === 'euc' ? '#8fa38f' : '#c48a5a', 0.6, { side: THREE.DoubleSide });
  leafMat.name = 'leaf';
  for (let i = 0; i < 7; i++) {
    const a = r() * 6.28, lean = (0.1 + r() * 0.18) * spread, L = 0.35 + r() * 0.25;
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
export function throwBlanket(color, seed = 1, w = 0.7, d = 1.4, drop = 0.28) {
  const g = G();
  const m = fabric('#ffffff', { map: knitTexture(color, seed), sheen: 0.8 });
  const t = mesh(drapeGeo(w, d, drop, { seg: 60, wr: 0.022, seed, freq: 1.4 }), m); t.castShadow = t.receiveShadow = true; g.add(t);
  return g;
}
export function cushion(color, s = 0.42) {
  const g = G();
  const c = mesh(pillowGeo(s, s * 0.5, s * 0.8), fabric(color, { bumpMap: linenBump(12), bumpScale: 0.6 }));
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
export function chairCoat(color, seed = 1, w = 0.44, drop = 0.5, wr = 0.02, d0 = 0.05) {
  const g = G();
  const m = std(color, 0.92, { bumpMap: linenBump(seed + 40), bumpScale: 0.6, side: THREE.DoubleSide });
  const d = mesh(drapeGeo(w, d0, drop, { seg: 44, wr, seed, freq: 1.6 }), m);
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
function shoeGeo(kind) {
  const L = 0.27, W = 0.098;
  const g = new THREE.BoxGeometry(1, 1, 1, 10, 5, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, w = p.getZ(i) + 0.5; // 0..1 ; w: heel->toe
    // outline: rounded toe, narrower heel, slight inward curve
    const width = W * (0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, w * 1.15))) * (w > 0.85 ? Math.sqrt(Math.max(0, 1 - Math.pow((w - 0.85) / 0.16, 2))) * 0.85 + 0.15 : 1);
    const top = kind === 'boot' ? (w < 0.42 ? 0.17 : 0.17 - (w - 0.42) * 0.22) : (w < 0.35 ? 0.085 : 0.085 - (w - 0.35) * 0.075);
    const x = (u - 0.5) * width;
    const round = Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.5) * 2, 4)));
    const y = v * top * (0.55 + 0.45 * round);
    p.setXYZ(i, x, y, (w - 0.5) * L);
  }
  g.computeVertexNormals();
  return g;
}
export function shoes(kind = 'sneaker', color = '#efeae2', size = 1) {
  const g = G();
  const sole = std(kind === 'boot' ? '#2a1d16' : '#f4f1ea', 0.75);
  const up = std(color, kind === 'boot' ? 0.5 : 0.8, { bumpMap: linenBump(14), bumpScale: kind === 'boot' ? 0.1 : 0.4 });
  const ug = shoeGeo(kind);
  for (const s of [-1, 1]) {
    const sh = G();
    sh.add(mesh(ug, up, 0, 0.012, 0));
    const so = mesh(rbox(0.1, 0.018, 0.275, 0.008), sole, 0, 0.009, 0.002); sh.add(so);
    const open = mesh(new THREE.CircleGeometry(0.03, 16).rotateX(-Math.PI / 2), std('#2a221c', 0.9), 0, (kind === 'boot' ? 0.182 : 0.098), -0.07);
    open.scale.set(1, 1, 1.5); sh.add(open);
    if (kind !== 'boot') { const lace = mesh(new THREE.BoxGeometry(0.04, 0.004, 0.06), std('#f8f6f0', 0.6), 0, 0.085, 0.0); lace.rotation.x = -0.32; sh.add(lace); }
    sh.position.x = s * 0.06; sh.rotation.y = s * 0.025;
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
  g.add(b);
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
  // lying flat on the floor, wheels down
  const g = G();
  g.add(mesh(rbox(0.2, 0.014, 0.78, 0.007, 3), std('#2f4858', 0.6), 0, 0.068, 0));
  for (const z of [-0.27, 0.27]) for (const s of [-1, 1]) {
    const w = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16), std('#e9d36a', 0.5), s * 0.07, 0.026, z); w.rotation.z = Math.PI / 2; g.add(w);
  }
  shade(g); g.add(contact(0.3, 0.85, 0.45));
  return g;
}
export function mosesBasket() {
  const g = G();
  const wick = std('#ffffff', 0.9, { map: knitTexture('#c9a774', 31) });
  const b = mesh(lathe([[0, 0], [0.3, 0], [0.33, 0.06], [0.35, 0.22], [0.33, 0.24], [0.31, 0.08], [0, 0.04]], 40), wick, 0, 0.44, 0);
  b.scale.set(0.62, 1, 1.22); g.add(b);
  const lin = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 32), std('#f4efe6', 0.95), 0, 0.6, 0); lin.scale.set(0.6, 1, 1.18); g.add(lin);
  const blanket = mesh(drapeGeo(0.3, 0.42, 0.04, { seg: 30, wr: 0.01, seed: 4 }), std('#cfd9cf', 0.95, { bumpMap: linenBump(3), bumpScale: 0.6 }), 0, 0.615, 0.08); g.add(blanket);
  const stand = std('#6b4a32', 0.5);
  for (const z of [-0.3, 0.3]) for (const s of [-1, 1]) {
    const l = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), stand, 0, 0.23, z); l.rotation.z = s * 0.42; g.add(l);
  }
  for (const x of [-0.16, 0.16]) { const rl = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 8), stand, x, 0.43, 0); rl.rotation.x = Math.PI / 2; g.add(rl); }
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

// ------------------------------------------------------------------ later life
export function headphones(color = '#2a2a2e') {
  const g = G();
  const m = std(color, 0.5);
  const band = mesh(new THREE.TorusGeometry(0.085, 0.009, 8, 24, Math.PI), m, 0, 0.03, 0); band.rotation.x = -Math.PI / 2 + 0.25; g.add(band);
  for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 20), m, s * 0.085, 0.02, 0); g.add(cup); }
  shade(g); g.add(contact(0.25, 0.12, 0.4, 0.001));
  return g;
}
export function guitar() {
  const g = G();
  const wood = std('#ffffff', 0.4, { map: woodTexture([28, 55, 48], 91, 512, 50) });
  const dark = std('#2a1c14', 0.5);
  const lower = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 40), wood, 0, 0.22, 0); lower.rotation.x = Math.PI / 2; g.add(lower);
  const upper = mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.1, 40), wood, 0, 0.5, 0); upper.rotation.x = Math.PI / 2; g.add(upper);
  const hole = mesh(new THREE.CircleGeometry(0.045, 24), dark, 0, 0.4, 0.0505); g.add(hole);
  g.add(mesh(rbox(0.05, 0.5, 0.025, 0.008), dark, 0, 0.88, 0.02));
  g.add(mesh(rbox(0.07, 0.15, 0.025, 0.01), dark, 0, 1.18, 0.02));
  g.rotation.x = -0.2;
  shade(g); return g;
}
export function cardboardBox(w = 0.5, h = 0.36, d = 0.38, open = false) {
  const g = G();
  const m = std('#b88d5e', 0.9, { bumpMap: linenBump(71), bumpScale: 0.3 });
  g.add(mesh(rbox(w, h, d, 0.01), m, 0, h / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w * 1.002, 0.004, 0.05), std('#cdbb94', 0.4), 0, h + 0.001, 0));
  if (open) for (const s of [-1, 1]) { const f = mesh(new THREE.BoxGeometry(w, 0.004, d / 2), m, 0, h, s * d / 2); f.rotation.x = s * 1.1; f.position.z += s * 0.08; f.position.y += 0.08; g.add(f); }
  shade(g); g.add(contact(w + 0.2, d + 0.2, 0.6));
  return g;
}
export function jigsaw(seed = 3) {
  const [c, x] = canvas(512, 360);
  const r = rng(seed);
  x.fillStyle = '#d8c9ae'; x.fillRect(0, 0, 512, 360);
  // a picture of the sea, half done
  const sky = x.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#9fb6cc'); sky.addColorStop(1, '#f0c99e');
  for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) {
    const done = (i < 7 && j > 1) || (j > 5) || r() < 0.25;
    if (!done) continue;
    x.fillStyle = j < 5 ? sky : '#4d6f8a'; x.globalAlpha = 1;
    x.fillRect(i * 42 + 4, j * 40, 42, 40);
    x.strokeStyle = 'rgba(0,0,0,0.18)'; x.strokeRect(i * 42 + 4, j * 40, 42, 40);
  }
  for (let k = 0; k < 40; k++) { x.fillStyle = r() < 0.5 ? '#6f8aa0' : '#e9c49a'; x.fillRect(380 + r() * 120, r() * 340, 22, 20); }
  const g = G();
  const p = mesh(new THREE.PlaneGeometry(0.5, 0.35).rotateX(-Math.PI / 2), std('#ffffff', 0.7, { map: toTex(c) }), 0, 0.003, 0);
  p.receiveShadow = true; g.add(p);
  return g;
}
export function tablet() {
  const g = G();
  g.add(mesh(rbox(0.25, 0.008, 0.175, 0.01), std('#1c1c1e', 0.3, { metalness: 0.4 }), 0, 0.004, 0));
  shade(g); g.add(contact(0.3, 0.22, 0.35, 0.001));
  return g;
}
export function newspaper(seed = 5) {
  const [c, x] = canvas(256, 180);
  const r = rng(seed);
  x.fillStyle = '#e4ddcf'; x.fillRect(0, 0, 256, 180);
  x.fillStyle = 'rgba(40,36,32,0.8)'; x.fillRect(12, 10, 232, 14);
  for (let col = 0; col < 3; col++) for (let l = 0; l < 18; l++) { x.fillStyle = `rgba(60,55,50,${0.25 + r() * 0.3})`; x.fillRect(12 + col * 80, 34 + l * 8, 70 * (0.7 + r() * 0.3), 3); }
  // a crossword, half filled
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { x.fillStyle = (i * 3 + j * 5) % 4 === 0 ? '#222' : '#f4efe4'; x.fillRect(170 + i * 10, 100 + j * 10, 9, 9); }
  const g = G();
  const p = mesh(new THREE.PlaneGeometry(0.34, 0.24, 6, 2).rotateX(-Math.PI / 2), std('#ffffff', 0.9, { map: toTex(c), side: THREE.DoubleSide }), 0, 0.004, 0);
  p.receiveShadow = true; p.castShadow = true; g.add(p);
  const pen = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 8), std('#1d2a44', 0.4), 0.12, 0.008, 0.05); pen.rotation.set(Math.PI / 2, 0, 0.6); pen.castShadow = true; g.add(pen);
  return g;
}
// small pot of herbs/flowers for the balcony; `dry` 0..1 browns it
export function herbPot(seed = 1, color = '#5f7d45') {
  const g = pot(0.1, 0.17, std('#b5674a', 0.85));
  const r = rng(seed);
  const leafM = std(color, 0.7, { side: THREE.DoubleSide });
  leafM.name = 'leaf';
  const lg = leafGeo(0.07, 0.03, { shape: 'lance', segL: 4, segW: 2 });
  for (let i = 0; i < 30; i++) {
    const lf = mesh(lg, leafM, (r() - 0.5) * 0.12, 0.16 + r() * 0.12, (r() - 0.5) * 0.12);
    lf.rotation.set(-r() * 1.2, r() * 6.28, 0); lf.castShadow = true; g.add(lf);
  }
  g.userData.leafM = leafM;
  return g;
}
export function cuttingJar() {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.035, 0], [0.037, 0.09], [0.03, 0.11], [0.032, 0.12], [0, 0.12]], 24), new THREE.MeshPhysicalMaterial({ color: C('#e4efe6'), roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, envMapIntensity: 2 })));
  g.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.07, 20), std('#b9c9bd', 0.1, { transparent: true, opacity: 0.4 }), 0, 0.035, 0));
  g.add(mesh(tube([[0, 0.02, 0], [0.01, 0.14, 0], [0.02, 0.22, 0.01]], 0.003, 8, 4), std('#4f6a3c', 0.6)));
  const lm = std('#4d6c3c', 0.5, { side: THREE.DoubleSide });
  for (const [y, ry, s] of [[0.2, 0.4, 0.09], [0.16, 2.7, 0.07]]) { const l = mesh(leafGeo(s, s * 0.45, { curl: 0.2 }), lm, 0.015, y, 0.008); l.rotation.set(-0.7, ry, 0); g.add(l); }
  shade(g); g.add(contact(0.1, 0.1, 0.35, 0.001));
  return g;
}

// ------------------------------------------------------------------ garments that hang over a backrest rail
// origin = centre of the rail. Section runs: front (short, follows the backrest's lean) -> over the rail -> back (long, falls free).
export function garment(color, { w = 0.42, front = 0.14, back = 0.4, r = 0.045, lean = 0.16, seed = 1, sleeves = true, knit = false, bulge = 0.018 } = {}) {
  const g = G();
  const SU = 32, SV = 60;
  const arc = Math.PI * r, L = front + arc + back;
  const geo = new THREE.PlaneGeometry(1, 1, SU, SV);
  const p = geo.attributes.position;
  const rr = rng(seed), ph = rr() * 6, ph2 = rr() * 6, skew = (rr() - 0.5) * 0.06;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2;          // -1..1 across
    const a = (p.getY(i) + 0.5) * L;  // 0..L along the section (0 = front hem, L = back hem)
    let y, z, hang = 0;
    if (a < front) { const d = front - a; y = -d; z = r + lean * d + 0.004; hang = (d / front) * 0.5; }
    else if (a < front + arc) {
      // over the rail: the cloth bunches a little at the shoulders
      const t = (a - front) / r; const bunch = 1 + 0.25 * Math.pow(Math.abs(u), 3);
      y = r * Math.sin(t) * bunch; z = r * Math.cos(t) * bunch;
    } else { const d = a - front - arc; hang = d / back; y = -d; z = -r - bulge * Math.sin(Math.PI * Math.min(1, d / back)); }
    // gravity folds: deeper towards the hem, a few larger tubes plus fine creases; side edges curl in
    const big = Math.sin(u * 4.2 + ph) * 0.016, fine = Math.sin(u * 13 + ph2 + a * 3) * 0.004;
    const fold = (big + fine) * hang;
    const edge = Math.pow(Math.abs(u), 6) * 0.02 * hang;
    if (z > 0) z += Math.abs(fold) * 0.5 + edge * 0.5; else z -= Math.abs(fold) + edge;
    if (a > front + arc) y += (Math.sin(u * 3 + ph) * 0.018 + skew * u) * hang * hang; // uneven hem
    const x = u * (w / 2) * (1 + 0.12 * hang - 0.05 * edge) ;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const lining = C(color).lerp(new THREE.Color('#2a2420'), 0.35).getStyle();
  const map = knit ? knitTexture(color, seed + 5) : garmentMap(color, lining, front / L, arc / L, seed);
  const mat = fabric('#ffffff', { map, bumpMap: linenBump(seed + 40), bumpScale: knit ? 0.8 : 0.5, side: THREE.DoubleSide, sheen: knit ? 0.85 : 0.6 });
  const body = mesh(geo, mat); body.castShadow = body.receiveShadow = true; g.add(body);
  if (sleeves) for (const s of [-1, 1]) {
    // a sleeve falls from the shoulder behind the rail, slightly forward at the elbow, flattened by its own weight
    const len = back * 0.86, x0 = s * (w / 2 - 0.045);
    const pts = [[x0, -0.02, -r - 0.03], [x0 + s * 0.006, -len * 0.45, -r - 0.045], [x0 - s * 0.004, -len, -r - 0.035]];
    const sm = fabric(color, { bumpMap: linenBump(seed + 41), bumpScale: 0.5 });
    const sl = mesh(tube(pts, 0.03, 16, 10), sm); sl.scale.z = 1; g.add(sl);
    const sp = sl.geometry.attributes.position; // flatten front-to-back and taper to the cuff
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i), k = (-y) / len; const cx = x0 + (sp.getX(i) - x0) * (1 - 0.15 * k); sp.setXYZ(i, cx, y, -r - 0.04 + (sp.getZ(i) + r + 0.04) * 0.55); }
    sl.geometry.computeVertexNormals(); sl.castShadow = true;
  }
  return g;
}
// a garment folded and laid down (on a seat). origin = bottom centre
export function foldedCloth(color, w = 0.3, d = 0.24, h = 0.06, knit = true, seed = 3) {
  const g = G();
  const m = fabric(knit ? '#ffffff' : color, knit ? { map: knitTexture(color, seed) } : {});
  g.add(mesh(rbox(w, h * 0.55, d, h * 0.25, 3), m, 0, h * 0.28, 0));
  g.add(mesh(rbox(w * 0.96, h * 0.5, d * 0.92, h * 0.24, 3), m, 0.005, h * 0.76, -0.006));
  shade(g); return g;
}

// ------------------------------------------------------------------ small events
export function pizzaBox() {
  const g = G();
  const m = std('#a8865c', 0.9, { bumpMap: linenBump(90), bumpScale: 0.2 });
  g.add(mesh(rbox(0.33, 0.04, 0.33, 0.005), m, 0, 0.02, 0));
  const lid = mesh(new THREE.BoxGeometry(0.33, 0.004, 0.33), m, 0, 0.04, -0.165); lid.geometry.translate(0, 0, 0.165); lid.rotation.x = -0.55; g.add(lid);
  shade(g); g.add(contact(0.4, 0.4, 0.4, 0.001));
  return g;
}
export function sketchbook() {
  const g = G();
  const [c, x] = canvas(256, 180); const r = rng(17);
  x.fillStyle = '#f1ebdf'; x.fillRect(0, 0, 256, 180);
  x.strokeStyle = 'rgba(40,35,30,0.55)'; x.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) { x.beginPath(); const y0 = 40 + r() * 100; x.moveTo(140 + r() * 20, y0); x.bezierCurveTo(170, y0 - 30 * r(), 200, y0 + 20 * r(), 240, y0 - 10); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(127, 0, 2, 180);
  const p = mesh(new THREE.PlaneGeometry(0.3, 0.21).rotateX(-Math.PI / 2), std('#ffffff', 0.9, { map: toTex(c) }), 0, 0.012, 0);
  p.receiveShadow = true; g.add(p);
  g.add(mesh(rbox(0.31, 0.01, 0.22, 0.004), std('#2a2a2a', 0.7), 0, 0.005, 0));
  const pen = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 6), std('#c9a14a', 0.5), 0.1, 0.018, 0.13); pen.rotation.set(Math.PI / 2, 0, 0.4); pen.castShadow = true; g.add(pen);
  shade(g); return g;
}
export function cake(candles = 1) {
  const g = plate('#efe9df', 0.12);
  g.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 32), std('#efe0c8', 0.7), 0, 0.04, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.012, 32), std('#d8664a', 0.6), 0, 0.072, 0));
  const fl = new THREE.MeshBasicMaterial({ color: C('#ffcc80').multiplyScalar(12) });
  for (let i = 0; i < candles; i++) {
    const a = (i / candles) * Math.PI * 2, rr = candles === 1 ? 0 : 0.045;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    g.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.035, 6), std(['#3f8fd0', '#f2b437', '#e86fa0', '#5bb35a'][i % 4], 0.5), cx, 0.095, cz));
    const f = mesh(new THREE.SphereGeometry(0.003, 8, 6), fl, cx, 0.117, cz); f.scale.y = 2.2; g.add(f);
  }
  shade(g); return g;
}
export function suitcase(color = '#7f8e99') {
  // packed and standing by, closed
  const g = G();
  const m = std(color, 0.5);
  g.add(mesh(rbox(0.44, 0.62, 0.24, 0.035), m, 0, 0.33, 0));
  g.add(mesh(rbox(0.45, 0.03, 0.245, 0.01), std('#5d6a73', 0.5), 0, 0.33, 0));
  const h = mesh(new THREE.TorusGeometry(0.05, 0.009, 8, 16, Math.PI), std('#2a2a2a', 0.5), 0, 0.64, 0); g.add(h);
  for (const x of [-0.17, 0.17]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), std('#222', 0.6), x, 0.012, 0.08));
  shade(g); g.add(contact(0.6, 0.4, 0.55));
  return g;
}
export function paintJob() {
  const g = G();
  const sheet = mesh(new THREE.PlaneGeometry(0.7, 0.5, 8, 6).rotateX(-Math.PI / 2), std('#d9d4ca', 0.95, { side: THREE.DoubleSide }), 0, 0.003, 0);
  const sp = sheet.geometry.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, Math.max(0, Math.sin(sp.getX(i) * 13 + sp.getZ(i) * 7) * 0.006));
  sheet.geometry.computeVertexNormals(); sheet.receiveShadow = true; g.add(sheet);
  g.add(mesh(lathe([[0, 0], [0.09, 0], [0.09, 0.17], [0.092, 0.175], [0, 0.175]], 32), std('#c9ccd0', 0.35, { metalness: 0.7 }), 0.12, 0.003, 0.05));
  g.add(mesh(new THREE.CircleGeometry(0.085, 24).rotateX(-Math.PI / 2), std('#e6dfd6', 0.5), 0.12, 0.18, 0.05));
  const br = mesh(rbox(0.05, 0.012, 0.2, 0.004), std('#8a6a4a', 0.6), -0.14, 0.01, -0.05); br.rotation.y = 0.6; g.add(br);
  shade(g); return g;
}
export function napkin(color = '#e9e2d4', seed = 1) {
  const g = G();
  const geo = new THREE.SphereGeometry(0.05, 12, 8); const p = geo.attributes.position; const r = rng(seed);
  for (let i = 0; i < p.count; i++) { const k = 0.7 + r() * 0.5; p.setXYZ(i, p.getX(i) * k * 1.3, Math.max(0, p.getY(i)) * k * 0.5, p.getZ(i) * k); }
  geo.computeVertexNormals();
  g.add(mesh(geo, std(color, 0.95))); shade(g);
  return g;
}
export function plateStack(n = 4) {
  const g = G();
  for (let i = 0; i < n; i++) { const pl = plate('#efe9df', 0.13); pl.position.set((i % 2) * 0.006, i * 0.012, 0); pl.rotation.y = i; g.add(pl); }
  const k = mesh(new THREE.BoxGeometry(0.012, 0.003, 0.2), std('#c9c9c9', 0.25, { metalness: 0.9 }), 0.02, n * 0.012 + 0.012, 0); k.rotation.y = 0.4; g.add(k);
  return g;
}
export function openBook(color = '#5a3a2a') {
  const g = G();
  const page = std('#efe8d8', 0.9);
  for (const s of [-1, 1]) {
    const pg = mesh(rbox(0.14, 0.012, 0.2, 0.004), page, s * 0.072, 0.01, 0); pg.rotation.z = s * -0.06; g.add(pg);
  }
  g.add(mesh(rbox(0.3, 0.006, 0.21, 0.003), std(color, 0.7), 0, 0.003, 0));
  shade(g); g.add(contact(0.36, 0.28, 0.35, 0.001));
  return g;
}
export function bouquet(cols = ['#e9b4b0', '#f6f1e8', '#d98a6a', '#c9a0b4']) {
  // garden flowers among the eucalyptus: small heads at different heights, a few still closed
  const g = vaseStems('euc', 0.6);
  const r = rng(cols.length * 7 + 3);
  for (let i = 0; i < 11; i++) {
    const a = r() * 6.28, lean = 0.04 + r() * 0.12, L = 0.26 + r() * 0.18;
    const tip = [Math.cos(a) * lean, 0.2 + L, Math.sin(a) * lean];
    g.add(mesh(tube([[0, 0.05, 0], [tip[0] * 0.5, 0.2 + L * 0.55, tip[2] * 0.5], tip], 0.002, 10, 4), std('#5d6b52', 0.6)));
    const bud = r() < 0.25, rad = bud ? 0.01 : 0.016 + r() * 0.012;
    const head = mesh(new THREE.SphereGeometry(rad, 12, 8), std(cols[i % cols.length], 0.85), ...tip);
    head.scale.set(1, bud ? 1.5 : 0.6, 1); head.rotation.set(r() - 0.5, 0, r() - 0.5); head.castShadow = true; g.add(head);
    if (!bud) { const c = mesh(new THREE.SphereGeometry(rad * 0.35, 8, 6), std('#e0c060', 0.7), tip[0], tip[1] + rad * 0.45, tip[2]); g.add(c); }
  }
  return g;
}
// faint lighter patch + tape residue where a drawing once hung
export function wallTrace(w = 0.22, h = 0.165) {
  const g = G();
  g.add(mesh(new THREE.PlaneGeometry(w, h), std('#fff8ee', 0.92, { transparent: true, opacity: 0.07, depthWrite: false }), 0, 0, 0.0015));
  for (const s of [-1, 1]) g.add(mesh(new THREE.PlaneGeometry(0.035, 0.012), std('#c9b58a', 0.6, { transparent: true, opacity: 0.35, depthWrite: false }), s * (w / 2 - 0.02), h / 2 - 0.01, 0.0018));
  return g;
}

// ================================================================== meals, drinks, evenings
const food = (c, r = 0.7) => std(c, r);
const cutlery = () => std('#c9c9c9', 0.25, { metalness: 0.9 });
function fork(g, x, z, ry = 0) { const f = mesh(rbox(0.012, 0.004, 0.17, 0.002, 1), cutlery(), x, 0.003, z); f.rotation.y = ry; f.castShadow = true; g.add(f); }
function knife(g, x, z, ry = 0) { const k = mesh(rbox(0.014, 0.003, 0.2, 0.002, 1), cutlery(), x, 0.003, z); k.rotation.y = ry; k.castShadow = true; g.add(k); }
// a plate with something on it; cutlery inside the plate's own footprint so it never touches neighbours
export function plateWith(kind, r = 0.13, seed = 1) {
  const g = plate('#efe9df', r);
  const R = rng(seed);
  const top = 0.018;
  if (kind === 'pasta') {
    for (let i = 0; i < 14; i++) { const t = mesh(new THREE.TorusGeometry(0.014 + R() * 0.008, 0.004, 6, 14), food('#e8c27a', 0.6), (R() - 0.5) * 0.07, top + 0.026 + R() * 0.01, (R() - 0.5) * 0.07); t.rotation.set(R() * 3, R() * 3, R() * 3); g.add(t); }
    g.add(mesh(new THREE.SphereGeometry(0.02, 10, 8), food('#b8402a', 0.5), 0.01, top + 0.02, 0));
  } else if (kind === 'roast') {
    const m = mesh(rbox(0.07, 0.025, 0.05, 0.01, 2), food('#7a4a2a', 0.6), -0.02, top + 0.012, 0.01); m.rotation.y = 0.4; g.add(m);
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.015, 10, 8), food('#d9b26a'), 0.04, top + 0.012, -0.03 + i * 0.03));
    for (let i = 0; i < 5; i++) { const b = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6), food('#4f7a36'), -0.03 + i * 0.01, top + 0.004, -0.05); b.rotation.set(Math.PI / 2, 0, 0.3); g.add(b); }
  } else if (kind === 'salad') {
    for (let i = 0; i < 12; i++) { const l = mesh(new THREE.SphereGeometry(0.016, 8, 6), food(R() < 0.7 ? '#6f9a48' : '#c9402a', 0.7), (R() - 0.5) * 0.09, top + 0.008, (R() - 0.5) * 0.09); l.scale.y = 0.35; g.add(l); }
  } else if (kind === 'toast') {
    for (let i = 0; i < 2; i++) { const t = mesh(rbox(0.07, 0.012, 0.07, 0.008, 2), food('#d9a35a', 0.85), -0.02 + i * 0.05, top + 0.006 + i * 0.008, i * 0.02); t.rotation.y = i * 0.5; g.add(t); }
  } else if (kind === 'croissants') {
    for (let i = 0; i < 3; i++) { const c = mesh(new THREE.TorusGeometry(0.03, 0.014, 8, 14, Math.PI * 1.2), food('#d0903e', 0.55), (i - 1) * 0.06, top + 0.012, (i % 2) * 0.03); c.rotation.x = Math.PI / 2; c.rotation.z = i; g.add(c); }
  } else if (kind === 'cake') {
    const w = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.045, 16, 1, false, 0, 0.9), food('#efe0c8', 0.7), 0, top + 0.022, 0); g.add(w);
  } else if (kind === 'remnants') {
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.005, 6, 4), food('#b8862a'), (R() - 0.5) * 0.1, top + 0.003, (R() - 0.5) * 0.1));
  } else if (kind === 'kid') { // plastic plate look: coloured rim, small pieces
    for (let i = 0; i < 5; i++) g.add(mesh(rbox(0.018, 0.012, 0.018, 0.004, 1), food(['#e8c27a', '#6f9a48', '#e07a22'][i % 3]), (R() - 0.5) * 0.08, top + 0.006, (R() - 0.5) * 0.08));
  }
  if (kind !== 'kid' && kind !== 'remnants' && kind !== 'croissants' && kind !== 'cake') { fork(g, -r * 0.62, 0, 0.1); knife(g, r * 0.62, 0, -0.08); }
  if (kind === 'remnants') { fork(g, 0.02, 0.01, 0.9); knife(g, 0.03, -0.02, 0.8); }
  shade(g); return g;
}
export function bowlWith(kind, seed = 1) {
  const g = bowl(kind === 'soup' ? '#e6ddcf' : '#f0ebe2', 0.075, 0.05);
  const R = rng(seed);
  if (kind === 'soup') g.add(mesh(new THREE.CircleGeometry(0.06, 24).rotateX(-Math.PI / 2), food('#d9823a', 0.3), 0, 0.038, 0));
  if (kind === 'cereal') {
    g.add(mesh(new THREE.CircleGeometry(0.06, 24).rotateX(-Math.PI / 2), food('#f4f1ea', 0.3), 0, 0.036, 0));
    for (let i = 0; i < 16; i++) { const c = mesh(new THREE.TorusGeometry(0.006, 0.003, 5, 8), food('#d9a35a'), (R() - 0.5) * 0.08, 0.04, (R() - 0.5) * 0.08); c.rotation.x = Math.PI / 2; g.add(c); }
  }
  const sp = mesh(rbox(0.012, 0.004, 0.13, 0.002, 1), cutlery(), 0.05, 0.05, 0.02); sp.rotation.set(0.35, 0.4, 0); sp.castShadow = true; g.add(sp);
  return g;
}
export function servingDish(kind, seed = 1) {
  const g = G(); const R = rng(seed);
  if (kind === 'casserole') {
    g.add(mesh(lathe([[0, 0], [0.12, 0], [0.13, 0.05], [0.125, 0.055], [0, 0.055]], 32), glazed('#d8cfc0'), 0, 0, 0)).children[0].scale.set(1, 1, 0.7);
    const top = mesh(new THREE.CircleGeometry(0.115, 28).rotateX(-Math.PI / 2), food('#a8642a', 0.5), 0, 0.052, 0); top.scale.set(1, 1, 0.7); g.add(top);
  } else if (kind === 'saladBowl') {
    g.add(bowl('#6a8a8a', 0.12, 0.08));
    for (let i = 0; i < 20; i++) { const l = mesh(new THREE.SphereGeometry(0.02, 8, 6), food(R() < 0.8 ? '#6f9a48' : '#c9402a'), (R() - 0.5) * 0.14, 0.07 + R() * 0.02, (R() - 0.5) * 0.14); l.scale.y = 0.4; g.add(l); }
  } else if (kind === 'bread') {
    g.add(mesh(rbox(0.3, 0.018, 0.18, 0.006, 2), std('#ffffff', 0.6, { map: woodTexture([30, 40, 55], 71, 256, 30) }), 0, 0.009, 0));
    const loaf = mesh(new THREE.CapsuleGeometry(0.045, 0.12, 6, 12), food('#b8783a', 0.8), -0.04, 0.05, 0); loaf.rotation.z = Math.PI / 2; loaf.scale.y = 0.75; g.add(loaf);
    for (let i = 0; i < 2; i++) { const s = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), food('#ecd9b0', 0.9), 0.09 + i * 0.018, 0.035, 0); s.rotation.z = Math.PI / 2 - 0.4; g.add(s); }
  } else if (kind === 'cheese') {
    g.add(mesh(rbox(0.28, 0.018, 0.2, 0.006, 2), std('#ffffff', 0.6, { map: woodTexture([28, 35, 50], 72, 256, 30) }), 0, 0.009, 0));
    for (let i = 0; i < 3; i++) { const c = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 3), food(['#f2d27a', '#efe6c8', '#e8b85a'][i]), -0.07 + i * 0.07, 0.036, (i % 2) * 0.04 - 0.02); c.rotation.y = R() * 3; g.add(c); }
    for (let i = 0; i < 9; i++) g.add(mesh(new THREE.SphereGeometry(0.011, 8, 6), food('#6a3a5a', 0.3), 0.08 + (R() - 0.5) * 0.06, 0.03, 0.05 + (R() - 0.5) * 0.05));
  } else if (kind === 'chips') {
    g.add(bowl('#e0d6c4', 0.09, 0.06));
    for (let i = 0; i < 22; i++) { const c = mesh(new THREE.CircleGeometry(0.014, 8), food('#e8c070', 0.6), (R() - 0.5) * 0.1, 0.05 + R() * 0.02, (R() - 0.5) * 0.1); c.rotation.set(R() * 3, R() * 3, 0); g.add(c); }
  }
  shade(g); g.add(contact(0.32, 0.26, 0.4, 0.001));
  return g;
}
export function pizzaOpen(slicesLeft = 5) {
  const g = G();
  const m = std('#a8865c', 0.9, { bumpMap: linenBump(90), bumpScale: 0.2 });
  g.add(mesh(rbox(0.33, 0.04, 0.33, 0.005), m, 0, 0.02, 0));
  const lid = mesh(new THREE.BoxGeometry(0.33, 0.004, 0.33), m, 0, 0.04, -0.165); lid.geometry.translate(0, 0, 0.165); lid.rotation.x = -0.55; g.add(lid);
  // the pizza, some slices already gone
  const ang = (slicesLeft / 8) * Math.PI * 2;
  g.add(mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.012, 40, 1, false, 0.4, ang), food('#d8a050', 0.8), 0, 0.046, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.004, 40, 1, false, 0.4, ang), food('#c0442a', 0.5), 0, 0.054, 0));
  const R = rng(4);
  for (let i = 0; i < 22; i++) { const a = 0.4 + R() * ang, rr = 0.03 + R() * 0.09; g.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 10), food(R() < 0.5 ? '#f2e2b0' : '#5a2a1a', 0.6), Math.sin(a) * rr, 0.058, Math.cos(a) * rr)); }
  shade(g); g.add(contact(0.42, 0.42, 0.4, 0.001));
  return g;
}
export function pizzaClosed() {
  const g = G(); const m = std('#a8865c', 0.9, { bumpMap: linenBump(91), bumpScale: 0.2 });
  g.add(mesh(rbox(0.33, 0.045, 0.33, 0.005), m, 0, 0.0225, 0)); shade(g); g.add(contact(0.42, 0.42, 0.4, 0.001)); return g;
}
export function noodleBox(seed = 1) {
  const g = G();
  const geo = new THREE.CylinderGeometry(0.055, 0.04, 0.1, 4, 1, false, Math.PI / 4); geo.translate(0, 0.05, 0);
  g.add(mesh(geo, std('#f2eee6', 0.8)));
  const st = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.22, 5), std('#c9a46a', 0.6), 0.01, 0.13, 0); st.rotation.z = 0.25 + seed * 0.1; g.add(st);
  const st2 = st.clone(); st2.position.x = 0.02; st2.rotation.z = 0.3 + seed * 0.1; g.add(st2);
  shade(g); g.add(contact(0.13, 0.13, 0.4, 0.001)); return g;
}
export function waterGlass(level = 0.65, tint = null) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.032, 0], [0.036, 0.11], [0.034, 0.11], [0.03, 0.006], [0, 0.006]], 28), glassMat()));
  if (level > 0) g.add(mesh(new THREE.CylinderGeometry(0.031, 0.029, 0.1 * level, 24), new THREE.MeshPhysicalMaterial({ color: C(tint || '#dfeef0'), roughness: 0.05, transparent: true, opacity: tint ? 0.85 : 0.25, depthWrite: false }), 0, 0.006 + 0.05 * level, 0));
  g.add(contact(0.1, 0.1, 0.3, 0.001)); return g;
}
export function carafe() {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.055, 0], [0.06, 0.08], [0.045, 0.16], [0.03, 0.22], [0.033, 0.24], [0, 0.24]], 32), glassMat()));
  g.add(mesh(new THREE.CylinderGeometry(0.054, 0.056, 0.11, 24), new THREE.MeshPhysicalMaterial({ color: C('#dfeef0'), roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }), 0, 0.06, 0));
  g.add(contact(0.16, 0.16, 0.35, 0.001)); return g;
}
export function beer(full = true) {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.03, 0], [0.031, 0.13], [0.014, 0.18], [0.012, 0.22], [0, 0.22]], 24), new THREE.MeshPhysicalMaterial({ color: C('#5a2e10'), roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92 })));
  g.add(mesh(new THREE.CylinderGeometry(0.0315, 0.0315, 0.06, 24, 1, true), std(full ? '#e9dcc2' : '#d9cbb0', 0.8), 0, 0.07, 0));
  shade(g); g.add(contact(0.1, 0.1, 0.45, 0.001)); return g;
}
export function sodaCan(color = '#c4302a') {
  const g = G();
  g.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 24), std(color, 0.35, { metalness: 0.5 }), 0, 0.06, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.006, 24), std('#cfcfcf', 0.3, { metalness: 0.9 }), 0, 0.123, 0));
  shade(g); g.add(contact(0.1, 0.1, 0.4, 0.001)); return g;
}
export function milkCarton() {
  const g = G();
  g.add(mesh(rbox(0.07, 0.17, 0.07, 0.004), std('#f2f0ea', 0.6), 0, 0.085, 0));
  const roof = mesh(new THREE.CylinderGeometry(0.0, 0.05, 0.04, 4, 1), std('#f2f0ea', 0.6), 0, 0.19, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.3; g.add(roof);
  g.add(mesh(new THREE.PlaneGeometry(0.06, 0.07), std('#3f8fd0', 0.6), 0, 0.09, 0.0352));
  shade(g); g.add(contact(0.11, 0.11, 0.45, 0.001)); return g;
}
export function cupSaucer(color = '#f1ece2', drink = '#5a3220') {
  const g = G();
  g.add(mesh(lathe([[0, 0], [0.06, 0], [0.065, 0.008], [0.06, 0.01], [0, 0.01]], 32), glazed(color)));
  g.add(mesh(lathe([[0, 0.01], [0.03, 0.01], [0.04, 0.065], [0.037, 0.065], [0.028, 0.016], [0, 0.016]], 28), glazed(color)));
  g.add(mesh(new THREE.CircleGeometry(0.036, 20).rotateX(-Math.PI / 2), std(drink, 0.15), 0, 0.055, 0));
  const h = mesh(new THREE.TorusGeometry(0.015, 0.004, 6, 12, Math.PI * 1.3), glazed(color), 0.042, 0.042, 0); h.rotation.z = -1.9; g.add(h);
  shade(g); g.add(contact(0.15, 0.15, 0.35, 0.001)); return g;
}
export function teapot(color = '#4f6a6a') {
  const g = G(); const m = glazed(color);
  g.add(mesh(lathe([[0, 0], [0.06, 0], [0.085, 0.05], [0.08, 0.1], [0.05, 0.13], [0.02, 0.135], [0, 0.135]], 32), m));
  g.add(mesh(new THREE.SphereGeometry(0.013, 10, 8), m, 0, 0.145, 0));
  g.add(mesh(tube([[0.075, 0.05, 0], [0.12, 0.09, 0], [0.14, 0.12, 0]], 0.009, 8, 6), m));
  const h = mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 14, Math.PI), m, -0.085, 0.075, 0); h.rotation.z = Math.PI / 2; g.add(h);
  shade(g); g.add(contact(0.26, 0.2, 0.45, 0.001)); return g;
}
export function napkinFolded(color = '#e9e2d4') { const g = G(); g.add(mesh(rbox(0.1, 0.012, 0.1, 0.005, 2), fabric(color), 0, 0.006, 0)); shade(g); return g; }
export function cards(seed = 2) {
  const g = G(); const R = rng(seed);
  const back = std('#8a2a2a', 0.6), face = std('#f2eee6', 0.6);
  for (let i = 0; i < 9; i++) { const c = mesh(rbox(0.06, 0.002, 0.09, 0.003, 1), R() < 0.6 ? face : back, (R() - 0.5) * 0.24, 0.001 + i * 0.0021, (R() - 0.5) * 0.16); c.rotation.y = R() * 3; c.receiveShadow = true; g.add(c); }
  g.add(mesh(rbox(0.065, 0.025, 0.095, 0.004, 1), back, 0.16, 0.0125, 0.1));
  shade(g); return g;
}
export function boardGame(seed = 3) {
  const [c, x] = canvas(256);
  x.fillStyle = '#e9dcc0'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { if ((i + j) % 2) { x.fillStyle = '#5a3a2a'; x.fillRect(16 + i * 28, 16 + j * 28, 28, 28); } }
  const g = G();
  g.add(mesh(rbox(0.34, 0.016, 0.34, 0.004, 2), std('#ffffff', 0.6, { map: toTex(c) }), 0, 0.008, 0));
  const R = rng(seed);
  for (let i = 0; i < 14; i++) g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16), std(i % 2 ? '#1f1f1f' : '#f2eee6', 0.35), (Math.floor(R() * 8) - 3.5) * 0.0375, 0.02, (Math.floor(R() * 8) - 3.5) * 0.0375));
  shade(g); g.add(contact(0.42, 0.42, 0.4, 0.001));
  return g;
}
export function pregnancyTest() {
  const g = G();
  const tissue = mesh(new THREE.PlaneGeometry(0.16, 0.12, 4, 3).rotateX(-Math.PI / 2), fabric('#f6f4ef'), 0, 0.002, 0); tissue.receiveShadow = true; g.add(tissue);
  const t = mesh(rbox(0.13, 0.012, 0.024, 0.005, 2), std('#f8f8f6', 0.4), 0, 0.009, 0); t.rotation.y = 0.25; g.add(t);
  const win = mesh(new THREE.PlaneGeometry(0.022, 0.009).rotateX(-Math.PI / 2), std('#e0a0b0', 0.5), 0.0, 0.0152, 0); win.rotation.y = 0.25; g.add(win);
  shade(g); return g;
}
export function babyThings() {
  const g = G();
  g.add(foldedCloth('#cfe0e8', 0.16, 0.13, 0.04, false, 21));
  const f2 = foldedCloth('#f2d8c8', 0.14, 0.12, 0.035, false, 22); f2.position.y = 0.042; f2.rotation.y = 0.3; g.add(f2);
  for (const s of [-1, 1]) { const b = mesh(new THREE.SphereGeometry(0.022, 12, 10), fabric('#f4efe6', { map: knitTexture('#f4efe6', 23) }), 0.14 + s * 0.026, 0.016, 0.03); b.scale.set(0.8, 0.7, 1.3); b.castShadow = true; g.add(b); }
  return g;
}
export function kidCup() { const g = G(); g.add(mesh(lathe([[0, 0], [0.028, 0], [0.032, 0.07], [0, 0.07]], 20), std('#5bb35a', 0.4))); shade(g); g.add(contact(0.08, 0.08, 0.3, 0.001)); return g; }
export function phone() { const g = G(); g.add(mesh(rbox(0.072, 0.008, 0.148, 0.008, 2), std('#1d1d20', 0.25, { metalness: 0.3 }), 0, 0.004, 0)); shade(g); return g; }
export function speaker() { const g = G(); g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 28), fabric('#6a6a6e', { bumpMap: linenBump(95), bumpScale: 0.6 }), 0, 0.06, 0)); shade(g); return g; }
export function sailboatModel() {
  const g = G(); const w = std('#8a5a3a', 0.5);
  const hull = mesh(new THREE.CapsuleGeometry(0.018, 0.13, 4, 10), w, 0, 0.045, 0); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.8); g.add(hull);
  g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.17, 6), w, 0, 0.135, 0));
  const sail = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, 0.14)])), std('#efe6d6', 0.8, { side: THREE.DoubleSide }), 0.004, 0.07, 0); g.add(sail);
  g.add(mesh(rbox(0.06, 0.012, 0.03, 0.004, 1), w, 0, 0.006, 0));
  shade(g); return g;
}
export function carvedBird() {
  const g = G(); const w = std('#6a4a2e', 0.45);
  const b = mesh(new THREE.SphereGeometry(0.03, 16, 12), w, 0, 0.03, 0); b.scale.set(1.4, 0.9, 0.9); g.add(b);
  g.add(mesh(new THREE.SphereGeometry(0.016, 12, 10), w, 0.035, 0.05, 0));
  const tail = mesh(new THREE.ConeGeometry(0.012, 0.04, 8), w, -0.045, 0.04, 0); tail.rotation.z = 1.9; g.add(tail);
  shade(g); return g;
}
export function wovenArt(seed = 5) {
  const [c, x] = canvas(256, 320); const R = rng(seed);
  x.fillStyle = '#d9c4a0'; x.fillRect(0, 0, 256, 320);
  const cols = ['#a8452f', '#2f4858', '#c99a42', '#5d6f5a', '#efe6d6'];
  for (let y = 0; y < 320; y += 10 + R() * 18) { x.fillStyle = cols[Math.floor(R() * cols.length)]; x.fillRect(0, y, 256, 6 + R() * 10); for (let k = 0; k < 6; k++) { x.fillStyle = cols[Math.floor(R() * cols.length)]; x.beginPath(); x.moveTo(R() * 256, y); x.lineTo(R() * 256, y + 14); x.lineTo(R() * 256, y + 7); x.fill(); } }
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(0,0,0,${R() * 0.12})`; x.fillRect(R() * 256, R() * 320, 2, 1); }
  return toTex(c);
}
