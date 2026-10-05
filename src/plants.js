// Plants that grow with the household. Pure functions of age.
import * as THREE from 'three';
import { std, mesh, leafGeo, tube, shade, C } from './build.js';
import { pot } from './objects.js';
import { rng, smooth, keys, clamp, lerp } from './util.js';

// The big paddle-leaf plant by the door. Bought small at 25, repotted at ~34.
export function heroPlant(parent, at) {
  const root = new THREE.Group();
  root.position.copy(at);
  parent.add(root);

  const pot1 = pot(0.15, 0.27), pot2 = pot(0.205, 0.37, std('#d8d0c4', 0.6));
  root.add(pot1, pot2);
  const fadeable = (g) => { const mats = []; g.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; mats.push(m.material); } }); return mats; };
  const p1m = fadeable(pot1), p2m = fadeable(pot2);

  const r = rng(404);
  const vigor = (a) => keys(a, [[20, 0.5], [25, 0.62], [30, 0.82], [34, 0.95], [38, 1.12], [45, 1.32]]);
  const leaves = [];
  const leafGreen = C('#3f5a35'), leafOld = C('#9b8a4a');
  const N = 26;
  for (let i = 0; i < N; i++) {
    const birth = 20.5 + i * (24 / N) + r() * 0.5;
    const life = 6 + r() * 5;
    const az = (i * 2.399) % (Math.PI * 2); // golden angle
    const g = new THREE.Group();
    const pet = new THREE.Group();
    const petMesh = mesh(new THREE.CylinderGeometry(0.008, 0.012, 1, 6).translate(0, 0.5, 0), std('#4f6a3c', 0.6));
    pet.add(petMesh);
    const blade = new THREE.Group();
    const mat = std('#3f5a35', 0.55, { side: THREE.DoubleSide, transparent: true });
    const bl = mesh(leafGeo(1, 0.36, { curl: 0.18 + r() * 0.12, fold: 0.35, segL: 16, segW: 6 }), mat);
    bl.rotation.z = (r() - 0.5) * 0.6; // twist
    blade.add(bl);
    g.add(pet, blade);
    shade(g);
    bl.customDepthMaterial = new THREE.MeshDepthMaterial({ alphaHash: true, side: THREE.DoubleSide });
    root.add(g);
    leaves.push({ g, pet, blade, bl, mat, petMat: petMesh.material, birth, life, az, size: 0.42 + r() * 0.2, len: 0.32 + r() * 0.35, tilt: 0.25 + r() * 0.35, seed: r() });
  }

  return {
    root,
    update(age, t) {
      const repot = smooth(34.2, 34.7, age);
      p1m.forEach((m) => { m.opacity = 1 - repot; m.depthWrite = repot < 0.5; });
      p2m.forEach((m) => { m.opacity = repot; m.depthWrite = repot >= 0.5; });
      pot1.visible = repot < 0.999; pot2.visible = repot > 0.001;
      pot1.position.y = repot * 0.04; pot2.position.y = (1 - repot) * 0.05;
      const soilY = lerp(0.25, 0.34, repot);
      for (const L of leaves) {
        const grow = smooth(L.birth, L.birth + 1.1, age);
        const old = smooth(L.birth + L.life - 0.8, L.birth + L.life, age);
        const gone = smooth(L.birth + L.life - 0.1, L.birth + L.life + 0.5, age);
        const vis = grow * (1 - gone);
        L.g.visible = vis > 0.003;
        if (!L.g.visible) continue;
        const v = vigor(L.birth);
        const sway = Math.sin(t * 0.7 + L.seed * 9) * 0.015 + Math.sin(t * 1.3 + L.seed * 3) * 0.008;
        const len = L.len * v * (0.35 + 0.65 * grow) * 1.25;
        // young leaves stand upright, older ones open outward and droop
        const ageYrs = clamp(age - L.birth, 0, 12);
        const tilt = (0.12 + L.tilt * smooth(0, 2.5, ageYrs) + old * 0.5) * (0.6 + 0.4 * v);
        L.g.position.set(0, soilY, 0);
        L.g.rotation.set(0, L.az, 0);
        L.pet.rotation.set(tilt + sway, 0, 0);
        L.pet.scale.set(1, len, 1);
        // blade at petiole tip, continuing outward, drooping more with age
        const tip = new THREE.Vector3(0, len, 0).applyEuler(L.pet.rotation);
        L.blade.position.copy(tip);
        L.blade.rotation.set(-Math.PI / 2 + tilt * 1.4 + 0.25 + old * 0.4 + sway * 2, 0, 0);
        const s = L.size * v * (0.15 + 0.85 * grow);
        L.blade.scale.set(s, s, s);
        L.mat.color.copy(leafGreen).lerp(leafOld, old);
        L.mat.opacity = 1 - gone;
        L.bl.customDepthMaterial.opacity = 1 - gone;
      }
    },
  };
}

// Trailing ivy along the bookshelf; length grows with age.
export function ivy(parent, potAt, path, { rate = 0.105, start = 0.12, seed = 7 } = {}) {
  const root = new THREE.Group();
  parent.add(root);
  const p = pot(0.07, 0.11, std('#e2dbd0', 0.6));
  p.position.copy(potAt);
  root.add(p);
  const curve = new THREE.CatmullRomCurve3(path.map((q) => new THREE.Vector3(...q)));
  const total = curve.getLength();
  const SEG = 160;
  const stem = mesh(new THREE.TubeGeometry(curve, SEG, 0.0035, 5, false), std('#4c5a33', 0.7));
  stem.castShadow = true;
  root.add(stem);
  const idxPerSeg = 5 * 6;
  const r = rng(seed);
  const leafMat = std('#3d5a30', 0.5, { side: THREE.DoubleSide });
  const lg = leafGeo(0.06, 0.055, { shape: 'heart', curl: 0.1, fold: 0.2, segL: 6, segW: 4 });
  const leaves = [];
  for (let s = 0.03; s < total; s += 0.035 + r() * 0.03) {
    const u = s / total;
    const pt = curve.getPointAt(u), tan = curve.getTangentAt(u);
    const lf = mesh(lg, leafMat);
    lf.position.copy(pt);
    const side = r() < 0.5 ? -1 : 1;
    lf.rotation.set(-0.6 + r() * 0.4, side * (0.6 + r() * 0.8) + Math.atan2(tan.x, tan.z), r() - 0.5);
    lf.castShadow = true; lf.receiveShadow = true;
    root.add(lf);
    leaves.push({ lf, s, sz: 0.7 + r() * 0.6 });
  }
  return {
    root,
    update(age) {
      const L = clamp(start + (age - 25) * rate, 0.01, total);
      const segs = Math.floor((L / total) * SEG);
      stem.geometry.setDrawRange(0, segs * idxPerSeg);
      for (const q of leaves) {
        const g = smooth(q.s, q.s + 0.07, L);
        q.lf.visible = g > 0.01;
        q.lf.scale.setScalar(q.sz * (0.2 + 0.8 * g));
      }
    },
  };
}

// Simple potted olive on the balcony.
export function olive(parent, at) {
  const g = new THREE.Group();
  g.position.copy(at);
  parent.add(g);
  g.add(pot(0.2, 0.36, std('#9c5a40', 0.85)));
  const trunk = mesh(tube([[0, 0.3, 0], [0.03, 0.7, 0.02], [-0.02, 1.0, 0.0]], 0.025, 10, 6), std('#5a4a3a', 0.8));
  g.add(trunk);
  const r = rng(12);
  const lm = std('#6f7d5a', 0.7, { side: THREE.DoubleSide });
  for (let i = 0; i < 160; i++) {
    const a = r() * 6.28, rr = Math.sqrt(r()) * 0.33, y = 0.95 + (r() - 0.4) * 0.45;
    const lf = mesh(leafGeo(0.07, 0.018, { shape: 'lance', segL: 3, segW: 2 }), lm, Math.cos(a) * rr, y, Math.sin(a) * rr);
    lf.rotation.set(r() * 3, r() * 3, r() * 3); g.add(lf);
  }
  shade(g);
  return g;
}
