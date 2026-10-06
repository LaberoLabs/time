// Scroll is not linear in years: time slows around the moments worth seeing (arrival -> hold -> departure).
// The same mapping is used by main.js (scroll -> age) and by life.js, so transitions can be given a width in
// scroll distance: a change then reads equally gently wherever it happens, however much time is slowed there.
import { clamp } from './util.js';

export const AGE0 = 25, AGE1 = 90;
export const VH_PER_YEAR = 5400 / (AGE1 - AGE0); // page height per unslowed year

export function makePace(beats) {
  const N = 13000, A = new Float64Array(N + 1), Cm = new Float64Array(N + 1);
  const box = (a, a0, a1) => { const e = 0.12; const t0 = clamp((a - (a0 - e)) / e, 0, 1), t1 = clamp(((a1 + e) - a) / e, 0, 1); return Math.min(t0 * t0 * (3 - 2 * t0), t1 * t1 * (3 - 2 * t1)); };
  let c = 0;
  for (let i = 0; i <= N; i++) {
    const a = AGE0 + (AGE1 - AGE0) * (i / N);
    let d = 1; for (const [a0, a1, w] of beats) if (a > a0 - 0.2 && a < a1 + 0.2) d = Math.max(d, 1 + w * box(a, a0, a1));
    if (i) c += d * (AGE1 - AGE0) / N;
    A[i] = a; Cm[i] = c;
  }
  const ageAtUnits = (t) => {
    if (t <= 0) return AGE0 + t; // outside the life the pace is plain years
    if (t >= c) return AGE1 + (t - c);
    let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; (Cm[m] < t ? (lo = m) : (hi = m)); }
    const f = (t - Cm[lo]) / Math.max(1e-9, Cm[hi] - Cm[lo]); return A[lo] + (A[hi] - A[lo]) * f;
  };
  const unitsAt = (a) => {
    if (a <= AGE0) return a - AGE0;
    if (a >= AGE1) return c + (a - AGE1);
    const x = ((a - AGE0) / (AGE1 - AGE0)) * N, i = Math.min(N - 1, Math.floor(x)), f = x - i;
    return Cm[i] + (Cm[i + 1] - Cm[i]) * f;
  };
  return {
    total: c,
    toAge(p) { return ageAtUnits(p * c); },
    toP(a) { const i = clamp(Math.round(((a - AGE0) / (AGE1 - AGE0)) * N), 0, N); return Cm[i] / c; },
    // position along the scroll (in unslowed years), for easing a change evenly in scroll rather than in years
    units: unitsAt,
    // the age reached after scrolling `vh` further (negative: back)
    shift(a, vh) { return ageAtUnits(unitsAt(a) + vh / VH_PER_YEAR); },
    // scroll distance (vh) between two ages
    vh(a, b) { return (unitsAt(b) - unitsAt(a)) * VH_PER_YEAR; },
  };
}
