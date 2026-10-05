// Life objects: everything that arrives, moves, ages or leaves is a pure function of age.
import * as THREE from 'three';
import { presence, noise1, keys, moves } from './util.js';

const _v = new THREE.Vector3();

export class Life {
  constructor(parent) {
    this.root = new THREE.Group();
    parent.add(this.root);
    this.items = [];
  }

  // spans: [[in, out?, fi?, fo?], ...] ; one object may come and go several times.
  add(obj, o = {}) {
    const it = {
      obj,
      spans: o.spans || [[o.in ?? -Infinity, o.out ?? Infinity, o.fi ?? 0.4, o.fo ?? 0.4]],
      base: obj.position.clone(),
      baseRot: obj.rotation.clone(),
      baseScale: obj.scale.clone(),
      settle: o.settle ?? [0, 0.03, 0],      // offset while arriving (being put down)
      lift: o.lift ?? o.settle ?? [0, 0.03, 0], // offset while leaving
      path: o.path || null,                    // [[age, [x,y,z], ry?, dur?]] moves at listed ages
      wob: o.wob || null,                      // { p: metres, r: radians, f: per-year, seed }
      scale: o.scale || null,                  // [[age, s]] or fn
      update: o.update || null,                // (age, p, obj, it)
      follow: o.follow || null,                // another object whose transform this one rides on
      noCollide: o.noCollide || false,         // flat traces etc. excluded from the collision audit
      allow: o.allow || [],                    // objects it may legitimately touch (bunny in its basket)
      dynamicBox: o.dynamicBox || false,       // parts that move or hide: recompute its box each time
      onBed: o.onBed || false,
      fadeMats: [],
      contacts: [],
    };
    obj.traverse((m) => {
      if (m.userData.isContact) { it.contacts.push(m); return; }
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const cl = mats.map((mt) => {
        const c = mt.clone();
        c.userData.baseOpacity = mt.opacity;
        c.transparent = true;
        it.fadeMats.push(c);
        return c;
      });
      m.material = Array.isArray(m.material) ? cl : cl[0];
      if (m.castShadow) {
        m.customDepthMaterial = new THREE.MeshDepthMaterial({ alphaHash: true });
        it.fadeMats.push(m.customDepthMaterial);
        m.customDepthMaterial.userData.baseOpacity = 1;
      }
    });
    this.root.add(obj);
    this.items.push(it);
    return obj;
  }

  presence(it, age) {
    let p = 0, arriving = true;
    for (const [a, b, fi = 0.4, fo = 0.4] of it.spans) {
      const q = presence(age, a, b, fi, fo);
      if (q > p) { p = q; arriving = age < a + fi + 0.001; }
    }
    return [p, arriving];
  }

  update(age) {
    for (const it of this.items) {
      const [p, arriving] = this.presence(it, age);
      const o = it.obj;
      o.visible = p > 0.002;
      if (!o.visible) continue;
      // transform
      let pos = it.base, ry = it.baseRot.y;
      if (it.path) {
        const v = moves(age, it.path.map(([a, P, r, d]) => [a, [...P, r ?? it.baseRot.y], d]));
        pos = _v.set(v[0], v[1], v[2]); ry = v[3];
      }
      o.position.copy(pos);
      o.rotation.set(it.baseRot.x, ry, it.baseRot.z);
      if (it.wob) {
        const { p: wp = 0.02, r: wr = 0.06, f = 1.2, seed = 1, until = Infinity } = it.wob;
        const wa = Math.min(age, until); // a chair nobody moves any more
        o.position.x += noise1(wa * f, seed) * wp;
        o.position.z += noise1(wa * f, seed + 7) * wp;
        o.rotation.y += noise1(wa * f * 0.8, seed + 3) * wr;
      }
      if (it.follow) {
        const f = it.follow, c = Math.cos(f.rotation.y), sn = Math.sin(f.rotation.y);
        const x = o.position.x, z = o.position.z;
        o.position.set(f.position.x + x * c + z * sn, f.position.y + o.position.y, f.position.z - x * sn + z * c);
        o.rotation.y += f.rotation.y;
      }
      if (p < 1) {
        const k = (1 - p) * (1 - p);
        const off = arriving ? it.settle : it.lift;
        o.position.x += off[0] * k; o.position.y += off[1] * k; o.position.z += off[2] * k;
      }
      if (it.scale) {
        const s = typeof it.scale === 'function' ? it.scale(age) : keys(age, it.scale);
        o.scale.copy(it.baseScale).multiplyScalar(s);
      }
      // fade
      for (const m of it.fadeMats) {
        m.opacity = m.userData.baseOpacity * p;
        if (!m.isMeshDepthMaterial) m.depthWrite = m.userData.baseOpacity >= 1 ? p > 0.35 : false;
      }
      for (const c of it.contacts) c.material.opacity = c.userData.baseOpacity * p;
      if (it.update) it.update(age, p, o, it);
    }
  }

  setAllVisible(v) { for (const it of this.items) it.obj.visible = v; }
}

// ---------------------------------------------------------------- collision audit (dev)
// Tests every pair of visible life objects, and each against static furniture, at many ages.
const _b = new THREE.Box3(), _m = new THREE.Matrix4();
Life.prototype.prepareAudit = function () {
  for (const it of this.items) {
    const o = it.obj;
    const saved = [o.position.clone(), o.rotation.clone(), o.scale.clone(), o.visible];
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrixWorld(true);
    const box = new THREE.Box3();
    o.traverse((m) => {
      if (!m.isMesh || m.userData.isContact) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      _b.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); box.union(_b);
    });
    it.localBox = box;
    [o.position, o.rotation, o.scale].forEach((v, i) => v.copy(saved[i])); o.visible = saved[3];
    const sz = box.getSize(new THREE.Vector3());
    it.label = `${this.items.indexOf(it)} @(${o.position.x.toFixed(2)},${o.position.y.toFixed(2)},${o.position.z.toFixed(2)}) ${sz.x.toFixed(2)}x${sz.y.toFixed(2)}x${sz.z.toFixed(2)}`;
  }
};
Life.prototype.audit = function (ages, statics, eps = 0.004) {
  const hits = new Map();
  const note = (k, a) => { const h = hits.get(k); if (h) { h.last = a; h.n++; } else hits.set(k, { first: a, last: a, n: 1 }); };
  for (const age of ages) {
    this.update(age);
    const live = [];
    for (const it of this.items) {
      if (!it.obj.visible || it.follow || it.noCollide || !it.localBox || it.localBox.isEmpty()) continue;
      it.obj.updateMatrixWorld(true);
      let wb;
      if (it.dynamicBox) {
        wb = new THREE.Box3();
        it.obj.traverseVisible((m) => { if (!m.isMesh || m.userData.isContact) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); _b.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); wb.union(_b); });
        wb.expandByScalar(-eps);
      } else wb = it.localBox.clone().applyMatrix4(it.obj.matrixWorld).expandByScalar(-eps);
      if (wb.isEmpty()) continue;
      live.push([it, wb]);
    }
    for (let i = 0; i < live.length; i++) {
      const [a, A] = live[i];
      for (let j = i + 1; j < live.length; j++) { const [b, B] = live[j]; if (a.allow.includes(b.obj) || b.allow.includes(a.obj)) continue; if (A.intersectsBox(B)) note(`${a.label}  <->  ${b.label}`, age); }
      for (const [name, S, skip] of statics) { if (skip && skip(a)) continue; if (A.intersectsBox(S)) note(`${a.label}  <->  [${name}]`, age); }
    }
  }
  return [...hits.entries()].map(([k, h]) => `${h.first.toFixed(2)}-${h.last.toFixed(2)} (${h.n})  ${k}`);
};
