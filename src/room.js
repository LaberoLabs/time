// The room: shell, French doors, balcony, curtains, light, and the furniture that never leaves.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { std, shade, boxUV, rbox, mesh, lathe, contact, pillowGeo, drapeGeo, C } from './build.js';
import { floorTextures, plasterTextures, woodTexture, linenBump, rugTexture, canvas, toTex, encAge } from './tex.js';
import { rng } from './util.js';

export const TABLE = { x: 1.3, z: 2.15, y: 0.76 };
export const ROOM = { x0: -4.2, x1: 4.2, z1: 7.2, h: 3.0, wall: 0.3, door: { x0: -0.5, x1: 1.3, h: 2.5 } };

// Inject an age-driven history map into a standard material.
// mode receives vec4 hs (decoded times 0..1) and float a (current age, encoded)
export function withHistory(mat, histTex, ageUniform, glsl) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHist = { value: histTex };
    sh.uniforms.uAgeEnc = ageUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvHUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHUv; uniform sampler2D uHist; uniform float uAgeEnc;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + glsl);
  };
  mat.customProgramCacheKey = () => 'hist' + glsl.length;
  return mat;
}

function tableHistory() {
  const W = 1024, H = 512, r = rng(101);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'darken';
  const v = (age) => Math.max(0, Math.min(250, encAge(age)));
  // top is 2.0 x 0.95 m ; u along x, v along z (v=0 at back edge -z? box top: v along -z). helper in metres:
  const P = (mx, mz) => [((mx + 0.85) / 1.7) * W, ((mz + 0.45) / 0.9) * H];
  // ring stains (G)
  const ring = (mx, mz, age, rad = 0.036) => {
    const [px, py] = P(mx, mz);
    x.strokeStyle = `rgb(255,${v(age)},255)`; x.lineWidth = 2.2 + r() * 2;
    x.beginPath(); x.arc(px, py, rad * 512 * (0.95 + r() * 0.1), r() * 2, r() * 2 + 5.2 + r()); x.stroke();
  };
  for (let i = 0; i < 6; i++) ring(0.45 + r() * 0.2, -0.15 + r() * 0.15, 25.6 + i * 1.2);
  for (let i = 0; i < 6; i++) ring(-0.05 + r() * 0.25, -0.12 + r() * 0.2, 28 + i * 0.7);
  for (let i = 0; i < 5; i++) ring(-0.5 + r() * 0.7, 0.05 + r() * 0.2, 32 + i * 0.6, 0.045);
  for (let i = 0; i < 10; i++) ring(-0.8 + r() * 1.6, -0.3 + r() * 0.6, 37 + i * 0.8, 0.042);
  // scratches (R): a few early, many after the child arrives, near the left end
  const scratch = (age, mx, mz) => {
    const [px, py] = P(mx, mz);
    x.strokeStyle = `rgb(${v(age)},255,255)`; x.lineWidth = 0.8 + r() * 1.4;
    x.beginPath(); x.moveTo(px, py);
    const a = r() * 6.28, L = 10 + r() * 50;
    x.quadraticCurveTo(px + Math.cos(a) * L * 0.5 + (r() - 0.5) * 8, py + Math.sin(a) * L * 0.5, px + Math.cos(a) * L, py + Math.sin(a) * L);
    x.stroke();
  };
  for (let i = 0; i < 20; i++) scratch(25.3 + r() * 9, (r() - 0.5) * 1.8, (r() - 0.5) * 0.8);
  for (let i = 0; i < 55; i++) scratch(34.5 + r() * 10.5, -0.95 + Math.pow(r(), 1.6) * 1.4, (r() - 0.5) * 0.85);
  // crayon (B): child's scribbles off the edge of paper
  for (let i = 0; i < 26; i++) {
    const age = 36.3 + r() * 3.2;
    const [px, py] = P(-0.75 + r() * 0.6, -0.05 + r() * 0.4);
    x.strokeStyle = `rgb(255,255,${v(age)})`; x.lineWidth = 2 + r() * 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 4; k++) x.lineTo(px + (r() - 0.5) * 70, py + (r() - 0.5) * 40);
    x.stroke();
  }
  // later life (drawn last so the earlier pattern is unchanged)
  for (let i = 0; i < 14; i++) ring(-0.4 + r() * 0.9, -0.25 + r() * 0.5, 46 + i * 2.1, 0.042);
  for (let i = 0; i < 10; i++) ring(-0.3 + r() * 0.2, -0.28 + r() * 0.12, 77 + i * 1.3, 0.042); // one place, later
  for (let i = 0; i < 25; i++) scratch(45 + r() * 8, (r() - 0.5) * 1.4, 0.05 + r() * 0.35);
  for (let i = 0; i < 20; i++) scratch(53 + r() * 37, (r() - 0.5) * 1.5, (r() - 0.5) * 0.8);
  x.globalCompositeOperation = 'source-over';
  const t = toTex(c, { srgb: false });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function floorHistory() {
  // uv over full floor: u = (x - x0)/W, v = 1 - z/D (PlaneGeometry rotated: v=1 at z=-D/2)
  const W = 1024, H = 1024, r = rng(202);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const FW = ROOM.x1 - ROOM.x0, FD = ROOM.z1;
  const P = (wx, wz) => [((wx - ROOM.x0) / FW) * W, ((wz) / FD) * H];
  x.globalCompositeOperation = 'darken';
  // R: worn paths, encoded as soft gradients: centres wear first
  const path = [[0.4, 0.2], [0.2, 1.2], [0.6, 2.2], [1.2, 2.3], [0.2, 3.8], [-1.2, 2.6], [-1.9, 1.0]];
  for (let k = 0; k < 220; k++) {
    const i = Math.floor(r() * (path.length - 1)), t = r();
    const wx = path[i][0] + (path[i + 1][0] - path[i][0]) * t + (r() - 0.5) * 0.25;
    const wz = path[i][1] + (path[i + 1][1] - path[i][1]) * t + (r() - 0.5) * 0.25;
    const [px, py] = P(wx, wz);
    const g = x.createRadialGradient(px, py, 0, px, py, 50);
    g.addColorStop(0, `rgba(${encAge(29)},255,255,0.5)`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(px - 50, py - 50, 100, 100);
  }
  // G: scuffs — chair legs around the table, toy marks after 35
  for (let i = 0; i < 160; i++) {
    const kid = i > 60;
    const age = kid ? 35 + r() * 10 : 25.5 + r() * 9;
    const wx = kid ? -1.6 + r() * 3.4 : 0.3 + r() * 2.2;
    const wz = kid ? 1.4 + r() * 2.8 : 2.2 + r() * 1.7;
    const [px, py] = P(wx, wz);
    x.strokeStyle = `rgb(255,${encAge(age)},255)`; x.lineWidth = 0.8 + r() * 1.5;
    const a = r() * 6.28, L = 6 + r() * 24;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
  const t = toTex(c, { srgb: false });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function buildRoom(scene, ctx) {
  RectAreaLightUniformsLib.init();
  const room = new THREE.Group();
  scene.add(room);
  const { x0, x1, z1, h, wall } = ROOM;
  const D = ROOM.door;

  // ------------------------------------------------------------ materials
  const fl = floorTextures();
  const floorMat = withHistory(
    std('#f2ece6', 0.66, { map: fl.map, bumpMap: fl.bump, bumpScale: 1.2 }),
    floorHistory(), ctx.ageU, /* glsl */`
      { vec4 hs = texture2D(uHist, vHUv);
        float wear = clamp((uAgeEnc - hs.r) * 7.15, 0., 1.) * (1. - hs.r);
        float scuff = smoothstep(hs.g, hs.g + 0.01, uAgeEnc);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.08, 1.02) + 0.015, wear * 0.55);
        roughnessFactor = mix(roughnessFactor, 0.8, wear * 0.7);
        diffuseColor.rgb *= 1. - scuff * 0.22;
        roughnessFactor = mix(roughnessFactor, 0.9, scuff);
        float y45 = uAgeEnc / 0.3077; float years = min(y45, 1.) + max(y45 - 1., 0.) * 0.12;
        diffuseColor.rgb *= 1.0 - years * 0.05; }`
  );
  const pl = plasterTextures();
  const wallMat = std('#efe4d8', 0.92, { map: pl.map, bumpMap: pl.bump, bumpScale: 0.5 });
  const trimMat = std('#ebe4d8', 0.5);
  const ceilMat = std('#c9bdb2', 0.95, { map: pl.map });

  // ------------------------------------------------------------ floor + ceiling + walls
  const floorGeo = new THREE.PlaneGeometry(x1 - x0, z1).rotateX(-Math.PI / 2);
  // stretch base map uv by real size, keep raw uv for history (map transform handles repeat)
  fl.map.repeat.set((x1 - x0) / 4, z1 / 4); fl.bump.repeat.copy(fl.map.repeat);
  const floor = mesh(floorGeo, floorMat, (x0 + x1) / 2, 0, z1 / 2);
  floor.receiveShadow = true;
  room.add(floor);

  const ceil = mesh(new THREE.PlaneGeometry(x1 - x0, z1 + wall).rotateX(Math.PI / 2), ceilMat, (x0 + x1) / 2, h, z1 / 2 - wall / 2);
  ceil.receiveShadow = true; ceil.castShadow = true;
  room.add(ceil);

  const wallPiece = (w, hh, d, cx, cy, cz) => {
    const m = mesh(boxUV(w, hh, d, 1.6), wallMat, cx, cy, cz);
    m.castShadow = m.receiveShadow = true;
    room.add(m);
    return m;
  };
  // back wall, with the door opening
  wallPiece(D.x0 - x0, h, wall, (x0 + D.x0) / 2, h / 2, -wall / 2);
  wallPiece(x1 - D.x1, h, wall, (x1 + D.x1) / 2, h / 2, -wall / 2);
  wallPiece(D.x1 - D.x0, h - D.h, wall, (D.x0 + D.x1) / 2, D.h + (h - D.h) / 2, -wall / 2);
  // side walls (thick, to block light)
  wallPiece(wall, h, z1 + wall, x0 - wall / 2, h / 2, z1 / 2 - wall / 2);
  wallPiece(wall, h, z1 + wall, x1 + wall / 2, h / 2, z1 / 2 - wall / 2);
  // roof slab above ceiling to stop light leaks
  const roof = mesh(new THREE.BoxGeometry(x1 - x0 + 1, 0.3, z1 + 2), wallMat, 0, h + 0.15, z1 / 2 - 0.5);
  roof.castShadow = true; room.add(roof);

  // skirting along the back wall
  for (const [a, b] of [[x0, D.x0 - 0.09], [D.x1 + 0.09, x1]]) {
    const s = mesh(new THREE.BoxGeometry(b - a, 0.11, 0.018), trimMat, (a + b) / 2, 0.055, 0.009);
    shade(s); room.add(s);
  }
  // door casing (interior trim) + jamb lining + threshold
  const casW = 0.09;
  const cas = [
    [casW, D.h + casW, D.x0 - casW / 2, (D.h + casW) / 2],
    [casW, D.h + casW, D.x1 + casW / 2, (D.h + casW) / 2],
    [D.x1 - D.x0 + casW * 2, casW, (D.x0 + D.x1) / 2, D.h + casW / 2],
  ];
  for (const [w, hh, cx, cy] of cas) { const m = mesh(rbox(w, hh, 0.03, 0.006), trimMat, cx, cy, 0.012); shade(m); room.add(m); }
  for (const s of [-1, 1]) {
    const m = mesh(new THREE.BoxGeometry(0.02, D.h, wall), trimMat, s < 0 ? D.x0 + 0.01 : D.x1 - 0.01, D.h / 2, -wall / 2);
    shade(m); room.add(m);
  }
  const head = mesh(new THREE.BoxGeometry(D.x1 - D.x0, 0.02, wall), trimMat, (D.x0 + D.x1) / 2, D.h - 0.01, -wall / 2); shade(head); room.add(head);
  const thr = mesh(rbox(D.x1 - D.x0 + 0.04, 0.035, wall + 0.04, 0.008), std('#8a6a50', 0.5), (D.x0 + D.x1) / 2, 0.0175, -wall / 2);
  shade(thr); room.add(thr);

  // ------------------------------------------------------------ French doors (open outward)
  const glassMat = new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false });
  const leafW = (D.x1 - D.x0) / 2;
  const makeLeaf = (dir) => {
    const g = new THREE.Group();
    const add = (w, hh, cx, cy, mat = trimMat, d = 0.045) => { const m = mesh(rbox(w, hh, d, 0.004, 2), mat, dir * cx, cy, 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const st = 0.065;
    add(st, D.h - 0.01, st / 2, D.h / 2);
    add(st, D.h - 0.01, leafW - st / 2, D.h / 2);
    add(leafW, 0.08, leafW / 2, D.h - 0.05);
    add(leafW, 0.36, leafW / 2, 0.18 + 0.01, trimMat, 0.04); // bottom panel
    add(leafW, 0.05, leafW / 2, 0.385);
    // muntins: 2 columns x 4 rows
    const gx0 = st, gx1 = leafW - st, gy0 = 0.41, gy1 = D.h - 0.09;
    add(0.022, gy1 - gy0, (gx0 + gx1) / 2, (gy0 + gy1) / 2, trimMat, 0.028);
    for (let i = 1; i < 4; i++) add(gx1 - gx0, 0.022, (gx0 + gx1) / 2, gy0 + (gy1 - gy0) * i / 4, trimMat, 0.028);
    const glass = mesh(new THREE.PlaneGeometry(gx1 - gx0, gy1 - gy0), glassMat, dir * (gx0 + gx1) / 2, (gy0 + gy1) / 2, 0);
    glass.castShadow = false; glass.renderOrder = 2;
    g.add(glass);
    // handle
    const hnd = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12), std('#2a2522', 0.35, { metalness: 0.8 }), dir * (leafW - 0.04), 1.05, 0.04);
    hnd.rotation.z = Math.PI / 2; g.add(hnd);
    return g;
  };
  const leafL = makeLeaf(1); leafL.position.set(D.x0 + 0.02, 0, -wall + 0.02); leafL.rotation.y = THREE.MathUtils.degToRad(72);
  const leafR = makeLeaf(-1); leafR.position.set(D.x1 - 0.02, 0, -wall + 0.02); leafR.rotation.y = THREE.MathUtils.degToRad(-64);
  room.add(leafL, leafR);

  // ------------------------------------------------------------ balcony
  const balc = new THREE.Group(); room.add(balc);
  const slab = mesh(boxUV(4.0, 0.22, 1.5, 1), std('#9c8f86', 0.85, { map: pl.map }), 0.4, -0.11, -wall - 0.75);
  slab.receiveShadow = true; slab.castShadow = true; balc.add(slab);
  const facade = mesh(boxUV(6, 4, 0.05, 2.2), wallMat, 0.4, 1.0, -wall - 0.02); // outer facade edge pieces
  facade.visible = false; balc.add(facade);
  const iron = std('#1b1716', 0.45, { metalness: 0.6 });
  const railZ = -wall - 1.38;
  const rail = mesh(new THREE.BoxGeometry(4.0, 0.035, 0.05), iron, 0.4, 1.0, railZ); balc.add(rail);
  const rail2 = mesh(new THREE.BoxGeometry(4.0, 0.025, 0.03), iron, 0.4, 0.1, railZ); balc.add(rail2);
  for (let xx = -1.55; xx <= 2.35; xx += 0.105) {
    const b = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), iron, xx, 0.55, railZ); balc.add(b);
  }
  // little curls at the rail top
  for (let xx = -1.5; xx <= 2.3; xx += 0.42) {
    const t = mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16), iron, xx, 0.93, railZ); balc.add(t);
  }
  shade(balc);
  // side returns of the balcony railing
  for (const sx of [-1.6, 2.4]) {
    const sr = mesh(new THREE.BoxGeometry(0.035, 0.035, 1.38), iron, sx, 1.0, -wall - 0.69); shade(sr); balc.add(sr);
    for (let zz = -wall - 0.1; zz > railZ; zz -= 0.11) { const b = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), iron, sx, 0.55, zz); shade(b); balc.add(b); }
  }

  // ------------------------------------------------------------ curtains (animated)
  const curtainMat = new THREE.MeshStandardMaterial({
    color: C('#f1e6d6'), roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.72,
    emissive: C('#ff9c5c'), emissiveIntensity: 0.12, bumpMap: linenBump(3), bumpScale: 0.3, depthWrite: false,
  });
  const curtains = [];
  const mkCurtain = (cx, w, phase) => {
    const W = w, H = 2.66, sx = 36, sy = 50;
    const g = new THREE.PlaneGeometry(W, H, sx, sy);
    g.translate(0, -H / 2, 0);
    const base = g.attributes.position.array.slice();
    const m = mesh(g, curtainMat, cx, 2.72, 0.09);
    m.castShadow = true; m.receiveShadow = true; m.userData.noAO = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ alphaHash: true, opacity: 0.45 });
    m.renderOrder = 3;
    room.add(m);
    curtains.push({ m, base, W, H, phase });
  };
  mkCurtain(D.x0 - 0.28, 0.48, 0.0);
  mkCurtain(D.x1 + 0.52, 0.48, 2.1);
  const rod = mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.1), iron, (D.x0 + D.x1) / 2 + 0.12, 2.74, 0.09);
  rod.rotation.z = Math.PI / 2; shade(rod); room.add(rod);

  const updateCurtains = (t) => {
    for (const c of curtains) {
      const p = c.m.geometry.attributes.position;
      const a = p.array;
      for (let i = 0; i < p.count; i++) {
        const bx = c.base[i * 3], by = c.base[i * 3 + 1];
        const down = -by / c.H; // 0 top .. 1 bottom
        const u = bx / c.W;
        const folds = Math.sin(u * 26 + c.phase) * 0.035 + Math.sin(u * 61 + c.phase * 3) * 0.008;
        const breeze = (Math.sin(t * 0.55 + c.phase + down * 1.4) * 0.6 + Math.sin(t * 1.27 + u * 3 + c.phase) * 0.4);
        const sway = breeze * 0.055 * Math.pow(down, 1.6);
        a[i * 3] = bx * (1 - 0.12 * down) + Math.sin(t * 0.4 + c.phase) * 0.02 * down * down;
        a[i * 3 + 1] = by;
        a[i * 3 + 2] = folds * (0.85 + 0.3 * down) + sway + 0.04 * down * down;
      }
      p.needsUpdate = true;
      c.m.geometry.computeVertexNormals();
    }
  };

  // ------------------------------------------------------------ static furniture
  const oak = woodTexture([30, 38, 40], 5);
  const walnut = woodTexture([22, 34, 26], 8);
  const woodMat = std('#ffffff', 0.55, { map: oak });
  const darkWood = std('#ffffff', 0.5, { map: walnut });

  // bed
  const bed = new THREE.Group(); room.add(bed);
  const bx0 = -3.62, bx1 = -2.02, bz0 = 0.04, bz1 = 2.2;
  const bcx = (bx0 + bx1) / 2, bw = bx1 - bx0, bd = bz1 - bz0;
  bed.add(mesh(rbox(bw + 0.06, 0.24, bd, 0.02), woodMat, bcx, 0.2, bz0 + bd / 2));
  for (const [lx, lz] of [[bx0 + 0.05, bz1 - 0.05], [bx1 - 0.05, bz1 - 0.05]]) bed.add(mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), woodMat, lx, 0.05, lz));
  bed.add(mesh(rbox(bw + 0.08, 1.05, 0.06, 0.015), woodMat, bcx, 0.525, 0.05));
  const linenB = linenBump(4);
  const sheetMat = std('#efe9df', 0.95, { bumpMap: linenB, bumpScale: 0.4 });
  bed.add(mesh(rbox(bw - 0.04, 0.22, bd - 0.1, 0.06, 4), sheetMat, bcx, 0.42, bz0 + 0.06 + (bd - 0.1) / 2));
  const duvetMat = std('#f3eee6', 0.95, { bumpMap: linenB, bumpScale: 0.5 });
  const duvet = mesh(drapeGeo(bw - 0.02, bd - 0.62, 0.26, { seg: 110, wr: 0.024, seed: 2, sag: 0.0, freq: 0.8 }), duvetMat, bcx, 0.565, bz0 + 0.62 + (bd - 0.62) / 2 - 0.02);
  bed.add(duvet);
  // folded-back top edge of duvet
  const fold = mesh(rbox(bw - 0.02, 0.06, 0.2, 0.03, 4), duvetMat, bcx, 0.57, bz0 + 0.66);
  fold.rotation.x = 0.1; bed.add(fold);
  const pilMat = std('#fbf7f0', 0.95, { bumpMap: linenB, bumpScale: 0.3, emissive: C('#3a2a20'), emissiveIntensity: 0.25 });
  const p1 = mesh(pillowGeo(0.66, 0.22, 0.46), pilMat, bx0 + 0.42, 0.64, 0.3); p1.rotation.set(-0.55, 0.05, 0.03); bed.add(p1);
  const p2 = mesh(pillowGeo(0.66, 0.2, 0.46), pilMat, bx1 - 0.4, 0.63, 0.31); p2.rotation.set(-0.5, -0.06, -0.03); bed.add(p2);
  shade(bed);
  const bedContact = contact(bw + 0.5, bd + 0.4, 0.55); bedContact.position.set(bcx, 0.003, bz0 + bd / 2); room.add(bedContact);

  // nightstand
  const ns = new THREE.Group(); room.add(ns);
  const NX = -1.72;
  ns.add(mesh(rbox(0.42, 0.5, 0.4, 0.012), darkWood, NX, 0.3, 0.22));
  for (const [lx, lz] of [[NX - 0.18, 0.05], [NX + 0.18, 0.05], [NX - 0.18, 0.39], [NX + 0.18, 0.39]]) ns.add(mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), darkWood, lx, 0.03, lz));
  ns.add(mesh(new THREE.BoxGeometry(0.36, 0.004, 0.005), std('#1a1410', 0.6), NX, 0.4, 0.422));
  ns.add(mesh(new THREE.SphereGeometry(0.012, 12, 8), std('#c8a46a', 0.3, { metalness: 0.8 }), NX, 0.46, 0.425));
  // lamp
  const lampBase = mesh(lathe([[0, 0], [0.06, 0], [0.075, 0.05], [0.07, 0.14], [0.04, 0.22], [0.012, 0.26], [0, 0.26]]), std('#b9876a', 0.45), NX - 0.03, 0.55, 0.2);
  ns.add(lampBase);
  const shadeMat = new THREE.MeshStandardMaterial({ color: C('#f2e3c8'), roughness: 0.95, side: THREE.DoubleSide, emissive: C('#ffb36b'), emissiveIntensity: 1.6 });
  const lampShade = mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 40, 1, true), shadeMat, NX - 0.03, 0.92, 0.2);
  ns.add(lampShade);
  shade(ns); lampShade.castShadow = false;
  const nsContact = contact(0.7, 0.6, 0.6); nsContact.position.set(NX, 0.003, 0.24); room.add(nsContact);
  const lampLight = new THREE.PointLight(C('#ffae62'), 1.4, 4.5, 2);
  lampLight.position.set(NX - 0.03, 0.9, 0.26); room.add(lampLight);

  // rug
  const rugMat = std('#ffffff', 1.0, { map: rugTexture(), bumpMap: linenBump(8), bumpScale: 0.8 });
  const rug = mesh(rbox(2.2, 0.014, 3.0, 0.006, 2), rugMat, -0.95, 0.007, 2.75);
  rug.rotation.y = 0.05; rug.receiveShadow = true; room.add(rug);
  ctx.rug = rug; ctx.rugMat = rugMat;

  // table
  const table = new THREE.Group(); room.add(table);
  const topMat = withHistory(std('#ffffff', 0.36, { map: woodTexture([24, 42, 30], 12, 1024, 260) }), tableHistory(), ctx.ageU, /* glsl */`
    { vec4 hs = texture2D(uHist, vHUv);
      float sc = smoothstep(hs.r, hs.r + 0.006, uAgeEnc);
      float st = smoothstep(hs.g, hs.g + 0.01, uAgeEnc);
      float cr = smoothstep(hs.b, hs.b + 0.006, uAgeEnc);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.22 + vec3(0.012, 0.008, 0.004), sc * 0.22);
      roughnessFactor = mix(roughnessFactor, 0.5, max(sc * 0.5, st * 0.6));
      diffuseColor.rgb *= 1. - st * 0.28;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.08, 0.06), cr * 0.45);
      float y45 = uAgeEnc / 0.3077; float years = min(y45, 1.) + max(y45 - 1., 0.) * 0.12;
      diffuseColor.rgb *= 1. - years * 0.08; }`);
  const tcx = TABLE.x, tcz = TABLE.z, tw = 1.7, td = 0.9, th = TABLE.y;
  const top = mesh(new THREE.BoxGeometry(tw, 0.05, td), [darkWood, darkWood, topMat, darkWood, darkWood, darkWood], 0, th - 0.025, 0);
  table.add(top);
  table.add(mesh(new THREE.BoxGeometry(tw - 0.2, 0.09, td - 0.2), darkWood, 0, th - 0.095, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.03, 0.022, th - 0.05, 12), darkWood, sx * (tw / 2 - 0.11), (th - 0.05) / 2, sz * (td / 2 - 0.1));
    table.add(leg);
    const lc = contact(0.18, 0.18, 0.7); lc.position.set(sx * (tw / 2 - 0.11), 0.003, sz * (td / 2 - 0.1)); table.add(lc);
  }
  table.position.set(tcx, 0, tcz);
  shade(table);
  const tContact = contact(tw + 0.4, td + 0.4, 0.35); tContact.position.y = 0.003; table.add(tContact);
  ctx.table = table; ctx.tableTopY = th;

  // bookshelf
  const shelf = new THREE.Group(); room.add(shelf);
  const sx0 = 2.25, sw = 1.25, sdp = 0.34, sh = 2.32;
  const sMat = darkWood;
  shelf.add(mesh(new THREE.BoxGeometry(0.03, sh, sdp), sMat, sx0 + 0.015, sh / 2, sdp / 2));
  shelf.add(mesh(new THREE.BoxGeometry(0.03, sh, sdp), sMat, sx0 + sw - 0.015, sh / 2, sdp / 2));
  shelf.add(mesh(new THREE.BoxGeometry(sw, sh, 0.012), sMat, sx0 + sw / 2, sh / 2, 0.006));
  ctx.shelfYs = [0.06, 0.44, 0.82, 1.2, 1.58, 1.96];
  for (const y of [...ctx.shelfYs, sh - 0.015]) shelf.add(mesh(new THREE.BoxGeometry(sw, 0.03, sdp), sMat, sx0 + sw / 2, y, sdp / 2));
  shade(shelf);
  const shContact = contact(sw + 0.3, 0.7, 0.6); shContact.position.set(sx0 + sw / 2, 0.003, 0.22); room.add(shContact);
  ctx.shelf = { x0: sx0 + 0.03, x1: sx0 + sw - 0.03, d: sdp };

  // pendant above the table
  const pend = new THREE.Group(); room.add(pend);
  const py = 1.98;
  pend.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, h - py - 0.2), std('#111', 0.5), 0, py + 0.2 + (h - py - 0.2) / 2, 0));
  const domeMat = std('#1a1a1b', 0.45, { metalness: 0.3, side: THREE.DoubleSide, envMapIntensity: 0.4 });
  pend.add(mesh(lathe([[0.025, 0.24], [0.04, 0.22], [0.05, 0.17], [0.12, 0.1], [0.2, 0.03], [0.235, 0.0], [0.233, -0.004]], 64), domeMat, 0, py, 0));
  const inner = mesh(lathe([[0.232, -0.002], [0.2, 0.028], [0.12, 0.095], [0.05, 0.16], [0.03, 0.2]], 64), new THREE.MeshStandardMaterial({ color: C('#f4e8d6'), emissive: C('#ffb468'), emissiveIntensity: 0.45, side: THREE.BackSide, roughness: 0.6 }), 0, py, 0);
  pend.add(inner);
  const bulb = mesh(new THREE.SphereGeometry(0.045, 24, 16), new THREE.MeshBasicMaterial({ color: C('#ffe2b0').multiplyScalar(14) }), 0, py + 0.07, 0);
  pend.add(bulb);
  pend.position.set(tcx + 0.05, 0, tcz - 0.05);
  pend.traverse((m) => { if (m.isMesh) m.castShadow = m !== bulb && m !== inner; });
  const spot = new THREE.SpotLight(C('#ffb468'), 9, 5, 0.95, 0.9, 2);
  spot.position.set(tcx + 0.05, py + 0.05, tcz - 0.05);
  spot.target.position.set(tcx + 0.05, 0, tcz - 0.05);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.radius = 4;
  spot.shadow.camera.near = 0.1;
  room.add(spot, spot.target);
  const pglow = new THREE.PointLight(C('#ffb468'), 0.35, 3.5, 2); pglow.position.set(tcx, py + 0.4, tcz); room.add(pglow);

  // ------------------------------------------------------------ light
  const sunDir = ctx.sunDir;
  const sun = new THREE.DirectionalLight(C('#ffb985'), 7.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3;
  sun.target.position.set(0, 0, 2);
  room.add(sun, sun.target);
  ctx.sun = sun;

  const sky = new THREE.RectAreaLight(C('#ffc4a0'), 3.6, D.x1 - D.x0, D.h);
  sky.position.set((D.x0 + D.x1) / 2, D.h / 2, 0.2);
  sky.lookAt((D.x0 + D.x1) / 2, D.h / 2, 5);
  room.add(sky);
  const sky2 = new THREE.RectAreaLight(C('#b9a0c8'), 0.7, D.x1 - D.x0, D.h);
  sky2.position.set((D.x0 + D.x1) / 2, D.h / 2 + 0.3, 0.25);
  sky2.lookAt((D.x0 + D.x1) / 2, 2.8, 4);
  room.add(sky2);

  const bounce = new THREE.PointLight(C('#ffae7a'), 1.9, 7, 1.5);
  bounce.position.set(-0.6, 0.35, 2.4); room.add(bounce);
  ctx.bounce = bounce;
  const bounce2 = new THREE.PointLight(C('#ffb488'), 1.1, 5, 1.6);
  bounce2.position.set(0.3, 0.45, 1.0); room.add(bounce2);
  const hemi = new THREE.HemisphereLight(C('#7a6c8c'), C('#4a2c1c'), 0.3);
  room.add(hemi);

  // ------------------------------------------------------------ sun shafts (ray-marched inside a sheared box)
  const beamU = {
    uDir: { value: new THREE.Vector3(0, -0.5, 1) }, uCol: { value: C('#ffb47e') }, uInt: { value: 0.3 },
    uRect: { value: new THREE.Vector4(D.x0, D.x1, 0.0, D.h) }, uZ: { value: -wall }, uLen: { value: 7.0 }, uTime: { value: 0 },
  };
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(24), 3));
  beamGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]);
  const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
    uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */`
      uniform vec3 uDir, uCol; uniform float uInt, uZ, uLen, uTime; uniform vec4 uRect; varying vec3 vW;
      vec3 toLocal(vec3 p){ float t = (p.z - uZ) / uDir.z; return vec3(p.x - uDir.x * t, p.y - uDir.y * t, t); }
      float hash(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.7, 41.3))) * 43758.5); }
      float dens(vec3 p){
        if (p.y < 0.0 || p.z < uZ) return 0.;
        vec3 l = toLocal(p);
        float ex = smoothstep(uRect.x, uRect.x + 0.18, l.x) * smoothstep(uRect.y, uRect.y - 0.18, l.x);
        float ey = smoothstep(uRect.z + 0.05, uRect.z + 0.35, l.y) * smoothstep(uRect.w, uRect.w - 0.25, l.y);
        float f = exp(-l.z * 0.32) * smoothstep(0.0, 0.6, l.z);
        float st = 0.75 + 0.25 * sin(l.x * 21. + l.y * 3.) * sin(l.x * 6.3 - l.y * 9.1 + 1.3);
        return ex * ey * f * st;
      }
      void main(){
        vec3 ro = cameraPosition, rd = normalize(vW - cameraPosition);
        // slab intersection in local sheared space (affine -> linear in s)
        vec3 a = toLocal(ro), b = toLocal(ro + rd) - a;
        vec3 lo = vec3(uRect.x, uRect.z, 0.), hi = vec3(uRect.y, uRect.w, uLen);
        vec3 t0 = (lo - a) / b, t1 = (hi - a) / b;
        vec3 tmin = min(t0, t1), tmax = max(t0, t1);
        float s0 = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
        float s1 = min(min(tmax.x, tmax.y), tmax.z);
        if (s1 <= s0) discard;
        float acc = 0.; const int N = 18; float dl = (s1 - s0) / float(N);
        float j = hash(vec3(gl_FragCoord.xy, 1.));
        for (int i = 0; i < N; i++) { vec3 p = ro + rd * (s0 + (float(i) + j) * dl); acc += dens(p); }
        acc *= dl;
        float g = 0.45 + 0.8 * pow(max(dot(rd, -uDir), 0.), 8.);
        gl_FragColor = vec4(uCol * uInt * acc * g, 1.);
      }`,
  }));
  beam.frustumCulled = false; beam.renderOrder = 5; beam.userData.noAO = true;
  room.add(beam);
  const setBeam = (travel) => {
    beamU.uDir.value.copy(travel);
    const pa = beamGeo.attributes.position;
    const cs = [[D.x0, 0], [D.x1, 0], [D.x1, D.h], [D.x0, D.h]];
    const L = beamU.uLen.value;
    cs.forEach(([cx, cy], i) => {
      pa.setXYZ(i, cx, cy, -wall);
      pa.setXYZ(i + 4, cx + travel.x * L, cy + travel.y * L, -wall + travel.z * L);
    });
    pa.needsUpdate = true;
  };

  ctx.duvetMat = duvetMat;
  return {
    room, curtains, sun, floorMat, beamU,
    update(age, t) {
      updateCurtains(t);
      // sun drifts with the seasons — shadows travel as years pass
      const season = Math.sin((age - 25) * Math.PI * 2 - 0.6);
      const az = THREE.MathUtils.degToRad(17 + season * 4.5 + (age - 25) * 0.1);
      const el = THREE.MathUtils.degToRad(27 + season * 2.5);
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      sun.position.copy(sun.target.position).addScaledVector(dir, 20);
      ctx.season = season;
      setBeam(dir.clone().negate());
    },
  };
}
