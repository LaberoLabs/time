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
import { rng, smooth, clamp, lerp, union, subtract, presence } from './util.js';
import { makePace } from './pace.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the grown child, coming home: short stays, more often after 77
const LOSS = 73.5; // the last evening with two glasses
const END = 89.6; // the last things put down are never picked up again
// the grown child, coming home
const VISITS = [[60.6, 60.95], [66.0, 66.35], [70.1, 70.45], [77.0, 77.4], [84.0, 84.4]].map(([a, b]) => [a, b, 0.1, 0.1]);
const VPRE = VISITS.filter(([a]) => a < LOSS).map(([a, b]) => [a, b]);
const VPOST = VISITS.filter(([a]) => a > LOSS).map(([a, b]) => [a, b]);
const PARTNERS = [66.0, 70.1]; // the son's partner comes along from the second visit on
const GRANDCHILD = [70.1];     // and their child, the third time
const BIRTHDAYS = [34.7]; // the first one only; growing up is told by their things
const DINNERS = [54.0, 57.4]; // one dinner party, one games night
const TRIPS = [30.25, 37.08, 55.15, 63.35, 71.5];

// ---------------------------------------------------------------- life as scenes
// Each scene has its own light (time of day) and its own table. Table scenes clear the everyday things while they last.
export const SCENES = [];
const sc = (a, b, tod, kind, o = {}) => SCENES.push({ a, b, tod, kind, table: true, keep: false, w: 4, ...o });
sc(25.35, 25.75, 'night', 'pizza', { keep: true });           // working late, takeaway
sc(26.05, 26.4, 'morning', 'breakfast1', { keep: true });     // breakfast alone
sc(26.8, 27.1, 'dusk', 'date');
sc(28.85, 29.3, 'day', 'movein', { table: false });
sc(29.7, 30.0, 'dusk', 'dinner2');                            // a cooked dinner for two
sc(31.5, 31.82, 'night', 'friendsYoung'); sc(31.88, 32.08, 'dawn', 'friendsYoungAfter');
sc(32.95, 33.2, 'morning', 'pregnant');
sc(33.3, 33.65, 'day', 'babyprep');
BIRTHDAYS.forEach((b, k) => sc(b, b + 0.32, 'day', 'birthday', { k, w: 7 })); // time slows a little more here: the cake should be seen
sc(38.3, 38.55, 'golden', 'familyDinner');
sc(40.2, 40.5, 'morning', 'familyBreakfast');
sc(48.9, 49.15, 'night', 'teenTakeaway');
sc(49.6, 50.25, 'day', 'paint', { table: false, w: 3 });
sc(51.9, 53.0, 'day', 'moveout', { table: false, w: 3.5 });
DINNERS.forEach((d, i) => { const games = i === 1; sc(d, d + 0.32, games ? 'night' : 'dusk', games ? 'games' : 'party', { w: 5 }); sc(d + 0.38, d + 0.55, 'dawn', games ? 'gamesAfter' : 'partyAfter', { w: 5 }); });
TRIPS.forEach((t) => sc(t, t + 0.3, 'day', 'trip', { table: false, w: 2 }));
VPRE.forEach(([a, b]) => sc(a, b, 'day', 'lunch', { partner: PARTNERS.includes(a), grand: GRANDCHILD.includes(a), w: 3 }));
sc(67.8, 68.05, 'golden', 'soup2');
sc(65.2, 65.45, 'morning', 'breakfastOld');
sc(73.15, 73.45, 'golden', 'lastEvening');
sc(75.3, 75.55, 'dusk', 'supperAlone'); sc(82.3, 82.55, 'dusk', 'supperAlone');
VPOST.forEach(([a, b]) => sc(a, b, 'day', 'teaVisit', { w: 3 }));
sc(86.6, 86.85, 'night', 'nightAlone', { keep: true });
sc(89.35, 89.75, 'dusk', 'end', { table: false, w: 3.5 }); sc(89.8, 90.6, 'night', 'end', { table: false, w: 3.5 });
SCENES.sort((x, y) => x.a - y.a);
// moments where time should slow so they can be seen (consumed by main.js scroll mapping)
// stretches where nothing happens but time should still be felt: the first year alone, and the last quiet years
const STILL = [[73.5, 75.2, 3], [79.0, 81.5, 1.6], [85.0, 89.3, 0.6]];
export const BEATS = [...SCENES.map((s) => [s.a, s.b, s.w]), ...STILL];
export const PACE = makePace(BEATS);

// ---------------------------------------------------------------- transitions, measured in scroll distance (vh)
// A change is given a width in scroll, not in years, so it reads equally gently wherever time is slowed.
const EDGE = 40;    // a scene's things arriving or leaving
const ROUTINE = 45; // everyday things coming into or going out of use
const edge = (s) => Math.min(EDGE, 0.3 * PACE.vh(s.a, s.b)); // short moments keep a readable middle
// a fade centred on age h, w vh wide -> [start, duration]
const around = (h, w) => { const a = PACE.shift(h, -w / 2); return [a, PACE.shift(h, w / 2) - a]; };
const sceneSpan = (s, t = s) => { const [a, fi] = around(s.a, edge(s)), [b, fo] = around(t.b, edge(t)); return [a, b, fi, fo]; };
const win = (kind) => SCENES.filter((s) => s.kind === kind).map((s) => sceneSpan(s));
// an evening and its morning after as one unbroken stretch, for things that stay on the table all night
const after = (s, k2) => SCENES.find((u) => u.kind === k2 && u.a >= s.b && u.a - s.b < 0.2);
const chain = (k1, k2) => SCENES.filter((s) => s.kind === k1).map((s) => sceneSpan(s, after(s, k2) || s));
// the everyday table is put aside for a scene: it leaves across the scene's arriving edge and returns across its
// leaving edge, so one arrangement hands over to the other. Scenes close together (an evening and its morning
// after) share one gap, so the everyday things never flicker back in between.
const holes = (list) => {
  const runs = [];
  for (const s of list) { const r = runs[runs.length - 1]; if (r && PACE.vh(r.t.b, s.a) < 2 * EDGE) r.t = s; else runs.push({ s, t: s }); }
  return runs.map(({ s, t }) => { const [h0, f0] = around(s.a, edge(s)), [h1, f1] = around(t.b, edge(t)); return [h0, h1, f0, f1]; });
};
const TABLE_HOLES = holes(SCENES.filter((s) => s.table && !s.keep));
const ALL_TABLE = holes(SCENES.filter((s) => s.table));
// everyday things on the table come into and go out of use gently, and are put aside whenever the table is used for something else
const routine = (list) => list.map(([a, b]) => [a, b, Number.isFinite(a) ? PACE.shift(a, ROUTINE) - a : 0, Number.isFinite(b) ? PACE.shift(b, ROUTINE) - b : 0]);
// (a sliver left between a scene and the routine's own start or end would only half-appear and go again: it is dropped)
const daily = (list, h = TABLE_HOLES) => subtract(routine(list), h).filter(([a, b, fi]) => !(Number.isFinite(a) && Number.isFinite(b)) || b > a + fi + 0.02);
// one-off things (boxes, the paint, a suitcase): there from a to b, arriving and leaving across centred edges
const stay = (a, b, w = EDGE) => { const [a0, fi] = around(a, w), [b0, fo] = around(b, w); return [[a0, b0, fi, fo]]; };
// the light each moment happens in
export function todLayers(age) {
  const out = [];
  for (const s of SCENES) { if (age < s.a - 0.12 || age > s.b + 0.12) continue; out.push([s.tod, presence(age, s.a - 0.08, s.b + 0.02, 0.08, 0.08)]); }
  return out;
}
const LATE = SCENES.filter((s) => /After$/.test(s.kind)).map((s) => sceneSpan(s));
// presence of a span, eased in scroll distance exactly as the life objects are
const eased = (age, [a, b, fi, fo]) => { const U = PACE.units; return presence(U(age), U(a), U(b), U(a + fi) - U(a), U(b + fo) - U(b)); };
const VISITS_SHOES = [[36.1, 52.4, 0.4, 0.4], ...SCENES.filter((s) => s.kind === 'lunch' || s.kind === 'teaVisit').map((s) => sceneSpan(s))]; // every visit, before and after the loss

export function buildLife(scene, ctx) {
  const life = new Life(scene, PACE);
  const add = (obj, x, y, z, o = {}) => { obj.position.set(x, y, z); if (o.ry !== undefined) obj.rotation.y = o.ry; return life.add(obj, o); };
  const T = TABLE, ty = T.y;
  const extras = []; // custom per-frame updaters

  // ================================================================ chairs
  const chairA = add(O.chairSpindle(), T.x - 0.15, 0, T.z - 0.78, {
    ry: 0.05,
    wob: { p: 0.05, r: 0.12, f: 1.1, seed: 11 },
  });
  const chairB = add(O.chairLadder(), T.x - 1.16, 0, T.z + 0.04, {
    spans: [...win('date'), [28.15, Infinity, 0.5, 0.4]], ry: Math.PI / 2 - 0.1, settle: [-0.25, 0, 0.1],
    wob: { p: 0.06, r: 0.14, f: 1.0, seed: 23, until: LOSS },
  });
  const kc = O.kidChair();
  const kidChair = add(kc.g, T.x - 0.28, 0, T.z + 0.84, { dynamicBox: true,
    spans: [[34.1, 48.2, 0.5, 0.4]],
    ry: Math.PI + 0.06, settle: [0, 0, 0.25],
    wob: { p: 0.015, r: 0.04, f: 0.9, seed: 5 },
    update(age) {
      // baby guard and tray come off at ~37.5; seat lowers as the child grows
      const off = smooth(37.3, 37.7, age);
      kc.guard.visible = off < 0.99;
      kc.guard.position.y = off * 0.05; kc.guard.position.z = -off * 0.12; // lifted off, away from the table
      kc.guard.traverse((m) => { if (m.isMesh) m.material.opacity *= 1 - off; });
      kc.seat.position.y = lerp(0.62, 0.52, smooth(39, 42, age));
    },
  });

  // ================================================================ coats (draped over chair backs) and bags
  const coat1 = add(O.garment('#8a5a3a', { seed: 1 }), 0, 0.95, -0.21, { follow: chairA, out: 59.6, fo: 0.4, settle: [0, 0.05, 0] }); // taken off the chair before the new one is hung there
  add(O.garment('#4f5a66', { seed: 6, back: 0.42 }), 0, 0.95, -0.21, { follow: chairA, in: 60.0, fi: 0.45, out: END, fo: 0.25, settle: [0, 0.05, 0] }); // the coat, replaced
  const scarf = add(O.garment('#b5523b', { w: 0.17, r: 0.092, front: 0.2, back: 0.3, knit: true, sleeves: false, bulge: 0.004, seed: 4 }), 0.05, 0.95, -0.21, { follow: chairA, in: 30.6, out: END, fo: 0.25, settle: [0, 0.04, 0] });
  const coat2 = add(O.garment('#b7a48a', { seed: 2, knit: true, back: 0.34, front: 0.12, lean: 0, r: 0.05 }), 0, 0.935, -0.185, { follow: chairB, spans: [...win('date'), [28.3, LOSS + 1.2, 0.4, 0.3]], settle: [0, 0.05, 0] });
  // it stays a little after the boots have gone, then is folded and left on their seat; put away years later
  add(O.foldedCloth('#b7a48a', 0.3, 0.24, 0.06, true, 9), 0, 0.48, 0.02, { follow: chairB, in: LOSS + 1.3, out: 80.0, fi: 0.25, fo: 0.4, settle: [0, 0.04, 0] });
  const kidCoat = add(O.garment('#d9a22a', { seed: 3, w: 0.32, back: 0.3, front: 0.11, r: 0.055, lean: 0.38 }), 0, 0.925, -0.175, { follow: kidChair, in: 38.8, out: 41.4, settle: [0, 0.05, 0] });
  add(O.backpack('#c4532e'), 0.42, 0.42, 0.05, { follow: kidChair, in: 40.6, out: 47.6, settle: [0, 0.05, 0] });

  // ================================================================ table top
  // zones (offsets from the table centre): P protagonist (back), R partner (left short end), C child / guest (front),
  // N shared middle, E right end (candle, flowers). Every object below belongs to a person or an activity at its place.
  const at = (dx, dz) => [T.x + dx, ty, T.z + dz];
  const put = (obj, dx, dz, o = {}) => add(obj, T.x + dx, ty, T.z + dz, o);

  // ---------- the things that stay: candle (lit from 29 until the very end) and flowers
  add(O.vaseStems('dried'), T.x + 0.68, ty, T.z - 0.24, { in: 28.4, out: 31.0 });
  add(O.vaseStems('euc'), T.x + 0.74, ty, T.z - 0.33, { spans: subtract(routine([[42.1, 77.4]]), holes(SCENES.filter((s) => s.kind === 'party' || s.kind === 'partyAfter'))),
    update(age, p, o) { const d = smooth(LOSS + 1.5, 77.2, age); o.traverse((m) => { if (m.isMesh && m.material.name === 'leaf') m.material.color.set('#8fa38f').lerp(C('#9a8a62'), d); }); } });
  const cnd = O.candle();
  add(cnd, T.x + 0.02, ty, T.z + 0.02, {
    in: 29.2, dynamicBox: true,
    path: [[29, at(0.02, 0.02)], [33.6, at(0.6, -0.05)]], // moved out of reach before the baby comes
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

  // ---------- everyday table, phase by phase
  // alone: work late at the laptop with a glass, a book at the empty end, drawings in the evenings
  put(O.wineGlass(0.6), 0.15, -0.3, { spans: daily([[-Infinity, 27.8]], ALL_TABLE), wob: { p: 0.02, r: 0, f: 2.2, seed: 3 } });
  const lap = O.laptop();
  add(lap, ...at(-0.25, -0.12), {
    spans: daily([[-Infinity, 33.6]]), ry: Math.PI + 0.08,
    path: [[25, at(-0.25, -0.12), Math.PI + 0.08], [28.2, at(-0.2, -0.2), Math.PI - 0.15], [29.85, at(0.62, 0.25), Math.PI + 0.5, 0.1]], dynamicBox: true,
    update(age) { lap.userData.lid.rotation.x = lerp(-0.28, -1.5, smooth(29.6, 29.7, age)); },
  });
  put(O.bookStack(['#2f4858', '#c9a46a', '#8a3b2c']), 0.62, 0.2, { spans: daily([[-Infinity, 29.4]]), ry: 0.3 });
  put(O.bookFlat('#d9cbb0', 0.14, 0.2, 0.02), -0.55, 0.05, { spans: daily([[-Infinity, 27.6]]), ry: 0.5 });
  put(O.sketchbook(), 0.6, -0.2, { spans: daily([[25.9, 27.3]]), ry: -0.2, wob: { p: 0.008, r: 0.1, f: 2, seed: 91 } });
  // together: their paperback at their end
  put(O.bookFlat('#6b2f3a', 0.13, 0.2, 0.03), -0.62, -0.05, { spans: daily([[28.0, 32.9]]), ry: -0.3 });
  // pregnancy and the small-child years: tea at both places
  put(O.mug('#e3dccf'), -0.46, -0.3, { spans: daily([[33.2, 41.7], [64.8, LOSS]]), wob: { p: 0.015, r: 0.6, f: 2.4, seed: 31 } });
  put(O.mug('#3f5a6a'), -0.72, -0.12, { spans: daily([[37.6, 41.45], [61.2, LOSS]]), wob: { p: 0.015, r: 0.8, f: 2.1, seed: 33 } });
  // working years: a newer laptop, a phone, their folder of papers — gone at retirement
  const lap2 = O.laptop();
  put(lap2, -0.2, -0.25, { dynamicBox: true, spans: daily([[41.8, 64.8]]), ry: Math.PI - 0.05, wob: { p: 0.01, r: 0.05, f: 1.3, seed: 34 } });
  put(O.phone(), 0.12, -0.34, { spans: daily([[41.8, END]]), ry: 0.2, wob: { p: 0.01, r: 0.3, f: 2.7, seed: 35 } });
  put(O.bookFlat('#2f6fb3', 0.23, 0.3, 0.015), -0.62, -0.08, { spans: daily([[41.8, 60.2]]), ry: 0.1 });
  // retired: the paper in the mornings, later a tablet; a jigsaw for a winter
  put(O.newspaper(), -0.16, -0.12, { spans: daily([[68.4, LOSS]]), wob: { p: 0.008, r: 0.08, f: 2.3, seed: 82 } });
  put(O.tablet(), 0.35, -0.28, { spans: daily([[62.6, END]]), wob: { p: 0.008, r: 0.08, f: 1.8, seed: 81 } });
  put(O.jigsaw(), -0.3, 0.24, { spans: daily([[61.4, 63.9]]) });
  // alone: a closed book and water at first; later tea, a plate, an open book, a cutting from the old plant
  put(O.bookFlat('#3d4a3a', 0.14, 0.21, 0.03), -0.2, -0.2, { spans: daily([[LOSS + 0.5, 84.2]]), ry: 0.2 });
  put(O.waterGlass(0.6), -0.04, -0.36, { spans: daily([[LOSS + 0.5, END]]) });
  put(O.openBook('#3d4a3a'), -0.15, 0.1, { spans: daily([[84.4, END]]), ry: 0.08 });
  put(O.cuttingJar(), 0.3, 0.1, { spans: daily([[85.4, END]]) }); // where the fruit bowl was
  put(O.fruitBowl(), 0.22, 0.12, { spans: daily([[36.6, LOSS + 0.8]]) });
  // the child's place: bottle -> sippy cup -> drawings -> juice and school books -> pencil case -> laptop and headphones
  put(O.babyBottle(), -0.32, 0.3, { spans: daily([[33.7, 35.3]]), wob: { p: 0.03, r: 0, f: 2.5, seed: 41 } });
  put(O.sippyCup(), -0.1, 0.3, { spans: daily([[35.7, 39.2]]), wob: { p: 0.015, r: 0.5, f: 2.6, seed: 42 } });
  put(O.paperSheets([childDrawing('scribble', 71), childDrawing('house', 72), childDrawing('rainbow', 73)]), -0.5, 0.22, { spans: daily([[36.2, 40.5]]) });
  put(O.tumbler('#f2a33a'), -0.08, 0.32, { spans: daily([[40.1, 45.8]]), wob: { p: 0.012, r: 0, f: 2.2, seed: 43 } });
  put(O.bookStack(['#e2523a', '#3f8fd0'], 9), -0.42, 0.22, { spans: daily([[40.6, 45.8]]), ry: -0.2 });
  put(O.pencilCase(), -0.28, 0.4, { spans: daily([[40.8, 52.4]]) });
  put(O.laptop(), -0.3, 0.22, { spans: daily([[46.2, 52.4]]), ry: 0.15, wob: { p: 0.012, r: 0.08, f: 1.6, seed: 72 } });
  put(O.headphones(), -0.66, 0.3, { spans: daily([[47.3, 52.3]]), ry: 0.5, wob: { p: 0.012, r: 0.3, f: 2.0, seed: 73 } });

  // ---------- scenes: one coherent table for each moment
  const W = (kind) => win(kind);
  const many = (...kinds) => union(...kinds.map((k) => W(k)));
  // working late, alone: the pizza is half eaten, a beer instead of the usual glass
  put(O.pizzaOpen(5), 0.25, 0.12, { spans: W('pizza'), ry: 0.12, settle: [0, 0.02, 0] });
  put(O.beer(), 0.12, -0.3, { spans: W('pizza') });
  // breakfast alone, laptop already open
  put(O.bowlWith('cereal', 1), 0.08, -0.22, { spans: W('breakfast1') });
  put(O.cupSaucer('#f1ece2', '#5a3220'), 0.32, -0.28, { spans: W('breakfast1') });
  put(O.waterGlass(0.7, '#f2a33a'), 0.3, -0.06, { spans: W('breakfast1') });
  // a date: pasta, two glasses
  put(O.plateWith('pasta', 0.13, 2), -0.15, -0.22, { spans: W('date') });
  put(O.plateWith('pasta', 0.13, 3), -0.64, 0.04, { spans: W('date'), ry: 1.4 });
  const EVENINGS = () => union(W('date'), W('dinner2'), W('lastEvening'), chain('party', 'partyAfter'), chain('games', 'gamesAfter'));
  put(O.wineGlass(0.55), 0.08, -0.32, { spans: EVENINGS() });
  put(O.wineGlass(0.45), -0.62, -0.22, { spans: EVENINGS() });
  put(O.bottle(), 0.15, 0.05, { spans: W('date') });
  // the first dinner they cook together, after moving in
  put(O.plateWith('roast', 0.13, 4), -0.15, -0.22, { spans: many('dinner2', 'familyDinner', 'party') });
  put(O.plateWith('roast', 0.13, 5), -0.64, 0.04, { spans: many('dinner2', 'familyDinner'), ry: 1.5 });
  put(O.servingDish('casserole', 1), 0.32, 0.12, { spans: W('dinner2') });
  put(O.servingDish('bread', 2), 0.35, -0.25, { spans: W('dinner2'), ry: 0.1 });
  put(O.bottle(), 0.12, -0.12, { spans: W('dinner2') });
  // a slow Sunday morning: croissants, tea and coffee, the paper
  put(O.plateWith('croissants', 0.13, 6), 0.25, 0.12, { spans: W('brunch2') });
  put(O.cupSaucer('#f1ece2', '#5a3220'), 0.05, -0.3, { spans: W('brunch2') });
  put(O.cupSaucer('#d9cfc0', '#a8763a'), -0.62, -0.2, { spans: W('brunch2') });
  put(O.plate('#efe9df', 0.1), -0.2, -0.2, { spans: W('brunch2') });
  put(O.plate('#efe9df', 0.1), -0.62, 0.08, { spans: W('brunch2') });
  put(O.waterGlass(0.6, '#f2a33a'), 0.18, -0.18, { spans: W('brunch2') });
  put(O.newspaper(3), -0.2, 0.28, { spans: W('brunch2'), ry: 0.1 });
  // friends round when they were young: pizza boxes, beer, cards; at dawn the boxes are closed and the bottles empty
  put(O.pizzaOpen(3), 0.3, 0.15, { spans: W('friendsYoung'), ry: -0.1 });
  put(O.pizzaClosed(), 0.65, -0.17, { spans: W('friendsYoung') });
  [[-0.15, -0.28], [-0.6, -0.15], [-0.35, 0.32], [0.05, 0.36]].forEach(([x, z], i) => put(O.beer(), x, z, { spans: W('friendsYoung'), wob: { p: 0.01, r: 0, f: 3, seed: 100 + i } }));
  [[0.68, 0.2], [0.76, 0.3], [0.62, 0.32], [0.76, 0.12]].forEach(([x, z]) => put(O.beer(false), x, z, { spans: W('friendsYoungAfter') }));
  put(O.cards(4), -0.3, 0.0, { spans: W('friendsYoung') });
  put(O.servingDish('chips', 3), -0.6, 0.15, { spans: chain('friendsYoung', 'friendsYoungAfter') });
  // a quiet discovery, one morning
  put(O.pregnancyTest(), -0.55, -0.12, { spans: W('pregnant'), ry: 0.3, settle: [0, 0.01, 0] });
  put(O.milkGlass(0.75), -0.7, 0.12, { spans: W('pregnant') });   // theirs: milk
  put(O.champagneFlute(), 0.08, -0.32, { spans: W('pregnant') });
  put(O.champagneBottle(), 0.2, -0.12, { spans: W('pregnant') });
  put(O.mug('#e3dccf'), -0.3, -0.3, { spans: W('babyprep') });
  // getting ready: tiny clothes folded on the table
  put(O.babyThings(), 0.28, 0.18, { spans: W('babyprep'), ry: 0.2 });
  // birthdays: cake at the child's place, tea for the parents, juice for the child
  SCENES.filter((s) => s.kind === 'birthday').forEach((s) => {
    put(O.cake(s.k + 1), -0.15, 0.08, { spans: [sceneSpan(s)], settle: [0, 0.015, 0] });
  });
  put(O.plate('#efe9df', 0.08), 0.15, -0.22, { spans: W('birthday') });
  put(O.plate('#efe9df', 0.08), -0.5, -0.05, { spans: W('birthday') });
  put(O.cupSaucer('#f1ece2', '#a8763a'), -0.35, -0.3, { spans: W('birthday') });
  put(O.cupSaucer('#d9cfc0', '#a8763a'), -0.7, 0.2, { spans: W('birthday') });
  put(O.kidCup(), -0.35, 0.33, { spans: W('birthday') });
  // family dinner: something from the oven, the child's own plate, water for everyone
  put(O.plateWith('kid', 0.1, 7), -0.3, 0.3, { spans: W('familyDinner') });
  put(O.kidCup(), -0.08, 0.36, { spans: W('familyDinner') });
  put(O.servingDish('casserole', 8), 0.25, 0.1, { spans: W('familyDinner') });
  put(O.carafe(), 0.45, -0.2, { spans: many('familyDinner', 'party', 'games', 'lunch') });
  put(O.waterGlass(0.6), 0.08, -0.32, { spans: many('familyDinner', 'lunch', 'soup2', 'supperAlone') });
  put(O.waterGlass(0.5), -0.62, -0.24, { spans: many('familyDinner', 'lunch', 'soup2') });
  // school-day breakfast for three
  put(O.bowlWith('cereal', 9), -0.12, -0.25, { spans: W('familyBreakfast') });
  put(O.bowlWith('cereal', 10), -0.62, 0.0, { spans: W('familyBreakfast') });
  put(O.bowlWith('cereal', 11), -0.3, 0.3, { spans: W('familyBreakfast') });
  put(O.milkCarton(), 0.12, 0.05, { spans: W('familyBreakfast'), ry: 0.4 });
  put(O.plateWith('toast', 0.13, 12), 0.35, 0.12, { spans: W('familyBreakfast') });
  put(O.cupSaucer('#f1ece2', '#5a3220'), 0.12, -0.3, { spans: W('familyBreakfast') });
  put(O.cupSaucer('#d9cfc0', '#a8763a'), -0.62, -0.25, { spans: W('familyBreakfast') });
  put(O.waterGlass(0.7, '#f2a33a'), -0.05, 0.36, { spans: W('familyBreakfast') });
  // a teenager's takeaway night
  put(O.noodleBox(1), -0.15, -0.25, { spans: W('teenTakeaway') });
  put(O.noodleBox(2), -0.62, 0.0, { spans: W('teenTakeaway') });
  put(O.noodleBox(3), -0.3, 0.28, { spans: W('teenTakeaway') });
  put(O.sodaCan('#c4302a'), -0.05, 0.33, { spans: W('teenTakeaway') });
  put(O.waterGlass(0.6), 0.05, -0.32, { spans: W('teenTakeaway') });
  put(O.beer(), -0.62, -0.25, { spans: W('teenTakeaway') });

  // evenings with friends, once the child has gone: a guest at each free place, serving dishes, bottles, flowers or a game
  put(O.plateWith('roast', 0.13, 13), -0.66, 0.06, { spans: W('party'), ry: 1.2 });
  put(O.plateWith('salad', 0.13, 14), -0.25, 0.26, { spans: W('party') });
  put(O.plateWith('roast', 0.13, 15), 0.62, 0.22, { spans: W('party') });
  put(O.wineGlass(0.4), 0.0, 0.36, { spans: union(chain('party', 'partyAfter'), chain('games', 'gamesAfter')) });
  put(O.wineGlass(0.3), 0.8, 0.4, { spans: chain('party', 'partyAfter') });
  put(O.beer(), 0.6, 0.25, { spans: chain('games', 'gamesAfter') });
  put(O.servingDish('saladBowl', 16), 0.22, 0.14, { spans: W('party') });
  put(O.bottle(), 0.1, -0.06, { spans: union(chain('party', 'partyAfter'), chain('games', 'gamesAfter')) });
  put(O.bouquet(), 0.74, -0.33, { spans: chain('party', 'partyAfter') });
  put(O.boardGame(17), -0.25, 0.24, { spans: chain('games', 'gamesAfter'), ry: 0.05 });
  put(O.servingDish('cheese', 18), 0.25, 0.12, { spans: chain('games', 'gamesAfter') });
  put(O.servingDish('chips', 19), -0.62, 0.12, { spans: chain('games', 'gamesAfter') });
  // the morning after: plates stacked, empty bottles, napkins where people sat
  put(O.plateStack(4), -0.25, 0.24, { spans: W('partyAfter'), settle: [0, 0.01, 0] });
  put(O.bottle(), 0.42, -0.15, { spans: many('partyAfter', 'gamesAfter') });
  put(O.napkin('#e9e2d4', 1), -0.58, 0.16, { spans: W('partyAfter') });
  put(O.napkin('#e9e2d4', 2), 0.6, 0.22, { spans: W('partyAfter') });
  put(O.napkin('#e9e2d4', 3), -0.42, -0.1, { spans: W('gamesAfter') });
  put(O.napkin('#e9e2d4', 4), 0.45, 0.33, { spans: W('gamesAfter') });
  // the grown child home for lunch (and sometimes someone very small)
  put(O.plateWith('roast', 0.13, 20), -0.15, -0.22, { spans: W('lunch') });
  put(O.plateWith('salad', 0.13, 21), -0.66, 0.06, { spans: W('lunch'), ry: 0.7 });
  put(O.plateWith('roast', 0.13, 22), -0.25, 0.26, { spans: W('lunch'), ry: -0.4 });
  put(O.servingDish('saladBowl', 23), 0.22, 0.14, { spans: W('lunch') });
  put(O.waterGlass(0.6), 0.0, 0.36, { spans: W('lunch') });
  const lunchWith = (flag) => SCENES.filter((s) => s.kind === 'lunch' && s[flag]).map((s) => sceneSpan(s));
  put(O.plateWith('roast', 0.105, 31), -0.6, 0.355, { spans: lunchWith('partner') }); // the son's partner, at the front beside him
  put(O.waterGlass(0.6), -0.8, 0.3, { spans: lunchWith('partner') });
  put(O.plateWith('kid', 0.1, 32), -0.44, -0.25, { spans: lunchWith('grand') });               // their child, across the table
  put(O.kidCup(), -0.7, -0.36, { spans: lunchWith('grand') });
  // quiet suppers for two in later years
  put(O.bowlWith('soup', 24), -0.15, -0.25, { spans: many('soup2', 'supperAlone') });
  put(O.bowlWith('soup', 25), -0.62, 0.0, { spans: W('soup2') });
  put(O.servingDish('bread', 26), 0.25, 0.1, { spans: W('soup2') });
  // an old couple's breakfast: a pot of tea
  put(O.teapot('#4f6a6a'), 0.2, 0.05, { spans: many('breakfastOld', 'teaVisit') });
  put(O.cupSaucer('#f1ece2', '#a8763a'), -0.15, -0.28, { spans: many('breakfastOld', 'breakfastAlone', 'teaVisit') });
  put(O.cupSaucer('#d9cfc0', '#a8763a'), -0.62, -0.05, { spans: W('breakfastOld') });
  put(O.plateWith('toast', 0.13, 27), 0.25, -0.25, { spans: W('breakfastOld') });
  put(O.plateWith('toast', 0.13, 28), 0.1, -0.22, { spans: W('breakfastAlone') });
  // the last evening with two glasses
  put(O.servingDish('cheese', 29), 0.25, 0.1, { spans: W('lastEvening') });
  // the child visits later on: tea and a cake they brought
  put(O.cupSaucer('#c9a14a', '#a8763a'), -0.25, 0.28, { spans: W('teaVisit') });
  put(O.plateWith('cake', 0.13, 30), 0.25, -0.25, { spans: W('teaVisit') });

  // a chair pulled up for whoever comes, with their coat over it
  const guestChair = add(O.chairSpindle(std('#5d5a54', 0.6)), T.x - 0.28, 0, T.z + 0.82, {
    spans: union(chain('friendsYoung', 'friendsYoungAfter'), chain('party', 'partyAfter'), chain('games', 'gamesAfter'), W('lunch'), W('teaVisit')), ry: Math.PI - 0.12, settle: [0, 0, 0.2],
    update(age, p, o) {
      // pushed back from the table by the morning after: the change happens across the same handoff as the table's
      const late = Math.max(0, ...LATE.map((sp) => eased(age, sp)));
      o.position.z += 0.16 * late; o.position.x -= 0.06 * late; o.rotation.y += 0.35 * late;
    },
  });
  add(O.garment('#6a5a4a', { seed: 12, back: 0.36 }), 0, 0.95, -0.21, { follow: guestChair, spans: many('party', 'games', 'lunch', 'teaVisit'), settle: [0, 0.05, 0] });
  // the son's partner gets a chair of her own at the free place, and their child the child's chair (the one from before: guard and tray long gone)
  add(O.chairSpindle(std('#7a6f60', 0.6)), T.x - 0.78, 0, T.z + 0.82, {
    spans: lunchWith('partner'), ry: Math.PI - 0.06, settle: [0, 0, 0.2], wob: { p: 0.015, r: 0.04, f: 0.9, seed: 71 },
  });
  const kc2 = O.kidChair(); kc2.guard.visible = false;
  add(kc2.g, T.x - 0.68, 0, T.z - 0.8, {
    dynamicBox: true, spans: lunchWith('grand'), ry: 0.04, settle: [0, 0, -0.25], wob: { p: 0.015, r: 0.04, f: 0.9, seed: 72 },
    update() { kc2.seat.position.y = 0.52; },
  });


  // ================================================================ bed
  add(O.throwBlanket('#6a6560', 2, 0.42, 0.34, 0.07), -2.42, 0.64, 1.0, { onBed: true,
    ry: 0.4, settle: [0, 0.05, 0], out: END, fo: 0.25,
    path: [[25, [-2.42, 0.64, 1.0], 0.4], [29, [-3.36, 0.64, 1.6], 1.4]],
  });
  add(O.throwBlanket('#8a3f2a', 5, 0.72, 0.5, 0.07), -2.5, 0.645, 1.4, { onBed: true, in: 29.0, fi: 0.5, ry: 0.32, settle: [0, 0.08, 0],
    path: [[29, [-2.5, 0.645, 1.4], 0.32], [80.5, [-2.45, 0.65, 1.32], 0.6, 0.5]] }); // theirs; it stays
  add(O.cushion('#9a5b3e'), -3.15, 0.6, 0.62, { onBed: true, in: 30.6, ry: 0.15 });
  add(O.cushion('#6f7a5f', 0.38), -2.48, 0.6, 0.64, { onBed: true, in: 31.2, out: 77.5, ry: -0.2 });

  // ================================================================ nightstand
  add(O.bookFlat('#2f4858', 0.13, 0.19, 0.025), -1.6, 0.55, 0.3, { ry: 0.25, wob: { p: 0.02, r: 0.3, f: 1.5, seed: 51 } });
  add(O.bookFlat('#a8452f', 0.13, 0.2, 0.03), -1.6, 0.575, 0.3, { in: 28.6, out: 80.0, fo: 0.4, ry: -0.1, wob: { p: 0.02, r: 0.3, f: 1.3, seed: 52, until: LOSS } }); // theirs: put away with their clothes
  add(O.babyMonitor(), -1.88, 0.55, 0.36, { in: 33.8, out: 37.4, ry: 0.3 });

  // ================================================================ floor: shoes, the cradle, toys
  add(O.leatherShoes('#6b4226'), -1.86, 0, 0.7, { out: END, fo: 0.25, ry: 0, wob: { p: 0.006, r: 0.04, f: 1.3, seed: 61 } });
  // theirs: on date nights, then every day; gone soon after they are
  add(O.heels('#2b2424'), -1.6, 0, 0.79, { spans: [...win('date'), [27.9, LOSS + 0.3, 0.4, 0.2]], ry: 0, wob: { p: 0.004, r: 0.015, f: 1.2, seed: 62 } });
  // visitors' shoes, by the others, only while they are there: the son's partner from the second visit, their child the third time
  add(O.loafers('#34405a'), -1.36, 0, 1.13, { spans: SCENES.filter((s) => s.kind === 'lunch' && s.partner).map((s) => sceneSpan(s)), ry: 0.08, wob: { p: 0.006, r: 0.05, f: 1.4, seed: 64 } });
  add(O.shoes('sneaker', '#d9b04c', 0.6), -1.42, 0, 1.47, { spans: SCENES.filter((s) => s.kind === 'lunch' && s.grand).map((s) => sceneSpan(s)), ry: -0.25, wob: { p: 0.006, r: 0.08, f: 1.4, seed: 65 } });
  add(O.shoes('sneaker', '#c9442e'), -1.73, 0, 1.12, { spans: VISITS_SHOES, ry: -0.1, scale: [[34.9, 0.42], [37, 0.55], [40, 0.68], [45, 0.86], [49, 1.02], [90, 1.04]], wob: { p: 0.006, r: 0.06, f: 1.4, seed: 63 } });

  const cradle = add(O.mosesBasket(), -1.72, 0, 1.5, { in: 33.75, out: 35.6, fi: 0.5, fo: 0.5, ry: 0.08, settle: [0, 0, 0.2] });
  // the bunny is put down somewhere new each time, never carried through the air:
  // in the cradle, on the rug, by the table, on the bed, and finally on top of the shelf
  const bunnyAt = [[33.9, 35.7, -1.72, 0.61, 1.47, 0.4], [35.9, 36.9, -0.85, 0.014, 2.0, -0.6], [37.05, 38.2, -0.78, 0.014, 1.95, 0.9], [38.35, 52.9, -2.18, 0.6, 0.72, 0.2], [53.1, Infinity, 2.95, 2.335, 0.2, -0.3]];
  // each move happens in turn: it is gone from one place before it is seen in the next, meeting halfway between
  const meet = bunnyAt.slice(1).map(([a], i) => (bunnyAt[i][1] + a) / 2), BW = 30;
  const bunnies = bunnyAt.map(([a, b, x, y, z, ry], i) => {
    const a0 = i ? meet[i - 1] : a, b0 = i < meet.length ? PACE.shift(meet[i], -BW) : b;
    const sp = [a0, b0, PACE.shift(a0, BW) - a0, i < meet.length ? meet[i] - b0 : 0.4];
    return add(O.bunny(), x, y, z, { spans: [sp], ry, onBed: true, settle: [0, 0.04, 0], allow: i === 0 ? [cradle] : [] });
  });
  add(O.blocks(3), -0.7, 0.014, 2.35, {
    spans: [[35.3, 39.6, 0.4, 0.4], ...GRANDCHILD.map((g) => [g + 0.05, g + 0.33, 0.08, 0.08])], settle: [0, 0.04, 0],
    path: [[35.3, [-0.7, 0.014, 2.35], 0], [36.1, [-1.3, 0.014, 2.9], 1.2], [37.0, [-1.35, 0.014, 2.3], 1.6], [38.6, [-1.25, 0.014, 2.5], 1.6], [66, [-0.85, 0.014, 2.5], 0.7], [68, [-0.5, 0.014, 2.2], 2.4]],
  });
  add(O.ball(['#d8432f', '#f4f1ea', '#3a7cc6'], 0.075), -0.3, 0.014, 2.1, {
    in: 36.0, out: 49.8,
    path: [[36, [-0.3, 0.014, 2.1]], [37.5, [-1.1, 0.014, 3.1]], [39.5, [-1.3, 0.014, 3.5]], [41, [-0.6, 0.014, 2.0]], [43, [-1.0, 0.014, 3.2]]], // rolls along open floor only
  });
  add(O.balanceBike(), -0.1, 0, 3.0, { in: 36.8, out: 40.8, ry: 0.9, settle: [0.2, 0, 0.1],
    path: [[36.8, [-0.1, 0, 3.0], 0.9], [38.5, [-0.55, 0, 3.2], 0.3]] });

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
  add(O.frame(photoTexture('beach', 3), 0.2, 0.15, { border: 0.016, mat: 0.03, color: '#2a221c' }), -3.4, 1.98, 0, { in: 37.4, settle: [0, -0.03, 0.03] }); // after the family trip
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
    ['scribble', -1.62, 1.24, 67.4, Infinity, 87], // a grandchild's; kept
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
  add(O.radio(), 2.6, shelfY[4], 0.18, {}); // the old player, kept all their life
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
  // a guitar, left behind when they go
  add(O.guitar(), 2.0, 0, 0.56, { in: 46.6, ry: -0.5, settle: [0, 0, 0.15] });
  // leaving home: boxes, briefly
  add(O.cardboardBox(0.5, 0.36, 0.38, true), -0.35, 0, 1.55, { spans: stay(51.9, 52.85), ry: 0.2, settle: [0, 0, 0] });
  add(O.cardboardBox(0.42, 0.3, 0.32), -0.95, 0, 1.3, { spans: stay(52.1, 52.95), ry: -0.3, settle: [0, 0, 0] });
  add(O.cardboardBox(0.42, 0.3, 0.32), -0.94, 0.3, 1.31, { spans: stay(52.3, 52.8), ry: -0.2, settle: [0, 0.05, 0] }); // the top box goes before the one it sits on

  // photographs take the drawings' place above the nightstand
  add(O.frame(photoTexture('hills', 11), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#2a221c' }), -1.92, 1.42, 0, { in: 49.2, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('beach', 12), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#d9cfbf' }), -1.92, 1.72, 0, { in: 55.5, settle: [0, -0.03, 0.03] });
  add(O.frame(photoTexture('sea', 13), 0.15, 0.2, { border: 0.016, mat: 0.03, color: '#8a6a4a' }), -1.64, 1.6, 0, { in: 63.8, settle: [0, -0.03, 0.03] });
  // photo albums where the picture books were
  for (let i = 0; i < 9; i++) {
    const b = O.bookUpright(['#3b3430', '#5a4636', '#2f3b44', '#6b2f3a', '#4b5d3f'][i % 5], 0.31, 0.055, 0.25, 500 + i);
    add(b, 2.33 + i * 0.058, shelfY[0], 0.15, { in: 54.5 + i * 1.6, fi: 0.3, settle: [0, 0, 0.15] });
  }

  // a photograph by the bed
  const np = add(O.frame(photoTexture('sea', 1), 0.07, 0.05, { border: 0.012, mat: 0.02, color: '#c9b08a' }), -1.87, 0.607, 0.36, { in: 80.2, ry: 0.2, settle: [0, 0.03, 0] });
  np.rotation.x = -0.12;

  // the balcony fills with pots, then thins out again
  const potSpec = [[0.5, -1.22, 58.5, 83.0, '#5f7d45'], [0.77, -1.2, 60.0, 79.5, '#6d8a3e'], [1.04, -1.24, 62.0, 77.8, '#7a5a8a'], [1.3, -1.22, 64.2, Infinity, '#55753f']];
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
  add(rug2, -0.72, 0, 2.62, { noCollide: true, in: 60.6, fi: 0.3, out: 83.0, fo: 0.4, ry: 0.13, settle: [0, 0, 0] });
  ctx.rugMat.transparent = true;


  // ================================================================ life between the milestones
  // 29: someone moves in — boxes, briefly
  add(O.cardboardBox(0.5, 0.36, 0.38, true), -0.35, 0, 1.55, { spans: stay(28.85, 29.25), ry: -0.15, settle: [0, 0, 0] });
  add(O.cardboardBox(0.42, 0.3, 0.32), -0.95, 0, 1.3, { spans: stay(28.9, 29.3), ry: 0.25, settle: [0, 0, 0] });
  // the room is repainted once the child is older; the paint things wait on a sheet
  add(O.paintJob(), -0.6, 0, 0.78, { spans: win('paint'), ry: 0.1, settle: [0, 0, 0] });
  // pale patches and tape marks where drawings hung, until the repaint (and the grandchild's, never painted over)
  for (const [k, x, y, a, b] of taped) {
    const until = b > 50 ? Infinity : 49.95;
    add(O.wallTrace(0.22, 0.165), x, y, 0, { noCollide: true, in: b + 0.3, out: until, fi: 0.2, fo: 0.08, settle: [0, 0, 0] });
  }
  // trips away
  for (const sp of win('trip')) add(O.suitcase(), -0.72, 0, 1.3, { spans: [sp], ry: 0.35, settle: [0, 0, 0] });
  // things brought home from those trips stay
  add(O.sailboatModel(), 3.38, 2.335, 0.17, { in: 55.6, settle: [0, 0.03, 0] });
  add(O.carvedBird(), -1.9, 0.55, 0.12, { in: 63.9, ry: 0.8, settle: [0, 0.03, 0] });
  add(O.frame(O.wovenArt(5), 0.13, 0.16, { border: 0.016, mat: 0.03, color: '#3a2a20' }), -1.64, 1.95, 0, { in: 72.0, settle: [0, -0.03, 0.03] });

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
  // late in life the table becomes the centre of the room: the pendant's pool gathers a little and sits over the middle of the table
  const spotAngle = ctx.spot.angle, spotRadius = ctx.spot.shadow.radius, spotAim = ctx.spot.target.position.clone(), spotAimLate = V(T.x - 0.05, 0, T.z + 0.03);

  // one arrangement hands over to the next: overlap where things can share the moment, in turn where they would stand in each other's place
  life.prepareAudit();
  life.handoffs = life.resolveHandoffs({ pace: PACE });

  return {
    life,
    // still: the age has not changed since the last call, so everything that is a function of age alone is already
    // right; only what moves with the clock (the plant's sway, the candle's flicker) is brought up to date
    update(age, t, vel, still = false) {
      if (still) { hero.update(age, t); for (const f of extras) f(age, t); return; }
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
      ctx.dim = dim;
      // walls yellow slowly, are repainted at 50, and age again
      const rp = smooth(49.9, 50.1, age);
      ctx.wallMat.color.copy(wallBase).lerp(wallOld, smooth(25, 49.9, age) * (1 - rp)).lerp(wallNew, rp).lerp(wallOld2, smooth(50.1, 90, age) * rp);
      ctx.curtainMat.color.copy(curtBase).lerp(curtNew, smooth(57.9, 58.2, age));
      ctx.shadeMat.color.copy(shadeBase).lerp(shadeNew, smooth(61.9, 62.2, age));
      ctx.spot.color.copy(spotBase).lerp(spotNew, smooth(59.9, 60.2, age));
      // As the room empties, the table becomes its centre: the pendant's pool narrows a little and settles on the middle
      // of the table, and the lamp keeps its own strength while everything around it goes on dimming (ctx.tableFocus,
      // daylight.js). Its shadows keep the softness they had: the PCF radius follows the narrowing of the shadow camera.
      const late = smooth(78, 86, age);
      ctx.tableFocus = late;
      ctx.spot.angle = lerp(spotAngle, 0.72, late);
      ctx.spot.shadow.radius = spotRadius * Math.tan(lerp(spotAngle, 0.75, late)) / Math.tan(ctx.spot.angle);
      ctx.spot.target.position.lerpVectors(spotAim, spotAimLate, late);
      // 90: the lamps are off, then the candle goes out
      ctx.off = smooth(89.8, 89.92, age);
      ctx.duvetMat.color.copy(duvetBase).lerp(duvetLater, smooth(30, 31, age)).lerp(C('#d6cfc2'), smooth(58, 59, age));
    },
  };
}
