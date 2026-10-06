// Life objects: everything that arrives, moves, ages or leaves is a pure function of age.
import * as THREE from 'three';
import { presence, noise1, keys, moves } from './util.js';
import { alphaIsOne } from './build.js';

const _v = new THREE.Vector3();

export class Life {
  // pace (optional): ease every arrival and departure evenly in scroll distance rather than in years, so a
  // change reads the same wherever time is slowed, including at the edges of a slowed moment
  constructor(parent, pace = null) {
    this.pace = pace;
    this.root = new THREE.Group();
    parent.add(this.root);
    this.items = [];
    // On every render three brings every object's world matrix up to date, there or not. A thing that is not there
    // (visible = false) is neither drawn nor casts a shadow, so its matrices are left alone until it is there again.
    // Nothing can be stale then: three rebuilds an object's matrix from its current position, rotation and scale on
    // every update, so the first update it is visible for places it, and all it carries, exactly. (Otherwise this is
    // three's own Object3D.updateMatrixWorld; the audit and the handoffs update the objects they read themselves.)
    this.root.updateMatrixWorld = function (force) {
      if (this.matrixAutoUpdate) this.updateMatrix();
      if (this.matrixWorldNeedsUpdate || force) {
        if (this.matrixWorldAutoUpdate === true) {
          if (this.parent === null) this.matrixWorld.copy(this.matrix);
          else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        }
        this.matrixWorldNeedsUpdate = false;
        force = true;
      }
      const children = this.children;
      for (let i = 0, l = children.length; i < l; i++) if (children[i].visible) children[i].updateMatrixWorld(force);
    };
  }

  // spans: [[in, out?, fi?, fo?], ...] ; one object may come and go several times.
  add(obj, o = {}) {
    const it = {
      obj,
      spans: (o.spans || [[o.in ?? -Infinity, o.out ?? Infinity, o.fi ?? 0.4, o.fo ?? 0.4]]).map((x) => x.slice()), // owned: handoffs may adjust them
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
        // a thing that was solid to begin with is drawn solid again whenever it is fully there (see update)
        c.userData.solid = !mt.transparent && mt.opacity >= 1 && mt.depthWrite && alphaIsOne(mt);
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
    const P = this.pace, u = P ? P.units(age) : age;
    for (const [a, b, fi = 0.4, fo = 0.4] of it.spans) {
      const q = P ? presence(u, P.units(a), P.units(b), fi && P.units(a + fi) - P.units(a), fo && P.units(b + fo) - P.units(b)) : presence(age, a, b, fi, fo);
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
      // Fully there, a solid thing is drawn as the opaque surface it is: at opacity 1 that gives the same pixels as
      // blending, at a fraction of the cost. While arriving or leaving (or dimmed by its own update) it stays a blended fade.
      for (const m of it.fadeMats) if (m.userData.solid) {
        const t = m.opacity < 1;
        if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
      }
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
// world box of a visible object, as the audit sees it (null if nothing to test)
Life.prototype.worldBox = function (it, eps = 0.004) {
  it.obj.updateMatrixWorld(true);
  let wb;
  if (it.dynamicBox) {
    wb = new THREE.Box3();
    it.obj.traverseVisible((m) => { if (!m.isMesh || m.userData.isContact) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); _b.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); wb.union(_b); });
    wb.expandByScalar(-eps);
  } else wb = it.localBox.clone().applyMatrix4(it.obj.matrixWorld).expandByScalar(-eps);
  return wb.isEmpty() ? null : wb;
};

// ---------------------------------------------------------------- handoffs
// When one arrangement gives way to the next, the old things leave while the new ones arrive (a crossfade),
// except where an incoming thing would stand where an outgoing one still is: that pair hands over in turn,
// the old one going a little earlier and the new one coming a little later, meeting where their changes met.
// Everything stays a pure function of age; this only adjusts the spans once, at build time.
Life.prototype.resolveHandoffs = function ({ eps = 0.004, minHold = 0.02, pace = null } = {}) {
  // a fade moved along keeps its width in scroll distance (time may be slowed differently where it lands)
  const keepWidth = (from, dur, to) => (pace ? pace.shift(to, pace.vh(from, from + dur)) - to : dur);
  if (!this.items[0].localBox) this.prepareAudit();
  const able = this.items.filter((it) => !it.follow && !it.noCollide && it.localBox && !it.localBox.isEmpty());
  let cache = new Map();
  const boxesAt = (age) => {
    const k = Math.round(age * 1e5);
    let m = cache.get(k);
    if (!m) {
      this.update(age); m = new Map();
      for (const it of able) if (it.obj.visible) { const b = this.worldBox(it, eps); if (b) m.set(it, b); }
      cache.set(k, m);
    }
    return m;
  };
  const report = { pairs: 0, passes: 0, short: [] };
  for (let pass = 0; pass < 8; pass++) {
    cache = new Map();
    const ins = [], outs = [];
    for (const it of able) for (const s of it.spans) {
      const [a, b, fi = 0.4, fo = 0.4] = s;
      if (Number.isFinite(a)) ins.push({ it, s, t0: a, t1: a + fi });
      if (Number.isFinite(b)) outs.push({ it, s, t0: b, t1: b + fo });
    }
    let changed = 0;
    for (const I of ins) for (const O of outs) {
      if (I.it === O.it || !(I.t0 < O.t1 - 1e-6 && O.t0 < I.t1 - 1e-6)) continue; // not changing at the same time
      if (I.it.allow.includes(O.it.obj) || O.it.allow.includes(I.it.obj)) continue;
      const bi = boxesAt(I.t1 + 1e-4).get(I.it), bo = boxesAt(O.t0 - 1e-4).get(O.it);
      if (!bi || !bo || !bi.intersectsBox(bo)) continue;
      const m = (Math.min(I.t0, O.t0) + Math.max(I.t1, O.t1)) / 2;
      const fo0 = O.s[3] ?? 0.4, foVh = pace ? pace.vh(O.s[1], O.s[1] + fo0) : 0;
      const startFor = (end) => (pace ? pace.shift(end, -foVh) : end - fo0); // when the old one must start leaving to be gone by `end`
      let gone = Math.max(m, O.s[0] + (O.s[2] ?? 0.4) + minHold); // the old one keeps its own full moment
      const b1 = Math.min(O.s[1], Math.max(startFor(gone), O.s[0] + (O.s[2] ?? 0.4) + minHold));
      if (b1 !== O.s[1]) { O.s[3] = keepWidth(O.s[1], fo0, b1); O.s[1] = b1; }
      gone = O.s[1] + O.s[3];
      if (I.s[0] < gone) { I.s[2] = keepWidth(I.s[0], I.s[2] ?? 0.4, gone); I.s[0] = gone; }
      changed++;
      I.t0 = I.s[0]; I.t1 = I.s[0] + I.s[2]; O.t0 = O.s[1]; O.t1 = O.s[1] + O.s[3];
    }
    report.pairs += changed; report.passes = pass + 1;
    if (!changed) break;
  }
  // anything that would no longer reach a readable moment
  for (const it of able) for (const [a, b, fi = 0.4] of it.spans) if (Number.isFinite(a) && Number.isFinite(b) && a + fi + minHold > b) report.short.push([this.items.indexOf(it), +a.toFixed(3), +b.toFixed(3)]);
  return report;
};

Life.prototype.audit = function (ages, statics, eps = 0.004) {
  const hits = new Map();
  const note = (k, a) => { const h = hits.get(k); if (h) { h.last = a; h.n++; } else hits.set(k, { first: a, last: a, n: 1 }); };
  for (const age of ages) {
    this.update(age);
    const live = [];
    for (const it of this.items) {
      if (!it.obj.visible || it.follow || it.noCollide || !it.localBox || it.localBox.isEmpty()) continue;
      const wb = this.worldBox(it, eps);
      if (wb) live.push([it, wb]);
    }
    for (let i = 0; i < live.length; i++) {
      const [a, A] = live[i];
      for (let j = i + 1; j < live.length; j++) { const [b, B] = live[j]; if (a.allow.includes(b.obj) || b.allow.includes(a.obj)) continue; if (A.intersectsBox(B)) note(`${a.label}  <->  ${b.label}`, age); }
      for (const [name, S, skip] of statics) { if (skip && skip(a)) continue; if (A.intersectsBox(S)) note(`${a.label}  <->  [${name}]`, age); }
    }
  }
  return [...hits.entries()].map(([k, h]) => `${h.first.toFixed(2)}-${h.last.toFixed(2)} (${h.n})  ${k}`);
};
