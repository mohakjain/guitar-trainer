// ── Game loop, settings, wake lock ───────────────────────────────────────────

import { OPEN_STRINGS, generatePair } from './music.js';
import { getShapeInfo, findReferenceDots } from './pedagogy.js';
import { buildFretboard, clearDots, showDot, colorDot, drawConnector, clearConnector } from './fretboard.js';
import { playNote } from './audio.js';

// ── DOM refs (cached once) ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  playBtn:       $('playBtn'),
  skipBtn:       $('skipBtn'),
  stopBtn:       $('stopBtn'),
  stateLabel:    $('stateLabel'),
  progressFill:  $('progressFill'),
  countLabel:    $('countLabel'),
  nextLabel:     $('nextLabel'),
  rootDisplay:   $('rootDisplay'),
  rootPos:       $('rootPos'),
  noteDisplay:   $('noteDisplay'),
  notePos:       $('notePos'),
  answerCard:    $('answerCard'),
  intervalName:  $('intervalName'),
  intervalSound: $('intervalSound'),
  intervalSemi:  $('intervalSemi'),
  ansHint:       $('ansHint'),
  shapeCard:     $('shapeCard'),
  shapeText:     $('shapeText'),
  shapeHint:     $('shapeHint'),
  modeSelect:    $('modeSelect'),
  speedSlider:   $('speedSlider'),
  speedLabel:    $('speedLabel'),
  settingsPanel: $('settingsPanel'),
  settingsToggle:$('settingsToggle'),
  settingsOverlay:$('settingsOverlay'),
  noUnisonToggle:$('noUnisonToggle'),
};

// ── State ───────────────────────────────────────────────────────────────────
let playing = false;
let t_next = null, t_reveal = null, t_shape = null, t_far = null, t_prog = null;
let count = 0, progStart = null;
let wakeLock = null;

function getMode()  { return els.modeSelect.value; }
function getSpeed() { return parseInt(els.speedSlider.value) * 1000; }

// ── Wake Lock ───────────────────────────────────────────────────────────────
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* not supported or denied */ }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// ── Settings persistence ────────────────────────────────────────────────────
function saveSettings() {
  try {
    localStorage.setItem('fretboard-ears', JSON.stringify({
      mode: els.modeSelect.value,
      speed: els.speedSlider.value,
      noUnison: els.noUnisonToggle.checked,
    }));
  } catch(e) {}
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('fretboard-ears'));
    if (s) {
      if (s.mode) els.modeSelect.value = s.mode;
      if (s.speed) {
        els.speedSlider.value = s.speed;
        els.speedLabel.textContent = s.speed + 's';
      }
      if (s.noUnison) els.noUnisonToggle.checked = s.noUnison;
    }
  } catch(e) {}
}

// ── UI helpers ──────────────────────────────────────────────────────────────
function resetPhaseIndicators() {
}

function clearTimers() {
  clearTimeout(t_next);
  clearTimeout(t_reveal);
  clearTimeout(t_shape);
  clearTimeout(t_far);
  clearInterval(t_prog);
}

function resetCards() {
  els.answerCard.className = 'answer-card hidden';
  els.answerCard.style.borderColor = '';
  els.ansHint.textContent  = 'reveals at 50%';
  els.intervalName.textContent = '—';
  els.intervalSound.textContent = '';
  els.intervalSound.style.color = '';
  els.intervalSemi.textContent = '—';
  els.shapeCard.className = 'shape-card hidden';
  els.shapeText.innerHTML = '—';
  els.shapeHint.textContent = '';
  els.rootDisplay.style.color = '';
  els.noteDisplay.style.color = '';
}

// ── Core game loop ──────────────────────────────────────────────────────────
function nextInterval() {
  clearTimers();
  clearDots();
  clearConnector();
  resetPhaseIndicators();
  resetCards();

  count++;
  els.countLabel.textContent = count + ' played';

  const pair = generatePair(getMode(), { noUnison: els.noUnisonToggle.checked });

  // Show dots
  showDot(pair.root.si, pair.root.fret, 'root', pair.root.note);
  showDot(pair.interval.si, pair.interval.fret, 'ivl', pair.interval.note);

  // Update info cards
  els.rootDisplay.textContent = pair.root.note;
  els.noteDisplay.textContent = pair.interval.note;
  const sn = si => OPEN_STRINGS[si].name;
  els.rootPos.textContent = `${sn(pair.root.si)} str · fret ${pair.root.fret}`;
  els.notePos.textContent = `${sn(pair.interval.si)} str · fret ${pair.interval.fret}`;

  // Play: root then interval
  playNote(pair.root.si, pair.root.fret, 0, 1.4);
  playNote(pair.interval.si, pair.interval.fret, 0.5, 1.4);

  const dur = getSpeed();
  progStart = Date.now();
  els.progressFill.style.width = '0%';
  els.nextLabel.textContent = 'next in ' + (dur/1000) + 's';

  // Phase 1: reveal answer at 50%
  t_reveal = setTimeout(() => {
    if (!playing) return;
    els.answerCard.className = 'answer-card revealed';
    els.answerCard.style.borderColor = pair.info.color;
    els.intervalName.textContent = pair.info.name;
    els.intervalSound.textContent = pair.info.sound;
    els.intervalSemi.textContent = pair.semitones + ' semitone' + (pair.semitones !== 1 ? 's' : '');
    els.ansHint.textContent = '';
    // Reveal interval colors on dots and cards
    const rootColor = pair.semitones === 0 ? pair.info.color : '#e09f5a';
    colorDot(pair.root.si, pair.root.fret, rootColor, '#1a1a1d');
    colorDot(pair.interval.si, pair.interval.fret, pair.info.color, '#1a1a1d');
    els.rootDisplay.style.color = rootColor;
    els.noteDisplay.style.color = pair.info.color;
    els.intervalSound.style.color = pair.info.color;
    // Replay both together
    playNote(pair.root.si, pair.root.fret, 0, 1.8);
    playNote(pair.interval.si, pair.interval.fret, 0, 1.8);
  }, dur * 0.5);

  // Phase 2: show shape + references at 66%
  t_shape = setTimeout(() => {
    if (!playing) return;
    els.answerCard.className = 'answer-card shaped';

    const shapeInfo = getShapeInfo(
      pair.semitones,
      pair.root.si, pair.root.fret,
      pair.interval.si, pair.interval.fret
    );

    els.shapeCard.className = 'shape-card visible';
    els.shapeText.innerHTML = shapeInfo.text;
    els.shapeHint.textContent = shapeInfo.hint;

    // Show ghost dots — other voicings of this interval, colored by interval
    if (shapeInfo.ghostDots) {
      shapeInfo.ghostDots.forEach(g => {
        const type = g.isStandard ? 'ghost-std' : 'ghost';
        showDot(g.si, g.fret, type, g.label);
        colorDot(g.si, g.fret, null, pair.info.color, pair.info.color);
      });
    }

    // Show near reference landmarks (within 2 strings of root or interval)
    const refDots = findReferenceDots(
      pair.root.si, pair.root.fret,
      pair.interval.si, pair.interval.fret
    );
    const isNear = r => {
      const dRoot = Math.abs(r.si - pair.root.si);
      const dIvl = Math.abs(r.si - pair.interval.si);
      return Math.min(dRoot, dIvl) <= 2;
    };
    const isGhost = r => shapeInfo.ghostDots?.some(g => g.si === r.si && g.fret === r.fret);

    refDots.filter(r => isNear(r) && !isGhost(r)).forEach(r => {
      showDot(r.si, r.fret, 'ref', r.label);
      colorDot(r.si, r.fret, null, r.color, r.color);
    });

    // Show relay dot — the root relocated to the interval's string
    if (shapeInfo.relayDot) {
      showDot(shapeInfo.relayDot.si, shapeInfo.relayDot.fret, 'relay', shapeInfo.relayDot.label);
    }

    drawConnector(pair.root.si, pair.root.fret, pair.interval.si, pair.interval.fret, shapeInfo.anchorDot);

    // Stash far refs for the 75% phase
    pair._farRefs = refDots.filter(r => !isNear(r) && !isGhost(r));
  }, dur * 0.66);

  // Phase 3: show far reference dots at 75%
  t_far = setTimeout(() => {
    if (!playing) return;
    if (pair._farRefs) {
      pair._farRefs.forEach(r => {
        showDot(r.si, r.fret, 'ref', r.label);
        colorDot(r.si, r.fret, null, r.color, r.color);
      });
    }
  }, dur * 0.75);

  // Progress bar
  t_prog = setInterval(() => {
    const elapsed = Date.now() - progStart;
    const pct = Math.min((elapsed / dur) * 100, 100);
    els.progressFill.style.width = pct + '%';
    const rem = Math.max(0, Math.ceil((dur - elapsed) / 1000));
    els.nextLabel.textContent = rem > 0 ? 'next in ' + rem + 's' : '...';
  }, 100);

  t_next = setTimeout(() => { if (playing) nextInterval(); }, dur);
}

// ── Public controls ─────────────────────────────────────────────────────────
function startAll() {
  playing = true;
  requestWakeLock();
  saveSettings();
  els.playBtn.textContent = '⏸ Pause';
  els.playBtn.classList.remove('primary');
  els.stopBtn.style.display = 'inline-block';
  els.skipBtn.disabled = false;
  els.stateLabel.textContent = 'Playing — hands off!';
  nextInterval();
}

function pauseAll() {
  playing = false;
  clearTimers();
  releaseWakeLock();
  els.playBtn.textContent = '▶ Resume';
  els.playBtn.classList.add('primary');
  els.stateLabel.textContent = 'Paused';
  els.nextLabel.textContent = '—';
}

function stopAll() {
  playing = false;
  clearTimers();
  clearDots();
  clearConnector();
  resetPhaseIndicators();
  releaseWakeLock();
  count = 0;
  els.playBtn.textContent = '▶ Play';
  els.playBtn.classList.add('primary');
  els.stopBtn.style.display = 'none';
  els.skipBtn.disabled = true;
  els.stateLabel.textContent = 'Press play to begin';
  els.progressFill.style.width = '0%';
  els.countLabel.textContent = '0 played';
  els.nextLabel.textContent = '—';
  els.rootDisplay.textContent = '—';
  els.noteDisplay.textContent = '—';
  els.rootPos.textContent = '—';
  els.notePos.textContent = '—';
  resetCards();
}

function togglePlay() {
  playing ? pauseAll() : startAll();
}

function toggleSettings() {
  const isOpen = els.settingsPanel.classList.toggle('open');
  els.settingsToggle.classList.toggle('open');
  els.settingsOverlay.classList.toggle('open', isOpen);
}

function closeSettings() {
  els.settingsPanel.classList.remove('open');
  els.settingsToggle.classList.remove('open');
  els.settingsOverlay.classList.remove('open');
}

// ── Init ────────────────────────────────────────────────────────────────────
loadSettings();
buildFretboard();

// Event listeners
els.speedSlider.addEventListener('input', () => {
  els.speedLabel.textContent = els.speedSlider.value + 's';
});
els.modeSelect.addEventListener('change', saveSettings);
els.speedSlider.addEventListener('change', saveSettings);
els.noUnisonToggle.addEventListener('change', saveSettings);

// Expose to onclick handlers in HTML
window.togglePlay = togglePlay;
window.nextInterval = nextInterval;
window.stopAll = stopAll;
window.toggleSettings = toggleSettings;
window.closeSettings = closeSettings;
