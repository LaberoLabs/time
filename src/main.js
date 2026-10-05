import * as THREE from 'three';
import { buildExterior } from './exterior.js';
import { buildRoom } from './room.js';
import { buildLife, BEATS, todLayers } from './life.js';
import { resolve, applyDaylight } from './daylight.js';
import { buildPost } from './post.js';
import { clamp } from './util.js';
import { encAge } from './tex.js';

const AGE0 = 25, AGE1 = 90;

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const PR_MAX = Math.min(window.devicePixelRatio, 1.5);
let pr = PR_MAX;
renderer.setPixelRatio(pr);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d0907');
// a little warm air in the room: separates near from far without flattening it
scene.fog = new THREE.FogExp2(new THREE.Color('#5a3626'), 0.035);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.05, 6000);
const CAM = new THREE.Vector3(0.2, 1.47, 4.75);
const LOOK = new THREE.Vector3(0.18, 1.2, 0);
camera.position.copy(CAM);
camera.lookAt(LOOK);

// ------------------------------------------------------------------ environment (soft warm interior reflections)
{
  const env = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#2a1d17'), side: THREE.BackSide }));
  box.position.y = 2;
  env.add(box);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb27a').multiplyScalar(5) }));
  win.position.set(0.3, 1.5, -4.9); env.add(win);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8a5a40').multiplyScalar(1.5) }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, -0.9, -1); env.add(glow);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb060').multiplyScalar(6) }));
  lamp.position.set(1.5, 2, 2); env.add(lamp);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.45;
}

// ------------------------------------------------------------------ world
const ctx = { ageU: { value: 0 }, sunDir: null };
const sunVis = new THREE.Vector3(0.062, 0.03, -1).normalize();
const exterior = buildExterior(scene, sunVis);
const room = buildRoom(scene, ctx);
const life = buildLife(scene, ctx);
const post = buildPost(renderer, scene, camera);
// compile every material up front so nothing hitches when it first appears
life.life.setAllVisible(true);
renderer.compile(scene, camera);

// ------------------------------------------------------------------ sizing
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  camera.aspect = a;
  // keep the room's width on narrow screens
  const baseV = 43, baseA = 16 / 9;
  if (a < baseA) {
    const hh = Math.tan(THREE.MathUtils.degToRad(baseV / 2)) * baseA;
    camera.fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(hh / a)) * (a < 1 ? 0.82 : 1));
  } else camera.fov = baseV;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  post.setSize(w, h);
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ scroll = time
const hintEl = document.getElementById('hint');
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
// Scroll is not linear in years: time slows around the moments worth seeing (arrival -> hold -> departure).
const WARP = (() => {
  const N = 13000, A = new Float64Array(N + 1), Cm = new Float64Array(N + 1);
  const box = (a, a0, a1) => { const e = 0.12; const t0 = clamp((a - (a0 - e)) / e, 0, 1), t1 = clamp(((a1 + e) - a) / e, 0, 1); return Math.min(t0 * t0 * (3 - 2 * t0), t1 * t1 * (3 - 2 * t1)); };
  let c = 0;
  for (let i = 0; i <= N; i++) {
    const a = AGE0 + (AGE1 - AGE0) * (i / N);
    let d = 1; for (const [a0, a1, w] of BEATS) if (a > a0 - 0.2 && a < a1 + 0.2) d = Math.max(d, 1 + w * box(a, a0, a1));
    if (i) c += d * (AGE1 - AGE0) / N;
    A[i] = a; Cm[i] = c;
  }
  return { total: c, toAge(p) { const t = p * c; let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; (Cm[m] < t ? (lo = m) : (hi = m)); } const f = (t - Cm[lo]) / Math.max(1e-9, Cm[hi] - Cm[lo]); return A[lo] + (A[hi] - A[lo]) * f; },
    toP(a) { const i = clamp(Math.round(((a - AGE0) / (AGE1 - AGE0)) * N), 0, N); return Cm[i] / c; } };
})();
document.getElementById('scroll').style.height = Math.round(5400 * WARP.total / (AGE1 - AGE0)) + 'vh';
const ageFromScroll = () => WARP.toAge(clamp(scrollY / Math.max(1, maxScroll()), 0, 1));

const params = new URLSearchParams(location.search);
let age = AGE0, target = AGE0;
if (params.has('age')) {
  const a = clamp(parseFloat(params.get('age')), AGE0, AGE1);
  history.scrollRestoration = 'manual';
  requestAnimationFrame(() => scrollTo(0, WARP.toP(a) * maxScroll()));
  age = target = a;
}
addEventListener('scroll', () => {
  target = ageFromScroll();
  if (scrollY > 8) hintEl.classList.add('gone');
}, { passive: true });

// debug / screenshot hook
window.__scene = scene; window.__post = post; window.__THREE = THREE; window.__renderer = renderer;
window.__time = { setAge(a) { target = age = clamp(a, AGE0, AGE1); scrollTo(0, WARP.toP(age) * maxScroll()); }, get age() { return age; } };

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let smear = 0, shownAge = -1, first = true;
let manualT = 0;
function step(dt, t) {
  const prev = age;
  age += (target - age) * (1 - Math.exp(-dt * 5.5));
  if (Math.abs(target - age) < 1e-4) age = target;
  const vel = Math.abs(age - prev) / Math.max(dt, 1e-3); // years per second

  // temporal smear: only when scrubbing years quickly; vanishes at rest
  const want = clamp((vel - 2.0) / 14, 0, 1) * 0.6;
  smear += (want - smear) * (1 - Math.exp(-dt * (want > smear ? 6 : 9)));
  if (want === 0 && smear < 0.015) smear = 0;
  post.smear.amount = smear;

  ctx.ageU.value = encAge(age) / 255;
  room.update(age, t);
  life.update(age, t, vel);
  applyDaylight(resolve(todLayers(age)), ctx, exterior, renderer, scene);
  exterior.update(age, t, camera.position);


  if (params.has('raw')) renderer.render(scene, camera); else post.composer.render(dt);
  if (first) { first = false; canvas.classList.add('on'); document.body.classList.add('ready'); }
}
// adaptive resolution: keep motion smooth on slower GPUs
let perfAcc = 0, perfN = 0;
function adapt(dt) {
  perfAcc += dt; perfN++;
  if (perfN < 90) return;
  const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
  let next = pr;
  if (avg > 0.026 && pr > 0.8) next = Math.max(0.8, pr - 0.2);
  else if (avg < 0.0135 && pr < PR_MAX) next = Math.min(PR_MAX, pr + 0.1);
  if (next !== pr) { pr = next; renderer.setPixelRatio(pr); resize(); }
}
let frameNo = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  // shadows refresh at half rate unless time is moving
  frameNo++;
  renderer.shadowMap.needsUpdate = frameNo % 2 === 0 || Math.abs(target - age) > 1e-4;
  step(dt, clock.elapsedTime);
  if (!document.hidden) adapt(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// render synchronously (for capture when the tab is hidden)
window.__time.render = (n = 1, settle = true) => {
  renderer.shadowMap.needsUpdate = true;
  for (let i = 0; i < n; i++) { manualT += 1 / 60; step(1 / 60, clock.elapsedTime + manualT); }
  if (settle) { age = target; renderer.shadowMap.needsUpdate = true; step(1 / 60, clock.elapsedTime + manualT); }
  return age;
};
window.__time.shot = (a) => {
  window.__time.setAge(a);
  window.__time.render(4);
  canvas.style.transition = 'none'; canvas.classList.add('on'); document.body.classList.add('ready');
  return age;
};
// save a full-resolution frame (dev only)
window.__time.save = async (a, name, crop) => {
  window.__time.shot(a);
  let url;
  if (crop) {
    const [x, y, w, h] = crop.map((v, i) => Math.round(v * (i % 2 ? canvas.height : canvas.width)));
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    c2.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
    url = c2.toDataURL('image/png');
  } else url = canvas.toDataURL('image/png');
  await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: url });
  return name;
};
// simulate a scrub: move target from a to b over `secs`, capture mid-way (dev only)
window.__time.scrub = async (a, b, secs, name, at = 0.6) => {
  window.__time.setAge(a); window.__time.render(3);
  const n = Math.round(secs * 60);
  for (let i = 1; i <= n; i++) {
    target = a + (b - a) * (i / n);
    manualT += 1 / 60; step(1 / 60, clock.elapsedTime + manualT);
    if (i === Math.round(n * at)) {
      const url = canvas.toDataURL('image/png');
      await fetch('/__shot?name=' + name, { method: 'POST', body: url });
    }
  }
  return { age, smear: post.smear.amount };
};
// collision audit across the whole life (dev)
window.__time.audit = (step = 0.1, fine = 0.02) => {
  const L = life.life;
  if (!L.items[0].localBox) L.prepareAudit();
  const B = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  const onBed = (it) => it.onBed;
  const statics = [
    ['table top', B(0.45, 0.71, 1.7, 2.15, 0.758, 2.6)],
    ['bed', B(-3.62, 0, 0.04, -2.02, 0.55, 2.2), onBed],
    ['nightstand', B(-1.93, 0, 0.02, -1.51, 0.548, 0.42)],
    ['plant pot', B(-1.46, 0, 0.28, -1.02, 0.4, 0.72)],
    ['back wall', B(-5, 0, -0.6, 5, 3, 0)],
    ['floor', B(-5, -1, -0.5, 5, 0, 8)],
    ['shelf side L', B(2.25, 0, 0, 2.28, 2.32, 0.34)],
  ];
  const ages = [];
  for (let a = 25; a <= 90; a += step) ages.push(a);
  for (const [a0, a1] of BEATS) for (let a = a0 - 0.1; a <= a1 + 0.1; a += fine) ages.push(a);
  ages.sort((x, y) => x - y);
  const res = L.audit(ages, statics);
  window.__time.setAge(age);
  return res;
};
