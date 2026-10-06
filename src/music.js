// The score: Track 1 ("Two Again") and Track 2 ("The Last Ordinary Evening"), both unchanged, with exactly one second of
// silence between them. Its position is a pure function of the age on screen, through TIME's own scroll pace: Track 1
// runs evenly from 25 (0:00) to 53 (its end); then the breath; then Track 2, whose own phrases are pinned to the life's
// turns (T2) and run evenly along the scroll between them. At 90 the life is over but the music is not: the rest of
// Track 2 plays out on its own while the empty room stays.
//
// What is heard follows that position without being chained to every scroll step (makePlayer): the music plays at its
// own speed while time moves, forwards or (the same music reversed) backwards, and only corrects itself when it has
// drifted past a small window around the target, so held notes are never chopped or repeated.
import { clamp } from './util.js';

const SRC = ['audio/track1.mp3', 'audio/track2.mp3'].map((f) => import.meta.env.BASE_URL + f); // wherever the site is served from
const A1 = 53; // Track 1 ends: the child has moved out
const GAP = 1.0; // the breath between the tracks: one second of silence, taken from neither
const END = 90; // the end of the life; what remains of Track 2 after it is an epilogue
// [age, seconds into Track 2]: the life's turns pinned to Track 2's own phrases
const T2 = [
  [A1, -GAP], // the breath begins where Track 1 ends
  [61, 72.74], // ageing together: the phrase that opens on D
  [73.15, 155.93], // the last ordinary evening: the phrase that rises to E and dies away
  [73.5, 166.6], // partner gone: the music comes back from its near-silence, piano alone, without the low voice
  [89.35, 190.0], // the last resident gone: the long phrase arrives home on A
  [END, 199.1], // the life ends on the final A chord; its ring and the last A's are the epilogue
];

// ------------------------------------------------------------------ playback around the target
// All in seconds of music. The music never waits in silence: it plays forwards whenever time is not moving back
// (also while it stands still), and the same music reversed while it moves back. It is left alone within a window
// around the target; once it has fallen LAG behind it jumps on, and once it has run LEAD ahead it is taken back to
// time's place, crossfaded, so it stays with the life without ever stopping.
const LEAD = 15; // ahead of the target: taken back to it from here
const MINLOOP = 8; // near a landmark the music is taken back at least this far, so it never stutters
const LAG = 2.5; // behind a fast scroll: jump to the target
const SEEK_GAP = 0.4; // at most one jump this often
const VMIN = 0.05; // target speed (music s per s) below which time counts as standing still
const FADE_IN = 0.08, XFADE = 0.15, BACK_XF = 1.5; // a start; a jump or a turn; taken back to time's place

// io: { now(), start(dir, pos, fadeIn) -> handle, ramp(handle, gain, secs), stopAt(handle, time | Infinity) }
// marks: score positions the music may never pass before time does (the end of Track 1, the loss, the final chord)
export function makePlayer(io, dur, marks = []) {
  let voice = null; // { h, dir, t0, p0 }
  let head = 0, vel = 0, lastT = null, lastNow = null, lastSeek = -1e9;
  const pos = () => (voice ? clamp(voice.p0 + voice.dir * (io.now() - voice.t0), 0, dur) : head);
  const drop = (fade) => { if (!voice) return; head = pos(); io.ramp(voice.h, 0, fade); io.stopAt(voice.h, io.now() + fade); voice = null; };
  const start = (dir, p, fade) => {
    drop(fade);
    if (dir > 0 ? p >= dur - 0.01 : p <= 0.01) { head = p; return; }
    voice = { h: io.start(dir, p, fade), dir, t0: io.now(), p0: p };
  };

  return {
    sync(T) { drop(0.02); head = T; lastT = T; vel = 0; },
    // T: the target (score seconds) this frame; epilogue: the life has ended and the rest plays out on its own
    tick(T, epilogue = false) {
      const now = io.now(), dt = lastNow === null ? 0 : now - lastNow; lastNow = now;
      if (lastT !== null && dt > 0) vel += ((T - lastT) / dt - vel) * (1 - Math.exp(-dt / 0.15));
      lastT = T;
      if (voice && (voice.dir > 0 ? pos() >= dur : pos() <= 0)) { head = pos(); voice = null; }
      const p = pos(), dir = !epilogue && vel < -VMIN ? -1 : 1;
      if (voice && voice.dir !== dir) { start(dir, p, XFADE); return; } // turned: the same place, the other way
      const behind = (T - p) * dir; // > 0: the music is short of the target in the direction it plays
      const moving = Math.abs(vel) > VMIN, free = now - lastSeek > SEEK_GAP;
      if (moving && behind > LAG && free) { lastSeek = now; start(dir, T, voice ? XFADE : FADE_IN); return; }
      if (epilogue) { if (!voice) start(1, p, FADE_IN); return; } // the life is over: the rest plays out to its end
      // too far ahead, or about to pass a landmark time has not reached: back to time's place, crossfaded
      const B = dir > 0 ? marks.find((b) => b > T + 1e-3) ?? Infinity : -Infinity;
      if (free && (-behind > LEAD || (dir > 0 && p > B - BACK_XF))) { lastSeek = now; start(dir, dir > 0 ? Math.min(T, B - MINLOOP) : T, BACK_XF); return; }
      if (!voice) start(dir, p, FADE_IN);
    },
    get pos() { return pos(); },
    get playing() { return voice ? voice.dir : 0; },
  };
}

// ------------------------------------------------------------------ the score in the browser
export function makeMusic(pace) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let fwd = null, rev = null, d1 = 0, dur = 0, player = null, synced = false;
  const u = (a) => pace.units(a), u1 = u(A1);

  Promise.all(SRC.map((s) => fetch(s).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)))).then(([b1, b2]) => {
    const sr = ctx.sampleRate, gap = Math.round(GAP * sr), n = b1.length + gap + b2.length;
    const nc = Math.max(b1.numberOfChannels, b2.numberOfChannels);
    const f = ctx.createBuffer(nc, n, sr), r = ctx.createBuffer(nc, n, sr);
    for (let c = 0; c < nc; c++) {
      const d = f.getChannelData(c);
      d.set(b1.getChannelData(Math.min(c, b1.numberOfChannels - 1)), 0);
      d.set(b2.getChannelData(Math.min(c, b2.numberOfChannels - 1)), b1.length + gap);
      r.getChannelData(c).set(d.slice().reverse());
    }
    d1 = b1.length / sr; dur = n / sr; fwd = f; rev = r;
    player = makePlayer({
      now: () => ctx.currentTime,
      start(dir, p, fade) {
        const src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
        src.buffer = dir > 0 ? fwd : rev;
        src.connect(g).connect(ctx.destination);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fade);
        src.start(t, dir > 0 ? p : dur - p);
        return { src, g };
      },
      ramp({ g }, v, secs) {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + secs);
      },
      stopAt({ src }, t) { try { src.stop(t === Infinity ? ctx.currentTime + 1e5 : t); } catch (e) { /* already stopped */ } },
    }, dur, [d1, ...T2.filter(([a]) => a === 73.5 || a === END).map(([, t]) => d1 + GAP + t)]);
  });

  // Unlocking sound. Browsers start audio only from a genuine gesture (a click, tap or key; never a wheel or trackpad
  // scroll), so every such gesture anywhere resumes it, and a scroll resumes it wherever the browser allows. Until then a
  // scroll brings up a quiet cue that goes for good once sound is on.
  const cue = document.getElementById('sound');
  if (cue && matchMedia('(pointer: coarse)').matches) cue.textContent = 'TAP ANYWHERE FOR SOUND';
  const gesture = () => {
    if (ctx.state === 'running') return;
    ctx.resume();
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(); // iOS
  };
  for (const e of ['pointerdown', 'pointerup', 'mousedown', 'click', 'touchstart', 'touchend', 'keydown']) addEventListener(e, gesture, { capture: true, passive: true });
  let tried = 0;
  addEventListener('scroll', () => {
    if (ctx.state === 'running') return;
    const ua = navigator.userActivation;
    if ((!ua || ua.hasBeenActive) && performance.now() - tried > 500) { tried = performance.now(); ctx.resume(); }
    if (cue) cue.classList.remove('gone');
  }, { passive: true });
  ctx.onstatechange = () => { if (ctx.state === 'running' && cue) cue.classList.add('gone'); };

  // the score position (seconds) at an age
  const posAt = (age) => {
    if (age <= A1) return (clamp(u(age), 0, u1) / u1) * d1; // Track 1, as approved
    let i = 1; while (i < T2.length - 1 && age > T2[i][0]) i++;
    const [a0, t0] = T2[i - 1], [a1, t1] = T2[i];
    return d1 + GAP + t0 + (t1 - t0) * clamp((u(age) - u(a0)) / (u(a1) - u(a0)), 0, 1);
  };

  return {
    update(age) {
      if (!player) return;
      if (ctx.state !== 'running') { synced = false; return; }
      const T = posAt(age), epilogue = age >= END - 1e-3;
      // the first frame with sound: take up the music where time already is, and start with the next movement
      if (!synced) { synced = true; player.sync(epilogue ? dur : T); return; }
      player.tick(T, epilogue);
    },
    get state() { return { ctx: ctx.state, loaded: !!player, d1, dur, pos: player ? player.pos : 0, playing: player ? player.playing : 0 }; },
    posAt,
  };
}
