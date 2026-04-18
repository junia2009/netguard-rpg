// ==============================
// BGM System - Web Audio API Chiptune
// ==============================
const Music = (() => {
  let ctx = null;
  let masterGain = null;
  let muteGain = null;
  let trackGain = null;  // Per-track gain node, disconnected on stop
  let currentTrack = null;
  let muted = false;
  let volume = 0.35;
  let isPlaying = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    muteGain = ctx.createGain();
    muteGain.gain.value = muted ? 0 : 1;
    masterGain.connect(muteGain);
    muteGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // --- Note Helpers ---
  const NOTE_FREQ = {};
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  for (let oct = 0; oct <= 8; oct++) {
    for (let i = 0; i < 12; i++) {
      const n = noteNames[i] + oct;
      NOTE_FREQ[n] = 440 * Math.pow(2, (oct - 4) + (i - 9) / 12);
    }
  }
  NOTE_FREQ['R'] = 0; // Rest

  function freq(note) {
    return NOTE_FREQ[note] || 0;
  }

  // --- Oscillator factory ---
  function createOsc(type, frequency, gainVal, startTime, duration, detune) {
    if (!ctx || !trackGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    gain.gain.setValueAtTime(gainVal, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain);
    gain.connect(trackGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // --- Drum sounds ---
  function scheduleKick(time) {
    if (!ctx || !trackGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.connect(gain);
    gain.connect(trackGain);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  function scheduleHihat(time, vol) {
    if (!ctx || !trackGain) return;
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    gain.gain.setValueAtTime(vol || 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(trackGain);
    src.start(time);
  }

  function scheduleSnare(time) {
    if (!ctx || !trackGain) return;
    const bufLen = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.3, time);
    nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(trackGain);
    noise.start(time);
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
    oGain.gain.setValueAtTime(0.3, time);
    oGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    osc.connect(oGain);
    oGain.connect(trackGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  // --- Track Scheduling ---
  function scheduleTrack(trackName, startTime) {
    const track = TRACKS[trackName];
    if (!track) return { duration: 4 };
    const bpm = track.bpm;
    const beatDur = 60 / bpm;
    const sixteenth = beatDur / 4;

    // Schedule melody
    if (track.melody) {
      let t = startTime;
      for (const [note, beats] of track.melody) {
        const dur = beats * beatDur;
        if (note !== 'R') {
          createOsc(track.melodyWave || 'square', freq(note), track.melodyVol || 0.18, t, dur * 0.9, track.melodyDetune || 0);
        }
        t += dur;
      }
    }

    // Schedule sub melody / harmony
    if (track.harmony) {
      let t = startTime;
      for (const [note, beats] of track.harmony) {
        const dur = beats * beatDur;
        if (note !== 'R') {
          createOsc(track.harmonyWave || 'triangle', freq(note), track.harmonyVol || 0.1, t, dur * 0.9);
        }
        t += dur;
      }
    }

    // Schedule bass
    if (track.bass) {
      let t = startTime;
      for (const [note, beats] of track.bass) {
        const dur = beats * beatDur;
        if (note !== 'R') {
          createOsc(track.bassWave || 'sawtooth', freq(note), track.bassVol || 0.15, t, dur * 0.85);
        }
        t += dur;
      }
    }

    // Schedule arpeggio
    if (track.arp) {
      let t = startTime;
      for (const [note, beats] of track.arp) {
        const dur = beats * beatDur;
        if (note !== 'R') {
          createOsc('square', freq(note), 0.07, t, dur * 0.6);
        }
        t += dur;
      }
    }

    // Schedule drums
    if (track.drums) {
      let t = startTime;
      for (const [type, beats] of track.drums) {
        if (type === 'K') scheduleKick(t);
        else if (type === 'S') scheduleSnare(t);
        else if (type === 'H') scheduleHihat(t, 0.12);
        else if (type === 'h') scheduleHihat(t, 0.06);
        t += beats * beatDur;
      }
    }

    return { duration: track.loopBeats * beatDur };
  }

  // --- Looping ---
  let loopTimer = null;
  let nextScheduleTime = 0;

  function startLoop(trackName) {
    if (!ctx) init();
    resume();
    stopLoop();
    // Create fresh trackGain for this track
    trackGain = ctx.createGain();
    trackGain.gain.value = 1;
    trackGain.connect(masterGain);
    currentTrack = trackName;
    isPlaying = true;
    nextScheduleTime = ctx.currentTime + 0.15;
    scheduleNext();
  }

  function scheduleNext() {
    if (!isPlaying || !currentTrack) return;
    const { duration } = scheduleTrack(currentTrack, nextScheduleTime);
    nextScheduleTime += duration;
    const delay = (nextScheduleTime - ctx.currentTime - 0.5) * 1000;
    loopTimer = setTimeout(() => scheduleNext(), Math.max(delay, 100));
  }

  function stopLoop() {
    isPlaying = false;
    currentTrack = null;
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    // Disconnect trackGain to instantly silence all scheduled audio
    if (trackGain) {
      trackGain.disconnect();
      trackGain = null;
    }
  }

  function setMuted(m) {
    muted = m;
    if (!muteGain) return;
    muteGain.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  // ============================================
  // TRACK DEFINITIONS
  // ============================================

  const TRACKS = {};

  // --- 1. Title: Cyber Synthwave ---
  TRACKS.title = {
    bpm: 120,
    loopBeats: 16,
    melodyWave: 'sawtooth',
    melodyVol: 0.16,
    melodyDetune: 6,
    melody: [
      ['E5',1],['R',0.5],['D5',0.5],['C5',1],['R',0.5],['B4',0.5],
      ['A4',1],['R',0.5],['B4',0.5],['C5',1],['E5',1],
      ['D5',1],['R',0.5],['C5',0.5],['B4',1],['R',0.5],['A4',0.5],
      ['G4',1],['A4',0.5],['B4',0.5],['C5',1],['R',1],
    ],
    harmonyWave: 'triangle',
    harmonyVol: 0.08,
    harmony: [
      ['A3',2],['E3',2],['F3',2],['C4',2],
      ['D3',2],['A3',2],['E3',2],['G3',2],
    ],
    bass: [
      ['A2',0.5],['R',0.5],['A2',0.5],['R',0.5],['A2',0.5],['R',0.5],['A2',0.5],['R',0.5],
      ['F2',0.5],['R',0.5],['F2',0.5],['R',0.5],['G2',0.5],['R',0.5],['G2',0.5],['R',0.5],
      ['D2',0.5],['R',0.5],['D2',0.5],['R',0.5],['D2',0.5],['R',0.5],['D2',0.5],['R',0.5],
      ['E2',0.5],['R',0.5],['E2',0.5],['R',0.5],['G2',0.5],['R',0.5],['G2',0.5],['R',0.5],
    ],
    bassWave: 'sawtooth',
    bassVol: 0.14,
    arp: [
      ['A4',0.25],['C5',0.25],['E5',0.25],['C5',0.25],['A4',0.25],['C5',0.25],['E5',0.25],['C5',0.25],
      ['F4',0.25],['A4',0.25],['C5',0.25],['A4',0.25],['G4',0.25],['B4',0.25],['D5',0.25],['B4',0.25],
      ['D4',0.25],['F4',0.25],['A4',0.25],['F4',0.25],['D4',0.25],['F4',0.25],['A4',0.25],['F4',0.25],
      ['E4',0.25],['G4',0.25],['B4',0.25],['G4',0.25],['E4',0.25],['G4',0.25],['B4',0.25],['G4',0.25],
    ],
    drums: [
      ['K',1],['h',0.5],['H',0.5],['S',1],['h',0.5],['H',0.5],
      ['K',1],['h',0.5],['H',0.5],['S',1],['h',0.5],['H',0.5],
      ['K',1],['h',0.5],['H',0.5],['S',1],['h',0.5],['H',0.5],
      ['K',0.5],['h',0.5],['S',0.5],['h',0.5],['K',0.5],['S',0.5],
    ],
  };

  // --- 2. Town (Home Server): Peaceful ---
  TRACKS.town = {
    bpm: 100,
    loopBeats: 16,
    melodyWave: 'triangle',
    melodyVol: 0.18,
    melody: [
      ['E5',1],['D5',0.5],['C5',1],['D5',0.5],['E5',1],['E5',1],['E5',1],
      ['D5',1],['D5',1],['D5',1],['R',1],
      ['E5',1],['G5',1],['G5',1],['R',1],
      ['E5',1],['D5',0.5],['C5',0.5],['D5',1],['C5',1],
    ],
    harmonyWave: 'sine',
    harmonyVol: 0.08,
    harmony: [
      ['C4',2],['G3',2],['C4',2],['G3',2],
      ['B3',2],['G3',2],['C4',2],['G3',2],
    ],
    bass: [
      ['C3',2],['E3',2],['F3',2],['G3',2],
      ['A2',2],['G2',2],['F2',2],['G2',2],
    ],
    bassWave: 'triangle',
    bassVol: 0.1,
    drums: [
      ['R',1],['h',1],['R',1],['h',1],
      ['R',1],['h',1],['R',1],['h',1],
      ['R',1],['h',1],['R',1],['h',1],
      ['R',1],['h',1],['R',1],['h',1],
    ],
  };

  // --- 3. Field (Network): Adventurous ---
  TRACKS.field = {
    bpm: 130,
    loopBeats: 16,
    melodyWave: 'square',
    melodyVol: 0.17,
    melodyDetune: 5,
    melody: [
      ['A4',0.5],['C5',0.5],['E5',1],['D5',0.5],['C5',0.5],['D5',1],
      ['E5',0.5],['C5',0.5],['A4',1],['R',1],
      ['A4',0.5],['C5',0.5],['E5',0.5],['G5',0.5],['F5',1],['E5',0.5],['D5',0.5],
      ['C5',1],['D5',0.5],['E5',0.5],['C5',1],['R',1],
      ['F5',1],['E5',0.5],['D5',0.5],['C5',1],['D5',1],
    ],
    harmonyWave: 'triangle',
    harmonyVol: 0.08,
    harmony: [
      ['A3',2],['A3',2],['F3',2],['G3',2],
      ['A3',2],['C4',2],['F3',2],['G3',2],
    ],
    bass: [
      ['A2',1],['A2',1],['A2',1],['A2',1],
      ['F2',1],['F2',1],['G2',1],['G2',1],
      ['A2',1],['A2',1],['C3',1],['C3',1],
      ['F2',1],['F2',1],['G2',1],['G2',1],
    ],
    bassWave: 'sawtooth',
    bassVol: 0.12,
    drums: [
      ['K',0.5],['H',0.5],['H',0.5],['S',0.5],['H',0.5],['H',0.5],['K',0.5],['H',0.5],
      ['K',0.5],['H',0.5],['S',0.5],['H',0.5],['K',0.5],['H',0.5],['S',0.5],['H',0.5],
      ['K',0.5],['H',0.5],['H',0.5],['S',0.5],['H',0.5],['H',0.5],['K',0.5],['H',0.5],
      ['K',0.5],['S',0.5],['K',0.5],['S',0.5],['K',0.5],['K',0.5],['S',0.5],['H',0.5],
    ],
  };

  // --- 4. Dungeon1 (Infected Sector A): Battle Begins ---
  TRACKS.dungeon1 = {
    bpm: 140,
    loopBeats: 16,
    melodyWave: 'square',
    melodyVol: 0.18,
    melody: [
      ['E4',0.5],['E4',0.5],['E5',0.5],['R',0.5],['D5',0.5],['C5',0.5],['D5',0.5],['E5',0.5],
      ['A4',1],['R',0.5],['A4',0.5],['C5',0.5],['D5',0.5],['E5',1],
      ['D5',0.5],['C5',0.5],['B4',0.5],['A4',0.5],['B4',1],['R',1],
      ['E4',0.5],['A4',0.5],['C5',0.5],['E5',0.5],['D5',1],['C5',0.5],['B4',0.5],['A4',1],
    ],
    harmonyWave: 'sawtooth',
    harmonyVol: 0.06,
    harmony: [
      ['A3',1],['C4',1],['A3',1],['C4',1],
      ['D3',1],['F3',1],['E3',1],['E3',1],
      ['A3',1],['C4',1],['A3',1],['C4',1],
      ['D3',1],['E3',1],['A3',1],['A3',1],
    ],
    bass: [
      ['A2',0.5],['R',0.5],['A2',0.5],['A2',0.5],['C3',0.5],['R',0.5],['C3',0.5],['C3',0.5],
      ['D2',0.5],['R',0.5],['D2',0.5],['D2',0.5],['E2',0.5],['R',0.5],['E2',0.5],['E2',0.5],
      ['A2',0.5],['R',0.5],['A2',0.5],['A2',0.5],['C3',0.5],['R',0.5],['C3',0.5],['C3',0.5],
      ['D2',0.5],['E2',0.5],['D2',0.5],['E2',0.5],['A2',1],['R',1],
    ],
    bassWave: 'sawtooth',
    bassVol: 0.14,
    drums: [
      ['K',0.5],['H',0.5],['S',0.5],['H',0.5],['K',0.5],['H',0.5],['S',0.5],['H',0.5],
      ['K',0.5],['H',0.5],['S',0.5],['H',0.5],['K',0.5],['K',0.5],['S',0.5],['H',0.5],
      ['K',0.5],['H',0.5],['S',0.5],['H',0.5],['K',0.5],['H',0.5],['S',0.5],['H',0.5],
      ['K',0.5],['S',0.5],['K',0.5],['S',0.5],['K',0.5],['S',0.5],['S',0.5],['S',0.5],
    ],
  };

  // --- 5. Dungeon2 (Infected Sector B): Heavy & Ominous ---
  TRACKS.dungeon2 = {
    bpm: 110,
    loopBeats: 16,
    melodyWave: 'sawtooth',
    melodyVol: 0.14,
    melody: [
      ['E4',1.5],['D#4',0.5],['E4',1],['B3',1],
      ['C4',1.5],['B3',0.5],['A3',2],
      ['E4',1],['G4',1],['F#4',0.5],['E4',0.5],['D4',1],
      ['C4',1],['D4',0.5],['E4',0.5],['B3',2],
    ],
    harmonyWave: 'square',
    harmonyVol: 0.06,
    harmony: [
      ['E3',2],['E3',2],['A2',2],['A2',2],
      ['C3',2],['C3',2],['B2',2],['B2',2],
    ],
    bass: [
      ['E2',0.5],['E2',0.5],['R',0.5],['E2',0.5],['E2',0.5],['E2',0.5],['R',0.5],['E2',0.5],
      ['A1',0.5],['A1',0.5],['R',0.5],['A1',0.5],['A1',0.5],['A1',0.5],['R',0.5],['A1',0.5],
      ['C2',0.5],['C2',0.5],['R',0.5],['C2',0.5],['C2',0.5],['C2',0.5],['R',0.5],['C2',0.5],
      ['B1',0.5],['B1',0.5],['R',0.5],['B1',0.5],['B1',1],['R',1],
    ],
    bassWave: 'sawtooth',
    bassVol: 0.18,
    drums: [
      ['K',1],['h',0.5],['h',0.5],['S',1],['h',0.5],['h',0.5],
      ['K',1],['h',0.5],['K',0.5],['S',1],['h',0.5],['h',0.5],
      ['K',1],['h',0.5],['h',0.5],['S',1],['h',0.5],['h',0.5],
      ['K',0.5],['K',0.5],['S',1],['K',0.5],['S',0.5],['K',0.5],['S',0.5],
    ],
    arp: [
      ['E5',0.25],['B4',0.25],['G4',0.25],['E4',0.25],['E5',0.25],['B4',0.25],['G4',0.25],['E4',0.25],
      ['A4',0.25],['E4',0.25],['C4',0.25],['A3',0.25],['A4',0.25],['E4',0.25],['C4',0.25],['A3',0.25],
      ['C5',0.25],['G4',0.25],['E4',0.25],['C4',0.25],['C5',0.25],['G4',0.25],['E4',0.25],['C4',0.25],
      ['B4',0.25],['G4',0.25],['D4',0.25],['B3',0.25],['B4',0.25],['G4',0.25],['D4',0.25],['B3',0.25],
    ],
  };

  // --- 6. Boss Room: Intense ---
  TRACKS.boss = {
    bpm: 170,
    loopBeats: 16,
    melodyWave: 'sawtooth',
    melodyVol: 0.18,
    melodyDetune: 8,
    melody: [
      ['A4',0.25],['A4',0.25],['A5',0.5],['G5',0.25],['F5',0.25],['E5',0.5],
      ['D5',0.25],['E5',0.25],['F5',0.5],['E5',0.25],['D5',0.25],['C5',0.5],
      ['A4',0.25],['A4',0.25],['A5',0.5],['G5',0.25],['F5',0.25],['E5',0.5],
      ['F5',0.5],['E5',0.5],['D5',0.5],['C5',0.5],
      ['B4',0.25],['B4',0.25],['B5',0.5],['A5',0.25],['G5',0.25],['F5',0.5],
      ['E5',0.25],['F5',0.25],['G5',0.5],['F5',0.25],['E5',0.25],['D5',0.5],
      ['A4',0.5],['C5',0.5],['E5',0.5],['A5',0.5],
      ['G5',0.5],['F5',0.5],['E5',0.5],['D5',0.5],
    ],
    harmonyWave: 'square',
    harmonyVol: 0.08,
    harmony: [
      ['A3',0.5],['C4',0.5],['A3',0.5],['C4',0.5],['D4',0.5],['F4',0.5],['D4',0.5],['F4',0.5],
      ['A3',0.5],['C4',0.5],['A3',0.5],['C4',0.5],['F3',0.5],['A3',0.5],['E3',0.5],['G3',0.5],
      ['B3',0.5],['D4',0.5],['B3',0.5],['D4',0.5],['E3',0.5],['G3',0.5],['E3',0.5],['G3',0.5],
      ['A3',0.5],['C4',0.5],['E4',0.5],['A4',0.5],['G3',0.5],['D4',0.5],['F4',0.5],['D4',0.5],
    ],
    bass: [
      ['A2',0.25],['R',0.25],['A2',0.25],['A2',0.25],['A2',0.25],['R',0.25],['A2',0.25],['R',0.25],
      ['D2',0.25],['R',0.25],['D2',0.25],['D2',0.25],['E2',0.25],['R',0.25],['E2',0.25],['R',0.25],
      ['A2',0.25],['R',0.25],['A2',0.25],['A2',0.25],['F2',0.25],['R',0.25],['E2',0.25],['R',0.25],
      ['B2',0.25],['R',0.25],['B2',0.25],['B2',0.25],['E2',0.25],['R',0.25],['E2',0.25],['R',0.25],
      ['A2',0.25],['R',0.25],['A2',0.25],['R',0.25],['G2',0.25],['R',0.25],['F2',0.25],['R',0.25],
      ['E2',0.25],['R',0.25],['D2',0.25],['R',0.25],['C2',0.25],['R',0.25],['D2',0.25],['R',0.25],
    ],
    bassWave: 'sawtooth',
    bassVol: 0.16,
    drums: [
      ['K',0.25],['H',0.25],['K',0.25],['H',0.25],['S',0.25],['H',0.25],['K',0.25],['H',0.25],
      ['K',0.25],['H',0.25],['K',0.25],['H',0.25],['S',0.25],['H',0.25],['S',0.25],['H',0.25],
      ['K',0.25],['H',0.25],['K',0.25],['H',0.25],['S',0.25],['H',0.25],['K',0.25],['H',0.25],
      ['K',0.25],['K',0.25],['S',0.25],['S',0.25],['K',0.25],['S',0.25],['K',0.25],['S',0.25],
      ['K',0.25],['H',0.25],['K',0.25],['H',0.25],['S',0.25],['H',0.25],['K',0.25],['H',0.25],
      ['K',0.25],['H',0.25],['K',0.25],['H',0.25],['S',0.25],['H',0.25],['S',0.25],['H',0.25],
      ['K',0.25],['H',0.25],['K',0.25],['H',0.25],['S',0.25],['H',0.25],['K',0.25],['H',0.25],
      ['K',0.25],['S',0.25],['K',0.25],['S',0.25],['S',0.25],['S',0.25],['S',0.25],['S',0.25],
    ],
  };

  // --- Map name to track name mapping ---
  const MAP_TRACKS = {
    town: 'town',
    field: 'field',
    dungeon1: 'dungeon1',
    dungeon2: 'dungeon2',
    boss_room: 'boss',
  };

  function playForMap(mapId) {
    // Random dungeon floors use dungeon tracks
    let trackName = MAP_TRACKS[mapId];
    if (!trackName && mapId.startsWith('rdungeon_f')) {
      const floor = parseInt(mapId.replace('rdungeon_f', ''));
      const totalFloors = DungeonGenerator ? DungeonGenerator.TOTAL_FLOORS : 5;
      if (floor >= totalFloors) {
        trackName = 'boss';
      } else if (floor >= 3) {
        trackName = 'dungeon2';
      } else {
        trackName = 'dungeon1';
      }
    }
    if (!trackName) return;
    if (currentTrack === trackName) return; // Already playing
    startLoop(trackName);
  }

  function playTitle() {
    if (currentTrack === 'title') return;
    startLoop('title');
  }

  function stop() {
    stopLoop();
  }

  return {
    init,
    resume,
    playForMap,
    playTitle,
    stop,
    toggleMute,
    isMuted: () => muted,
  };
})();
