// Post: AO for contact depth, gentle bloom, temporal "exposure" smear when scrubbing fast, grade.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

class AOPass extends GTAOPass {
  setSize(w, h) { super.setSize(Math.ceil(w / 2), Math.ceil(h / 2)); }
  render(renderer, writeBuffer, readBuffer, dt, mask) {
    const hidden = [];
    this.scene.traverse((o) => { if (o.userData.noAO && o.visible) { o.visible = false; hidden.push(o); } });
    super.render(renderer, writeBuffer, readBuffer, dt, mask);
    hidden.forEach((o) => (o.visible = true));
  }
}

// Exposure-style accumulation: out = mix(current, history, amount). amount=0 -> perfectly sharp.
class SmearPass extends Pass {
  constructor(w, h) {
    super();
    const opt = { type: THREE.HalfFloatType };
    this.a = new THREE.WebGLRenderTarget(w, h, opt);
    this.b = new THREE.WebGLRenderTarget(w, h, opt);
    this.amount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tNew: { value: null }, tOld: { value: null }, amt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `uniform sampler2D tNew, tOld; uniform float amt; varying vec2 vUv;
        void main(){ vec4 n = texture2D(tNew, vUv); vec4 o = texture2D(tOld, vUv);
          // slightly favour bright values so light leaves a trace, like film exposure
          vec3 m = mix(n.rgb, max(o.rgb, n.rgb * 0.0) , amt);
          gl_FragColor = vec4(m, 1.); }`,
      depthTest: false, depthWrite: false,
    });
    this.copy = new THREE.ShaderMaterial({
      uniforms: { t: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }',
      depthTest: false, depthWrite: false,
    });
    this.q = new FullScreenQuad(this.mat);
  }
  setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    this.mat.uniforms.tNew.value = readBuffer.texture;
    this.mat.uniforms.tOld.value = this.a.texture;
    this.mat.uniforms.amt.value = this.amount;
    this.q.material = this.mat;
    renderer.setRenderTarget(this.b); this.q.render(renderer);
    [this.a, this.b] = [this.b, this.a];
    this.copy.uniforms.t.value = this.a.texture;
    this.q.material = this.copy;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.q.render(renderer);
  }
}

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uVig: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uVig; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // gentle filmic tone: lifted, warm shadows; soft highlight roll
      c = mix(c, c * c * (3. - 2. * c), 0.32);
      c += vec3(0.018, 0.010, 0.012) * (1. - c);
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      float v = smoothstep(1.05, 0.25, length(q * vec2(0.9, 1.1)));
      c *= mix(1. - uVig, 1., v);
      c += (h(gl_FragCoord.xy) - 0.5) / 255.;
      gl_FragColor = vec4(c, 1.);
    }`,
};

export function buildPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  const ao = new AOPass(scene, camera, size.x, size.y);
  ao.output = 0;
  ao.blendIntensity = 1.15;
  ao.updateGtaoMaterial({ radius: 0.38, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 16, distanceFallOff: 1.0 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  composer.addPass(ao);

  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); gl_FragColor = vec4(min(c.rgb, vec3(800.)), 1.); }',
  }));

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.22, 0.7, 2.2);
  composer.addPass(bloom);

  const smear = new SmearPass(size.x, size.y);
  composer.addPass(smear);

  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  return {
    composer, ao, bloom, smear, grade,
    setSize(w, h) {
      composer.setSize(w, h);
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      grade.uniforms.uRes.value.set(s.x, s.y);
    },
  };
}
