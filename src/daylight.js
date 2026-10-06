// Time of day is its own system: each life scene asks for the light it happens in
// (breakfast in the morning, a dinner at dusk, a party into the night, the quiet dawn after).
// Between scenes the room rests in its golden evening.
import * as THREE from 'three';

const C = (h) => new THREE.Color(h);
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const sunDirFrom = (az, el) => {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
};

export const PRESETS = {
  golden: {
    sunVis: V(0.062, 0.03, -1), sunDir: sunDirFrom(17, 27), sun: 7.5, sunCol: C('#ffb985'), beam: 0.3,
    zenith: C('#3c4c8a'), mid: C('#d98a8c'), horizon: C('#ff9a52'), glow: C('#ff9a4a'), cloudLit: C('#ffa070'), cloudDark: C('#9a6680'), disc: 1,
    sky: 3.6, skyCol: C('#ffc4a0'), sky2: 0.7, sky2Col: C('#b9a0c8'),
    hemi: 0.3, hemiSky: C('#7a6c8c'), hemiGround: C('#4a2c1c'),
    deep: C('#24224a'), far: C('#a8707c'), glint: C('#ff9a50'),
    city: C('#a87488'), city2: C('#c48e98'), hills: C('#b48e98'), cityLights: 0,
    lamps: 1, exposure: 1, fog: C('#5a3626'),
  },
  morning: {
    sunVis: V(0, -0.2, 1), sunDir: sunDirFrom(17, 40), sun: 0, sunCol: C('#fff4e8'), beam: 0,
    zenith: C('#4a78c0'), mid: C('#8fb4dc'), horizon: C('#dfe8ec'), glow: C('#ffffff'), cloudLit: C('#ffffff'), cloudDark: C('#aab6c8'), disc: 0,
    sky: 6.0, skyCol: C('#dce6f4'), sky2: 1.3, sky2Col: C('#c8d8f0'),
    hemi: 0.6, hemiSky: C('#a8b8d0'), hemiGround: C('#5a4a3a'),
    deep: C('#2a4a6a'), far: C('#9ab4c4'), glint: C('#ffffff'),
    city: C('#8e9cae'), city2: C('#a8b4c2'), hills: C('#b8c4d0'), cityLights: 0,
    lamps: 0, exposure: 0.95, fog: C('#6a6a72'),
  },
  day: {
    sunVis: V(0.1, 0.9, -0.45), sunDir: sunDirFrom(24, 56), sun: 5.0, sunCol: C('#fff0dc'), beam: 0.1,
    zenith: C('#3c6cb8'), mid: C('#7aa8d8'), horizon: C('#cfdce4'), glow: C('#fff6e8'), cloudLit: C('#ffffff'), cloudDark: C('#9aa8bc'), disc: 0,
    sky: 5.0, skyCol: C('#f0ece4'), sky2: 1.0, sky2Col: C('#c8d4e8'),
    hemi: 0.5, hemiSky: C('#b0b8c8'), hemiGround: C('#6a4a32'),
    deep: C('#24486c'), far: C('#8aa8c0'), glint: C('#fff6e0'),
    city: C('#8696a8'), city2: C('#a0aebe'), hills: C('#b4c0cc'), cityLights: 0,
    lamps: 0, exposure: 0.95, fog: C('#6a5a4a'),
  },
  dusk: {
    sunVis: V(0.07, -0.035, -1), sunDir: sunDirFrom(15, 6), sun: 0.7, sunCol: C('#ff7a50'), beam: 0.04,
    zenith: C('#1c2350'), mid: C('#7a4a6a'), horizon: C('#e0703a'), glow: C('#ff6a30'), cloudLit: C('#ff8a5a'), cloudDark: C('#4a3450'), disc: 0,
    sky: 1.2, skyCol: C('#c87878'), sky2: 0.5, sky2Col: C('#7a6a9a'),
    hemi: 0.25, hemiSky: C('#5a4a6a'), hemiGround: C('#2a1a14'),
    deep: C('#141630'), far: C('#6a4050'), glint: C('#ff7040'),
    city: C('#5a3a50'), city2: C('#704a5a'), hills: C('#7a5a66'), cityLights: 0.6,
    lamps: 1, exposure: 1.05, fog: C('#3a2830'),
  },
  night: {
    sunVis: V(0, -0.5, -1), sunDir: sunDirFrom(15, -10), sun: 0, sunCol: C('#000000'), beam: 0,
    zenith: C('#05070f'), mid: C('#0c1020'), horizon: C('#1c1c2e'), glow: C('#000000'), cloudLit: C('#20243a'), cloudDark: C('#0c0e18'), disc: 0,
    sky: 0.35, skyCol: C('#4a5680'), sky2: 0.15, sky2Col: C('#3a4470'),
    hemi: 0.12, hemiSky: C('#2a3050'), hemiGround: C('#140c0a'),
    deep: C('#04060c'), far: C('#0c1020'), glint: C('#ffd090'),
    city: C('#0c0e16'), city2: C('#10121c'), hills: C('#141824'), cityLights: 1,
    lamps: 1.15, exposure: 1.15, fog: C('#141018'),
  },
  dawn: {
    sunVis: V(0, -0.1, 1), sunDir: sunDirFrom(17, 30), sun: 0, sunCol: C('#ffd8c8'), beam: 0,
    zenith: C('#6a78a8'), mid: C('#c4a8c0'), horizon: C('#efc8bc'), glow: C('#ffffff'), cloudLit: C('#f8d8d8'), cloudDark: C('#8a7a9a'), disc: 0,
    sky: 2.6, skyCol: C('#e0cbd8'), sky2: 0.8, sky2Col: C('#b8b0d0'),
    hemi: 0.45, hemiSky: C('#9a98b8'), hemiGround: C('#4a3a34'),
    deep: C('#3a3a58'), far: C('#b8a0b0'), glint: C('#ffe0d0'),
    city: C('#9a90a8'), city2: C('#b0a4b8'), hills: C('#c0b4c4'), cityLights: 0.25,
    lamps: 0.5, exposure: 1.05, fog: C('#5a5060'),
  },
};

function clone(p) {
  const o = {};
  for (const k in p) o[k] = p[k] && p[k].clone ? p[k].clone() : p[k];
  return o;
}
function mixInto(o, b, t) {
  for (const k in o) {
    if (o[k] && o[k].isColor) o[k].lerp(b[k], t);
    else if (o[k] && o[k].isVector3) o[k].lerp(b[k], t).normalize();
    else o[k] = o[k] + (b[k] - o[k]) * t;
  }
}

// layers: [[presetName, weight], ...] applied in order over the golden base
export function resolve(layers) {
  const s = clone(PRESETS.golden);
  for (const [name, w] of layers) if (w > 0.0005) mixInto(s, PRESETS[name], Math.min(1, w));
  return s;
}

export function applyDaylight(s, ctx, ext, renderer, scene) {
  const r = ctx.lights;
  // sun + shafts
  ctx.sun.intensity = s.sun; ctx.sun.color.copy(s.sunCol);
  ctx.sun.position.copy(ctx.sun.target.position).addScaledVector(s.sunDir, 20);
  ctx.setBeam(s.sunDir.clone().negate()); ctx.beamU.uInt.value = s.beam; ctx.beamU.uCol.value.copy(s.sunCol);
  const sunK = Math.min(1, s.sun / 7.5);
  r.bounce.intensity = 1.9 * sunK; r.bounce2.intensity = 1.1 * sunK;
  r.bounce.color.copy(s.sunCol); r.bounce2.color.copy(s.sunCol);
  r.sky.intensity = s.sky; r.sky.color.copy(s.skyCol); r.sky2.intensity = s.sky2; r.sky2.color.copy(s.sky2Col);
  r.hemi.intensity = s.hemi; r.hemi.color.copy(s.hemiSky); r.hemi.groundColor.copy(s.hemiGround);
  // interior lamps: time of day x the life's own dimming x the final switch-off
  const lamps = s.lamps * (1 - (ctx.off || 0));
  const dim = ctx.dim || 0;
  ctx.lampLight.intensity = 1.4 * lamps; ctx.shadeMat.emissiveIntensity = 1.6 * lamps;
  ctx.spot.intensity = 9 * (1 - 0.45 * dim * (1 - (ctx.tableFocus || 0))) * lamps; // the table lamp holds as it becomes the room's centre ctx.pendantGlow.intensity = 0.35 * (1 - 0.5 * dim) * lamps;
  ctx.pendantInner.emissiveIntensity = 0.45 * lamps; ctx.bulbMat.color.copy(ctx.bulbBase).multiplyScalar(Math.max(0.02, lamps));
  // sky, water, city
  const u = ext.skyU;
  u.sunDir.value.copy(s.sunVis); u.zenith.value.copy(s.zenith); u.mid.value.copy(s.mid); u.horizon.value.copy(s.horizon);
  u.glowCol.value.copy(s.glow); u.cloudLit.value.copy(s.cloudLit); u.cloudDark.value.copy(s.cloudDark); u.uDisc.value = s.disc;
  const w = ext.waterU; w.deep.value.copy(s.deep); w.far.value.copy(s.far); w.glint.value.copy(s.glint);
  ext.cityMat.color.copy(s.city); ext.cityMat2.color.copy(s.city2); ext.hillMat.color.copy(s.hills);
  ext.cityLights.material.opacity = s.cityLights; ext.cityLights.visible = s.cityLights > 0.01;
  renderer.toneMappingExposure = s.exposure * (1.0 - 0.1 * dim - 0.06 * (ctx.off || 0));
  scene.fog.color.copy(s.fog);
}
