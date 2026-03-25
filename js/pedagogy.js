// ── Anchor-based pedagogy ────────────────────────────────────────────────────
//
// VISUAL-FIRST: Instead of just describing intervals in words, we show them
// on the fretboard. When the shape phase triggers, we light up:
//
// 1. Ghost dots at ALL positions where this interval exists from the root
//    (so you can see the full pattern — "here are all your octaves from D")
// 2. The "standard" shape is labeled to teach the canonical form
// 3. For non-anchor intervals, the reference anchor is also shown
//
// The text is secondary — the fretboard IS the teacher.

import { SMIDI, FRET_COUNT, NOTE_NAMES, OPEN_STRINGS, INTERVALS } from './music.js';

// Find every position on the fretboard where this interval from root lands
export function findAllVoicings(rootSi, rootFret, semitones) {
  const targetMidi = SMIDI[rootSi] + rootFret + semitones;
  const positions = [];

  for (let si = 0; si < 6; si++) {
    const f = targetMidi - SMIDI[si];
    if (f >= 0 && f <= FRET_COUNT) {
      positions.push({ si, fret: f });
    }
  }
  return positions;
}

// Identify the "standard" voicing — the one that uses the canonical shape
// Returns the index into the voicings array, or -1
function findStandardVoicing(voicings, rootSi, rootFret, semitones) {
  // For each interval, define what the "standard" cross-string shape looks like
  // P4: 1 string down (higher si), same fret (adjusted for B-G)
  // P5: 1 string down, 2 frets back (adjusted for B-G)
  // Octave: 2 strings down, 2 frets up (adjusted for B-G)
  // Others: closest to root in string distance, preferring standard direction

  if (semitones === 0) {
    // Unison: same position is standard
    return voicings.findIndex(v => v.si === rootSi && v.fret === rootFret);
  }

  // For cross-string intervals, prefer the voicing closest to the root
  // with smallest string distance, biased toward lower strings (higher si)
  let bestIdx = -1;
  let bestScore = Infinity;

  voicings.forEach((v, i) => {
    const strDist = Math.abs(v.si - rootSi);
    const fretDist = Math.abs(v.fret - rootFret);
    // Prefer 1-2 string distance, penalize same-string (less useful to learn)
    const sameStr = v.si === rootSi ? 10 : 0;
    const score = strDist * 3 + fretDist + sameStr;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });

  return bestIdx;
}

export function getShapeInfo(semitones, rootSi, rootFret, ivlSi, ivlFret) {
  const strDiff = ivlSi - rootSi;
  const fretDiff = ivlFret - rootFret;
  const crossesBG = (Math.min(rootSi, ivlSi) <= 1 && Math.max(rootSi, ivlSi) >= 2);

  // Find all voicings and determine which are "ghost" dots to show
  const allVoicings = findAllVoicings(rootSi, rootFret, semitones);

  // Filter out the one already shown as the main interval dot
  const ghostDots = allVoicings
    .filter(v => !(v.si === ivlSi && v.fret === ivlFret))
    .map(v => {
      const isStandard = isStandardShape(v, rootSi, rootFret, semitones);
      return {
        si: v.si,
        fret: v.fret,
        label: isStandard ? INTERVALS[semitones].short : '',
        isStandard,
      };
    });

  // For non-anchor intervals, also add the reference anchor dot
  let anchorDot = null;
  if (semitones >= 1 && semitones <= 4) {
    anchorDot = findAnchorDot(rootSi, rootFret, 5, 'P4');
  } else if (semitones === 6) {
    anchorDot = findAnchorDot(rootSi, rootFret, 7, 'P5');
  } else if (semitones >= 8 && semitones <= 11) {
    anchorDot = findAnchorDot(rootSi, rootFret, 12, '8ve');
  }

  // Don't add anchor if it overlaps with an existing ghost dot or the interval
  if (anchorDot) {
    const overlaps = ghostDots.some(g => g.si === anchorDot.si && g.fret === anchorDot.fret)
      || (anchorDot.si === ivlSi && anchorDot.fret === ivlFret)
      || (anchorDot.si === rootSi && anchorDot.fret === rootFret);
    if (overlaps) anchorDot = null;
  }

  const text = buildText(semitones, strDiff, fretDiff, crossesBG, anchorDot);
  const hint = buildHint(semitones, crossesBG);

  return { text, hint, ghostDots, anchorDot };
}

function findAnchorDot(rootSi, rootFret, anchorSemitones, label) {
  const targetMidi = SMIDI[rootSi] + rootFret + anchorSemitones;
  const candidates = [];

  for (let si = 0; si < 6; si++) {
    const f = targetMidi - SMIDI[si];
    if (f >= 0 && f <= FRET_COUNT && si !== rootSi) {
      candidates.push({ si, fret: f, strDist: Math.abs(si - rootSi) });
    }
  }

  candidates.sort((a, b) => a.strDist - b.strDist);
  if (!candidates[0]) return null;

  return { si: candidates[0].si, fret: candidates[0].fret, label };
}

// Check if a voicing matches the "standard" shape for its interval
function isStandardShape(voicing, rootSi, rootFret, semitones) {
  const strDiff = voicing.si - rootSi;
  const fretDiff = voicing.fret - rootFret;
  const crossesBG = (Math.min(rootSi, voicing.si) <= 1 && Math.max(rootSi, voicing.si) >= 2);

  // P4: 1 string down, same fret (or +1 if crossing B-G)
  if (semitones === 5) {
    return strDiff === 1 && Math.abs(fretDiff) <= 1;
  }
  // P5: 1 string down, 2 frets back (or 1 if crossing B-G)
  if (semitones === 7) {
    return strDiff === 1 && fretDiff <= 0 && fretDiff >= -2;
  }
  // Octave: 2 strings down, 2-3 frets up
  if (semitones === 12) {
    return strDiff === 2 && fretDiff >= 2 && fretDiff <= 3;
  }
  // For other intervals: prefer the closest cross-string voicing
  if (Math.abs(strDiff) >= 1 && Math.abs(strDiff) <= 2) {
    return true; // first cross-string hit is "standard enough"
  }
  return false;
}

function buildText(semitones, strDiff, fretDiff, crossesBG, anchorDot) {
  // Same string
  if (strDiff === 0) {
    if (semitones === 0) return 'Same note, same spot.';
    return `Same string, <em>${semitones} fret${semitones>1?'s':''} up</em>.`;
  }

  const strDesc = `${Math.abs(strDiff)} string${Math.abs(strDiff)>1?'s':''} ${strDiff > 0 ? 'lower' : 'higher'}`;
  const fretDesc = fretDiff === 0 ? 'same fret' : `${Math.abs(fretDiff)} fret${Math.abs(fretDiff)>1?'s':''} ${fretDiff > 0 ? 'up' : 'down'}`;

  // Anchor intervals describe themselves
  if (semitones === 5) {
    if (Math.abs(strDiff) === 1 && strDiff > 0) {
      return `<em>${strDesc}, ${fretDesc}</em>. This is how the guitar is tuned — each string is a P4 apart.`;
    }
    return `<em>${strDesc}, ${fretDesc}</em>. See the ghost dots for the standard P4 shape.`;
  }
  if (semitones === 7) {
    if (Math.abs(strDiff) === 1 && strDiff > 0) {
      return `<em>${strDesc}, ${fretDesc}</em>. The <em>power chord</em> shape.`;
    }
    return `<em>${strDesc}, ${fretDesc}</em>. See the ghost dots for the power chord shape.`;
  }
  if (semitones === 12) {
    if (Math.abs(strDiff) === 2) {
      return `<em>${strDesc}, ${fretDesc}</em>. The <em>octave box</em>.` +
        (crossesBG ? ' Shifted +1 fret because of the B-G gap.' : '');
    }
    return `<em>${strDesc}, ${fretDesc}</em>. See the ghost dots for the octave box shape.`;
  }
  if (semitones === 0) {
    return `Same pitch: <em>${strDesc}, ${fretDesc}</em>.`;
  }

  // Non-anchor intervals: reference the anchor
  if (anchorDot) {
    if (semitones >= 1 && semitones <= 4) {
      const delta = 5 - semitones;
      return `<em>${strDesc}, ${fretDesc}</em>. That's <em>${delta} fret${delta>1?'s':''} back</em> from the <span class="anchor-ref">P4</span>.`;
    }
    if (semitones === 6) {
      return `<em>${strDesc}, ${fretDesc}</em>. One fret back from the <span class="anchor-ref">P5</span>, or one fret past the P4.`;
    }
    if (semitones >= 8 && semitones <= 11) {
      const delta = 12 - semitones;
      return `<em>${strDesc}, ${fretDesc}</em>. That's <em>${delta} fret${delta>1?'s':''} back</em> from the <span class="anchor-ref">octave</span>.`;
    }
  }

  return `<em>${strDesc}, ${fretDesc}</em>.`;
}

function buildHint(semitones, crossesBG) {
  const hints = {
    0: 'Each string pair is 5 semitones apart (4 for B-G).',
    1: 'Minor 2nd — maximum tension. 1 fret on the same string.',
    2: 'Major 2nd — whole step. 2 frets on the same string.',
    3: 'Minor 3rd — the sad/dark color. P4 minus 2 frets.',
    4: 'Major 3rd — the bright/happy color. P4 minus 1 fret.',
    5: crossesBG
      ? 'B→G is 4 semitones (not 5), so the shape shifts 1 fret when crossing that pair.'
      : 'The most natural interval — same fret, next string down.',
    6: 'Tritone — exactly between P4 and P5. 1 fret from each.',
    7: crossesBG
      ? 'Crossing B-G: power chord shifts to 1 fret back instead of 2.'
      : 'The power chord: 1 string down, 2 frets back.',
    8: 'Minor 6th — inverted major 3rd. Octave minus 4 frets.',
    9: 'Major 6th — inverted minor 3rd. Octave minus 3 frets.',
    10: 'Minor 7th — bluesy, expectant. Octave minus 2 frets.',
    11: 'Major 7th — leading tone tension. Octave minus 1 fret.',
    12: crossesBG
      ? 'Crossing B-G: octave box is 2 strings down, 3 frets up (not 2).'
      : 'Octave box: 2 strings down, 2 frets up.',
  };
  return hints[semitones] || `${semitones} semitones from the root.`;
}
