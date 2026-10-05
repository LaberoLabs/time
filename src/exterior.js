// Sky, water, far city. Unlit shaders, colors in linear HDR.
import * as THREE from 'three';
import { rng } from './util.js';

const lin = (hex) => new THREE.Color(hex);

const NOISE = /* glsl */`
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<6;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
`;

export function buildExterior(scene, sunVisDir) {
  const ext = new THREE.Group();
  scene.add(ext);

  // ------------------------------------------------------------ sky
  const skyU = {
    sunDir: { value: sunVisDir.clone() },
    uCloud: { value: 0 },
    uTime: { value: 0 },
    zenith: { value: lin('#2e3a6e') },
    mid: { value: lin('#c98a9a') },
    horizon: { value: lin('#f7a066') },
    sunCol: { value: lin('#fff0c8') },
    glowCol: { value: lin('#ff9a4a') },
    cloudLit: { value: lin('#ffb08a') },
    cloudDark: { value: lin('#8a6a8c') },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: NOISE + /* glsl */`
        uniform vec3 sunDir, zenith, mid, horizon, sunCol, glowCol, cloudLit, cloudDark; uniform float uCloud, uTime;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float e = d.y;
          float sd = max(dot(d, normalize(sunDir)), 0.);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.16, e));
          col = mix(col, zenith, smoothstep(0.12, 0.6, e));
          col += glowCol * pow(sd, 10.) * 0.35 + glowCol * pow(sd, 120.) * 0.7 + sunCol * pow(sd, 3000.) * 2.;
          // clouds: long horizontal streaks
          float dy = max(d.y + 0.08, 0.03);
          vec2 cp = vec2(d.x / dy, 1. / dy);
          cp *= vec2(0.9, 2.6);
          cp.x += uCloud * 0.18 + uTime * 0.002;
          float n = fbm(cp * vec2(0.55, 1.6));
          float band = smoothstep(0.02, 0.06, e) * (1. - smoothstep(0.22, 0.45, e));
          float c = smoothstep(0.50, 0.78, n) * band;
          float lit = pow(sd, 3.) * 0.8 + 0.25;
          vec3 cc = mix(cloudDark, cloudLit * (1.0 + 3. * pow(sd, 12.)), clamp(lit + (n - 0.6) * 1.5, 0., 1.));
          col = mix(col, cc, c * 0.85);
          // sun disc
          float disc = smoothstep(0.99955, 0.9997, sd);
          col += sunCol * disc * 9.;
          // below horizon (hidden by water, but keep tidy)
          col = mix(col, horizon * 0.8, smoothstep(0.0, -0.05, e));
          gl_FragColor = vec4(col, 1.);
        }`,
    })
  );
  sky.renderOrder = -10;
  ext.add(sky);

  // ------------------------------------------------------------ water
  const waterU = {
    sunDir: skyU.sunDir, uTime: skyU.uTime,
    deep: { value: lin('#2c2a48') }, far: { value: lin('#c98a7c') }, glint: { value: lin('#ffb870') },
    camPos: { value: new THREE.Vector3() },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 3000, 1, 1).rotateX(-Math.PI / 2).translate(0, -14, -1500),
    new THREE.ShaderMaterial({
      uniforms: waterU,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: NOISE + /* glsl */`
        uniform vec3 sunDir, deep, far, glint, camPos; uniform float uTime; varying vec3 vW;
        void main(){
          vec3 v = normalize(vW - camPos);
          float dist = length(vW.xz - camPos.xz);
          vec3 sd = normalize(sunDir);
          // horizontal angular offset from sun
          float az = atan(v.x, -v.z) - atan(sd.x, -sd.z);
          float fres = smoothstep(80., 1600., dist);
          vec3 col = mix(deep, far, pow(fres, 0.7));
          // waves
          vec2 p = vW.xz * vec2(0.08, 0.35);
          float w = fbm(p + vec2(uTime * 0.05, uTime * 0.02));
          float path = exp(-pow(az * (6. + 30. * (1.-fres)), 2.));
          float sparkle = smoothstep(0.58, 0.8, w) * path;
          col += glint * (path * 0.35 * (0.3 + fres) + sparkle * 1.6);
          col *= 0.9 + 0.2 * w;
          gl_FragColor = vec4(col, 1.);
        }`,
    })
  );
  ext.add(water);

  // ------------------------------------------------------------ far shore + city
  const r = rng(77);
  const shoreDist = 1500;
  const cityMat = new THREE.MeshBasicMaterial({ color: lin('#9a7088'), fog: false });
  const cityMat2 = new THREE.MeshBasicMaterial({ color: lin('#b88896'), fog: false });
  const hillMat = new THREE.MeshBasicMaterial({ color: lin('#b48e98'), fog: false });
  const geos = [], geos2 = [];
  // land strip
  const land = new THREE.Mesh(new THREE.BoxGeometry(6000, 22, 200), cityMat);
  land.position.set(0, -14 + 4, -shoreDist - 100);
  ext.add(land);
  for (let i = 0; i < 420; i++) {
    const x = (r() - 0.5) * 3000;
    const w = 8 + r() * 26, d = 14 + r() * 30;
    const centerBoost = Math.exp(-Math.pow((x - 60) / 420, 2));
    const h = 6 + r() * 16 + centerBoost * Math.pow(r(), 2.5) * 38;
    const g = new THREE.BoxGeometry(w, h, d);
    const z = -shoreDist - 30 - r() * 160;
    g.translate(x, -6 + h / 2, z);
    (z < -shoreDist - 110 ? geos2 : geos).push(g);
  }
  // fallback merge (avoid addon import here)
  const merge = (arr) => {
    let n = 0; arr.forEach((g) => (n += g.index.count));
    const pos = [], idx = []; let off = 0;
    arr.forEach((g) => {
      const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) pos.push(p[i]);
      const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setIndex(idx); return out;
  };
  ext.add(new THREE.Mesh(merge(geos), cityMat));
  ext.add(new THREE.Mesh(merge(geos2), cityMat2));

  // church spire, slightly left of the sun
  const spire = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.BoxGeometry(13, 58, 13), cityMat);
  tower.position.y = -14 + 29;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7.5, 62, 8), cityMat);
  cone.position.y = -14 + 58 + 31;
  spire.add(tower, cone);
  const sx = Math.atan2(sunVisDir.x, -sunVisDir.z) - 0.075;
  spire.position.set(Math.sin(sx) * shoreDist + 5, 0, -Math.cos(sx) * shoreDist);
  ext.add(spire);
  // a second smaller tower
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(10, 44, 10), cityMat);
  t2.position.set(spire.position.x - 330, -14 + 22, spire.position.z - 40);
  ext.add(t2);

  // distant hills
  const hillShape = new THREE.Shape();
  hillShape.moveTo(-5000, 0);
  for (let i = 0; i <= 80; i++) {
    const x = -5000 + i * 125;
    hillShape.lineTo(x, 40 + Math.sin(i * 0.37) * 30 + Math.sin(i * 1.3) * 12);
  }
  hillShape.lineTo(5000, 0);
  const hills = new THREE.Mesh(new THREE.ShapeGeometry(hillShape), hillMat);
  hills.position.set(0, -14, -2600);
  ext.add(hills);

  // ------------------------------------------------------------ boats (age-driven)
  const boatMat = new THREE.MeshBasicMaterial({ color: lin('#f3d9c4') });
  const boatDark = new THREE.MeshBasicMaterial({ color: lin('#4a3a48') });
  const boats = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 2.4, 4), boatDark);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 3.4), boatMat);
    cabin.position.set(1, 2.6, 0);
    b.add(hull, cabin);
    b.userData = { z: -320 - i * 260, speed: [9, -6, 4][i], phase: [0.2, 0.55, 0.8][i] };
    ext.add(b);
    boats.push(b);
  }

  return {
    ext, skyU, waterU,
    update(age, time, camPos) {
      skyU.uCloud.value = age;
      skyU.uTime.value = time;
      waterU.camPos.value.copy(camPos);
      for (const b of boats) {
        const { z, speed, phase } = b.userData;
        // boats cross the view as years pass
        const u = ((age * 0.37 * Math.abs(speed) / 6 + phase) % 1 + 1) % 1;
        const span = Math.abs(z) * 0.7;
        b.position.set((speed > 0 ? u - 0.5 : 0.5 - u) * span * 2, -14 + 1.2, z);
        b.visible = u > 0.05 && u < 0.95;
      }
    },
  };
}
