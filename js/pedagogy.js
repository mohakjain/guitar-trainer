// ── Anchor-based pedagogy ────────────────────────────────────────────────────
//
// The core idea: teach every interval as a delta from an anchor you already know.
// The 4 anchors every guitarist knows by shape:
//   P4 (5 semi): 1 string down, same fret (that's how the guitar is tuned)
//   P5 (7 semi): 1 string down, 2 frets back (power chord)
//   Octave (12): 2 strings down, 2 frets up (octave box)
//   Unison (0): same note, reference point
//
// For cross-string intervals, we find the nearest anchor on the fretboard
// and describe the target as "anchor + N frets" or "anchor - N frets".
// We also SHOW the anchor dot on the fretboard so the user can visualize.

import { SMIDI, FRET_COUNT, NOTE_NAMES, OPEN_STRINGS, INTERVALS } from './music.js';

function findAnchorPosition(rootSi, rootFret, anchorSemitones) {
  const targetMidi = SMIDI[rootSi] + rootFret + anchorSemitones;
  const candidates = [];

  for (let si = 0; si < 6; si++) {
    const f = targetMidi - SMIDI[si];
    if (f >= 0 && f <= FRET_COUNT && si !== rootSi) {
      candidates.push({ si, fret: f, strDist: Math.abs(si - rootSi) });
    }
  }

  candidates.sort((a, b) => a.strDist - b.strDist);
  return candidates[0] || null;
}

export function getShapeInfo(semitones, rootSi, rootFret, ivlSi, ivlFret) {
  const strDiff = ivlSi - rootSi; // positive = lower pitched string
  const fretDiff = ivlFret - rootFret;

  const crossesBG = (Math.min(rootSi, ivlSi) <= 1 && Math.max(rootSi, ivlSi) >= 2);

  let text = '', hint = '', anchor = null;

  // ── Same string: just count frets ──
  if (strDiff === 0) {
    if (semitones === 0) {
      text = `Same note, same spot.`;
      hint = 'The simplest case — identical pitch.';
    } else {
      text = `Same string, <em>${semitones} fret${semitones>1?'s':''} up</em>.`;
      if (semitones <= 3) hint = `${semitones} fret${semitones>1?'s':''} is easy to count.`;
      else if (semitones === 5) hint = 'Same distance as the next open string (P4).';
      else if (semitones === 7) hint = 'Same as jumping to the next string + 2 frets back.';
      else if (semitones === 12) hint = 'Exactly at the 12th fret marker — one octave.';
      else if (semitones < 7) hint = `That's a P5 (7 frets) minus ${7 - semitones}.`;
      else hint = `That's an octave (12) minus ${12 - semitones} frets.`;
    }
    return { text, hint, anchor };
  }

  // ── Unison across strings ──
  if (semitones === 0) {
    text = `Same pitch on a different string: <em>${Math.abs(strDiff)} string${Math.abs(strDiff)>1?'s':''} ${strDiff > 0 ? 'lower' : 'higher'}</em>, <em>${Math.abs(fretDiff)} fret${Math.abs(fretDiff)>1?'s':''} ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
    hint = crossesBG
      ? 'The B-G gap is 4 semitones (not 5), so the fret offset shifts by 1 when crossing that pair.'
      : 'Each string pair is 5 semitones apart, so going 1 string lower = 5 frets higher for the same note.';
    return { text, hint, anchor };
  }

  // ── P4 (5 semitones) — this IS an anchor ──
  if (semitones === 5) {
    if (Math.abs(strDiff) === 1 && strDiff > 0) {
      text = `<em>One string lower, ${fretDiff === 0 ? 'same fret' : Math.abs(fretDiff) + ' fret' + (Math.abs(fretDiff)>1?'s':'') + (fretDiff > 0 ? ' up' : ' down')}</em>. This is how the guitar is tuned — each string is a 4th apart.`;
      hint = crossesBG
        ? 'Exception: B→G is only 4 semitones, so the P4 needs +1 fret compensation.'
        : 'This is the most natural interval on guitar. Same fret, next string down = perfect 4th.';
    } else {
      text = `<em>${Math.abs(strDiff)} strings ${strDiff > 0 ? 'lower' : 'higher'}</em>, <em>${Math.abs(fretDiff)} frets ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
      hint = 'The simplest P4 shape is 1 string lower, same fret.';
    }
    return { text, hint, anchor };
  }

  // ── P5 (7 semitones) — this IS an anchor ──
  if (semitones === 7) {
    if (Math.abs(strDiff) === 1 && strDiff > 0) {
      text = `<em>One string lower, ${Math.abs(fretDiff)} fret${Math.abs(fretDiff)>1?'s':''} ${fretDiff > 0 ? 'up' : 'down'}</em>. The <em>power chord</em> shape.`;
      hint = crossesBG
        ? 'Crossing B-G: power chord shifts — 1 string lower, 1 fret down (not 2).'
        : 'The power chord: 1 string lower, 2 frets back. The most recognizable shape in rock guitar.';
    } else {
      text = `<em>${Math.abs(strDiff)} strings ${strDiff > 0 ? 'lower' : 'higher'}</em>, <em>${Math.abs(fretDiff)} frets ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
      hint = 'The simplest P5 is the power chord: 1 string lower, 2 frets back.';
    }
    return { text, hint, anchor };
  }

  // ── Octave (12) — this IS an anchor ──
  if (semitones === 12) {
    if (Math.abs(strDiff) === 2) {
      text = `<em>2 strings lower, ${Math.abs(fretDiff)} frets ${fretDiff > 0 ? 'up' : 'down'}</em>. The <em>octave box</em>.`;
      hint = crossesBG
        ? 'Crossing B-G: the octave box shifts to +3 frets instead of +2.'
        : 'Classic octave shape: 2 strings down, 2 frets up. Use the fret markers to spot it fast.';
    } else if (strDiff === 0) {
      text = `Same string, <em>12 frets up</em> — right at the octave marker.`;
      hint = '12th fret = octave. The double dot marker is your landmark.';
    } else {
      text = `<em>${Math.abs(strDiff)} strings ${strDiff > 0 ? 'lower' : 'higher'}</em>, <em>${Math.abs(fretDiff)} frets ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
      hint = 'The standard octave shape is 2 strings down, 2 frets up.';
    }
    return { text, hint, anchor };
  }

  // ── Intervals 1-4: anchor to P4 ──
  if (semitones >= 1 && semitones <= 4) {
    const p4pos = findAnchorPosition(rootSi, rootFret, 5);
    const absDelta = 5 - semitones;

    if (p4pos && Math.abs(strDiff) <= 2) {
      anchor = { si: p4pos.si, fret: p4pos.fret, label: 'P4' };
      text = `Find the <span class="anchor-ref">P4</span> (1 string down, same fret), then go <em>${absDelta} fret${absDelta>1?'s':''} back</em>.`;

      if (semitones === 4) hint = 'Major 3rd = P4 minus 1 fret. One fret below where you\'d play a 4th.';
      else if (semitones === 3) hint = 'Minor 3rd = P4 minus 2 frets. Two frets below the 4th — think "power chord on the same string pair but 1 fret further back."';
      else if (semitones === 2) hint = 'Major 2nd = P4 minus 3 frets. A whole step — easy to count on one string, trickier across strings.';
      else if (semitones === 1) hint = 'Minor 2nd = P4 minus 4 frets. Maximum tension — practically touching.';
    } else {
      text = describeGeometry(strDiff, fretDiff);
      hint = `${INTERVALS[semitones].name}: ${semitones} semitones. On one string, that's ${semitones} frets up.`;
    }
    return { text, hint, anchor };
  }

  // ── Tritone (6): between P4 and P5 ──
  if (semitones === 6) {
    const p5pos = findAnchorPosition(rootSi, rootFret, 7);
    if (p5pos) {
      anchor = { si: p5pos.si, fret: p5pos.fret, label: 'P5' };
      text = `Find the <span class="anchor-ref">P5</span> (power chord shape), then go <em>1 fret back</em>. Or find the <span class="anchor-ref">P4</span> and go <em>1 fret forward</em>.`;
      hint = 'The tritone sits exactly between the 4th and 5th — 1 fret from each. The most unstable interval.';
    } else {
      text = describeGeometry(strDiff, fretDiff) + ' One fret short of a power chord.';
      hint = 'Tritone = P5 - 1 fret = P4 + 1 fret.';
    }
    return { text, hint, anchor };
  }

  // ── Intervals 8-11: anchor to octave ──
  if (semitones >= 8 && semitones <= 11) {
    const octPos = findAnchorPosition(rootSi, rootFret, 12);
    const delta = 12 - semitones;

    if (octPos) {
      anchor = { si: octPos.si, fret: octPos.fret, label: '8ve' };
      text = `Find the <span class="anchor-ref">octave</span> (2 strings down, 2 frets up), then go <em>${delta} fret${delta>1?'s':''} back</em>.`;

      if (semitones === 11) hint = 'Major 7th = 1 fret short of the octave. Maximum leading-tone tension — wants to resolve up.';
      else if (semitones === 10) hint = 'Minor 7th = 2 frets short of the octave. The dominant 7th sound — bluesy, expectant.';
      else if (semitones === 9) hint = 'Major 6th = 3 frets short of the octave. Warm and open. It\'s also an inverted minor 3rd.';
      else if (semitones === 8) hint = 'Minor 6th = 4 frets short of the octave. Dark and wide. It\'s an inverted major 3rd.';
    } else {
      text = describeGeometry(strDiff, fretDiff);
      hint = `${INTERVALS[semitones].name} = octave minus ${delta} frets.`;
    }
    return { text, hint, anchor };
  }

  // Fallback
  text = describeGeometry(strDiff, fretDiff);
  hint = `${semitones} semitone${semitones!==1?'s':''} from the root.`;
  return { text, hint, anchor };
}

function describeGeometry(strDiff, fretDiff) {
  return `<em>${Math.abs(strDiff)} string${Math.abs(strDiff)>1?'s':''} ${strDiff > 0 ? 'lower' : 'higher'}</em>, <em>${Math.abs(fretDiff)} fret${Math.abs(fretDiff)>1?'s':''} ${fretDiff > 0 ? 'up' : 'down'}</em>.`;
}
