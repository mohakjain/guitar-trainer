// ── Piano roll DOM and rendering ─────────────────────────────────────────────

import { NOTE_NAMES } from './music.js';

const PIANO_LO = 48; // C3
const PIANO_HI = 71; // B4
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]); // semitone offsets within octave

export function buildPianoRoll() {
  const grid = document.getElementById('pianorollGrid');
  grid.innerHTML = '';
  // Build rows from high (top) to low (bottom)
  for (let midi = PIANO_HI; midi >= PIANO_LO; midi--) {
    const pc = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const row = document.createElement('div');
    row.className = 'pr-row' + (BLACK_KEYS.has(pc) ? ' black-key' : '');
    row.dataset.midi = midi;

    const label = document.createElement('span');
    label.className = 'pr-label';
    label.textContent = NOTE_NAMES[pc] + octave;

    const barArea = document.createElement('div');
    barArea.className = 'pr-bar-area';
    barArea.id = 'pr-bar-' + midi;

    row.appendChild(label);
    row.appendChild(barArea);
    grid.appendChild(row);
  }
}

export function showBar(midi, type, label) {
  const area = document.getElementById('pr-bar-' + midi);
  if (!area) return;
  const bar = document.createElement('div');
  bar.className = 'pr-bar ' + type;
  bar.textContent = label;
  area.appendChild(bar);
  // Trigger transition
  requestAnimationFrame(() => bar.classList.add('visible'));
}

export function colorBar(midi, bg) {
  const area = document.getElementById('pr-bar-' + midi);
  if (!area) return;
  area.querySelectorAll('.pr-bar').forEach(bar => bar.style.background = bg);
}

export function showRefBar(midi, label, color) {
  const area = document.getElementById('pr-bar-' + midi);
  if (!area) return;
  const bar = document.createElement('div');
  bar.className = 'pr-bar ref';
  bar.textContent = label;
  bar.style.borderColor = color;
  bar.style.color = color;
  area.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add('visible'));
}

export function clearBars() {
  for (let midi = PIANO_LO; midi <= PIANO_HI; midi++) {
    const area = document.getElementById('pr-bar-' + midi);
    if (area) area.innerHTML = '';
  }
}
