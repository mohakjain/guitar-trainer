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
  0:  { name:'Unison',       short:'U',  semitones:0  },
  1:  { name:'Minor 2nd',    short:'m2', semitones:1  },
  2:  { name:'Major 2nd',    short:'M2', semitones:2  },
  3:  { name:'Minor 3rd',    short:'m3', semitones:3  },
  4:  { name:'Major 3rd',    short:'M3', semitones:4  },
  5:  { name:'Perfect 4th',  short:'P4', semitones:5  },
  6:  { name:'Tritone',      short:'TT', semitones:6  },
  7:  { name:'Perfect 5th',  short:'P5', semitones:7  },
  8:  { name:'Minor 6th',    short:'m6', semitones:8  },
  9:  { name:'Major 6th',    short:'M6', semitones:9  },
  10: { name:'Minor 7th',    short:'m7', semitones:10 },
  11: { name:'Major 7th',    short:'M7', semitones:11 },
  12: { name:'Octave',       short:'8ve',semitones:12 },
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

// Generate a random root + interval pair for the given mode
export function generatePair(mode) {
  const allowed = MODE_INTERVALS[mode];
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

  const target = rnd(cands);
  return {
    root:     { si: rSi, fret: rFret, note: noteName(rSi, rFret) },
    interval: { si: target.si, fret: target.fret, note: noteName(target.si, target.fret) },
    info,
    semitones: semi,
  };
}
