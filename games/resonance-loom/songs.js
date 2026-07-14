/* ============================================================
   RESONANCE LOOM — song definitions
   Every melody here is ORIGINAL to this game (composed by GLM-5.2).
   No copyrighted audio, no samples, no third-party material.

   Two parts per song:
     - notes:    the falling gameplay chart. Each = { beat, lane }.
     - sequence: the backing music (melody/bass/pad) scheduled by MusicPlayer.
   Times are in BEATS (timeMode:'beat'); MusicPlayer converts to seconds.

   Difficulty ramps across the three songs:
       1. "Aurora Drift"   — Easy   (~90 bpm, sparse, slow)
       2. "Neon Loom"      — Normal (120 bpm, steady 8th notes)
       3. "Chronos Surge"  — Hard   (160 bpm, dense, syncopated)
   ============================================================ */

/* ---------- small composition helpers ---------- */
// repeat a pattern of (beat, lane) offsets, shifted by a base beat.
function pat(baseBeat, offsets) {
  return offsets.map(([b, l]) => ({ beat: baseBeat + b, lane: l }));
}
// straight run of 8th notes down/across lanes from startBeat for n notes.
function run8(startBeat, n, laneOrder) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ beat: startBeat + i * 0.5, lane: laneOrder[i % laneOrder.length] });
  }
  return out;
}

/* ============================================================
   SONG 1 — "Aurora Drift" (Easy)
   ============================================================ */
const SONG_AURORA = (() => {
  const notes = [];
  // Gentle, sparse: mostly quarter notes, a few eighths. 8 bars of 4/4.
  // Bar-by-bar, lanes 0..3.
  notes.push(...pat(0,   [[0,0],[1,1],[2,2],[3,3]]));            // bar 1 — walk up
  notes.push(...pat(4,   [[0,3],[1,2],[2,1],[3,0]]));            // bar 2 — walk down
  notes.push(...pat(8,   [[0,0],[1,2],[2,1],[3,3]]));            // bar 3
  notes.push(...pat(12,  [[0,2],[1,0],[2,3],[3,1]]));            // bar 4
  notes.push(...pat(16,  [[0,0],[0.5,1],[1.5,2],[2.5,3],[3,2]]));// bar 5 — some eighths
  notes.push(...pat(20,  [[0,3],[0.5,2],[1.5,1],[2.5,0],[3,1]]));// bar 6
  notes.push(...pat(24,  [[0,0],[1,1],[2,2],[3,3]]));            // bar 7
  notes.push(...pat(28,  [[3,0],[3.25,1],[3.5,2],[3.75,3]]));    // bar 8 — fill into end

  // Backing music: slow arpeggio in A minor pentatonic.
  const seq = [];
  const arp = ['A3','C4','E4','A4','E4','C4'];
  for (let bar = 0; bar < 8; bar++) {
    for (let i = 0; i < 4; i++) {
      const note = arp[(bar * 4 + i) % arp.length];
      seq.push({ t: bar * 4 + i, kind: 'melody', midi: noteToMidi(note), dur: 0.9, vol: 0.22, type: 'triangle' });
    }
    // bass on beat 1 and 3
    seq.push({ t: bar * 4 + 0, kind: 'bass', midi: noteToMidi('A2'), dur: 1.6, vol: 0.30, type: 'sine' });
    seq.push({ t: bar * 4 + 2, kind: 'bass', midi: noteToMidi('E2'), dur: 1.6, vol: 0.28, type: 'sine' });
  }

  return {
    id: 'aurora',
    title: 'Aurora Drift',
    desc: 'Slow & gentle · A-minor arpeggios',
    bpm: 90,
    tempo: 90,
    difficulty: 1,
    timeMode: 'beat',
    lengthBeats: 32,
    notes,
    sequence: seq,
  };
})();

/* ============================================================
   SONG 2 — "Neon Loom" (Normal)
   ============================================================ */
const SONG_NEON = (() => {
  const notes = [];
  // 16 bars at 120bpm. Steady 8th-note patterns with variation.
  const lanes = [0,1,2,3];
  // 8 bars of rolling 8ths
  for (let bar = 0; bar < 8; bar++) {
    const start = bar * 4;
    // forward roll
    notes.push(...run8(start + 0, 4, [0,1,2,3]));
    // reverse roll
    notes.push(...run8(start + 2, 4, [3,2,1,0]));
  }
  // 4 bars: chord stabs (two lanes together-ish as quick pairs)
  for (let bar = 8; bar < 12; bar++) {
    const s = bar * 4;
    notes.push({ beat: s + 0,   lane: 0 });
    notes.push({ beat: s + 0,   lane: 2 });
    notes.push({ beat: s + 1,   lane: 1 });
    notes.push({ beat: s + 1,   lane: 3 });
    notes.push({ beat: s + 2,   lane: 0 });
    notes.push({ beat: s + 2.5, lane: 1 });
    notes.push({ beat: s + 3,   lane: 2 });
    notes.push({ beat: s + 3.5, lane: 3 });
  }
  // 4 bars: accelerating finale
  for (let bar = 12; bar < 16; bar++) {
    const s = bar * 4;
    notes.push(...run8(s, 8, [0,1,2,3,3,2,1,0]));
  }

  // Backing music: punchy synth lead in E minor + driving bass.
  const seq = [];
  const lead = ['E4','G4','A4','B4','D5','B4','A4','G4'];
  const bass = ['E2','E2','G2','A2'];
  for (let bar = 0; bar < 16; bar++) {
    for (let i = 0; i < 8; i++) {
      const n = lead[(bar * 8 + i) % lead.length];
      seq.push({ t: bar * 4 + i * 0.5, kind: 'melody', midi: noteToMidi(n), dur: 0.35, vol: 0.18, type: 'sawtooth' });
    }
    seq.push({ t: bar * 4 + 0, kind: 'bass', midi: noteToMidi(bass[bar % 4]), dur: 1.8, vol: 0.32, type: 'square' });
    // off-beat hat-like tick
    seq.push({ t: bar * 4 + 2.5, kind: 'melody', midi: noteToMidi('E5'), dur: 0.08, vol: 0.10, type: 'square' });
    seq.push({ t: bar * 4 + 3.5, kind: 'melody', midi: noteToMidi('E5'), dur: 0.08, vol: 0.10, type: 'square' });
  }

  return {
    id: 'neon',
    title: 'Neon Loom',
    desc: 'Steady & bright · E-minor groove',
    bpm: 120,
    tempo: 120,
    difficulty: 2,
    timeMode: 'beat',
    lengthBeats: 64,
    notes,
    sequence: seq,
  };
})();

/* ============================================================
   SONG 3 — "Chronos Surge" (Hard)
   ============================================================ */
const SONG_CHRONOS = (() => {
  const notes = [];
  // 12 bars at 160bpm. Dense 16ths, syncopation, jacks (same lane repeats).
  // Pattern generator: alternating hands with occasional jacks and chords.
  const L = [0,1,2,3];
  for (let bar = 0; bar < 12; bar++) {
    const s = bar * 4;
    if (bar % 4 === 0) {
      // 16th stream: 0 1 2 3 3 2 1 0 ... (16 notes/bar)
      const order = [0,1,2,3,3,2,1,0,0,1,2,3,3,2,1,0];
      for (let i = 0; i < 16; i++) notes.push({ beat: s + i * 0.25, lane: order[i] });
    } else if (bar % 4 === 1) {
      // syncopated: off-beat emphasis
      const order = [1,3,0,2,1,3,0,2,2,0,3,1,2,0,3,1];
      for (let i = 0; i < 16; i++) notes.push({ beat: s + i * 0.25, lane: order[i] });
    } else if (bar % 4 === 2) {
      // jacks: 4 quick repeats per lane
      for (let lane = 0; lane < 4; lane++) {
        for (let k = 0; k < 4; k++) notes.push({ beat: s + lane + k * 0.25, lane });
      }
    } else {
      // chords & trills
      for (let i = 0; i < 4; i++) {
        notes.push({ beat: s + i,       lane: 0 });
        notes.push({ beat: s + i,       lane: 2 });
        notes.push({ beat: s + i + 0.5, lane: 1 });
        notes.push({ beat: s + i + 0.5, lane: 3 });
        // trill
        notes.push({ beat: s + i + 0.75, lane: 0 });
        notes.push({ beat: s + i + 1 - 0.25, lane: 1 });
      }
    }
  }

  // Backing music: driving bassline + high ostinato in D minor.
  const seq = [];
  const ostinato = ['D5','A4','F4','A4','D5','A4','F4','A4'];
  const bassNotes = ['D2','D2','F2','A2','D2','D2','Bb1','A2'];
  for (let bar = 0; bar < 12; bar++) {
    for (let i = 0; i < 8; i++) {
      const n = ostinato[(bar * 8 + i) % ostinato.length];
      seq.push({ t: bar * 4 + i * 0.5, kind: 'melody', midi: noteToMidi(n), dur: 0.25, vol: 0.16, type: 'square' });
    }
    // 16th bass
    for (let i = 0; i < 16; i++) {
      const n = bassNotes[bar % bassNotes.length];
      seq.push({ t: bar * 4 + i * 0.25, kind: 'bass', midi: noteToMidi(n), dur: 0.12, vol: 0.22, type: 'sawtooth' });
    }
  }

  return {
    id: 'chronos',
    title: 'Chronos Surge',
    desc: 'Fast & relentless · D-minor drive',
    bpm: 160,
    tempo: 160,
    difficulty: 3,
    timeMode: 'beat',
    lengthBeats: 48,
    notes,
    sequence: seq,
  };
})();

const SONGS = [SONG_AURORA, SONG_NEON, SONG_CHRONOS];
