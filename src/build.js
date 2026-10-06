// Geometry + material builders shared by the room and the life objects.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { blobTexture } from './tex.js';

export const C = (hex) => new THREE.Color(hex);

export function std(color, rough = 0.7, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: 0, ...extra });
}

export function fixNormals(g) {
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
    const l = Math.hypot(x, y, z);
    if (!(l > 1e-6)) n.setXYZ(i, 0, 1, 0);
  }
  return g;
}

// woven cloth: sheen gives the soft rim that reads as fabric
export function fabric(color, extra = {}) {
  const c = C(color);
  return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.92, metalness: 0, sheen: 0.7, sheenRoughness: 0.55, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.45), ...extra });
}
// glazed ceramic / varnished surfaces
export function glazed(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color: C(color), roughness: 0.38, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.18, ...extra });
}

// True when nothing in the material can make a pixel less than fully opaque at opacity 1: no alpha map, alpha test
// or hash, no vertex alpha, normal blending, and a colour map (if any) without a single non-opaque texel. Such a
// material, once fully there, looks exactly the same drawn as a solid (or single-pass) surface as it does blended.
const _solidTex = new WeakMap();
function texSolid(t) {
  if (!t) return true;
  if (_solidTex.has(t)) return _solidTex.get(t);
  let ok = false;
  const im = t.image;
  if (im && im.getContext) {
    const d = im.getContext('2d').getImageData(0, 0, im.width, im.height).data;
    ok = true; for (let i = 3; i < d.length; i += 4) if (d[i] < 255) { ok = false; break; }
  }
  _solidTex.set(t, ok);
  return ok;
}
export function alphaIsOne(m) {
  return m.blending === THREE.NormalBlending && !m.alphaMap && !m.alphaTest && !m.alphaHash && !m.alphaToCoverage
    && !m.vertexColors && !m.premultipliedAlpha && !m.transmission && !m.isShaderMaterial && texSolid(m.map);
}

export function shade(o, cast = true, recv = true) {
  o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } });
  return o;
}

// Box with UVs in world units (tile metres per texture repeat)
export function boxUV(w, h, d, tile = 1, seg = 1) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const uv = g.attributes.uv, n = g.attributes.normal;
  const p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const x = p.getX(i) + w / 2, y = p.getY(i) + h / 2, z = p.getZ(i) + d / 2;
    if (nx > 0.5) uv.setXY(i, z / tile, y / tile);
    else if (ny > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  return g;
}

export function rbox(w, h, d, r = 0.01, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
}

export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// Lathe from [[r, y], ...]
export function lathe(pts, seg = 48) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

// Soft contact shadow decal lying on a surface (y up).
export function contact(w, d, opacity = 0.5, y = 0.002) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, opacity, depthWrite: false, alphaMap: blobTexture() })
  );
  m.material.map = null;
  m.position.y = y;
  m.renderOrder = 1;
  m.userData.isContact = true;
  m.userData.baseOpacity = opacity;
  return m;
}

// Pillow: puffy box
export function pillowGeo(w, h, d) {
  const g = new THREE.BoxGeometry(1, 1, 1, 20, 8, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) * 2, y = p.getY(i) * 2, z = p.getZ(i) * 2; // -1..1
    const ex = 1 - x * x, ez = 1 - z * z;
    const puff = Math.pow(Math.max(ex * ez, 0), 0.45);
    y = y * (0.08 + 0.92 * puff);
    y += Math.sin(x * 3.1 + z * 2.3) * 0.04 * puff; // a little lumpiness
    x *= 1 - 0.06 * (1 - ez); z *= 1 - 0.06 * (1 - ex);
    p.setXYZ(i, x * w / 2, y * h / 2, z * d / 2);
  }
  g.computeVertexNormals();
  return fixNormals(g);
}

// Draped cloth over a rectangular top: footprint w x d, top at y=0, hangs down `drop`.
// wrinkle(seedFn) adds folds. Returns geometry.
export function drapeGeo(w, d, drop, { seg = 64, wr = 0.012, seed = 1, sag = 0.02, freq = 1 } = {}) {
  const ext = drop * 1.0;
  const W = w + ext * 2, D = d + ext * 2;
  const g = new THREE.PlaneGeometry(W, D, seg, Math.round(seg * D / W)).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const s = seed * 13.17;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const ox = Math.max(0, Math.abs(x) - w / 2), oz = Math.max(0, Math.abs(z) - d / 2);
    const out = Math.hypot(ox, oz);
    const cx = Math.sign(x) * Math.min(Math.abs(x), w / 2 + Math.min(ox, 0.03));
    const cz = Math.sign(z) * Math.min(Math.abs(z), d / 2 + Math.min(oz, 0.03));
    const f = freq;
    let y = 0;
    // folds
    y += Math.sin(x * 9 * f + Math.sin(z * 4 * f + s) * 1.5 + s) * wr;
    y += Math.sin(x * 3.1 * f + z * 2.2 * f + s * 0.7) * wr * 1.4; // broad lumps
    y += Math.sin(z * 7 * f + Math.cos(x * 5 * f + s) * 2.0) * wr * 0.8;
    y += Math.sin((x + z) * 17 * f + s * 2) * wr * 0.3;
    // gentle sag towards middle-edges
    y -= sag * (1 - Math.cos(Math.PI * Math.min(1, Math.abs(x) / (w / 2)))) * 0.5;
    let nx = cx, nz = cz;
    if (out > 0) {
      // hanging part: vertical drop with soft roll at edge
      const t = Math.min(out, drop);
      y = y * 0.5 - t + 0.012;
      const flare = Math.sin(Math.min(out / 0.05, 1) * Math.PI / 2) * 0.03 + t * 0.06;
      const len = out || 1;
      nx = cx + (ox / len) * flare * Math.sign(x || 1);
      nz = cz + (oz / len) * flare * Math.sign(z || 1);
      // vertical wave folds on the hanging part
      const along = ox > oz ? z : x;
      const k = Math.sin(along * 22 * f + s) * 0.018 * Math.min(1, t / 0.15);
      if (ox > oz) nx += Math.sign(x) * k; else nz += Math.sign(z) * k;
    }
    p.setXYZ(i, nx, y, nz);
  }
  g.computeVertexNormals();
  return fixNormals(g);
}

// Leaf: paddle/heart leaf, length along +z, midrib fold, curls with `curl`.
export function leafGeo(len = 1, wid = 0.35, { curl = 0.25, fold = 0.25, shape = 'paddle', segL = 14, segW = 6 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, segW, segL);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2; // -1..1 across
    const v = p.getY(i) + 0.5; // 0..1 along
    let wv;
    if (shape === 'heart') wv = Math.sin(Math.PI * Math.pow(v, 0.8)) * (1 - 0.35 * v) + (v < 0.12 ? 0.35 * (1 - v / 0.12) * 0 : 0);
    else if (shape === 'lance') wv = Math.pow(Math.sin(Math.PI * v), 0.9) * 0.6;
    else wv = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.85)), 0.7);
    const x = u * wv * wid / 2;
    const z = v * len;
    const y = Math.abs(u) * fold * wid * 0.5 * wv - curl * len * v * v; // fold up at edges, curl down along length
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return fixNormals(g);
}

export function tube(points, radius = 0.01, seg = 24, rs = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, seg, radius, rs, false);
}
