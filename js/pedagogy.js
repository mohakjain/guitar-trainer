// ── Anchor-based pedagogy ────────────────────────────────────────────────────
//
// VISUAL-FIRST: The fretboard is the teacher. When the shape phase triggers:
// 1. Ghost dots show all other positions where this interval note exists
// 2. Anchor dots show reference points (P4/P5/octave) for non-anchor intervals
// 3. Text gives a short, direct explanation — no fluff
//
// String indexing: 0=e (highest pitch) ... 5=E (lowest pitch)
// So going toward higher pitch = lower index = negative strDiff

import { SMIDI, FRET_COUNT, NOTE_NAMES, OPEN_STRINGS, INTERVALS } from './music.js';

// Find every position on the fretboard where this interval note exists
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

// Does this pair of strings cross the B-G boundary?
function crossesBG(si1, si2) {
  return (Math.min(si1, si2) <= 1 && Math.max(si1, si2) >= 2);
}

// Compute how many semitones between two adjacent strings
// Standard tuning: all gaps are 5 except B(1)-G(2) which is 4
function stringGap(siFrom, siTo) {
  // Total semitones between two strings
  return Math.abs(SMIDI[siFrom] - SMIDI[siTo]);
}

export function getShapeInfo(semitones, rootSi, rootFret, ivlSi, ivlFret) {
  const strDiff = ivlSi - rootSi; // negative = toward higher pitch
  const fretDiff = ivlFret - rootFret;
  const absStr = Math.abs(strDiff);
  const hasBG = crossesBG(rootSi, ivlSi);

  // Ghost dots: all other voicings of this interval note
  const allVoicings = findAllVoicings(rootSi, rootFret, semitones);
  const ghostDots = allVoicings
    .filter(v => !(v.si === ivlSi && v.fret === ivlFret))
    .map(v => ({
      si: v.si,
      fret: v.fret,
      label: INTERVALS[semitones].short,
      isStandard: false, // we'll mark standard ones below
    }));

  // Mark the "standard shape" ghost: the adjacent-string voicing closest to root
  ghostDots.forEach(g => {
    const sd = Math.abs(g.si - rootSi);
    if (semitones === 12 && sd === 2) g.isStandard = true;
    else if (semitones !== 12 && sd === 1) g.isStandard = true;
  });

  // For non-anchor intervals, find the anchor reference dot
  let anchorDot = null;
  if (semitones >= 1 && semitones <= 4) {
    anchorDot = findAnchorDot(rootSi, rootFret, 5, 'P4');
  } else if (semitones === 6) {
    anchorDot = findAnchorDot(rootSi, rootFret, 7, 'P5');
  } else if (semitones >= 8 && semitones <= 11) {
    anchorDot = findAnchorDot(rootSi, rootFret, 12, '8ve');
  }

  // Don't show anchor if it overlaps with existing dots
  if (anchorDot) {
    const overlaps = ghostDots.some(g => g.si === anchorDot.si && g.fret === anchorDot.fret)
      || (anchorDot.si === ivlSi && anchorDot.fret === ivlFret)
      || (anchorDot.si === rootSi && anchorDot.fret === rootFret);
    if (overlaps) anchorDot = null;
  }

  const text = buildText(semitones, absStr, strDiff, fretDiff, hasBG);
  const hint = buildHint(semitones, hasBG);

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

function buildText(semitones, absStr, strDiff, fretDiff, hasBG) {
  // Same string — simple
  if (absStr === 0) {
    if (semitones === 0) return 'Same note, same position.';
    return `Same string, <em>${Math.abs(fretDiff)} frets ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
  }

  const bgNote = hasBG ? ' (shifted 1 fret for B-G tuning)' : '';

  // ── P4 ──
  if (semitones === 5) {
    if (absStr === 1) {
      if (Math.abs(fretDiff) <= 1) {
        return `One string, ${fretDiff === 0 ? 'same fret' : '1 fret up'}. <em>This is the standard P4 shape</em> — how the guitar is tuned.${bgNote}`;
      }
    }
    return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>. Standard P4 = next string, same fret.`;
  }

  // ── P5 ──
  if (semitones === 7) {
    if (absStr === 1 && Math.abs(fretDiff) <= 2) {
      return `One string, ${describeFretDiff(fretDiff)}. <em>This is the power chord shape.</em>${bgNote}`;
    }
    return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>. Standard P5 = next string, 2 frets back (power chord).`;
  }

  // ── Octave ──
  if (semitones === 12) {
    if (absStr === 2 && fretDiff >= 2 && fretDiff <= 3) {
      return `2 strings, ${fretDiff} frets up. <em>This is the octave box.</em>${bgNote}`;
    }
    if (absStr === 0) {
      return `Same string, 12 frets up — at the octave marker.`;
    }
    return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>. Standard octave = 2 strings, 2 frets up.`;
  }

  // ── Unison ──
  if (semitones === 0) {
    return `Same pitch, different string: <em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.`;
  }

  // ── Intervals 1-4: reference P4 ──
  if (semitones >= 1 && semitones <= 4) {
    const delta = 5 - semitones;
    return `<em>${delta} fret${delta>1?'s':''} back</em> from the <span class="anchor-ref">P4</span> (next string, same fret). The ghost dots show where else this note lives.`;
  }

  // ── Tritone ──
  if (semitones === 6) {
    return `1 fret past the <span class="anchor-ref">P4</span>, or 1 fret before the <span class="anchor-ref">P5</span>. Right between them.`;
  }

  // ── Intervals 8-11: reference octave ──
  if (semitones >= 8 && semitones <= 11) {
    const delta = 12 - semitones;
    return `<em>${delta} fret${delta>1?'s':''} back</em> from the <span class="anchor-ref">octave</span> (2 strings, 2 frets up). The ghost dots show where else this note lives.`;
  }

  return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.`;
}

function describeFretDiff(fretDiff) {
  if (fretDiff === 0) return 'same fret';
  return `${Math.abs(fretDiff)} fret${Math.abs(fretDiff)>1?'s':''} ${fretDiff > 0 ? 'up' : 'back'}`;
}

function buildHint(semitones, hasBG) {
  const hints = {
    0: 'Each string is 5 semitones apart (except B-G which is 4).',
    1: 'Half step. Maximum dissonance.',
    2: 'Whole step. Common melodic movement.',
    3: 'Minor 3rd — dark, sad color. P4 minus 2.',
    4: 'Major 3rd — bright, happy color. P4 minus 1.',
    5: hasBG
      ? 'B to G is only 4 semitones, so P4 shifts 1 fret when crossing that pair.'
      : 'The guitar is tuned in 4ths — this is the most natural interval to find.',
    6: 'Tritone — splits the octave in half. Maximally unstable.',
    7: hasBG
      ? 'B-G crossing: power chord shifts to 1 fret back instead of 2.'
      : 'The power chord. 1 string, 2 frets back.',
    8: 'Minor 6th — inverted major 3rd. Octave minus 4.',
    9: 'Major 6th — inverted minor 3rd. Octave minus 3.',
    10: 'Minor 7th — dominant, bluesy. Octave minus 2.',
    11: 'Major 7th — leading tone, wants to resolve. Octave minus 1.',
    12: hasBG
      ? 'B-G crossing: octave box shifts to +3 frets instead of +2.'
      : 'Octave box: 2 strings, 2 frets up.',
  };
  return hints[semitones] || '';
}
