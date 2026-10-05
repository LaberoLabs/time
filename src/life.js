// The story, told only through things in the room.
//   25  one person: one chair, one glass, one coat, a small plant, half-empty shelves
//   27+ someone visits, then stays: a second glass, coat, chair, books, a throw, art
//   32+ the wine stops; tea. A basket by the bed. Then a high chair, bottles, toys
//   36+ drawings, marks on the wall, scuffs, a bike, a ball that wanders
//   41+ homework, the child's own chair and coat; the wine glasses come back
import * as THREE from 'three';
import { Life } from './lifecore.js';
import { TABLE } from './room.js';
import * as O from './objects.js';
import { heroPlant, ivy, olive } from './plants.js';
import { std, mesh, C } from './build.js';
import { inkPrint, abstractPrint, photoTexture, childDrawing, rugTexture2, BOOK_COLORS, KID_BOOK_COLORS, canvas, toTex } from './tex.js';
import { rng, smooth, keys, clamp, lerp, noise1, iv, union, subtract } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the grown child, coming home: short stays, more often after 77
const LOSS = 73.5; // the last evening with two glasses
const VISITS = [[56.2, 56.5], [60.1, 60.4], [64.3, 64.6], [66.0, 66.35], [67.2, 67.55], [68.5, 68.85], [70.1, 70.4], [73.6, 73.9], [77.0, 77.6], [78.4, 78.8], [80.4, 80.8], [83.1, 83.5], [85.6, 85.9], [88.2, 88.5]].map(([a, b]) => [a, b, 0.1, 0.1]);
const VISITS_SHOES = [[36.1, 52.4, 0.4, 0.4], ...VISITS.filter(([a]) => a < LOSS)];
const END = 89.6; // the last things put down are never picked up again
// evenings with friends, once the child has left: [start]; dinner lasts 0.2y, the late-evening traces 0.1y
const DINNERS = [53.7, 54.6, 57.0, 58.2, 59.3, 60.7];
const DIN = DINNERS.map((d) => [d, d + 0.32, 0.06, 0.04]);
const AFTER = DINNERS.map((d) => [d + 0.33, d + 0.5, 0.04, 0.06]);
const BOTH = DINNERS.map((d) => [d, d + 0.5, 0.06, 0.06]);
// cut windows out of a presence span (things cleared off the table for dinners)
const minus = (a, b, holes) => { const out = []; let s = a; for (const [h0, h1] of holes) { if (h1 < s || h0 > b) continue; out.push([s, h0, 0.4, 0.03]); s = h1; } out.push([s, b, 0.04, 0.4]); return out; };
const HOLES = DINNERS.map((d) => [d - 0.05, d + 0.56]);
// birthdays: an afternoon with cake and tea
const BIRTHDAYS = Array.from({ length: 11 }, (_, k) => 34.7 + k);
const BDAY = BIRTHDAYS.map((b) => [b, b + 0.32]);
const BDAY_H = BIRTHDAYS.map((b) => [b - 0.04, b + 0.36]);
const TRIPS = [55.15, 63.35, 71.5];
// what is drunk at the table depends on the years: wine evenings, tea years, and scenes in between
const VPRE = VISITS.filter(([a]) => a < LOSS).map(([a, b]) => [a, b]);
const VPOST = VISITS.filter(([a]) => a > LOSS).map(([a, b]) => [a, b]);
const pad = (l, p = 0.04) => l.map(([a, b]) => [a - p, b + p]);
const GLASS1 = subtract(union(iv([[-Infinity, 32.35], [41.8, 61.1], [LOSS + 0.5, 79.0]]), iv(VPRE, 0.1, 0.1)), [...BDAY_H, ...pad(VPOST)]);
const GLASS2 = subtract(union(iv([[26.6, 26.9], [27.25, 27.55]], 0.12, 0.12), iv([[27.85, 32.35], [41.85, 61.1]]), iv(VPRE.filter(([a]) => a < LOSS), 0.1, 0.1)), BDAY_H);
const MUG1 = subtract(union(iv([[32.3, 41.7], [61.2, LOSS], [79.2, 89.6]]), iv(BDAY, 0.05, 0.05), iv(VPOST, 0.1, 0.1)), [...pad(VPRE), ...HOLES]);
const MUG2 = subtract(union(iv([[37.6, 41.7], [61.2, LOSS]]), iv(BDAY.filter(([a]) => a > 37.6), 0.05, 0.05)), [...pad(VPRE), ...HOLES]);
// moments where time should slow so they can be seen (consumed by main.js scroll mapping)
export const BEATS = [
  [25.35, 25.75, 4], [28.85, 29.3, 4], ...BDAY.map(([a, b]) => [a, b, 5]), [49.6, 50.25, 3], [51.9, 53.0, 2.5],
  ...BOTH.map(([a, b]) => [a, b, 5]), ...TRIPS.map((t) => [t, t + 0.35, 4]), ...VISITS.map(([a, b]) => [a, b, 3]),
  [73.1, 74.2, 3], [89.3, 90.0, 6],
];

export function buildLife(scene, ctx) {
  const life = new Life(scene);
  const add = (obj, x, y, z, o = {}) => { obj.position.set(x, y, z); if (o.ry !== undefined) obj.rotation.y = o.ry; return life.add(obj, o); };
  const T = TABLE, ty = T.y;
  const extras = []; // custom per-frame updaters

  // ================================================================ chairs
  const chairA = add(O.chairSpindle(), T.x - 0.15, 0, T.z - 0.78, {
    ry: 0.05,
    wob: { p: 0.05, r: 0.12, f: 1.1, seed: 11 },
  });
  const chairB = add(O.chairLadder(), T.x - 1.16, 0, T.z + 0.04, {
    in: 28.15, fi: 0.5, ry: Math.PI / 2 - 0.1, settle: [-0.25, 0, 0.1],
    wob: { p: 0.06, r: 0.14, f: 1.0, seed: 23, until: LOSS },
  });
  const kc = O.kidChair();
  const kidChair = add(kc.g, T.x - 0.28, 0, T.z + 0.8, {
    spans: [[34.1, 48.2, 0.5, 0.4]],
    ry: Math.PI + 0.06, settle: [0, 0, 0.25],
    wob: { p: 0.03, r: 0.06, f: 0.9, seed: 5 },
    update(age) {
      // baby guard and tray come off at ~37.5; seat lowers as the child grows
      const off = smooth(37.3, 37.7, age);
      kc.guard.visible = off < 0.99;
      kc.guard.position.y = off * 0.05; kc.guard.position.z = off * 0.12;
      kc.guard.traverse((m) => { if (m.isMesh) m.material.opacity *= 1 - off; });
      kc.seat.position.y = lerp(0.62, 0.52, smooth(39, 42, age));
    },
  });

  // ================================================================ coats (draped over chair backs) and bags
  const coat1 = add(O.garment('#8a5a3a', { seed: 1 }), 0, 0.95, -0.21, { follow: chairA, out: 59.6, fo: 0.3, settle: [0, 0.05, 0] });
  add(O.garment('#4f5a66', { seed: 6, back: 0.42 }), 0, 0.95, -0.21, { follow: chairA, in: 60.0, fi: 0.3, out: END, fo: 0.25, settle: [0, 0.05, 0] }); // the coat, replaced
  const scarf = add(O.garment('#b5523b', { w: 0.17, r: 0.092, front: 0.2, back: 0.3, knit: true, sleeves: false, bulge: 0.004, seed: 4 }), 0.05, 0.95, -0.21, { follow: chairA, in: 30.6, out: END, fo: 0.25, settle: [0, 0.04, 0] });
  const coat2 = add(O.garment('#b7a48a', { seed: 2, knit: true, back: 0.34, front: 0.12, lean: 0, r: 0.05 }), 0, 0.935, -0.185, { follow: chairB, in: 28.3, out: LOSS + 3.0, fo: 0.3, settle: [0, 0.05, 0] });
  // afterwards it is folded and left on their seat for a while
  add(O.foldedCloth('#b7a48a', 0.3, 0.24, 0.06, true, 9), 0, 0.48, 0.02, { follow: chairB, in: LOSS + 3.25, out: 80.0, fi: 0.25, fo: 0.4, settle: [0, 0.04, 0] });
  const kidCoat = add(O.garment('#d9a22a', { seed: 3, w: 0.32, back: 0.3, front: 0.11, r: 0.055, lean: 0.38 }), 0, 0.925, -0.175, { follow: kidChair, in: 38.8, out: 41.4, settle: [0, 0.05, 0] });
  add(O.backpack('#c4532e'), 0.42, 0.42, 0.05, { follow: kidChair, in: 40.6, out: 47.6, settle: [0, 0.05, 0] });

  // ================================================================ table top
  const glass1 = add(O.wineGlass(0.6), T.x + 0.15, ty, T.z - 0.28, {
    spans: GLASS1,
    path: [[25, [T.x + 0.15, ty, T.z - 0.3]], [27.5, [T.x + 0.08, ty, T.z - 0.3]], [41.7, [T.x + 0.06, ty, T.z - 0.32]]],
    wob: { p: 0.02, r: 0, f: 2.2, seed: 3 },
    update(age, p, o) { const w = o.userData.wine; if (w) { w.visible = age < 79.3; w.material.opacity *= 1 - smooth(79.0, 79.3, age); } }, // no more wine
  });
  // the second glass: a visit, another visit, then always
  const glass2 = add(O.wineGlass(0.45), T.x - 0.66, ty, T.z - 0.2, {
    spans: GLASS2,
    wob: { p: 0.03, r: 0, f: 2.0, seed: 4 },
  });
  add(O.bottle(), T.x + 0.38, ty, T.z - 0.18, { in: 28.6, out: 32.2, wob: { p: 0.04, r: 0.3, f: 1.6, seed: 8 } });
  add(O.vaseStems('dried'), T.x + 0.68, ty, T.z - 0.24, { in: 28.4, out: 31.3 });
  add(O.vaseStems('euc'), T.x + 0.7, ty, T.z - 0.3, { in: 42.1, out: 77.4, fo: 0.5,
    update(age, p, o) { const d = smooth(LOSS + 1.5, 77.2, age); o.traverse((m) => { if (m.isMesh && m.material.name === 'leaf') m.material.color.set('#8fa38f').lerp(C('#9a8a62'), d); }); } });
  const cnd = O.candle();
  add(cnd, T.x + 0.02, ty, T.z + 0.02, {
    in: 29.2,
    path: [[29, [T.x + 0.02, ty, T.z + 0.02]], [33.6, [T.x + 0.6, ty, T.z - 0.05]]], // moved away before the baby comes
    update(age, p, o) {
      const burnt = clamp((age - 29.2) / 60.8, 0, 1);
      const h = lerp(0.2, 0.032, Math.pow(burnt, 0.9));
      cnd.userData.wax.scale.y = h; cnd.userData.wax.position.y = 0.08 + h / 2;
      cnd.userData.wax.material.color.set('#efe6d6').lerp(C('#d9c9a8'), burnt);
      cnd.userData.flame.position.y = 0.08 + h + 0.012;
      const out = smooth(89.9, 89.985, age); // after the lamps
      cnd.userData.flame.material.opacity = p * (1 - out);
      cnd.userData.flame.visible = out < 0.999;
      cnd.userData.light.intensity = 0.25 * p * (1 - out);
    },
  });
  extras.push((age, t) => { if (cnd.visible) { const f = 1 + Math.sin(t * 11.0) * 0.05 + Math.sin(t * 17.3) * 0.04; cnd.userData.flame.scale.set(1, 2.4 * f, 1); } });

  // single person's table
  const lap = O.laptop();
  add(lap, T.x - 0.25, ty, T.z - 0.12, {
    ry: Math.PI + 0.08, out: 33.6,
    path: [[25, [T.x - 0.25, ty, T.z - 0.12], Math.PI + 0.08], [28.2, [T.x - 0.2, ty, T.z - 0.2], Math.PI - 0.15], [29.8, [T.x + 0.6, ty, T.z + 0.18], Math.PI + 0.5]],
    update(age) { lap.userData.lid.rotation.x = lerp(-0.28, -1.5, smooth(29.3, 29.5, age)); },
  });
  add(O.bookStack(['#2f4858', '#c9a46a', '#8a3b2c']), T.x + 0.62, ty, T.z + 0.2, { out: 29.6, ry: 0.3 });
  add(O.bookFlat('#d9cbb0', 0.14, 0.2, 0.02), T.x - 0.55, ty, T.z + 0.05, { in: 25, out: 27.6, ry: 0.5 });

  // dinners for two
  add(O.plate(), T.x - 0.15, ty, T.z - 0.22, { in: 30.0, out: 32.4 });
  add(O.plate(), T.x - 0.66, ty, T.z + 0.06, { in: 30.05, out: 32.4 });
  add(O.bowl('#c9bba8', 0.07, 0.045), T.x - 0.15, ty + 0.01, T.z - 0.22, { in: 30.1, out: 32.4 });
  add(O.bowl('#c9bba8', 0.07, 0.045), T.x - 0.66, ty + 0.01, T.z + 0.06, { in: 30.15, out: 32.4 });

  // the mug: tea instead of wine, then it simply stays for good
  add(O.mug('#e3dccf'), T.x - 0.46, ty, T.z - 0.3, {
    spans: MUG1,
    path: [[32, [T.x - 0.46, ty, T.z - 0.3]], [35, [T.x - 0.4, ty, T.z - 0.28], 1.2], [38, [T.x - 0.48, ty, T.z - 0.26], 2.1], [42, [T.x - 0.44, ty, T.z - 0.3], 0.4]],
    wob: { p: 0.02, r: 0.6, f: 2.4, seed: 31 },
  });
  add(O.mug('#3f5a6a'), T.x - 0.72, ty, T.z + 0.04, { spans: MUG2, wob: { p: 0.02, r: 0.8, f: 2.1, seed: 33 } });

  // the child at the table
  add(O.babyBottle(), T.x - 0.32, ty, T.z + 0.3, { in: 33.7, out: 35.3, wob: { p: 0.04, r: 0, f: 2.5, seed: 41 } });
  add(O.sippyCup(), T.x - 0.1, ty, T.z + 0.3, { in: 35.7, out: 39.2, wob: { p: 0.02, r: 0.5, f: 2.6, seed: 42 } });
  add(O.paperSheets([childDrawing('scribble', 71), childDrawing('house', 72), childDrawing('rainbow', 73)]), T.x - 0.5, ty, T.z + 0.22, { in: 36.2, out: 40.5, settle: [0, 0.01, 0] });
  add(O.fruitBowl(), T.x + 0.22, ty, T.z + 0.12, { spans: minus(36.6, LOSS + 0.8, HOLES) });
  add(O.tumbler('#f2a33a'), T.x - 0.08, ty, T.z + 0.32, { in: 40.1, out: 45.8, wob: { p: 0.015, r: 0, f: 2.2, seed: 43 } });
  add(O.bookStack(['#e2523a', '#3f8fd0'], 9), T.x - 0.42, ty, T.z + 0.22, { in: 40.6, out: 45.8, ry: -0.2 });
  add(O.pencilCase(), T.x - 0.28, ty, T.z + 0.4, { in: 40.8, out: 52.4, ry: 0 });

  // ================================================================ bed
  add(O.throwBlanket('#6a6560', 2, 0.42, 0.34, 0.07), -2.42, 0.64, 1.0, {
    ry: 0.4, settle: [0, 0.05, 0], out: END, fo: 0.25,
    path: [[25, [-2.42, 0.64, 1.0], 0.4], [29, [-3.3, 0.64, 1.5], 1.1]],
  });
  add(O.throwBlanket('#8a3f2a', 5, 0.9, 0.6, 0.07), -2.42, 0.645, 1.3, { in: 29.0, fi: 0.5, ry: 0.32, settle: [0, 0.08, 0],
    path: [[29, [-2.42, 0.645, 1.3], 0.32], [80.5, [-2.4, 0.65, 1.2], 0.6, 0.5]] }); // theirs; it stays
  add(O.cushion('#9a5b3e'), -3.15, 0.6, 0.62, { in: 30.6, ry: 0.15 });
  add(O.cushion('#6f7a5f', 0.38), -2.48, 0.6, 0.64, { in: 31.2, out: 77.5, ry: -0.2 });

  // ================================================================ nightstand
  add(O.bookFlat('#2f4858', 0.13, 0.19, 0.025), -1.6, 0.55, 0.3, { ry: 0.25, wob: { p: 0.02, r: 0.3, f: 1.5, seed: 51 } });
  add(O.bookFlat('#a8452f', 0.13, 0.2, 0.03), -1.6, 0.575, 0.3, { in: 28.6, out: 75.2, ry: -0.1, wob: { p: 0.02, r: 0.3, f: 1.3, seed: 52 } });
  add(O.babyMonitor(), -1.88, 0.55, 0.36, { in: 33.8, out: 37.4, ry: 0.3 });

  // ================================================================ floor: shoes, the cradle, toys
  add(O.shoes('sneaker', '#efeae2'), -1.85, 0, 0.68, { out: END, fo: 0.25, ry: -0.2, wob: { p: 0.012, r: 0.15, f: 1.3, seed: 61 } });
  add(O.shoes('boot', '#4a2e20'), -1.61, 0, 0.72, { in: 27.9, out: LOSS + 0.6, fo: 0.3, ry: 0.06, wob: { p: 0.01, r: 0.1, f: 1.2, seed: 62 } });
  add(O.shoes('sneaker', '#c9442e'), -1.73, 0, 1.1, { spans: VISITS_SHOES, ry: -0.35, scale: [[34.9, 0.42], [37, 0.55], [40, 0.68], [45, 0.86], [49, 1.02], [90, 1.04]], wob: { p: 0.012, r: 0.15, f: 1.4, seed: 63 } });

  add(O.mosesBasket(), -1.72, 0, 1.5, { in: 33.75, out: 35.6, fi: 0.5, fo: 0.5, ry: 0.08, settle: [0, 0, 0.2] });
  add(O.bunny(), -1.72, 0.61, 1.47, {
    in: 33.9, ry: 0.4, settle: [0, 0.05, 0],
    path: [[33.9, [-1.72, 0.61, 1.47], 0.4], [35.9, [-0.85, 0.014, 2.0], -0.6, 0.35], [37.0, [-0.6, 0.014, 2.1], 0.9, 0.3], [38.3, [-2.18, 0.6, 0.72], 0.2, 0.4], [53.0, [2.95, 2.335, 0.2], -0.3, 0.4]],
  });
  add(O.blocks(3), -0.7, 0.014, 2.35, {
    spans: [[35.3, 39.6, 0.4, 0.4], [66.05, 66.35, 0.12, 0.12], [67.25, 67.55, 0.12, 0.12], [68.55, 68.85, 0.12, 0.12], [70.15, 70.4, 0.12, 0.12]], settle: [0, 0.04, 0],
    path: [[35.3, [-0.7, 0.014, 2.35], 0], [36.1, [-1.2, 0.014, 2.9], 1.2], [37.0, [-1.1, 0.014, 2.2], 2.1], [38.6, [-1.25, 0.014, 2.5], 1.6], [66, [-0.85, 0.014, 2.5], 0.7], [68, [-0.5, 0.014, 2.2], 2.4]],
  });
  add(O.ball(['#d8432f', '#f4f1ea', '#3a7cc6'], 0.075), -0.3, 0.014, 2.1, {
    in: 36.0, out: 49.8,
    path: [[36, [-0.3, 0.014, 2.1]], [37, [0.6, 0.0, 1.5]], [38.2, [-1.2, 0.014, 3.3]], [39.4, [0.3, 0.014, 3.4]], [40.6, [2.0, 0, 1.2]], [42, [-0.6, 0.014, 2.0]], [43.5, [0.3, 0.014, 3.4]]],
  });
  add(O.balanceBike(), -0.1, 0, 3.0, { in: 36.8, out: 40.8, ry: 0.9, settle: [0.2, 0, 0.1],
    path: [[36.8, [-0.1, 0, 3.0], 0.9], [38, [0.05, 0, 1.4], 2.6], [39.2, [-0.55, 0, 3.2], 0.3]] });
  add(O.skateboard(), -0.25, 0, 1.45, { in: 41.6, out: 51.3, ry: 0.4, settle: [0, 0.03, 0] });

  // ================================================================ walls
  // a print they brought with them
  add(O.frame(inkPrint(), 0.32, 0.4), -2.82, 1.66, 0.0, {});
  // the partner's print, hung, then rehung when the gallery grows
  add(O.frame(abstractPrint(), 0.36, 0.28, { color: '#c9b08a' }), -3.42, 1.5, 0.0, {
    in: 28.8, settle: [0, -0.04, 0.04],
    path: [[28.8, [-3.42, 1.5, 0]], [33.2, [-3.45, 1.62, 0]]],
  });
  add(O.frame(photoTexture('sea', 1), 0.18, 0.135, { border: 0.016, mat: 0.03, color: '#2a221c' }), -2.3, 1.48, 0, { in: 30.6, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('hills', 2), 0.135, 0.18, { border: 0.016, mat: 0.03, color: '#e8e2d6' }), -2.3, 1.84, 0, { in: 33.1, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('beach', 3), 0.2, 0.15, { border: 0.016, mat: 0.03, color: '#2a221c' }), -3.4, 1.98, 0, { in: 37.2, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('forest', 4), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#b89a72' }), -2.28, 2.2, 0, { in: 40.4, settle: [0, -0.03, 0.03] });
  // the first drawing, taped up at 36 — framed at 42
  add(O.frame(childDrawing('rainbow', 81), 0.28, 0.21, { border: 0.018, mat: 0.045, color: '#efe9de' }), -2.82, 2.17, 0, { in: 42.2, settle: [0, -0.03, 0.03] });

  // drawings taped above the nightstand
  const taped = [
    ['rainbow', -1.93, 1.24, 36.0, 41.9, 81],
    ['house', -1.67, 1.3, 36.8, 40.6, 82],
    ['boat', -1.9, 1.48, 37.6, 47.4, 83],
    ['cat', -1.66, 1.55, 38.6, 43.4, 84],
    ['flowers', -1.8, 1.73, 39.5, 48.1, 85],
    ['house', -1.66, 1.3, 41.2, 46.8, 86],
    ['scribble', -1.62, 1.24, 67.4, 75.5, 87], // a grandchild's
  ];
  for (const [k, x, y, a, b, seed] of taped) add(O.tapedPaper(childDrawing(k, seed), 0.22, 0.165, seed), x, y, 0.0, { in: a, out: b, fi: 0.25, fo: 0.25, settle: [0, 0, 0.03] });

  // height marks on the wall by the door, one each year, the child's age beside it
  for (let i = 0; i < 15; i++) {
    const age = 36 + i, h = i < 10 ? 0.84 + i * 0.066 + (i % 3) * 0.004 : 1.43 + [0.06, 0.12, 0.17, 0.205, 0.225][i - 10];
    const [c, x] = canvas(256, 48);
    x.strokeStyle = 'rgba(40,32,26,0.85)'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(8, 26 + (i % 2)); x.lineTo(150 + (i % 3) * 8, 25); x.stroke();
    x.fillStyle = 'rgba(40,32,26,0.85)'; x.font = 'italic 26px Georgia'; x.fillText(String(i + 2), 172, 35);
    const tex = toTex(c);
    const m = mesh(new THREE.PlaneGeometry(0.2, 0.0375), std('#ffffff', 0.9, { map: tex, transparent: true }));
    const g = new THREE.Group(); g.add(m);
    add(g, 1.5, h, 0.003, { in: age + 0.3, fi: 0.2, settle: [0, 0, 0] });
  }

  // ================================================================ bookshelf: one collection, then two, then a family's
  const shelfXs = [2.29, 3.45];
  const shelfY = [0.075, 0.455, 0.835, 1.215, 1.595, 1.975];
  const r = rng(909), rOut = rng(910);
  const fillShelf = (si, from, to, count, palette, { hMin = 0.19, hMax = 0.27, start = 0, end = 1, kid = false, outFrom = Infinity, outTo = Infinity } = {}) => {
    let x = lerp(shelfXs[0], shelfXs[1], start);
    const xEnd = lerp(shelfXs[0], shelfXs[1], end);
    for (let i = 0; i < count && x < xEnd - 0.03; i++) {
      const t = kid ? 0.012 + r() * 0.012 : 0.022 + r() * 0.025;
      const h = kid ? 0.2 + r() * 0.1 : hMin + r() * (hMax - hMin);
      const d = kid ? 0.2 + r() * 0.06 : 0.14 + r() * 0.06;
      const b = O.bookUpright(palette[Math.floor(r() * palette.length)], h, t, d, Math.floor(r() * 1000));
      const birth = lerp(from, to, i / count) + r() * 0.3;
      b.rotation.z = (r() - 0.5) * 0.02;
      const death = outFrom === Infinity ? Infinity : lerp(outFrom, outTo, rOut());
      add(b, x + t / 2, shelfY[si], 0.17 + (0.34 - d) / 2 - 0.02, { in: birth, out: death, fi: 0.3, fo: 0.3, settle: [0, 0, 0.15] });
      x += t + 0.002;
    }
    return x;
  };
  fillShelf(3, 24, 25, 22, BOOK_COLORS, { end: 0.75 });
  fillShelf(4, 24, 25, 10, BOOK_COLORS, { start: 0.42, end: 0.95 });
  add(O.radio(), 2.6, shelfY[4], 0.18, {});
  fillShelf(2, 28.2, 30.5, 30, BOOK_COLORS, { end: 0.98 });
  fillShelf(5, 28.6, 31.5, 30, BOOK_COLORS, { end: 0.7 });
  fillShelf(3, 29.5, 31, 8, BOOK_COLORS, { start: 0.76, end: 0.99 });
  fillShelf(0, 34, 39, 34, KID_BOOK_COLORS, { kid: true, end: 0.98, outFrom: 52.0, outTo: 53.4 });
  fillShelf(1, 38.5, 44, 16, KID_BOOK_COLORS, { start: 0.45, end: 0.99, kid: true });
  fillShelf(5, 50, 62, 12, BOOK_COLORS, { start: 0.72, end: 0.99 });
  // game boxes, a photo, a cup won
  const boxM = (col) => O.bookFlat(col, 0.3, 0.26, 0.05);
  add(boxM('#2f6fb3'), 2.48, shelfY[1], 0.18, { in: 39.5, settle: [0, 0, 0.15] });
  add(boxM('#e2523a'), 2.48, shelfY[1] + 0.05, 0.18, { in: 41.2, settle: [0, 0, 0.15] });
  add(O.frame(photoTexture('sea', 7), 0.08, 0.06, { border: 0.01, mat: 0.015, color: '#c9b08a' }), 2.37, shelfY[4] + 0.072, 0.13, { in: 31.6, settle: [0, 0, 0.1] }).rotation.x = -0.12;
  add(O.bowl('#5d6f73', 0.07, 0.09), 3.2, 2.335, 0.15, { in: 29.3 }); // on top of the shelf
  const cup = new THREE.Group();
  cup.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), std('#3a332c', 0.6), 0, 0.015, 0));
  cup.add(mesh(new THREE.LatheGeometry([[0.005, 0.03], [0.008, 0.07], [0.04, 0.1], [0.045, 0.14]].map(([a, b]) => new THREE.Vector2(a, b)), 24), std('#c9a14a', 0.25, { metalness: 0.9 })));
  add(cup, 2.72, shelfY[1], 0.16, { in: 43.2, settle: [0, 0, 0.1] });


  // ================================================================ 45 – 90
  // the teenager's things at the table
  const chairC = add(O.chairSpindle(std('#8fa3a8', 0.6)), T.x - 0.28, 0, T.z + 0.8, {
    in: 48.7, out: 52.6, fi: 0.4, ry: Math.PI + 0.1, settle: [0, 0, 0.25], wob: { p: 0.07, r: 0.2, f: 1.4, seed: 71 },
  });
  add(O.garment('#8d8470', { seed: 7, back: 0.36 }), 0, 0.95, -0.21, { follow: chairC, in: 48.9, out: 52.5, settle: [0, 0.05, 0] });
  add(O.laptop(), T.x - 0.3, ty, T.z + 0.22, { in: 46.2, out: 52.4, ry: 0.15, wob: { p: 0.015, r: 0.1, f: 1.6, seed: 72 } });
  add(O.headphones(), T.x - 0.66, ty, T.z + 0.3, { in: 47.3, out: 52.3, ry: 0.5, wob: { p: 0.015, r: 0.3, f: 2.0, seed: 73 } });
  // a guitar, left behind when they go
  add(O.guitar(), 2.1, 0, 0.52, { in: 46.6, ry: -0.5, settle: [0.1, 0, 0.1] });
  // leaving home: boxes, briefly
  add(O.cardboardBox(0.5, 0.36, 0.38, true), -0.35, 0, 1.55, { in: 51.9, out: 52.85, fi: 0.15, fo: 0.15, ry: 0.2, settle: [0, 0, 0] });
  add(O.cardboardBox(0.42, 0.3, 0.32), -0.82, 0, 1.3, { in: 52.1, out: 52.95, fi: 0.15, fo: 0.15, ry: -0.3, settle: [0, 0, 0] });
  add(O.cardboardBox(0.42, 0.3, 0.32), -0.8, 0.3, 1.32, { in: 52.3, out: 52.9, fi: 0.12, fo: 0.12, ry: -0.2, settle: [0, 0.05, 0] });

  // photographs take the drawings' place above the nightstand
  add(O.frame(photoTexture('hills', 11), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#2a221c' }), -1.92, 1.42, 0, { in: 49.2, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('beach', 12), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#d9cfbf' }), -1.92, 1.72, 0, { in: 55.5, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('sea', 13), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#8a6a4a' }), -1.64, 1.6, 0, { in: 63.8, settle: [0, -0.03, 0.03] });
  // photo albums where the picture books were
  for (let i = 0; i < 9; i++) {
    const b = O.bookUpright(['#3b3430', '#5a4636', '#2f3b44', '#6b2f3a', '#4b5d3f'][i % 5], 0.31, 0.055, 0.25, 500 + i);
    add(b, 2.33 + i * 0.058, shelfY[0], 0.15, { in: 54.5 + i * 1.6, fi: 0.3, settle: [0, 0, 0.15] });
  }

  // the grown child, coming home: their glass, their mug
  add(O.wineGlass(0.4), T.x - 0.45, ty, T.z + 0.3, { spans: VISITS.filter(([a]) => a < LOSS) });
  add(O.mug('#c9a14a'), T.x - 0.2, ty, T.z + 0.3, { spans: VISITS.filter(([a]) => a > 72) });

  // quieter years: a puzzle, a tablet, the paper
  add(O.jigsaw(), T.x - 0.3, ty, T.z + 0.24, { in: 61.4, out: 63.9, fi: 0.3, fo: 0.3, ry: 0.0, settle: [0, 0.01, 0] });
  add(O.tablet(), T.x + 0.35, ty, T.z - 0.28, { in: 62.6, out: END, fo: 0.25, ry: 0.0, wob: { p: 0.01, r: 0.1, f: 1.8, seed: 81 } });
  add(O.newspaper(), T.x - 0.16, ty, T.z - 0.12, { spans: subtract(iv([[68.4, 81.0]]), [[LOSS - 0.05, 79.2], ...pad(VPRE)]), ry: 0.0, wob: { p: 0.01, r: 0.08, f: 2.3, seed: 82 } });
  add(O.plate('#efe9df', 0.12), T.x - 0.16, ty, T.z - 0.18, { in: 81.4, out: END, fo: 0.25, wob: { p: 0.01, r: 0.3, f: 2, seed: 83 } });
  add(O.openBook('#3d4a3a'), T.x - 0.15, ty, T.z + 0.1, { in: 84.4, out: END, fo: 0.25, ry: 0.08, settle: [0, 0.01, 0] });
  // a cutting from the big plant, in a jar
  add(O.cuttingJar(), T.x + 0.3, ty, T.z + 0.1, { in: 85.4, fi: 0.4, out: END, fo: 0.25 }); // where the fruit bowl was
  // a photograph by the bed
  const np = add(O.frame(photoTexture('sea', 1), 0.07, 0.05, { border: 0.012, mat: 0.02, color: '#c9b08a' }), -1.87, 0.607, 0.36, { in: 80.2, ry: 0.2, settle: [0, 0.03, 0] });
  np.rotation.x = -0.12;

  // the balcony fills with pots, then thins out again
  const potSpec = [[0.58, -1.22, 58.5, 83.0, '#5f7d45'], [0.78, -1.2, 60.0, 79.5, '#6d8a3e'], [0.96, -1.24, 62.0, 77.8, '#7a5a8a'], [1.13, -1.2, 64.2, Infinity, '#55753f']];
  potSpec.forEach(([x, z, a, b, col], i) => {
    const green = C(col), dry = C('#8a6a3a');
    add(O.herbPot(40 + i, col), x, 0, z, {
      in: a, out: b, fo: 0.5, settle: [0, 0, 0],
      update(age, p, o) {
        const d = b === Infinity ? 0 : smooth(LOSS + 1.0, b - 0.2, age);
        o.traverse((m) => { if (m.isMesh && m.material.name === 'leaf') m.material.color.copy(green).lerp(dry, d); });
        o.scale.setScalar(0.6 + 0.4 * smooth(a, a + 2, age));
      },
    });
  });

  // a new rug, years later
  const rug2 = new THREE.Group();
  const r2 = mesh(O.rboxGeo(2.2, 0.014, 3.0, 0.006), std('#ffffff', 1.0, { map: rugTexture2() }), 0, 0.008, 0);
  r2.receiveShadow = true; rug2.add(r2);
  add(rug2, -0.72, 0, 2.62, { in: 60.6, fi: 0.3, out: 83.0, fo: 0.4, ry: 0.13, settle: [0, 0, 0] });
  ctx.rugMat.transparent = true;


  // ================================================================ life between the milestones
  // 25: a takeaway on the table; drawing in the evenings
  add(O.pizzaBox(), T.x + 0.2, ty, T.z + 0.15, { in: 25.35, out: 25.75, fi: 0.08, fo: 0.08, ry: 0.15 });
  add(O.sketchbook(), T.x + 0.3, ty, T.z - 0.04, { in: 25.9, out: 27.3, ry: -0.2, wob: { p: 0.01, r: 0.15, f: 2, seed: 91 } });
  // 29: someone moves in — boxes, briefly
  add(O.cardboardBox(0.5, 0.36, 0.38, true), -0.35, 0, 1.55, { in: 28.85, out: 29.25, fi: 0.08, fo: 0.1, ry: -0.15, settle: [0, 0, 0] });
  add(O.cardboardBox(0.42, 0.3, 0.32), -0.82, 0, 1.3, { in: 28.9, out: 29.3, fi: 0.08, fo: 0.1, ry: 0.25, settle: [0, 0, 0] });
  // birthdays at the child's place, one more candle each year
  BIRTHDAYS.forEach((b, k) => {
    add(O.cake(k + 1), T.x - 0.15, ty, T.z + 0.08, { in: b, out: b + 0.32, fi: 0.06, fo: 0.06, settle: [0, 0.015, 0] });
    // a small plate for each of them, and the knife
    add(O.plate('#efe9df', 0.08), T.x + 0.15, ty, T.z - 0.22, { in: b + 0.04, out: b + 0.32, fi: 0.05, fo: 0.05 });
    add(O.plate('#efe9df', 0.08), T.x - 0.5, ty, T.z - 0.05, { in: b + 0.05, out: b + 0.32, fi: 0.05, fo: 0.05 });
  });
  // the room is repainted once the child is older; the paint things wait on a sheet
  add(O.paintJob(), -0.55, 0, 0.82, { in: 49.6, out: 50.25, fi: 0.08, fo: 0.08, ry: 0.1, settle: [0, 0, 0] });
  // pale patches and tape marks where drawings hung, until the repaint (and the grandchild's, never painted over)
  for (const [k, x, y, a, b] of taped) {
    const until = b > 50 ? Infinity : 49.95;
    add(O.wallTrace(0.22, 0.165), x, y, 0, { in: b + 0.3, out: until, fi: 0.2, fo: 0.08, settle: [0, 0, 0] });
  }
  // trips away
  for (const tr of TRIPS) add(O.suitcase(), -0.72, 0, 1.3, { in: tr, out: tr + 0.35, fi: 0.06, fo: 0.06, ry: 0.35, settle: [0, 0, 0] });

  // evenings with friends: two more places, an opened bottle, flowers; afterwards the plates stacked, glasses left out
  const guestChair = add(O.chairSpindle(std('#5d5a54', 0.6)), T.x - 0.28, 0, T.z + 0.82, {
    spans: BOTH, ry: Math.PI - 0.12, settle: [0, 0, 0.2],
    update(age, p, o) { const late = AFTER.some(([a, b]) => age > a - 0.02 && age < b + 0.05); if (late) { o.position.z += 0.16; o.position.x -= 0.06; o.rotation.y += 0.35; } },
  });
  add(O.plate(), T.x - 0.15, ty, T.z - 0.22, { spans: DIN });
  add(O.plate(), T.x - 0.66, ty, T.z + 0.06, { spans: DIN });
  add(O.plate(), T.x - 0.25, ty, T.z + 0.24, { spans: DIN });
  add(O.plate(), T.x + 0.68, ty, T.z + 0.18, { spans: DIN });
  add(O.wineGlass(0.35), T.x + 0.0, ty, T.z + 0.36, { spans: BOTH });
  add(O.wineGlass(0.25), T.x + 0.78, ty, T.z + 0.38, { spans: BOTH });
  add(O.bottle(), T.x + 0.08, ty, T.z - 0.05, { spans: BOTH });
  add(O.bouquet(), T.x + 0.25, ty, T.z + 0.1, { spans: DINNERS.filter((_, i) => i % 2 === 0).map((d) => [d, d + 0.31, 0.04, 0.04]) });
  add(O.plateStack(4), T.x - 0.25, ty, T.z + 0.24, { spans: AFTER, settle: [0, 0.01, 0] });
  add(O.napkin('#e9e2d4', 1), T.x - 0.58, ty, T.z + 0.16, { spans: AFTER, settle: [0, 0, 0] });
  add(O.napkin('#e9e2d4', 2), T.x + 0.6, ty, T.z + 0.22, { spans: AFTER, settle: [0, 0, 0] });

  // ================================================================ plants
  const hero = heroPlant(scene, V(-1.24, 0, 0.5));
  const ivyA = ivy(scene, V(2.58, 2.33, 0.17), [[2.53, 2.37, 0.25], [2.36, 2.36, 0.33], [2.28, 2.25, 0.36], [2.27, 1.98, 0.37], [2.29, 1.62, 0.37], [2.26, 1.3, 0.36], [2.28, 0.98, 0.37], [2.25, 0.6, 0.36], [2.27, 0.3, 0.36]], { rate: 0.1, start: 0.14 });
  const iv2 = ivy(scene, V(2.58, 2.33, 0.17), [[2.62, 2.37, 0.26], [2.85, 2.34, 0.36], [3.05, 2.2, 0.37], [3.15, 1.98, 0.37]], { rate: 0.06, start: 0.05, seed: 9 });
  olive(scene, V(0.05, 0, -1.22));

  // ================================================================ ageing of the permanent things
  const rugBase = ctx.rugMat.color.clone();
  const rugOld = C('#d8cbbb');
  const duvetBase = ctx.duvetMat.color.clone(), duvetLater = C('#e9dfcf');
  const wallBase = ctx.wallMat.color.clone(), wallOld = C('#e4d2bc'), wallNew = C('#ece6de'), wallOld2 = C('#e0d2c0');
  const curtBase = ctx.curtainMat.color.clone(), curtNew = C('#e6e2da');
  const shadeBase = ctx.shadeMat.color.clone(), shadeNew = C('#d9c7ad');
  const spotBase = ctx.spot.color.clone(), spotNew = C('#ffc790');
  const bulbBase = ctx.bulbMat.color.clone();

  return {
    life,
    update(age, t) {
      life.update(age);
      hero.update(age, t);
      ivyA.update(age); iv2.update(age);
      for (const f of extras) f(age, t);
      // the rug shifts when floor space becomes play space, and fades
      const sh = smooth(34.6, 35.2, age);
      ctx.rug.position.set(lerp(-0.95, -0.72, sh), 0.007, lerp(2.75, 2.62, sh));
      ctx.rug.rotation.y = lerp(0.05, 0.13, sh);
      ctx.rugMat.color.copy(rugBase).lerp(rugOld, smooth(25, 58, age));
      ctx.rugMat.opacity = 1 - smooth(60.2, 60.5, age); // taken up before the new one is laid
      ctx.rug.visible = ctx.rugMat.opacity > 0.002;
      ctx.rugMat.depthWrite = ctx.rugMat.opacity > 0.5;
      const dim = smooth(LOSS, 89, age);
      if (ctx.spot) { ctx.spot.intensity = 9 * (1 - 0.45 * dim); ctx.pendantGlow.intensity = 0.35 * (1 - 0.5 * dim); }
      ctx.dim = dim;
      // walls yellow slowly, are repainted at 50, and age again
      const rp = smooth(49.9, 50.1, age);
      ctx.wallMat.color.copy(wallBase).lerp(wallOld, smooth(25, 49.9, age) * (1 - rp)).lerp(wallNew, rp).lerp(wallOld2, smooth(50.1, 90, age) * rp);
      ctx.curtainMat.color.copy(curtBase).lerp(curtNew, smooth(57.9, 58.2, age));
      ctx.shadeMat.color.copy(shadeBase).lerp(shadeNew, smooth(61.9, 62.2, age));
      ctx.spot.color.copy(spotBase).lerp(spotNew, smooth(59.9, 60.2, age));
      // 90: the lamps are off, then the candle goes out
      const off = smooth(89.8, 89.92, age);
      ctx.lampLight.intensity = 1.4 * (1 - off); ctx.shadeMat.emissiveIntensity = 1.6 * (1 - off);
      ctx.spot.intensity *= 1 - off; ctx.pendantGlow.intensity *= 1 - off;
      ctx.pendantInner.emissiveIntensity = 0.45 * (1 - off); ctx.bulbMat.color.copy(bulbBase).multiplyScalar(Math.max(0.02, 1 - off));
      ctx.off = off;
      ctx.duvetMat.color.copy(duvetBase).lerp(duvetLater, smooth(30, 31, age)).lerp(C('#d6cfc2'), smooth(58, 59, age));
    },
  };
}
