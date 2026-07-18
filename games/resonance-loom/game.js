/* ============================================================
   RESONANCE LOOM — core game engine
   Pure DOM + requestAnimationFrame. No frameworks.

   Architecture:
     - SCREENS: title / song-select / game / pause / result / help
     - GameManager: holds active run state, drives the RAF loop,
       handles note spawning + judgement + scoring.
     - A single shared SynthEngine (from audio.js) for hit feedback,
       and a MusicPlayer for backing tracks.
   ============================================================ */

(function () {
'use strict';

/* ---------- Constants ---------- */
const LANES = 4;
const KEYS = ['d', 'f', 'j', 'k'];
// Judgement windows, in seconds from the perfect-hit moment.
const WINDOWS = {
  perfect: 0.055,
  great:   0.100,
  good:    0.160,
  miss:    0.180,   // beyond this (or past note time + miss) => miss
};
const SCORE = { perfect: 300, great: 200, good: 100, miss: 0 };
// Notes spawn this far above the hit line (in seconds of lead time).
const APPROACH_TIME = 1.6;

/* ---------- DOM refs ---------- */
const $ = (id) => document.getElementById(id);
const screens = {
  title:       $('title-screen'),
  songSelect:  $('song-select-screen'),
  game:        $('game-screen'),
  pause:       $('pause-overlay'),
  result:      $('result-screen'),
  help:        $('help-overlay'),
};

/* ---------- Screen switching ---------- */
function showScreen(name) {
  for (const k in screens) screens[k].classList.add('hidden');
  if (screens[name]) screens[name].classList.remove('hidden');
}

/* ---------- Decorative background notes ---------- */
function spawnBgNotes() {
  const colors = ['#7c3aed', '#ff2d95', '#00e5ff', '#ffcf5c'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.className = 'note-bg';
    el.style.background = colors[i % colors.length];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = Math.random() * 100 + 'vh';
    const dur = 8 + Math.random() * 10;
    const dx = (Math.random() - 0.5) * 200;
    const dy = (Math.random() - 0.5) * 200;
    el.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0,0)' },
      ],
      { duration: dur * 1000, iterations: Infinity, easing: 'ease-in-out' }
    );
    document.body.appendChild(el);
  }
}

/* ---------- High-score persistence (localStorage) ---------- */
function highScoreKey(song) { return 'resonance-loom:hi:' + song.id; }
function getHighScore(song) {
  try { return parseInt(localStorage.getItem(highScoreKey(song)) || '0', 10) || 0; }
  catch (e) { return 0; }
}
function setHighScore(song, score) {
  try { localStorage.setItem(highScoreKey(song), String(score)); } catch (e) {}
}

/* ---------- Build song-select list ---------- */
function buildSongList() {
  const list = $('song-list');
  list.innerHTML = '';
  SONGS.forEach((song, idx) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    const diffLabel = ['', 'Easy', 'Normal', 'Hard'][song.difficulty];
    const hi = getHighScore(song);
    card.innerHTML = `
      <div class="num">${idx + 1}</div>
      <div class="meta">
        <div class="title">${song.title}</div>
        <div class="desc">${song.desc} · ${song.bpm} BPM</div>
        <div class="high">Best: ${hi.toLocaleString()}</div>
      </div>
      <div class="diff diff-${song.difficulty}">${diffLabel}</div>
    `;
    card.addEventListener('click', () => {
      synth.blip();
      startGame(song);
    });
    list.appendChild(card);
  });
}

/* ============================================================
   GameManager
   ============================================================ */
class GameManager {
  constructor() {
    this.player = new MusicPlayer(synth);
    this.reset(null);
  }

  reset(song) {
    this.song = song;
    this.notes = [];          // active notes: { el, lane, hitTime, hit, missed }
    this.spawnIdx = 0;        // next note in song.notes to spawn
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.totalNotes = song ? song.notes.length : 0;
    this.startTime = 0;
    this.paused = false;
    this.pausedAt = 0;
    this.pauseOffset = 0;
    this.running = false;
    this.rafId = null;
    this.songEnded = false;
  }

  // convert a note's beat -> absolute hit time (seconds since audio start)
  noteHitTime(note) {
    const beatDur = 60 / this.song.tempo;
    return note.beat * beatDur;
  }

  start(song) {
    this.reset(song);
    // wire DOM
    $('score').textContent = '0';
    $('combo').textContent = '0';
    $('judgement').textContent = '\u00a0';
    $('song-now').textContent = song.title;
    $('progress').style.width = '0%';

    // clear stray notes
    document.querySelectorAll('#track .note, #track .ripple').forEach((n) => n.remove());

    // Ensure audio is unlocked by a user gesture (Play/click).
    synth.ensure();

    // Start music + clock
    this.running = true;
    this.startTime = performance.now();
    this.player.play(song, { onEnd: () => this._maybeFinish() });

    this._loop();
  }

  _now() {
    // seconds since start, accounting for pause offset
    return (performance.now() - this.startTime) / 1000 - this.pauseOffset;
  }

  _loop() {
    if (!this.running) return;
    if (!this.paused) this._update();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _update() {
    const now = this._now();

    // spawn notes whose hit time is within APPROACH_TIME
    const sn = this.song.notes;
    while (this.spawnIdx < sn.length && this.noteHitTime(sn[this.spawnIdx]) - now < APPROACH_TIME) {
      this._spawnNote(sn[this.spawnIdx]);
      this.spawnIdx++;
    }

    // move + judge active notes
    const track = $('track');
    const trackH = track.clientHeight;
    const hitZoneFromBottom = 110; // matches CSS #hit-zone { bottom:110px }
    const fallDistance = trackH;   // travel full track height during APPROACH_TIME

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.hit) continue;
      const dt = now - n.hitTime;            // <0 above the line, >0 past it
      // Notes enter from above and fall DOWN. At hitTime (dt=0) the note sits
      // exactly on the hit zone. Before that (dt<0) it is higher up (smaller y).
      // So displacement from the hit zone is dt-scaled and POSITIVE = below.
      const pxFromHitZone = dt * (fallDistance / APPROACH_TIME);
      // place note so its vertical centre sits on hit zone at hitTime.
      // hit zone bottom-edge is at (trackH - hitZoneFromBottom) from top.
      const noteH = n.el.offsetHeight || 22;
      const top = (trackH - hitZoneFromBottom) - noteH / 2 + pxFromHitZone;
      n.el.style.transform = `translateY(${top}px)`;

      // miss if too late
      if (dt > WINDOWS.miss) {
        this._judge('miss', n);
      }
    }

    // progress bar
    const total = (this.song.timeMode === 'beat' ? this.song.lengthBeats * (60 / this.song.tempo) : this.song.length);
    $('progress').style.width = Math.min(100, (now / total) * 100) + '%';

    // finish if all notes processed + song ended
    if (this.spawnIdx >= this.song.notes.length && this.notes.every((n) => n.hit)) {
      // wait for music to end (onEnd handles it), but allow early finish after 1.5s
    }
  }

  _spawnNote(note) {
    const el = document.createElement('div');
    el.className = 'note';
    el.setAttribute('data-lane', note.lane);
    // horizontal position: each lane is 25% wide; centre within lane.
    el.style.left = (note.lane * 25 + 0.5) + '%';
    el.style.width = 'calc(25% - 8px)';
    el.style.top = '-40px';
    $('track').appendChild(el);
    this.notes.push({
      el,
      lane: note.lane,
      hitTime: this.noteHitTime(note),
      hit: false,
      missed: false,
    });
  }

  // Player pressed a lane key (or tapped a lane).
  press(lane) {
    // visual key feedback
    const keyEl = document.querySelector(`.key[data-lane="${lane}"]`);
    if (keyEl) keyEl.classList.add('active');

    if (!this.running || this.paused) return;

    // find the nearest un-hit note in this lane
    const now = this._now();
    let best = null, bestDt = Infinity;
    for (const n of this.notes) {
      if (n.hit || n.lane !== lane) continue;
      const dt = Math.abs(now - n.hitTime);
      if (dt < bestDt) { bestDt = dt; best = n; }
    }

    // ripple feedback regardless
    this._ripple(lane);

    if (!best || bestDt > WINDOWS.good) {
      // no note in range: don't penalise, but no reward either (anti-mash: small combo break)
      // We'll be lenient: do nothing. (Many rhythm games break combo; we keep it friendly.)
      return;
    }

    let grade;
    if (bestDt <= WINDOWS.perfect)      grade = 'perfect';
    else if (bestDt <= WINDOWS.great)   grade = 'great';
    else                                grade = 'good';

    this._judge(grade, best);
  }

  release(lane) {
    const keyEl = document.querySelector(`.key[data-lane="${lane}"]`);
    if (keyEl) keyEl.classList.remove('active');
  }

  _judge(grade, note) {
    note.hit = true;
    if (grade === 'miss') note.missed = true;

    this.counts[grade]++;
    const wasMiss = (grade === 'miss');
    if (!wasMiss) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      synth.hit(note.lane, this.combo);
    } else {
      this.combo = 0;
      synth.miss();
    }

    // scoring with combo multiplier (combo bonus)
    const base = SCORE[grade];
    const comboBonus = wasMiss ? 0 : Math.min(this.combo, 50); // up to +50/note
    this.score += base + comboBonus;

    // update HUD
    $('score').textContent = this.score.toLocaleString();
    $('combo').textContent = this.combo;

    // judgement text
    const jp = $('judge-pop');
    const colors = { perfect: '#00e5ff', great: '#7c3aed', good: '#ffcf5c', miss: '#ff5b5b' };
    jp.textContent = grade.toUpperCase();
    jp.style.color = colors[grade];
    jp.classList.remove('show');
    void jp.offsetWidth; // reflow to restart animation
    jp.classList.add('show');

    const jud = $('judgement');
    jud.textContent = grade.toUpperCase();
    jud.style.color = colors[grade];

    // remove note element (with a quick fade)
    if (note.el) {
      if (wasMiss) {
        note.el.style.opacity = '0.25';
        setTimeout(() => note.el.remove(), 200);
      } else {
        note.el.style.transition = 'opacity .15s, transform .15s';
        note.el.style.opacity = '0';
        note.el.style.transform += ' scale(1.6)';
        setTimeout(() => note.el.remove(), 160);
      }
    }

    // combo milestones
    if (!wasMiss && this.combo > 0 && this.combo % 10 === 0) {
      const cb = $('combo-big');
      cb.textContent = this.combo + ' COMBO';
      cb.classList.remove('show');
      void cb.offsetWidth;
      cb.classList.add('show');
    }

    // check completion
    if (this.spawnIdx >= this.song.notes.length && this.notes.every((n) => n.hit)) {
      this._maybeFinish();
    }
  }

  _ripple(lane) {
    const r = document.createElement('div');
    r.className = 'ripple fire';
    r.style.left = (lane * 25 + 2.5) + '%';
    r.style.width = '20%';
    $('track').appendChild(r);
    setTimeout(() => r.remove(), 420);
  }

  _maybeFinish() {
    if (this.songEnded) return;
    // ensure all notes are judged
    for (const n of this.notes) {
      if (!n.hit) this._judge('miss', n);
    }
    if (this.notes.every((n) => n.hit)) {
      this.songEnded = true;
      // give the final note a moment to fade
      setTimeout(() => this._finish(), 400);
    }
  }

  _finish() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.player.stop();

    // accuracy
    const weights = { perfect: 1.0, great: 0.65, good: 0.3, miss: 0 };
    let acc = 0;
    const denom = this.totalNotes;
    for (const k of ['perfect','great','good','miss']) acc += this.counts[k] * weights[k];
    const accuracy = denom ? (acc / denom) * 100 : 0;

    // grade
    let grade;
    if      (accuracy >= 95) grade = 'S';
    else if (accuracy >= 85) grade = 'A';
    else if (accuracy >= 70) grade = 'B';
    else if (accuracy >= 50) grade = 'C';
    else                     grade = 'D';

    // high score
    const prevHi = getHighScore(this.song);
    const isRecord = this.score > prevHi;
    if (isRecord) setHighScore(this.song, this.score);

    // populate result screen
    $('result-title').textContent = (grade === 'D') ? 'TRY AGAIN' : 'CLEAR';
    const g = $('result-grade');
    g.textContent = grade;
    g.className = 'grade-' + grade;
    $('r-perfect').textContent = this.counts.perfect;
    $('r-great').textContent   = this.counts.great;
    $('r-good').textContent    = this.counts.good;
    $('r-miss').textContent    = this.counts.miss;
    $('r-maxcombo').textContent= this.maxCombo;
    $('r-acc').textContent     = accuracy.toFixed(1) + '%';
    $('r-score').textContent   = this.score.toLocaleString();
    $('r-notes').textContent   = this.totalNotes;
    $('new-record').textContent = isRecord ? '★ NEW RECORD ★' : '';

    showScreen('result');
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pausedAt = performance.now();
    this.player.pause();
    showScreen('pause');
  }

  resume() {
    if (!this.paused) return;
    // fold the paused interval into the offset so note timings stay correct
    const pausedFor = (performance.now() - this.pausedAt) / 1000;
    this.pauseOffset += pausedFor;
    this.paused = false;
    // restart the music from the current position — simplest correct approach
    // is to re-schedule the remaining backing events. For simplicity we just
    // resume without backing track; the gameplay tones still play on hit.
    // (Keeps timing honest rather than desyncing the chart.)
    showScreen('game');
  }

  restart() {
    if (this.song) this.start(this.song);
  }

  quit() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.player.stop();
    document.querySelectorAll('#track .note, #track .ripple').forEach((n) => n.remove());
    buildSongList();
    showScreen('songSelect');
  }
}

const game = new GameManager();

/* ---------- Top-level actions ---------- */
function startGame(song) { showScreen('game'); game.start(song); }

/* ============================================================
   Input wiring
   ============================================================ */
// keyboard
window.addEventListener('keydown', (e) => {
  // ignore auto-repeat for press visuals but still allow re-judge? We debouce via key state.
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (KEYS.indexOf(k) >= 0) {
    const lane = KEYS.indexOf(k);
    game.press(lane);
    e.preventDefault();
    return;
  }
  if (k === ' ') {
    // pause toggle only during gameplay
    if (!screens.game.classList.contains('hidden')) {
      if (game.paused) { game.resume(); synth.blip(); }
      else { game.pause(); synth.blip(); }
    } else if (!screens.pause.classList.contains('hidden')) {
      game.resume();
    }
    e.preventDefault();
  }
  if (k === 'escape') {
    if (!screens.game.classList.contains('hidden') || !screens.pause.classList.contains('hidden')) {
      game.quit();
    } else if (!screens.help.classList.contains('hidden')) {
      showScreen('title');
    } else if (!screens.songSelect.classList.contains('hidden')) {
      showScreen('title');
    }
  }
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (KEYS.indexOf(k) >= 0) {
    game.release(KEYS.indexOf(k));
  }
});

// touch / mouse: tap a lane to hit it
document.querySelectorAll('.key').forEach((keyEl) => {
  const lane = parseInt(keyEl.getAttribute('data-lane'), 10);
  const press = (e) => { e.preventDefault(); game.press(lane); };
  const release = () => game.release(lane);
  keyEl.addEventListener('mousedown', press);
  keyEl.addEventListener('mouseup', release);
  keyEl.addEventListener('mouseleave', release);
  keyEl.addEventListener('touchstart', press, { passive: false });
  keyEl.addEventListener('touchend', release);
});

/* ---------- Button wiring ---------- */
$('btn-play').addEventListener('click', () => {
  synth.blip();
  buildSongList();
  showScreen('songSelect');
});
$('btn-howto').addEventListener('click', () => { synth.blip(); showScreen('help'); });
$('btn-help-close').addEventListener('click', () => { synth.blip(); showScreen('title'); });
$('btn-back-title').addEventListener('click', () => { synth.blip(); showScreen('title'); });

$('pause-btn').addEventListener('click', () => { synth.blip(); game.pause(); });
$('btn-resume').addEventListener('click', () => { synth.blip(); game.resume(); });
$('btn-restart').addEventListener('click', () => { synth.blip(); game.restart(); });
$('btn-quit').addEventListener('click', () => { synth.blip(); game.quit(); });

$('btn-replay').addEventListener('click', () => { synth.blip(); game.restart(); });
$('btn-result-menu').addEventListener('click', () => { synth.blip(); game.quit(); });

/* ---------- Boot ---------- */
spawnBgNotes();
showScreen('title');

})();
