/* ==========================================================
   LUDO - sound.js
   All sound effects are generated with the Web Audio API.
   No MP3/WAV files are needed.

   Public API (used by game.js):
     LudoSound.play('click' | 'roll' | 'move' | 'capture' | 'home' | 'win' | 'error')
     LudoSound.toggle()        -> flips mute, returns new muted state
     LudoSound.setMuted(bool)
     LudoSound.isMuted()

   The mute button is the element with id="sound-toggle".
   The choice is remembered between visits (localStorage).
   ========================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'ludo_sound_muted';
  var AudioCtx = window.AudioContext || window.webkitAudioContext;

  var ctx = null;
  var master = null;
  var noiseBuffer = null;
  var muted = false;

  /* ---------- saved preference ---------- */
  try { muted = window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { muted = false; }

  /* ---------- audio context (created on first user gesture) ---------- */
  function ensureContext() {
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.8;
        var comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);

        // one second of white noise, reused for rattles and thuds
        var len = ctx.sampleRate;
        noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      } catch (e) {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try { ctx.resume(); } catch (e) { /* ignore */ }
    }
    return ctx;
  }

  /* ---------- building blocks ---------- */
  function tone(freq, start, dur, type, vol, slideTo) {
    var t0 = ctx.currentTime + start;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(start, dur, vol, filterFreq, filterType) {
    var t0 = ctx.currentTime + start;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    var filt = ctx.createBiquadFilter();
    filt.type = filterType || 'bandpass';
    filt.frequency.value = filterFreq || 1800;
    filt.Q.value = 1.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  /* ---------- the sound effects ---------- */
  var effects = {
    click: function () {
      tone(660, 0, 0.07, 'triangle', 0.18, 880);
    },

    // dice rattling on a table, then a final knock
    roll: function () {
      var i, t = 0;
      for (i = 0; i < 9; i++) {
        noise(t, 0.05, 0.28, 1200 + Math.random() * 2200, 'bandpass');
        tone(180 + Math.random() * 160, t, 0.04, 'square', 0.05);
        t += 0.045 + Math.random() * 0.04;
      }
      tone(150, t + 0.02, 0.1, 'sine', 0.3, 80);
    },

    // soft wooden "tick" for every step a token takes
    move: function () {
      tone(520 + Math.random() * 60, 0, 0.09, 'sine', 0.22, 300);
      noise(0, 0.03, 0.12, 2600, 'highpass');
    },

    // a token gets sent back to its yard
    capture: function () {
      tone(520, 0, 0.35, 'sawtooth', 0.16, 110);
      tone(260, 0.02, 0.4, 'square', 0.1, 70);
      noise(0, 0.18, 0.25, 500, 'lowpass');
      tone(90, 0.28, 0.2, 'sine', 0.3, 50);
    },

    // a token reaches the centre
    home: function () {
      var notes = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < notes.length; i++) {
        tone(notes[i], i * 0.09, 0.28, 'triangle', 0.22);
      }
    },

    // victory fanfare
    win: function () {
      var seq = [
        [523.25, 0.00, 0.16], [523.25, 0.17, 0.16], [523.25, 0.34, 0.16],
        [659.25, 0.51, 0.30], [587.33, 0.84, 0.16], [783.99, 1.02, 0.60]
      ];
      for (var i = 0; i < seq.length; i++) {
        tone(seq[i][0], seq[i][1], seq[i][2] + 0.08, 'square', 0.12);
        tone(seq[i][0] * 2, seq[i][1], seq[i][2] + 0.08, 'triangle', 0.1);
      }
      tone(261.63, 1.02, 0.7, 'sawtooth', 0.08);
      tone(392.0, 1.02, 0.7, 'sawtooth', 0.06);
    },

    // no move available / turn skipped
    error: function () {
      tone(220, 0, 0.16, 'square', 0.14, 160);
      tone(165, 0.14, 0.2, 'square', 0.14, 120);
    }
  };

  /* ---------- public API ---------- */
  function play(name) {
    if (muted) return;
    var fn = effects[name];
    if (!fn) return;
    if (!ensureContext()) return;
    try { fn(); } catch (e) { /* a sound problem must never stop the game */ }
  }

  function refreshButton() {
    var btn = document.getElementById('sound-toggle');
    if (!btn) return;
    btn.classList.toggle('muted', muted);
    btn.setAttribute('aria-pressed', String(muted));
    btn.setAttribute('title', muted ? 'Sound off' : 'Sound on');
  }

  function setMuted(value) {
    muted = !!value;
    try { window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) { /* private mode */ }
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(muted ? 0 : 0.8, ctx.currentTime);
    }
    refreshButton();
  }

  function toggle() {
    setMuted(!muted);
    if (!muted) {
      ensureContext();
      play('click');
    }
    return muted;
  }

  window.LudoSound = {
    play: play,
    toggle: toggle,
    setMuted: setMuted,
    isMuted: function () { return muted; }
  };

  /* ---------- wire up the page ---------- */
  function unlock() {
    ensureContext();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('touchstart', unlock, true);
  window.addEventListener('keydown', unlock, true);

  // pause audio while the tab is hidden
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try {
      if (document.hidden) ctx.suspend(); else if (!muted) ctx.resume();
    } catch (e) { /* ignore */ }
  });

  function init() {
    var btn = document.getElementById('sound-toggle');
    if (btn) btn.addEventListener('click', function () { toggle(); });
    refreshButton();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
