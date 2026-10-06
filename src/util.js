// Small math + timeline helpers. Everything that changes with age is a pure
// function of age, so the story plays identically forwards and backwards.

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// Presence window: fades in over [a, a+fi], out over [b, b+fo].
export function presence(age, a, b = Infinity, fi = 0.35, fo = 0.35) {
  const pin = a === -Infinity ? 1 : smooth(a, a + fi, age);
  return pin * (b === Infinity ? 1 : 1 - smooth(b, b + fo, age));
}

// Seeded random
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

// 1D smooth value noise in [-1, 1]
function hash1(i, seed) {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i, seed), hash1(i + 1, seed), u);
}

// Keyframes: [[age, value], ...] where value is number or array. Smoothstep between keys.
export function keys(age, arr) {
  if (age <= arr[0][0]) return arr[0][1];
  const last = arr[arr.length - 1];
  if (age >= last[0]) return last[1];
  for (let i = 0; i < arr.length - 1; i++) {
    const [a0, v0] = arr[i], [a1, v1] = arr[i + 1];
    if (age >= a0 && age <= a1) {
      const t = smooth(a0, a1, age);
      if (Array.isArray(v0)) return v0.map((v, j) => lerp(v, v1[j], t));
      return lerp(v0, v1, t);
    }
  }
  return last[1];
}

// Keyframes where each move happens over a short window ending at the key's age
// (object rests most of the time, then gets moved): [[age, value, dur]]
export function moves(age, arr) {
  let v = arr[0][1];
  for (let i = 1; i < arr.length; i++) {
    const [a, nv, d = 0.3] = arr[i];
    const t = smooth(a - d, a, age);
    if (t <= 0) break;
    v = Array.isArray(v) ? v.map((x, j) => lerp(x, nv[j], t)) : lerp(v, nv, t);
  }
  return v;
}

// ---- interval sets: [[a, b, fadeIn, fadeOut], ...] for composing table "scenes"
export function iv(list, fi = 0.3, fo = 0.3) { return list.map(([a, b, f0, f1]) => [a, b, f0 ?? fi, f1 ?? fo]); }
export function union(...lists) {
  const all = lists.flat().slice().sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) { if (s[1] > last[1]) { last[1] = s[1]; last[3] = s[3]; } }
    else out.push(s.slice());
  }
  return out;
}
// A minus holes [h0, h1, fadeOut?, fadeIn?]; edges created by a hole fade over the hole's own widths (default hf)
export function subtract(A, holes, hf = 0.05) {
  let cur = A.map((s) => s.slice());
  for (const [h0, h1, f0 = hf, f1 = hf] of holes) {
    const next = [];
    for (const s of cur) {
      const [a, b, fi, fo] = s;
      if (h0 >= b && h0 < b + fo) { next.push([a, b, fi, Math.min(fo, h0 + f0 - b)]); continue; } // already leaving: gone by the time the hole's own edge is
      if (h1 <= a || h0 >= b) { next.push(s); continue; }
      if (h0 > a) next.push([a, h0, fi, f0]);
      if (h1 < b) next.push([h1, b, f1, fo]);
    }
    cur = next;
  }
  return cur;
}
