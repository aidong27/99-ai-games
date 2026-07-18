/* ============================================================
   RESONANCE LOOM — audio engine
   Pure Web Audio API. No samples, no assets, no copyrighted audio.
   All music is synthesised live from note data in songs.js.

   Two roles:
     (1) SynthEngine  — plays melodic percussion notes when you hit a note.
     (2) MusicPlayer  — plays the backing melody/bass of each song.
   ============================================================ */

/* ---------- Tiny music helpers ---------- */
// Note name -> MIDI number, e.g. "C4" -> 60. Supports sharps/flats.
function noteToMidi(name) {
  const map = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) return 60;
  const pitch = map[m[1]];
  const octave = parseInt(m[2], 10);
  return (octave + 1) * 12 + pitch;
}
function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

/* ============================================================
   SynthEngine — short percussive "blip" tones for hit feedback.
   One tone per lane, so the player "plays" a melody.
   ============================================================ */
class SynthEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    // Per-lane base note (a pleasant pentatonic-ish spread)
    this.laneNotes = ['C4', 'E4', 'G4', 'C5'].map(noteToMidi);
  }

  // Lazily create the AudioContext on first user gesture (browser policy).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  // Play a short note. midi=note, type=waveform, dur=seconds, vol=0..1
  tone(midi, { type='triangle', dur=0.25, vol=0.4, attack=0.005, release=0.12 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToFreq(midi);
    // ADSR-ish envelope: quick attack, exponential release
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + release);
  }

  // Hit feedback for a given lane (transposed up by combo for a rising feel,
  // but clamped so it never gets piercing).
  hit(lane, combo = 0) {
    const base = this.laneNotes[lane];
    const step = Math.min(12, Math.floor(combo / 8)); // up to +1 octave
    this.tone(base + step, { type: 'triangle', dur: 0.22, vol: 0.45 });
    // sparkle layer on top
    this.tone(base + step + 12, { type: 'sine', dur: 0.18, vol: 0.12 });
  }

  // A soft "miss" thud — downward, slightly dissonant.
  miss() {
    if (!this.ctx) return;
    this.tone(noteToMidi('A2'), { type: 'sawtooth', dur: 0.18, vol: 0.25, attack: 0.01 });
  }

  // Menu click.
  blip() {
    this.tone(noteToMidi('C5'), { type: 'square', dur: 0.06, vol: 0.18 });
  }
}

/* ============================================================
   MusicPlayer — plays the backing track of a song.
   A song's `sequence` is an array of events:
       { t: seconds, kind: 'melody'|'bass'|'pad', midi, dur, vol, type }
   We schedule them with the AudioContext clock for tight timing.
   ============================================================ */
class MusicPlayer {
  constructor(synth) {
    this.synth = synth;
    this.scheduled = [];     // active oscillator nodes (for stop())
    this.startTime = 0;
    this.song = null;
    this.playing = false;
    this.endTimeout = null;
  }

  play(song, { onEnd } = {}) {
    this.stop();
    const ctx = this.synth.ensure();
    this.song = song;
    this.playing = true;
    this.startTime = ctx.currentTime + 0.15; // small lead-in

    const seq = song.sequence || [];
    const tempo = song.tempo || 120;
    // sequence times are in BEATS if song.timeMode==='beat', else seconds.
    const beatDur = 60 / tempo;
    for (const ev of seq) {
      const when = (song.timeMode === 'beat' ? ev.t * beatDur : ev.t);
      this._scheduleEvent(ev, when);
    }

    const total = (song.timeMode === 'beat' ? song.lengthBeats * beatDur : song.length);
    this.endTimeout = setTimeout(() => {
      this.playing = false;
      if (onEnd) onEnd();
    }, (total + 1.0) * 1000);
  }

  _scheduleEvent(ev, when) {
    const ctx = this.synth.ctx;
    const at = this.startTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = ev.type || 'triangle';
    osc.frequency.value = midiToFreq(ev.midi);
    const vol = (ev.vol ?? 0.3);
    const dur = ev.dur ?? 0.3;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    gain.gain.setValueAtTime(vol, at + dur * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.synth.master);
    osc.start(at);
    osc.stop(at + dur + 0.1);
    this.scheduled.push(osc);
  }

  stop() {
    if (this.endTimeout) { clearTimeout(this.endTimeout); this.endTimeout = null; }
    for (const osc of this.scheduled) {
      try { osc.stop(); } catch (e) { /* already stopped */ }
    }
    this.scheduled = [];
    this.playing = false;
  }

  // Pause: stop all sound but remember nothing (restart-on-resume handled by caller).
  pause() { this.stop(); }
}

// Expose a single shared synth for the whole game.
const synth = new SynthEngine();
