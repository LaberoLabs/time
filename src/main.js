import * as THREE from 'three';
import { buildExterior } from './exterior.js';
import { buildRoom } from './room.js';
import { buildLife } from './life.js';
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
const ageEl = document.getElementById('age');
const hintEl = document.getElementById('hint');
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
const ageFromScroll = () => AGE0 + (AGE1 - AGE0) * clamp(scrollY / Math.max(1, maxScroll()), 0, 1);

const params = new URLSearchParams(location.search);
let age = AGE0, target = AGE0;
if (params.has('age')) {
  const a = clamp(parseFloat(params.get('age')), AGE0, AGE1);
  history.scrollRestoration = 'manual';
  requestAnimationFrame(() => scrollTo(0, ((a - AGE0) / (AGE1 - AGE0)) * maxScroll()));
  age = target = a;
}
addEventListener('scroll', () => {
  target = ageFromScroll();
  if (scrollY > 8) hintEl.classList.add('gone');
}, { passive: true });

// debug / screenshot hook
window.__scene = scene; window.__post = post; window.__THREE = THREE; window.__renderer = renderer;
window.__time = { setAge(a) { target = age = clamp(a, AGE0, AGE1); scrollTo(0, ((age - AGE0) / (AGE1 - AGE0)) * maxScroll()); }, get age() { return age; } };

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
  renderer.toneMappingExposure = 1.0 - 0.1 * (ctx.dim || 0);
  exterior.update(age, t, camera.position);

  const a = Math.floor(age + 1e-6);
  if (a !== shownAge) { shownAge = a; ageEl.textContent = a; }

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
