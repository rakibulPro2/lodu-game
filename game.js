/* ==========================================================
   LUDO - game.js
   Board rendering (Canvas), rules, bot AI, screens and input.
   Optional hooks used from other files (all safe if missing):
     window.LudoSound.play(name)   -> sound.js
     window.LudoAds.trigger(name)  -> ads-config.js
   ========================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  function sfx(name) {
    try {
      if (window.LudoSound && typeof window.LudoSound.play === 'function') window.LudoSound.play(name);
    } catch (e) { /* sound must never break the game */ }
  }
  function adHook(name) {
    try {
      if (window.LudoAds && typeof window.LudoAds.trigger === 'function') window.LudoAds.trigger(name);
    } catch (e) { /* ads must never break the game */ }
  }

  /* ---------- constants ---------- */
  const COLOR_NAMES = ['red', 'green', 'yellow', 'blue'];
  const DEFAULT_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
  const BOT_NAMES = { 1: 'Bot 1', 2: 'Bot 2', 3: 'Bot 3' };
  const FALLBACK_COLORS = { red: '#e63946', green: '#30b566', yellow: '#fcbf24', blue: '#318cf0' };

  // 52 shared track cells [col,row] on a 15x15 grid, clockwise, starting at Red's start square.
  const PATH = [];
  (function buildPath() {
    const push = (c, r) => PATH.push([c, r]);
    for (let c = 1; c <= 5; c++) push(c, 6);
    for (let r = 5; r >= 0; r--) push(6, r);
    push(7, 0); push(8, 0);
    for (let r = 1; r <= 5; r++) push(8, r);
    for (let c = 9; c <= 14; c++) push(c, 6);
    push(14, 7); push(14, 8);
    for (let c = 13; c >= 9; c--) push(c, 8);
    for (let r = 9; r <= 14; r++) push(8, r);
    push(7, 14); push(6, 14);
    for (let r = 13; r >= 9; r--) push(6, r);
    for (let c = 5; c >= 0; c--) push(c, 8);
    push(0, 7); push(0, 6);
  })();

  const START = [0, 13, 26, 39];           // track index of each colour's start square
  const STARS = [8, 21, 34, 47];           // star squares
  const SAFE = new Set(START.concat(STARS));
  const HOME_COL = [
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
  ];
  const YARD_ORIGIN = [[0, 0], [9, 0], [9, 9], [0, 9]];
  const YARD_SPOTS = YARD_ORIGIN.map(([ox, oy]) => [
    { x: ox + 1.9, y: oy + 1.9 }, { x: ox + 4.1, y: oy + 1.9 },
    { x: ox + 1.9, y: oy + 4.1 }, { x: ox + 4.1, y: oy + 4.1 }
  ]);
  const CENTER_DIR = [[-1, 0], [0, -1], [1, 0], [0, 1]];

  // Token progress: -1 = in yard, 0..50 = shared track, 51..55 = home column, 56 = home (finished)
  function absIdx(seat, p) { return (START[seat] + p) % 52; }

  function posOf(seat, ti, p) {
    if (p < 0) return YARD_SPOTS[seat][ti];
    if (p <= 50) { const c = PATH[absIdx(seat, p)]; return { x: c[0] + 0.5, y: c[1] + 0.5 }; }
    if (p <= 55) { const c = HOME_COL[seat][p - 51]; return { x: c[0] + 0.5, y: c[1] + 0.5 }; }
    const d = CENTER_DIR[seat];
    const spread = (ti - 1.5) * 0.3;
    return { x: 7.5 + d[0] * 0.85 + -d[1] * spread, y: 7.5 + d[1] * 0.85 + d[0] * spread };
  }

  /* ---------- DOM ---------- */
  const screens = {
    menu: $('#menu-screen'), setup: $('#setup-screen'), game: $('#game-screen'), win: $('#win-screen')
  };
  const howModal = $('#how-modal');
  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  const diceBySeat = [];
  $$('#arena .dice').forEach((d) => { diceBySeat[Number(d.dataset.player)] = d; });
  const seatEls = [];
  $$('#arena .seat').forEach((s) => { seatEls[Number(s.dataset.player)] = s; });
  const statusEl = $('#status-text');
  const chips = $$('#arena .player-chip');
  const rows = $$('#player-rows .player-row');
  const segBtns = $$('#count-group .seg-btn');
  const teamBtns = $$('#team-group .seg-btn');
  const countGroup = $('#count-group');
  const teamGroup = $('#team-group');

  /* ---------- state ---------- */
  let G = null;                 // current game
  let lastCfg = null;           // config for "Play again" / "Restart"
  const cfg = { mode: 'cpu', count: 2, teamBots: false };
  let gameCounter = 0;

  const cur = (g) => g.players[g.turn];
  const teamOf = (seat) => seat % 2;               // seats 0+2 = Team A, seats 1+3 = Team B
  const sameTeam = (g, a, b) => a === b || (g.team && teamOf(a.seat) === teamOf(b.seat));
  const seatsFor = (n) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

  /* ==========================================================
     COLOURS
     ========================================================== */
  const tmpCtx = document.createElement('canvas').getContext('2d');
  function normColor(value, fb) {
    tmpCtx.fillStyle = fb;
    tmpCtx.fillStyle = (value || '').trim() || fb;
    const out = tmpCtx.fillStyle;
    return /^#[0-9a-f]{6}$/i.test(out) ? out : fb;
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  let COL = {}, IVORY = '#fff8ea';
  function loadColors() {
    const cs = getComputedStyle(document.documentElement);
    COL = {};
    COLOR_NAMES.forEach((n) => { COL[n] = normColor(cs.getPropertyValue('--' + n), FALLBACK_COLORS[n]); });
    IVORY = normColor(cs.getPropertyValue('--ivory'), '#fff8ea');
  }

  /* ==========================================================
     BOARD RENDERING
     ========================================================== */
  let staticLayer = null;

  function starPath(c, cx, cy, ro, ri) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? ro : ri;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function buildStatic() {
    loadColors();
    const W = canvas.width;
    staticLayer = document.createElement('canvas');
    staticLayer.width = staticLayer.height = W;
    const c = staticLayer.getContext('2d');
    const u = W / 15;
    c.setTransform(u, 0, 0, u, 0, 0);

    c.fillStyle = IVORY;
    c.fillRect(0, 0, 15, 15);

    // yards
    COLOR_NAMES.forEach((name, seat) => {
      const [ox, oy] = YARD_ORIGIN[seat];
      const col = COL[name];
      c.fillStyle = col;
      c.fillRect(ox, oy, 6, 6);
      c.fillStyle = 'rgba(0,0,0,.12)';
      roundRect(c, ox + 0.9, oy + 1.0, 4.2, 4.2, 0.55); c.fill();
      c.fillStyle = '#fffdf6';
      roundRect(c, ox + 0.9, oy + 0.9, 4.2, 4.2, 0.55); c.fill();
      YARD_SPOTS[seat].forEach((s) => {
        c.beginPath(); c.arc(s.x, s.y, 0.62, 0, Math.PI * 2);
        c.fillStyle = shade(col, 0.6); c.fill();
        c.lineWidth = 0.07; c.strokeStyle = shade(col, -0.1); c.stroke();
      });
    });

    const drawCell = (col, row, fill) => {
      c.fillStyle = fill;
      c.fillRect(col, row, 1, 1);
      c.lineWidth = 0.04;
      c.strokeStyle = 'rgba(29,23,64,.3)';
      c.strokeRect(col, row, 1, 1);
    };

    // shared track
    PATH.forEach((cell, i) => {
      const startSeat = START.indexOf(i);
      drawCell(cell[0], cell[1], startSeat >= 0 ? COL[COLOR_NAMES[startSeat]] : '#fffdf6');
    });
    // home columns
    HOME_COL.forEach((cells, seat) => {
      cells.forEach((cell) => drawCell(cell[0], cell[1], COL[COLOR_NAMES[seat]]));
    });
    // start marks + stars
    START.forEach((i) => {
      const cell = PATH[i];
      c.beginPath(); c.arc(cell[0] + 0.5, cell[1] + 0.5, 0.27, 0, Math.PI * 2);
      c.lineWidth = 0.07; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke();
    });
    STARS.forEach((i) => {
      const cell = PATH[i];
      starPath(c, cell[0] + 0.5, cell[1] + 0.52, 0.36, 0.16);
      c.fillStyle = '#a79fcc'; c.fill();
    });

    // centre
    const tri = [
      [[6, 6], [6, 9], [7.5, 7.5]],
      [[6, 6], [9, 6], [7.5, 7.5]],
      [[9, 6], [9, 9], [7.5, 7.5]],
      [[6, 9], [9, 9], [7.5, 7.5]]
    ];
    tri.forEach((t, seat) => {
      c.beginPath(); c.moveTo(t[0][0], t[0][1]); c.lineTo(t[1][0], t[1][1]); c.lineTo(t[2][0], t[2][1]); c.closePath();
      c.fillStyle = COL[COLOR_NAMES[seat]]; c.fill();
      c.lineWidth = 0.04; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
    });
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(canvas.clientWidth * dpr);
    if (w < 10) return;
    if (canvas.width !== w || !staticLayer) {
      canvas.width = canvas.height = w;
      buildStatic();
    }
  }

  function drawToken(c, x, y, r, color, hop) {
    const ty = y - hop;
    c.fillStyle = 'rgba(0,0,0,' + Math.max(0.1, 0.3 - hop * 0.2) + ')';
    c.beginPath(); c.ellipse(x, y + r * 0.55, r * 0.95, r * 0.42, 0, 0, Math.PI * 2); c.fill();

    const gr = c.createRadialGradient(x - r * 0.35, ty - r * 0.4, r * 0.1, x, ty, r * 1.1);
    gr.addColorStop(0, shade(color, 0.65));
    gr.addColorStop(0.45, color);
    gr.addColorStop(1, shade(color, -0.5));
    c.beginPath(); c.arc(x, ty, r, 0, Math.PI * 2);
    c.fillStyle = gr; c.fill();
    c.lineWidth = r * 0.16; c.strokeStyle = 'rgba(255,255,255,.92)'; c.stroke();

    c.beginPath(); c.arc(x, ty, r * 0.55, 0, Math.PI * 2);
    c.lineWidth = r * 0.12; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();

    c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath(); c.ellipse(x - r * 0.3, ty - r * 0.42, r * 0.28, r * 0.15, -0.5, 0, Math.PI * 2); c.fill();
  }

  function draw(now) {
    if (!staticLayer || !G) return;
    const W = canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(staticLayer, 0, 0);
    ctx.setTransform(W / 15, 0, 0, W / 15, 0, 0);

    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    const turnPl = cur(G);

    // highlight the active player's yard
    if (G.phase !== 'over') {
      const [ox, oy] = YARD_ORIGIN[turnPl.seat];
      ctx.lineWidth = 0.12;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 + pulse * 0.5) + ')';
      ctx.strokeRect(ox + 0.06, oy + 0.06, 5.88, 5.88);
    }

    // collect tokens
    const items = [];
    const groups = {};
    G.players.forEach((pl) => {
      pl.tokens.forEach((t, ti) => {
        const canMove = G.phase === 'select' && pl === (G.ctrl || turnPl) && G.movable.some((m) => m.p === t.p);
        if (t.vis) {
          items.push({ t, pl, x: t.vis.x, y: t.vis.y, hop: t.vis.hop, r: 0.4, canMove: false, top: true });
          return;
        }
        const pos = posOf(pl.seat, ti, t.p);
        const it = { t, pl, x: pos.x, y: pos.y, hop: 0, r: t.p < 0 ? 0.42 : t.p === 56 ? 0.28 : 0.38, canMove, top: false };
        items.push(it);
        if (t.p >= 0 && t.p <= 55) {
          const key = pos.x.toFixed(2) + ',' + pos.y.toFixed(2);
          (groups[key] = groups[key] || []).push(it);
        }
      });
    });
    const offs = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
    Object.keys(groups).forEach((k) => {
      const g = groups[k];
      if (g.length < 2) return;
      g.forEach((it, i) => {
        if (g.length === 2) { it.x += i === 0 ? -0.2 : 0.2; it.r = 0.3; }
        else { it.x += offs[i % 4][0]; it.y += offs[i % 4][1]; it.r = 0.25; }
      });
    });

    items.sort((a, b) => (a.top - b.top) || (a.y - b.y));
    G.hits = [];
    items.forEach((it) => {
      if (it.canMove) {
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r * (1.25 + pulse * 0.2), 0, Math.PI * 2);
        ctx.lineWidth = 0.09; ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + pulse * 0.4) + ')'; ctx.stroke();
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r * (1.5 + pulse * 0.25), 0, Math.PI * 2);
        ctx.lineWidth = 0.05; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
      }
      drawToken(ctx, it.x, it.y, it.r, COL[COLOR_NAMES[it.pl.seat]], it.hop);
      G.hits.push({ t: it.t, x: it.x, y: it.y, r: it.r, canMove: it.canMove });
    });
  }

  let rafOn = false;
  function frame(now) {
    if (G && screens.game.classList.contains('active')) draw(now);
    requestAnimationFrame(frame);
  }
  function startLoop() {
    if (rafOn) return;
    rafOn = true;
    requestAnimationFrame(frame);
  }

  /* ---------- token tween ---------- */
  function tween(t, x1, y1, dur, hop) {
    return new Promise((res) => {
      const x0 = t.vis.x, y0 = t.vis.y, s = performance.now();
      (function step(now) {
        const k = Math.min(1, Math.max(0, (now - s) / dur));
        t.vis.x = x0 + (x1 - x0) * k;
        t.vis.y = y0 + (y1 - y0) * k;
        t.vis.hop = Math.sin(Math.PI * k) * hop;
        if (k < 1) requestAnimationFrame(step); else res();
      })(s);
    });
  }

  /* ==========================================================
     UI HELPERS
     ========================================================== */
  function showScreen(name) {
    Object.keys(screens).forEach((k) => screens[k].classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo(0, 0);
  }
  function setStatus(msg) { statusEl.textContent = msg; }

  function homeCount(pl) { return pl.tokens.filter((t) => t.p === 56).length; }

  function updateChips() {
    chips.forEach((chip) => {
      const seat = Number(chip.dataset.player);
      const pl = G && G.players.find((p) => p.seat === seat);
      if (seatEls[seat]) seatEls[seat].classList.toggle('hidden', !pl);
      chip.classList.toggle('hidden', !pl);
      if (pl && G.team) chip.dataset.team = teamOf(seat) === 0 ? 'A' : 'B'; else delete chip.dataset.team;
      if (!pl) return;
      $('.pname', chip).textContent = pl.name;
      $('.pscore', chip).textContent = homeCount(pl) + '/4';
      chip.classList.toggle('active', G.phase !== 'over' && cur(G) === pl);
    });
  }

  function updateControls() {
    if (!G) return;
    const can = G.phase === 'roll' && !cur(G).bot;
    const curSeat = cur(G).seat;
    diceBySeat.forEach((d, seat) => {
      if (!d) return;
      d.classList.toggle('active', G.phase !== 'over' && seat === curSeat);
      d.classList.toggle('ready', can && seat === curSeat);
      d.setAttribute('aria-disabled', String(!(can && seat === curSeat)));
    });
    screens.game.dataset.turn = String(cur(G).seat);
    updateChips();
  }

  /* ==========================================================
     SETUP SCREEN
     ========================================================== */
  function refreshSetup() {
    const isTeam = cfg.mode === 'team';
    const seats = isTeam ? [0, 1, 2, 3] : seatsFor(cfg.count);
    const botMode = cfg.mode === 'cpu' || (isTeam && cfg.teamBots);
    $('#setup-title').textContent = cfg.mode === 'cpu' ? 'Vs Computer' : isTeam ? 'Team Up (2 vs 2)' : 'Pass & Play';
    $('#setup-hint').textContent = cfg.mode === 'cpu'
      ? 'You play Red. The other colours are controlled by the computer.'
      : isTeam
        ? (cfg.teamBots
          ? 'You (Red) and a bot partner (Yellow) play against two bots. Partners never capture each other.'
          : 'Red & Yellow play against Green & Blue. Partners never capture each other.')
        : 'Pass the device to the next player after each turn.';
    countGroup.hidden = isTeam;
    teamGroup.hidden = !isTeam;
    segBtns.forEach((b) => {
      const on = Number(b.dataset.count) === cfg.count;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    teamBtns.forEach((b) => {
      const on = (b.dataset.bots === '1') === cfg.teamBots;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    let botNo = 0;
    rows.forEach((row, seat) => {
      const used = seats.includes(seat);
      row.classList.toggle('hidden', !used);
      const input = $('.name-input', row);
      const tag = $('.tag', row);
      if (!used) return;
      const isBot = botMode && seat !== 0;
      let role = isBot ? 'Bot' : (botMode ? 'You' : 'Player');
      if (isTeam) role = 'Team ' + (teamOf(seat) === 0 ? 'A' : 'B') + ' - ' + role;
      tag.textContent = role;
      input.disabled = isBot;
      if (isBot) {
        botNo++;
        input.value = (isTeam && seat === 2) ? 'Partner' : BOT_NAMES[botNo];
        input.dataset.wasBot = '1';
      } else if (input.dataset.wasBot === '1') {
        input.value = DEFAULT_NAMES[seat];
        input.dataset.wasBot = '0';
      }
    });
  }

  function openSetup(mode) {
    cfg.mode = mode;
    cfg.count = mode === 'cpu' ? 2 : 4;
    cfg.teamBots = false;
    rows.forEach((row, seat) => {
      const input = $('.name-input', row);
      input.value = (mode === 'cpu' && seat === 0) ? 'You' : DEFAULT_NAMES[seat];
      input.dataset.wasBot = '0';
    });
    refreshSetup();
    showScreen('setup');
  }

  /* ==========================================================
     GAME FLOW
     ========================================================== */
  function startGame(config) {
    const c = config || (function () {
      const inputs = rows.map((r) => $('.name-input', r));
      return {
        mode: cfg.mode,
        count: cfg.mode === 'team' ? 4 : cfg.count,
        teamBots: cfg.teamBots,
        names: inputs.map((inp, i) => (inp.value.trim() || DEFAULT_NAMES[i]).slice(0, 12))
      };
    })();
    lastCfg = c;

    const seats = seatsFor(c.count);
    const g = {
      id: ++gameCounter,
      mode: c.mode,
      team: c.mode === 'team',
      ctrl: null,
      players: seats.map((seat) => ({
        seat,
        name: c.names[seat],
        bot: (c.mode === 'cpu' || (c.mode === 'team' && c.teamBots)) && seat !== 0,
        tokens: [0, 1, 2, 3].map(() => ({ p: -1, vis: null }))
      })),
      turn: 0,
      phase: 'roll',
      roll: 0,
      sixes: 0,
      movable: [],
      hits: []
    };
    G = g;
    diceBySeat.forEach((d) => { if (d) { d.dataset.value = '0'; d.classList.remove('rolling', 'ready', 'active', 'nope'); } });
    showScreen('game');
    updateControls();
    requestAnimationFrame(() => { resizeCanvas(); });
    startLoop();
    adHook('gameStart');
    beginTurn(g);
  }

  function beginTurn(g) {
    if (G !== g) return;
    g.phase = 'roll';
    g.movable = [];
    g.ctrl = null;
    updateControls();
    const pl = cur(g);
    if (pl.bot) {
      setStatus(pl.name + ' is thinking...');
      sleep(800).then(() => { if (G === g && g.phase === 'roll') rollDice(); });
    } else {
      setStatus(pl.name + ': tap your dice to roll.');
    }
  }

  function nextTurn(g) {
    if (G !== g) return;
    g.sixes = 0;
    g.turn = (g.turn + 1) % g.players.length;
    beginTurn(g);
  }

  // In Team Up, a player who already brought all tokens home plays the partner's tokens.
  function controlled(g, pl) {
    if (g.team && homeCount(pl) === 4) {
      const partner = g.players.find((p) => p !== pl && teamOf(p.seat) === teamOf(pl.seat));
      if (partner && homeCount(partner) < 4) return partner;
    }
    return pl;
  }

  function movableTokens(pl, roll) {
    const seen = new Set();
    const out = [];
    pl.tokens.forEach((t) => {
      const ok = t.p === -1 ? roll === 6 : (t.p < 56 && t.p + roll <= 56);
      if (ok && !seen.has(t.p)) { seen.add(t.p); out.push(t); }
    });
    return out;
  }

  async function rollDice() {
    const g = G;
    if (!g || g.phase !== 'roll') return;
    g.phase = 'rolling';
    updateControls();
    sfx('roll');
    const dEl = diceBySeat[cur(g).seat];
    dEl.classList.add('rolling');
    const t0 = performance.now();
    while (performance.now() - t0 < 550) {
      dEl.dataset.value = String(1 + Math.floor(Math.random() * 6));
      await sleep(70);
      if (G !== g) return;
    }
    const val = 1 + Math.floor(Math.random() * 6);
    dEl.classList.remove('rolling');
    dEl.dataset.value = String(val);
    g.roll = val;
    const pl = cur(g);

    if (val === 6) {
      g.sixes++;
      if (g.sixes >= 3) {
        sfx('error');
        setStatus(pl.name + ' rolled three sixes in a row. Turn skipped.');
        await sleep(1300);
        return nextTurn(g);
      }
    }

    const owner = controlled(g, pl);
    g.ctrl = owner;
    const who = pl.name + ' rolled ' + val + (owner !== pl ? ' (playing for partner)' : '');
    const moves = movableTokens(owner, val);
    if (!moves.length) {
      sfx('error');
      setStatus(pl.name + ' rolled ' + val + '. No moves available.');
      await sleep(1100);
      return nextTurn(g);
    }
    g.movable = moves;

    if (pl.bot) {
      setStatus(who + '.');
      await sleep(650);
      if (G !== g) return;
      return performMove(g, aiChoose(g, owner, moves, val));
    }
    if (moves.length === 1) {
      setStatus(who + '.');
      await sleep(450);
      if (G !== g) return;
      return performMove(g, moves[0]);
    }
    g.phase = 'select';
    setStatus(who + '. Tap a token to move.');
    updateControls();
  }

  async function performMove(g, token) {
    if (G !== g) return;
    g.phase = 'moving';
    g.movable = [];
    updateControls();

    const roller = cur(g);
    const pl = g.ctrl || roller;           // owner of the token that moves
    const roll = g.roll;
    const ti = pl.tokens.indexOf(token);
    const from = token.p;
    const to = from === -1 ? 0 : from + roll;

    // animate
    const p0 = posOf(pl.seat, ti, from);
    token.vis = { x: p0.x, y: p0.y, hop: 0 };
    if (from === -1) {
      sfx('move');
      const e = posOf(pl.seat, ti, 0);
      await tween(token, e.x, e.y, 340, 0.6);
    } else {
      for (let p = from + 1; p <= to; p++) {
        const e = posOf(pl.seat, ti, p);
        sfx('move');
        await tween(token, e.x, e.y, 150, 0.28);
        if (G !== g) return;
      }
    }
    if (G !== g) return;
    token.p = to;
    token.vis = null;

    // captures
    let captured = false;
    if (to <= 50) {
      const idx = absIdx(pl.seat, to);
      if (!SAFE.has(idx)) {
        for (const op of g.players) {
          if (sameTeam(g, pl, op)) continue;
          for (let k = 0; k < op.tokens.length; k++) {
            const t = op.tokens[k];
            if (t.p >= 0 && t.p <= 50 && absIdx(op.seat, t.p) === idx) {
              captured = true;
              setStatus(roller.name + ' captured a token of ' + op.name + '!');
              sfx('capture');
              const from2 = posOf(op.seat, k, t.p);
              const yard = posOf(op.seat, k, -1);
              t.vis = { x: from2.x, y: from2.y, hop: 0 };
              await tween(t, yard.x, yard.y, 520, 0.9);
              if (G !== g) return;
              t.p = -1;
              t.vis = null;
            }
          }
        }
      }
    }

    const reachedHome = to === 56;
    if (reachedHome) sfx('home');
    updateChips();

    const won = g.team
      ? g.players.filter((p) => teamOf(p.seat) === teamOf(pl.seat)).every((p) => homeCount(p) === 4)
      : pl.tokens.every((t) => t.p === 56);
    if (won) return finishGame(g, pl);

    const bonus = roll === 6 || captured || reachedHome;
    if (bonus) {
      setStatus(roller.name + ' gets another roll!');
      await sleep(550);
      if (G !== g) return;
      beginTurn(g);
    } else {
      await sleep(250);
      nextTurn(g);
    }
  }

  /* ---------- smart bot ---------- */
  function inDanger(g, pl, idx) {
    if (SAFE.has(idx)) return false;
    for (const op of g.players) {
      if (sameTeam(g, pl, op)) continue;
      for (const t of op.tokens) {
        if (t.p < 0 || t.p > 50) continue;
        const d = (idx - absIdx(op.seat, t.p) + 52) % 52;
        if (d >= 1 && d <= 6) return true;
      }
    }
    return false;
  }

  function aiChoose(g, pl, moves, roll) {
    let best = moves[0], bestScore = -Infinity;
    moves.forEach((t) => {
      const from = t.p;
      const to = from === -1 ? 0 : from + roll;
      let s = Math.random() * 3;

      if (to === 56) s += 120;
      if (from === -1) s += 45;
      if (to >= 51 && to < 56) s += 25;

      if (to <= 50) {
        const idx = absIdx(pl.seat, to);
        if (SAFE.has(idx)) {
          s += 22;
        } else {
          let victimProgress = -1;
          g.players.forEach((op) => {
            if (sameTeam(g, pl, op)) return;
            op.tokens.forEach((ot) => {
              if (ot.p >= 0 && ot.p <= 50 && absIdx(op.seat, ot.p) === idx) victimProgress = Math.max(victimProgress, ot.p);
            });
          });
          if (victimProgress >= 0) s += 90 + victimProgress * 0.5;
          else if (inDanger(g, pl, idx)) s -= 35;
        }
      }

      if (from >= 0 && from <= 50) {
        const fidx = absIdx(pl.seat, from);
        if (SAFE.has(fidx)) s -= 8;
        else if (inDanger(g, pl, fidx)) s += 30;
      }

      s += roll * 1.5 + (from >= 0 ? from * 0.2 : 0);
      if (s > bestScore) { bestScore = s; best = t; }
    });
    return best;
  }

  /* ---------- finish ---------- */
  function finishTeamGame(g, winner) {
    const t = teamOf(winner.seat);
    const mates = g.players.filter((p) => teamOf(p.seat) === t);
    const foes = g.players.filter((p) => teamOf(p.seat) !== t);
    const hasBots = g.players.some((p) => p.bot);
    const label = 'Team ' + (t === 0 ? 'A' : 'B');
    const title = hasBots
      ? (mates.some((p) => !p.bot) ? 'Your team wins!' : 'The bots win!')
      : label + ' wins!';
    $('#win-title').textContent = title;
    const list = $('#win-ranking');
    list.innerHTML = '';
    [mates, foes].forEach((team) => {
      const li = document.createElement('li');
      li.style.setProperty('--pc', 'var(--' + COLOR_NAMES[team[0].seat] + ')');
      const dot = document.createElement('span'); dot.className = 'dot';
      const name = document.createElement('span');
      name.textContent = team.map((p) => p.name).join(' & '); name.style.flex = '1';
      const score = document.createElement('span');
      score.textContent = team.reduce((s, p) => s + homeCount(p), 0) + '/8 home';
      score.style.color = 'var(--muted)'; score.style.fontSize = '.85rem';
      li.appendChild(dot); li.appendChild(name); li.appendChild(score);
      list.appendChild(li);
    });
    setStatus(mates.map((p) => p.name).join(' & ') + ' won the game!');
    sleep(900).then(() => { if (G === g) screens.win.classList.add('active'); });
  }

  function finishGame(g, winner) {
    g.phase = 'over';
    updateControls();
    sfx('win');
    adHook('gameEnd');
    if (g.team) return finishTeamGame(g, winner);

    const others = g.players.filter((p) => p !== winner).sort((a, b) => {
      const sa = homeCount(a) * 1000 + a.tokens.reduce((s, t) => s + Math.max(t.p, 0), 0);
      const sb = homeCount(b) * 1000 + b.tokens.reduce((s, t) => s + Math.max(t.p, 0), 0);
      return sb - sa;
    });
    const ranking = [winner].concat(others);

    $('#win-title').textContent = (g.mode === 'cpu' && !winner.bot) ? 'You win!' : winner.name + ' wins!';
    const list = $('#win-ranking');
    list.innerHTML = '';
    ranking.forEach((pl) => {
      const li = document.createElement('li');
      li.style.setProperty('--pc', 'var(--' + COLOR_NAMES[pl.seat] + ')');
      const dot = document.createElement('span'); dot.className = 'dot';
      const name = document.createElement('span'); name.textContent = pl.name; name.style.flex = '1';
      const score = document.createElement('span'); score.textContent = homeCount(pl) + '/4 home';
      score.style.color = 'var(--muted)'; score.style.fontSize = '.85rem';
      li.appendChild(dot); li.appendChild(name); li.appendChild(score);
      list.appendChild(li);
    });
    setStatus(winner.name + ' won the game!');
    sleep(900).then(() => { if (G === g) screens.win.classList.add('active'); });
  }

  function leaveGame() {
    G = null;
    screens.win.classList.remove('active');
    showScreen('menu');
  }

  /* ==========================================================
     EVENTS
     ========================================================== */
  $('#btn-vs-computer').addEventListener('click', () => openSetup('cpu'));
  $('#btn-pass-play').addEventListener('click', () => openSetup('pass'));
  $('#btn-team').addEventListener('click', () => openSetup('team'));
  $('#btn-back-menu').addEventListener('click', () => showScreen('menu'));
  $('#btn-start').addEventListener('click', () => startGame());

  segBtns.forEach((b) => b.addEventListener('click', () => {
    cfg.count = Number(b.dataset.count);
    refreshSetup();
  }));

  teamBtns.forEach((b) => b.addEventListener('click', () => {
    cfg.teamBots = b.dataset.bots === '1';
    refreshSetup();
  }));

  $('#btn-how').addEventListener('click', () => { howModal.hidden = false; });
  $('#btn-how-close').addEventListener('click', () => { howModal.hidden = true; });
  howModal.addEventListener('click', (e) => { if (e.target === howModal) howModal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') howModal.hidden = true; });

  $('#btn-home').addEventListener('click', () => {
    if (!G || G.phase === 'over' || window.confirm('Quit this game and go back to the menu?')) leaveGame();
  });
  $('#btn-restart').addEventListener('click', () => {
    if (!G || G.phase === 'over' || window.confirm('Restart this game?')) {
      screens.win.classList.remove('active');
      startGame(lastCfg);
    }
  });
  $('#btn-win-menu').addEventListener('click', leaveGame);
  $('#btn-play-again').addEventListener('click', () => {
    screens.win.classList.remove('active');
    startGame(lastCfg);
  });

  // Every player has his own dice. Only the dice of the player whose turn it is can be used,
  // so taps on the other dice (or anywhere else) can never roll for someone else.
  diceBySeat.forEach((d, seat) => {
    if (!d) return;
    d.addEventListener('click', () => {
      if (G && G.phase === 'roll' && !cur(G).bot && cur(G).seat === seat) {
        rollDice();
      } else if (G && G.phase !== 'over' && !d.classList.contains('rolling')) {
        d.classList.remove('nope');
        void d.offsetWidth;
        d.classList.add('nope');
        setTimeout(() => d.classList.remove('nope'), 320);
      }
    });
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (!G || G.phase !== 'select' || cur(G).bot) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 15;
    const y = ((e.clientY - r.top) / r.height) * 15;
    let best = null, bd = Infinity;
    G.hits.forEach((h) => {
      if (!h.canMove) return;
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bd && d <= Math.max(h.r * 1.6, 0.7)) { bd = d; best = h; }
    });
    if (best) {
      const rep = G.movable.find((m) => m.p === best.t.p);
      if (rep) performMove(G, rep);
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.btn, .seg-btn')) sfx('click');
  });

  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 250));

  /* ---------- Android back button (Capacitor app only) ---------- */
  (function setupBackButton() {
    try {
      const cap = window.Capacitor;
      const App = cap && cap.Plugins && cap.Plugins.App;
      if (!App || typeof App.addListener !== 'function') return;
      App.addListener('backButton', () => {
        if (!howModal.hidden) { howModal.hidden = true; return; }
        if (screens.win.classList.contains('active')) { leaveGame(); return; }
        if (screens.game.classList.contains('active')) { $('#btn-home').click(); return; }
        if (screens.setup.classList.contains('active')) { showScreen('menu'); return; }
        if (typeof App.exitApp === 'function') App.exitApp();
      });
    } catch (e) { /* not running inside the app */ }
  })();

  refreshSetup();
})();
