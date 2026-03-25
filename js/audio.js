// ── Web Audio synthesis ──────────────────────────────────────────────────────

import { SMIDI } from './music.js';

let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function playNote(si, fret, delay, dur) {
  const ctx = getAudio();
  const freq = 440 * Math.pow(2, (SMIDI[si] + fret - 69) / 12);
  const now = ctx.currentTime + delay;

  // Main tone — triangle for warmth
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.32, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.15, now + 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur);

  // 2nd harmonic for pluck brightness
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(freq * 2, now);
  g2.gain.setValueAtTime(0.12, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.25);
  o2.connect(g2);
  g2.connect(ctx.destination);
  o2.start(now);
  o2.stop(now + dur);

  // 3rd harmonic — quick click for attack
  const o3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  o3.type = 'sine';
  o3.frequency.setValueAtTime(freq * 3, now);
  g3.gain.setValueAtTime(0.06, now);
  g3.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  o3.connect(g3);
  g3.connect(ctx.destination);
  o3.start(now);
  o3.stop(now + dur * 0.3);
}
