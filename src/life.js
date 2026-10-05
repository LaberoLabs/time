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
import { inkPrint, abstractPrint, photoTexture, childDrawing, BOOK_COLORS, KID_BOOK_COLORS, canvas, toTex } from './tex.js';
import { rng, smooth, keys, clamp, lerp, noise1 } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

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
    wob: { p: 0.06, r: 0.14, f: 1.0, seed: 23 },
  });
  const kc = O.kidChair();
  const kidChair = add(kc.g, T.x - 0.28, 0, T.z + 0.8, {
    in: 34.1, fi: 0.5, ry: Math.PI + 0.06, settle: [0, 0, 0.25],
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
  const coat1 = add(O.chairCoat('#8a5a3a', 1, 0.44), 0, 0.965, -0.215, { follow: chairA, settle: [0, 0.06, 0] });
  const scarf = add(O.chairCoat('#b5523b', 4, 0.2, 0.42, 0.012), 0.04, 0.99, -0.215, { follow: chairA, in: 30.6, settle: [0, 0.04, 0] });
  const coat2 = add(O.chairCoat('#3e4a3a', 2, 0.44), 0, 0.93, -0.19, { follow: chairB, in: 28.3, settle: [0, 0.06, 0] });
  const kidCoat = add(O.chairCoat('#d9a22a', 3, 0.34, 0.36), 0, 0.96, -0.2, { follow: kidChair, in: 38.8, out: 41.6, settle: [0, 0.05, 0] });
  const kidCoat2 = add(O.chairCoat('#2c3e58', 5, 0.38, 0.44), 0, 0.96, -0.2, { follow: kidChair, in: 41.6, settle: [0, 0.05, 0] });
  add(O.backpack('#c4532e'), 0.3, 0.32, -0.08, { follow: kidChair, in: 40.6, settle: [0, 0.05, 0] }).rotation.x = 0;

  // ================================================================ table top
  const glass1 = add(O.wineGlass(0.6), T.x + 0.15, ty, T.z - 0.28, {
    spans: [[-Infinity, 32.35, 0.3, 0.3], [41.8, Infinity, 0.4]],
    path: [[25, [T.x + 0.15, ty, T.z - 0.28]], [27.5, [T.x + 0.05, ty, T.z - 0.12]], [30, [T.x - 0.1, ty, T.z - 0.2]], [41.7, [T.x - 0.18, ty, T.z - 0.06]], [43.5, [T.x - 0.05, ty, T.z - 0.15]]],
    wob: { p: 0.025, r: 0, f: 2.2, seed: 3 },
  });
  // the second glass: a visit, another visit, then always
  const glass2 = add(O.wineGlass(0.45), T.x + 0.3, ty, T.z + 0.18, {
    spans: [[26.6, 26.9, 0.12, 0.12], [27.25, 27.55, 0.12, 0.12], [27.85, 32.35, 0.25, 0.3], [41.85, Infinity, 0.4]],
    wob: { p: 0.03, r: 0, f: 2.0, seed: 4 },
  });
  add(O.bottle(), T.x + 0.38, ty, T.z - 0.18, { in: 28.6, out: 32.2, wob: { p: 0.04, r: 0.3, f: 1.6, seed: 8 } });
  add(O.vaseStems('dried'), T.x + 0.68, ty, T.z - 0.24, { in: 28.4, out: 31.3 });
  add(O.vaseStems('euc'), T.x + 0.62, ty, T.z - 0.22, { in: 42.1 });
  const cnd = O.candle();
  add(cnd, T.x + 0.02, ty, T.z + 0.02, {
    in: 29.2,
    path: [[29, [T.x + 0.02, ty, T.z + 0.02]], [36.6, [T.x + 0.42, ty, T.z - 0.02]]],
    update(age, p, o) {
      // candles burn down and are replaced, year after year
      const cyc = ((age - 29.2) / 1.35) % 1;
      const h = lerp(0.2, 0.05, cyc);
      cnd.userData.wax.scale.y = h; cnd.userData.wax.position.y = 0.08 + h / 2;
      cnd.userData.flame.position.y = 0.08 + h + 0.012;
      const swap = Math.min(smooth(0.0, 0.04, cyc), 1 - smooth(0.96, 1.0, cyc));
      cnd.userData.wax.material.opacity *= swap; cnd.userData.flame.material.opacity = p * swap;
      cnd.userData.light.intensity = 0.25 * p * swap;
    },
  });
  extras.push((age, t) => { if (cnd.visible) { const f = 1 + Math.sin(t * 11.0) * 0.05 + Math.sin(t * 17.3) * 0.04; cnd.userData.flame.scale.set(1, 2.4 * f, 1); } });

  // single person's table
  const lap = O.laptop();
  add(lap, T.x - 0.25, ty, T.z - 0.12, {
    ry: Math.PI + 0.08, out: 33.6,
    path: [[25, [T.x - 0.25, ty, T.z - 0.12], Math.PI + 0.08], [28.2, [T.x - 0.2, ty, T.z - 0.2], Math.PI - 0.15], [30.4, [T.x + 0.55, ty, T.z + 0.15], Math.PI + 0.5]],
    update(age) { lap.userData.lid.rotation.x = lerp(-0.28, -1.5, smooth(30.2, 30.4, age)) ; },
  });
  add(O.bookStack(['#2f4858', '#c9a46a', '#8a3b2c']), T.x + 0.62, ty, T.z + 0.2, { out: 29.6, ry: 0.3 });
  add(O.bookFlat('#d9cbb0', 0.14, 0.2, 0.02), T.x - 0.55, ty, T.z + 0.05, { in: 25, out: 27.6, ry: 0.5 });

  // dinners for two
  add(O.plate(), T.x - 0.3, ty, T.z - 0.15, { in: 30.0, out: 32.4 });
  add(O.plate(), T.x + 0.25, ty, T.z + 0.22, { in: 30.05, out: 32.4 });
  add(O.bowl('#c9bba8', 0.07, 0.045), T.x - 0.3, ty + 0.01, T.z - 0.15, { in: 30.1, out: 32.4 });
  add(O.bowl('#c9bba8', 0.07, 0.045), T.x + 0.25, ty + 0.01, T.z + 0.22, { in: 30.15, out: 32.4 });

  // the mug: tea instead of wine, then it simply stays for good
  add(O.mug('#e3dccf'), T.x - 0.38, ty, T.z - 0.1, {
    in: 32.3,
    path: [[32, [T.x - 0.38, ty, T.z - 0.1]], [35, [T.x - 0.1, ty, T.z - 0.25], 1.2], [38, [T.x + 0.2, ty, T.z + 0.1], 2.1], [42, [T.x - 0.32, ty, T.z - 0.18], 0.4]],
    wob: { p: 0.04, r: 0.6, f: 2.4, seed: 31 },
  });
  add(O.mug('#3f5a6a'), T.x + 0.32, ty, T.z + 0.15, { in: 37.6, wob: { p: 0.05, r: 0.8, f: 2.1, seed: 33 } });

  // the child at the table
  add(O.babyBottle(), T.x - 0.32, ty, T.z + 0.3, { in: 33.7, out: 35.8, wob: { p: 0.04, r: 0, f: 2.5, seed: 41 } });
  add(O.sippyCup(), T.x - 0.2, ty, T.z + 0.28, { in: 35.6, out: 39.2, wob: { p: 0.05, r: 0.5, f: 2.6, seed: 42 } });
  add(O.paperSheets([childDrawing('scribble', 71), childDrawing('house', 72), childDrawing('rainbow', 73)]), T.x - 0.45, ty, T.z + 0.2, { in: 36.2, out: 40.5, settle: [0, 0.01, 0] });
  add(O.fruitBowl(), T.x + 0.05, ty, T.z - 0.05, { in: 36.6 });
  add(O.tumbler('#f2a33a'), T.x - 0.08, ty, T.z + 0.3, { in: 40.1, wob: { p: 0.05, r: 0, f: 2.2, seed: 43 } });
  add(O.bookStack(['#e2523a', '#3f8fd0'], 9), T.x - 0.42, ty, T.z + 0.18, { in: 40.6, ry: -0.2 });
  add(O.pencilCase(), T.x - 0.62, ty, T.z - 0.05, { in: 40.8, ry: 0.4 });

  // ================================================================ bed
  add(O.throwBlanket('#5a5652', 2, 0.55, 0.6), -2.55, 0.585, 1.35, {
    ry: 0.4, settle: [0, 0.05, 0],
    path: [[25, [-2.55, 0.585, 1.35], 0.4], [29, [-3.2, 0.585, 1.25], 1.1], [33, [-2.5, 0.585, 1.0], 0.2], [38, [-3.0, 0.585, 1.4], 0.9]],
  });
  add(O.throwBlanket('#8a3f2a', 5, 1.5, 0.5), -2.82, 0.6, 1.85, { in: 29.0, fi: 0.5, ry: 0.03, settle: [0, 0.08, 0] });
  add(O.cushion('#9a5b3e'), -3.15, 0.6, 0.62, { in: 30.6, ry: 0.15 });
  add(O.cushion('#6f7a5f', 0.38), -2.48, 0.6, 0.64, { in: 31.2, ry: -0.2 });

  // ================================================================ nightstand
  add(O.bookFlat('#2f4858', 0.13, 0.19, 0.025), -1.6, 0.55, 0.3, { ry: 0.25, wob: { p: 0.02, r: 0.3, f: 1.5, seed: 51 } });
  add(O.bookFlat('#a8452f', 0.13, 0.2, 0.03), -1.6, 0.575, 0.3, { in: 28.6, ry: -0.1, wob: { p: 0.02, r: 0.3, f: 1.3, seed: 52 } });
  add(O.babyMonitor(), -1.88, 0.55, 0.36, { in: 33.8, out: 37.4, ry: 0.3 });

  // ================================================================ floor: shoes, the cradle, toys
  add(O.shoes('sneaker', '#efeae2'), -1.6, 0, 0.82, { ry: -0.3, wob: { p: 0.07, r: 0.25, f: 1.3, seed: 61 } });
  add(O.shoes('boot', '#4a2e20'), -1.3, 0, 0.62, { in: 27.9, ry: -0.05, wob: { p: 0.06, r: 0.2, f: 1.2, seed: 62 } });
  add(O.shoes('sneaker', '#c9442e'), -1.42, 0, 1.08, { in: 34.9, ry: -0.6, scale: [[34.9, 0.42], [37, 0.55], [40, 0.68], [45, 0.86]], wob: { p: 0.08, r: 0.3, f: 1.4, seed: 63 } });

  add(O.mosesBasket(), -1.72, 0, 1.5, { in: 33.75, out: 35.6, fi: 0.5, fo: 0.5, ry: 0.08, settle: [0, 0, 0.2] });
  add(O.bunny(), -1.72, 0.61, 1.47, {
    in: 33.9, ry: 0.4, settle: [0, 0.05, 0],
    path: [[33.9, [-1.72, 0.61, 1.47], 0.4], [35.9, [-0.85, 0.014, 2.0], -0.6, 0.35], [37.0, [-0.3, 0.014, 2.6], 0.9, 0.3], [38.3, [-2.55, 0.6, 0.75], 0.2, 0.4], [42, [-3.3, 0.6, 0.7], 0.5]],
  });
  add(O.blocks(3), -0.7, 0.014, 2.35, {
    in: 35.3, out: 39.6, settle: [0, 0.04, 0],
    path: [[35.3, [-0.7, 0.014, 2.35], 0], [36.1, [-0.4, 0.014, 2.8], 1.2], [36.9, [-1.0, 0.014, 2.6], 2.1], [37.7, [0.1, 0.0, 1.9], 0.4], [38.6, [-0.6, 0.014, 2.1], 1.6]],
  });
  add(O.ball(['#d8432f', '#f4f1ea', '#3a7cc6'], 0.075), -0.3, 0.014, 2.1, {
    in: 36.0,
    path: [[36, [-0.3, 0.014, 2.1]], [37, [0.6, 0.0, 1.5]], [38.2, [-1.2, 0.014, 3.0]], [39.4, [0.9, 0.0, 3.2]], [40.6, [2.1, 0, 1.25]], [42, [-0.6, 0.014, 2.0]], [43.5, [0.45, 0.0, 1.6]]],
  });
  add(O.balanceBike(), -0.2, 0, 2.95, { in: 36.8, out: 40.8, ry: 0.9, settle: [0.2, 0, 0.1],
    path: [[36.8, [-0.2, 0, 2.95], 0.9], [38, [0.05, 0, 1.4], 2.6], [39.2, [-0.55, 0, 3.2], 0.3]] });
  add(O.skateboard(), -0.3, 0, 1.55, { in: 41.6, ry: 1.2, settle: [0, 0, 0.2] });

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
    ['boat', -1.9, 1.48, 37.6, Infinity, 83],
    ['cat', -1.66, 1.55, 38.6, 43.4, 84],
    ['flowers', -1.8, 1.73, 39.5, Infinity, 85],
    ['house', -1.66, 1.3, 41.2, Infinity, 86],
  ];
  for (const [k, x, y, a, b, seed] of taped) add(O.tapedPaper(childDrawing(k, seed), 0.22, 0.165, seed), x, y, 0.0, { in: a, out: b, fi: 0.25, fo: 0.25, settle: [0, 0, 0.03] });

  // height marks on the wall by the door, one each year, the child's age beside it
  for (let i = 0; i < 10; i++) {
    const age = 36 + i, h = 0.84 + i * 0.066 + (i % 3) * 0.004;
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
  const r = rng(909);
  const fillShelf = (si, from, to, count, palette, { hMin = 0.19, hMax = 0.27, start = 0, end = 1, kid = false } = {}) => {
    let x = lerp(shelfXs[0], shelfXs[1], start);
    const xEnd = lerp(shelfXs[0], shelfXs[1], end);
    for (let i = 0; i < count && x < xEnd - 0.03; i++) {
      const t = kid ? 0.012 + r() * 0.012 : 0.022 + r() * 0.025;
      const h = kid ? 0.2 + r() * 0.1 : hMin + r() * (hMax - hMin);
      const d = kid ? 0.2 + r() * 0.06 : 0.14 + r() * 0.06;
      const b = O.bookUpright(palette[Math.floor(r() * palette.length)], h, t, d, Math.floor(r() * 1000));
      const birth = lerp(from, to, i / count) + r() * 0.3;
      b.rotation.z = (r() - 0.5) * 0.02;
      add(b, x + t / 2, shelfY[si], 0.17 + (0.34 - d) / 2 - 0.02, { in: birth, fi: 0.3, settle: [0, 0, 0.15] });
      x += t + 0.002;
    }
    return x;
  };
  fillShelf(3, 24, 25, 22, BOOK_COLORS, { end: 0.75 });
  fillShelf(4, 24, 25, 10, BOOK_COLORS, { start: 0.42, end: 0.95 });
  add(O.radio(), 2.55, shelfY[4], 0.18, {});
  fillShelf(2, 28.2, 30.5, 30, BOOK_COLORS, { end: 0.98 });
  fillShelf(5, 28.6, 31.5, 30, BOOK_COLORS, { end: 0.7 });
  fillShelf(3, 29.5, 31, 8, BOOK_COLORS, { start: 0.76, end: 0.99 });
  fillShelf(0, 34, 39, 34, KID_BOOK_COLORS, { kid: true, end: 0.98 });
  fillShelf(1, 38.5, 44, 16, KID_BOOK_COLORS, { start: 0.45, end: 0.99, kid: true });
  // game boxes, a photo, a cup won
  const boxM = (col) => O.bookFlat(col, 0.3, 0.26, 0.05);
  add(boxM('#2f6fb3'), 2.48, shelfY[1], 0.18, { in: 39.5, settle: [0, 0, 0.15] });
  add(boxM('#e2523a'), 2.48, shelfY[1] + 0.05, 0.18, { in: 41.2, settle: [0, 0, 0.15] });
  add(O.frame(photoTexture('sea', 7), 0.12, 0.09, { border: 0.012, mat: 0.02, color: '#c9b08a' }), 2.42, shelfY[4] + 0.1, 0.12, { in: 31.6, settle: [0, 0, 0.1] }).rotation.x = -0.12;
  add(O.bowl('#5d6f73', 0.07, 0.09), 3.25, shelfY[5], 0.18, { in: 29.3 });
  const cup = new THREE.Group();
  cup.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), std('#3a332c', 0.6), 0, 0.015, 0));
  cup.add(mesh(new THREE.LatheGeometry([[0.005, 0.03], [0.008, 0.07], [0.04, 0.1], [0.045, 0.14]].map(([a, b]) => new THREE.Vector2(a, b)), 24), std('#c9a14a', 0.25, { metalness: 0.9 })));
  add(cup, 3.3, shelfY[1], 0.16, { in: 43.2, settle: [0, 0, 0.1] });

  // ================================================================ plants
  const hero = heroPlant(scene, V(-1.24, 0, 0.5));
  const iv = ivy(scene, V(2.58, 2.33, 0.17), [[2.53, 2.37, 0.25], [2.36, 2.36, 0.33], [2.28, 2.25, 0.36], [2.27, 1.98, 0.37], [2.29, 1.62, 0.37], [2.26, 1.3, 0.36], [2.28, 0.98, 0.37], [2.25, 0.6, 0.36], [2.27, 0.3, 0.36]], { rate: 0.1, start: 0.14 });
  const iv2 = ivy(scene, V(2.58, 2.33, 0.17), [[2.62, 2.37, 0.26], [2.85, 2.34, 0.36], [3.05, 2.2, 0.37], [3.15, 1.98, 0.37]], { rate: 0.06, start: 0.05, seed: 9 });
  olive(scene, V(0.05, 0, -1.22));

  // ================================================================ ageing of the permanent things
  const rugBase = ctx.rugMat.color.clone();
  const rugOld = C('#d8cbbb');
  const duvetBase = ctx.duvetMat.color.clone(), duvetLater = C('#e9dfcf');

  return {
    life,
    update(age, t) {
      life.update(age);
      hero.update(age, t);
      iv.update(age); iv2.update(age);
      for (const f of extras) f(age, t);
      // the rug shifts when floor space becomes play space, and fades
      const sh = smooth(34.6, 35.2, age);
      ctx.rug.position.set(lerp(-0.95, -0.72, sh), 0.007, lerp(2.75, 2.62, sh));
      ctx.rug.rotation.y = lerp(0.05, 0.13, sh);
      ctx.rugMat.color.copy(rugBase).lerp(rugOld, smooth(25, 45, age));
      ctx.duvetMat.color.copy(duvetBase).lerp(duvetLater, smooth(30, 31, age));
    },
  };
}
