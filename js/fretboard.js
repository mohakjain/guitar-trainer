// ── Fretboard rendering, dots, and SVG connectors ───────────────────────────

import { OPEN_STRINGS, FRET_COUNT, FRET_MARKERS } from './music.js';

export function buildFretboard() {
  const labelsEl = document.getElementById('fretLabels');
  const fbInner  = document.getElementById('fbInner');
  labelsEl.innerHTML = '';

  // Remove old string rows but keep the SVG overlay
  Array.from(fbInner.children).forEach(c => {
    if (c.id !== 'connectorSvg') c.remove();
  });

  for (let f = 0; f <= FRET_COUNT; f++) {
    const d = document.createElement('div');
    d.className = 'fret-label';
    d.textContent = f === 0 ? '' : f;
    labelsEl.appendChild(d);
  }

  OPEN_STRINGS.forEach((s, si) => {
    const row = document.createElement('div');
    row.className = 'string-row';

    const nm = document.createElement('div');
    nm.className = 'string-name';
    nm.textContent = s.name;
    row.appendChild(nm);

    const fretsEl = document.createElement('div');
    fretsEl.className = 'frets';

    for (let f = 0; f <= FRET_COUNT; f++) {
      const cell = document.createElement('div');
      cell.className = 'fret-cell';
      cell.id = `cell-${si}-${f}`;

      const dot = document.createElement('div');
      dot.className = 'note-dot';
      dot.id = `dot-${si}-${f}`;
      cell.appendChild(dot);

      if (FRET_MARKERS.includes(f)) {
        const m = document.createElement('div');
        m.className = 'fret-marker';
        cell.appendChild(m);
      }

      fretsEl.appendChild(cell);
    }
    row.appendChild(fretsEl);
    fbInner.appendChild(row);
  });
}

export function clearDots() {
  document.querySelectorAll('.note-dot').forEach(d => {
    d.className = 'note-dot';
    d.textContent = '';
    d.style.background = '';
    d.style.color = '';
    d.style.borderColor = '';
  });
}

export function showDot(si, fret, type, label) {
  const dot = document.getElementById(`dot-${si}-${fret}`);
  if (!dot) return;
  dot.className = `note-dot ${type} visible`;
  dot.textContent = label;
}

export function colorDot(si, fret, bgColor, textColor, borderColor) {
  const dot = document.getElementById(`dot-${si}-${fret}`);
  if (!dot) return;
  if (bgColor) dot.style.background = bgColor;
  if (textColor) dot.style.color = textColor;
  if (borderColor) dot.style.borderColor = borderColor;
}

function getDotCenter(si, fret) {
  const cell = document.getElementById(`cell-${si}-${fret}`);
  const parent = document.getElementById('fbInner');
  if (!cell || !parent) return null;
  const cr = cell.getBoundingClientRect();
  const pr = parent.getBoundingClientRect();
  return {
    x: cr.left - pr.left + cr.width / 2,
    y: cr.top  - pr.top  + cr.height / 2,
  };
}

function makeLine(svg, x1, y1, x2, y2, className) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.className.baseVal = className;
  svg.appendChild(line);
}

export function drawConnector(rootSi, rootFret, ivlSi, ivlFret, anchorDot) {
  const svg = document.getElementById('connectorSvg');
  svg.innerHTML = '';

  const A = getDotCenter(rootSi, rootFret);
  const B = getDotCenter(ivlSi, ivlFret);
  if (!A || !B) return;

  if (anchorDot) {
    const L = getDotCenter(anchorDot.si, anchorDot.fret);
    if (L) {
      makeLine(svg, A.x, A.y, L.x, L.y, 'anchor-line visible');
      makeLine(svg, L.x, L.y, B.x, B.y, 'anchor-line visible');
    }
  }

  makeLine(svg, A.x, A.y, B.x, B.y, 'connector-line visible');
}

export function clearConnector() {
  document.getElementById('connectorSvg').innerHTML = '';
}
