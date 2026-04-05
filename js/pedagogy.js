// ── Anchor-based pedagogy ────────────────────────────────────────────────────
//
// VISUAL-FIRST teaching strategy:
//
// 1. Ghost dots show all positions where this interval note exists
// 2. Anchor dots show reference points (P4/P5/octave)
// 3. For long-distance voicings: show the "unison relay" —
//    relocate the root to the target string, then count frets from there
//
// String indexing: 0=e (highest pitch) ... 5=E (lowest pitch)

import { SMIDI, FRET_COUNT, NOTE_NAMES, OPEN_STRINGS, INTERVALS } from './music.js';

// Reference intervals to show as colored landmarks — both up and down from root
const REFERENCE_SEMITONES = [0, 5, 7, 12, -5, -7, -12]; // Unison, P4, P5, Octave (above & below)

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

// Find all P4, P5, octave positions reachable from root (above & below), sorted by closeness
export function findReferenceDots(rootSi, rootFret, ivlSi, ivlFret) {
  const dots = [];
  const seen = new Set();
  for (const semi of REFERENCE_SEMITONES) {
    const absSemi = Math.abs(semi);
    const info = INTERVALS[absSemi];
    const targetMidi = SMIDI[rootSi] + rootFret + semi;
    for (let si = 0; si < 6; si++) {
      const f = targetMidi - SMIDI[si];
      if (f >= 0 && f <= FRET_COUNT) {
        const key = `${si}-${f}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Skip if overlaps root or interval dot
        if (si === rootSi && f === rootFret) continue;
        if (si === ivlSi && f === ivlFret) continue;
        const dist = Math.abs(si - rootSi) + Math.abs(f - rootFret);
        dots.push({ si, fret: f, label: info.short, color: info.color, semitones: absSemi, dist });
      }
    }
  }
  dots.sort((a, b) => a.dist - b.dist);
  return dots;
}

// Does crossing between these strings go over the B(1)-G(2) boundary?
function crossesBG(si1, si2) {
  return (Math.min(si1, si2) <= 1 && Math.max(si1, si2) >= 2);
}

// Find the root note on a specific string (unison)
function findRootOnString(rootSi, rootFret, targetSi) {
  const rootMidi = SMIDI[rootSi] + rootFret;
  const f = rootMidi - SMIDI[targetSi];
  if (f >= 0 && f <= FRET_COUNT) return f;
  return null;
}

export function getShapeInfo(semitones, rootSi, rootFret, ivlSi, ivlFret) {
  const strDiff = ivlSi - rootSi;
  const fretDiff = ivlFret - rootFret;
  const absStr = Math.abs(strDiff);
  const absFret = Math.abs(fretDiff);
  const hasBG = crossesBG(rootSi, ivlSi);

  // Ghost dots: all other voicings of the interval note
  const allVoicings = findAllVoicings(rootSi, rootFret, semitones);
  const ghostDots = allVoicings
    .filter(v => !(v.si === ivlSi && v.fret === ivlFret))
    .map(v => ({
      si: v.si,
      fret: v.fret,
      label: INTERVALS[semitones].short,
      isStandard: isStandardGhost(v, rootSi, rootFret, semitones),
    }));

  // Anchor dot for non-anchor intervals
  let anchorDot = null;
  if (semitones >= 1 && semitones <= 4) {
    anchorDot = findAnchorDot(rootSi, rootFret, 5, 'P4');
  } else if (semitones === 6) {
    anchorDot = findAnchorDot(rootSi, rootFret, 7, 'P5');
  } else if (semitones >= 8 && semitones <= 11) {
    anchorDot = findAnchorDot(rootSi, rootFret, 12, '8ve');
  }

  // Remove anchor if it overlaps
  if (anchorDot) {
    const overlaps = ghostDots.some(g => g.si === anchorDot.si && g.fret === anchorDot.fret)
      || (anchorDot.si === ivlSi && anchorDot.fret === ivlFret)
      || (anchorDot.si === rootSi && anchorDot.fret === rootFret);
    if (overlaps) anchorDot = null;
  }

  // Unison relay: when the interval spans a long distance across strings,
  // show where the ROOT lives on the SAME string as the interval note.
  // This teaches "relocate, then count frets."
  let relayDot = null;
  const isLongDistance = absStr >= 1 && absFret > 4;
  const isNonTrivial = semitones > 0 && semitones < 12;

  if (isLongDistance && isNonTrivial) {
    const relayFret = findRootOnString(rootSi, rootFret, ivlSi);
    if (relayFret !== null && relayFret !== rootFret) {
      // Don't show if it's the same position as interval or root
      if (!(relayFret === ivlFret && ivlSi === ivlSi)) {
        relayDot = { si: ivlSi, fret: relayFret, label: NOTE_NAMES[(SMIDI[rootSi] + rootFret) % 12] };
      }
    }
  }

  const text = buildText(semitones, absStr, strDiff, fretDiff, hasBG, relayDot, rootSi, rootFret, ivlSi, ivlFret);
  const hint = buildHint(semitones, hasBG);

  return { text, hint, ghostDots, anchorDot, relayDot };
}

// Find the nearest voicing of a given interval from root (preferring standard shapes)
function findNearestVoicing(rootSi, rootFret, semitones) {
  const targetMidi = SMIDI[rootSi] + rootFret + semitones;
  const candidates = [];
  for (let si = 0; si < 6; si++) {
    const f = targetMidi - SMIDI[si];
    if (f >= 0 && f <= FRET_COUNT) {
      const strDist = Math.abs(si - rootSi);
      const fretDist = Math.abs(f - rootFret);
      candidates.push({ si, fret: f, dist: strDist + fretDist, strDist });
    }
  }
  // Prefer adjacent string (standard shape), then by total distance
  candidates.sort((a, b) => {
    if (a.strDist <= 2 && b.strDist > 2) return -1;
    if (b.strDist <= 2 && a.strDist > 2) return 1;
    return a.dist - b.dist;
  });
  return candidates[0] || null;
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

function isStandardGhost(v, rootSi, rootFret, semitones) {
  const sd = Math.abs(v.si - rootSi);
  if (semitones === 12) return sd === 2;
  if (semitones === 5 || semitones === 7) return sd === 1;
  return sd === 1 && Math.abs(v.fret - rootFret) <= 3;
}

function buildText(semitones, absStr, strDiff, fretDiff, hasBG, relayDot, rootSi, rootFret, ivlSi, ivlFret) {
  const absFret = Math.abs(fretDiff);
  const sName = si => OPEN_STRINGS[si].name;

  // Same string — simple
  if (absStr === 0) {
    if (semitones === 0) return 'Same note, same position.';
    return `Same string, <em>${absFret} frets ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
  }

  const bgNote = hasBG ? ' (shifted 1 fret for B-G tuning)' : '';

  // ── P4 ──
  if (semitones === 5) {
    if (absStr === 1 && absFret <= 1) {
      return `One string, ${fretDiff === 0 ? 'same fret' : '1 fret up'}. <em>This is the standard P4 shape</em> — how the guitar is tuned.${bgNote}`;
    }
    // Non-standard voicing — find the nearest standard P4 to reference
    const stdP4 = findNearestVoicing(rootSi, rootFret, 5);
    if (stdP4) {
      return `The standard P4 is at <span class="anchor-ref">${sName(stdP4.si)} string fret ${stdP4.fret}</span> (one string, same fret). This is the same note at a different position.`;
    }
    return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.${bgNote}`;
  }

  // ── P5 ──
  if (semitones === 7) {
    if (absStr === 1 && absFret <= 2) {
      return `One string, ${describeFretDiff(fretDiff)}. <em>This is the power chord shape.</em>${bgNote}`;
    }
    const stdP5 = findNearestVoicing(rootSi, rootFret, 7);
    if (stdP5) {
      return `The standard P5 is at <span class="anchor-ref">${sName(stdP5.si)} string fret ${stdP5.fret}</span> (one string, 2 frets back). This is the same note at a different position.`;
    }
    return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.${bgNote}`;
  }

  // ── Octave ──
  if (semitones === 12) {
    if (absStr <= 2 && absFret <= 3) {
      return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>. Same note, one octave higher.${bgNote}`;
    }
    const stdOct = findNearestVoicing(rootSi, rootFret, 12);
    if (stdOct) {
      return `The nearest octave is at <span class="anchor-ref">${sName(stdOct.si)} string fret ${stdOct.fret}</span> (2 strings, 2 frets up). This is the same note at a different position.`;
    }
    return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.${bgNote}`;
  }

  // ── Unison ──
  if (semitones === 0) {
    return `Same pitch, different string: <em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.`;
  }

  // ── Non-anchor intervals ──
  // Describe relative to nearest landmark (P4, P5, or octave)
  if (semitones >= 1 && semitones <= 4) {
    // Close to P4 — describe as offset from it
    const nearP4 = findNearestVoicing(rootSi, rootFret, 5);
    if (nearP4 && absStr <= 2) {
      const delta = 5 - semitones;
      return `Find the <span class="anchor-ref">P4</span> at ${sName(nearP4.si)} string fret ${nearP4.fret}, then go <em>${delta} fret${delta>1?'s':''} back</em>.`;
    }
  }

  if (semitones === 6) {
    const nearP4 = findNearestVoicing(rootSi, rootFret, 5);
    const nearP5 = findNearestVoicing(rootSi, rootFret, 7);
    if (nearP4 && nearP5) {
      return `Halfway between <span class="anchor-ref">P4</span> (fret ${nearP4.fret}) and <span class="anchor-ref">P5</span> (fret ${nearP5.fret}) on ${sName(nearP4.si)} string.`;
    }
    return `1 fret past the <span class="anchor-ref">P4</span>, or 1 fret before the <span class="anchor-ref">P5</span>.`;
  }

  if (semitones >= 8 && semitones <= 11) {
    // Close to octave — describe as offset from it
    const nearOct = findNearestVoicing(rootSi, rootFret, 12);
    if (nearOct && absStr <= 3) {
      const delta = 12 - semitones;
      return `Find the <span class="anchor-ref">octave</span> at ${sName(nearOct.si)} string fret ${nearOct.fret}, then go <em>${delta} fret${delta>1?'s':''} back</em>.`;
    }
  }

  // Fallback: describe the raw shape, with relay if available
  if (relayDot) {
    const rootNote = NOTE_NAMES[(SMIDI[rootSi] + rootFret) % 12];
    const fretsBetween = Math.abs(ivlFret - relayDot.fret);
    const dir = ivlFret > relayDot.fret ? 'up' : 'back';
    return `${rootNote} is also at <span class="anchor-ref">fret ${relayDot.fret}</span> on the ${sName(ivlSi)} string — from there it's <em>${fretsBetween} fret${fretsBetween>1?'s':''} ${dir}</em>.`;
  }

  return `<em>${absStr} string${absStr>1?'s':''}, ${describeFretDiff(fretDiff)}</em>.`;
}

// When showing a non-standard voicing, add relay context if available
function withRelay(standardDesc, relayDot, semitones) {
  if (relayDot) {
    return `${standardDesc} Here, find the root at <span class="anchor-ref">fret ${relayDot.fret}</span> on the same string first.`;
  }
  return standardDesc;
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
