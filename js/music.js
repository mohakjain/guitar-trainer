// ── Music constants and interval data ────────────────────────────────────────

export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const OPEN_STRINGS = [
  { name:'e', midi:64 },
  { name:'B', midi:59 },
  { name:'G', midi:55 },
  { name:'D', midi:50 },
  { name:'A', midi:45 },
  { name:'E', midi:40 },
];

export const SMIDI = OPEN_STRINGS.map(s => s.midi);
export const FRET_COUNT = 12;
export const FRET_MARKERS = [3, 5, 7, 9, 12];

export const INTERVALS = {
  0:  { name:'Unison',       short:'U',  semitones:0,  sound:'identical, grounding, pure',    color:'#e09f5a' },
  1:  { name:'Minor 2nd',    short:'m2', semitones:1,  sound:'tense, grating, chromatic',     color:'#b8e62e' },
  2:  { name:'Major 2nd',    short:'M2', semitones:2,  sound:'bright, stepping, open',        color:'#c27aed' },
  3:  { name:'Minor 3rd',    short:'m3', semitones:3,  sound:'sad, dark, minor',              color:'#3ed8a0' },
  4:  { name:'Major 3rd',    short:'M3', semitones:4,  sound:'happy, sweet, major',           color:'#f06878' },
  5:  { name:'Perfect 4th',  short:'P4', semitones:5,  sound:'open, hymn-like, suspended',    color:'#5cb8ff' },
  6:  { name:'Tritone',      short:'TT', semitones:6,  sound:'restless, evil, splitting',     color:'#f0d830' },
  7:  { name:'Perfect 5th',  short:'P5', semitones:7,  sound:'strong, hollow, powerful',      color:'#d470ff' },
  8:  { name:'Minor 6th',    short:'m6', semitones:8,  sound:'dark, wide, cinematic',         color:'#40c840' },
  9:  { name:'Major 6th',    short:'M6', semitones:9,  sound:'warm, nostalgic, resolving',    color:'#f050a8' },
  10: { name:'Minor 7th',    short:'m7', semitones:10, sound:'bluesy, expectant, dominant',   color:'#40e8e8' },
  11: { name:'Major 7th',    short:'M7', semitones:11, sound:'dreamy, tense, leading',        color:'#f0a030' },
  12: { name:'Octave',       short:'8ve',semitones:12, sound:'same, higher, complete',        color:'#7b68ff' },
};

export const MODE_INTERVALS = {
  all:   [0,1,2,3,4,5,6,7,8,9,10,11,12],
  basic: [0,5,7,12],
  thirds:[3,4,8,9],
  tense: [1,2,6,10,11],
};

export function noteName(si, fret) {
  return NOTE_NAMES[(SMIDI[si] + fret) % 12];
}

export function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick a candidate weighted toward natural guitar voicings
function pickWeightedCandidate(cands, rootSi, rootFret, semitones) {
  if (cands.length === 1) return cands[0];

  const scored = cands.map(c => {
    const strDist = Math.abs(c.si - rootSi);
    const fretDist = Math.abs(c.fret - rootFret);
    let weight = 1;

    // Same string: great for small intervals, ok for others
    if (strDist === 0) {
      if (semitones <= 4) weight = 10;      // very natural
      else if (semitones <= 7) weight = 3;   // playable
      else weight = 1;                       // long reach
    }
    // Adjacent string (1 string away)
    else if (strDist === 1) {
      if (fretDist <= 3) weight = 8;         // compact shape, easy to see
      else if (fretDist <= 5) weight = 3;    // still reasonable
      else weight = 1;                       // awkward stretch
    }
    // 2 strings away — good for octaves and larger intervals
    else if (strDist === 2) {
      if (semitones === 12 && fretDist <= 3) weight = 10; // octave box
      else if (fretDist <= 4) weight = 4;
      else weight = 1;
    }
    // 3+ strings — unusual, low weight
    else {
      weight = 1;
    }

    return { candidate: c, weight };
  });

  // Weighted random selection
  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const s of scored) {
    r -= s.weight;
    if (r <= 0) return s.candidate;
  }
  return scored[scored.length - 1].candidate;
}

// Generate a random root + interval pair on a piano roll (C3–B4)
const PIANO_LO = 48; // C3
const PIANO_HI = 71; // B4

export function generatePianoPair(mode, opts = {}) {
  let allowed = MODE_INTERVALS[mode];
  if (opts.noUnison) allowed = allowed.filter(s => s !== 0);
  if (!allowed.length) allowed = MODE_INTERVALS[mode];
  const semi = rnd(allowed);
  const info = INTERVALS[semi];
  // Pick root so that root + semi stays in range
  const maxRoot = PIANO_HI - semi;
  if (maxRoot < PIANO_LO) return generatePianoPair(mode, opts); // interval too wide, retry
  const rootMidi = PIANO_LO + Math.floor(Math.random() * (maxRoot - PIANO_LO + 1));
  const ivlMidi = rootMidi + semi;
  const pname = m => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
  return {
    root:     { midi: rootMidi, note: pname(rootMidi) },
    interval: { midi: ivlMidi,  note: pname(ivlMidi) },
    info,
    semitones: semi,
  };
}

// Generate a random root + interval pair for the given mode
export function generatePair(mode, opts = {}) {
  let allowed = MODE_INTERVALS[mode];
  if (opts.noUnison) allowed = allowed.filter(s => s !== 0);
  if (!allowed.length) allowed = MODE_INTERVALS[mode]; // fallback if all filtered
  const rSi = Math.floor(Math.random() * 6);
  const rFret = Math.floor(Math.random() * 10);
  const semi = rnd(allowed);
  const info = INTERVALS[semi];
  const tMidi = SMIDI[rSi] + rFret + semi;

  const cands = [];
  OPEN_STRINGS.forEach((_, si) => {
    const f = tMidi - SMIDI[si];
    if (f >= 0 && f <= FRET_COUNT) cands.push({ si, fret: f });
  });

  if (!cands.length) return generatePair(mode);

  // Weight candidates toward natural voicings:
  // - Same string for small intervals (easy to see/play)
  // - Adjacent strings within a few frets for medium intervals
  // - Standard cross-string shapes for P4/P5/octave
  const target = pickWeightedCandidate(cands, rSi, rFret, semi);
  return {
    root:     { si: rSi, fret: rFret, note: noteName(rSi, rFret) },
    interval: { si: target.si, fret: target.fret, note: noteName(target.si, target.fret) },
    info,
    semitones: semi,
  };
}
