/*
  PHASMO GUIDE — app.js
  =====================
  All behaviour and logic. Reads data from data.js (loaded first).
  No inline styles or HTML string building where avoidable —
  CSS classes handle appearance, JS handles state.

  Sections:
    1. Splash — init, stars, sparks, lightning, bell, enter sequence
    2. App init — called once splash exits
    3. Menu — open/close/tab switching
    4. Hunt tab — filter system, result rendering
    5. Smudge tab — smudge timer, cooldown timer
    6. Evidence tab — cycle states, ghost elimination
    7. Ghost cards — searchable expandable cards
    8. Quick ref — one-liner list
*/


/* ══════════════════════════════════════════════════════════
   1. SPLASH
   ══════════════════════════════════════════════════════════ */

// Set house image src from data.js constant
// Done here (not in HTML) because HOUSE_B64 is defined in data.js
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('house-img').src = 'data:image/webp;base64,' + HOUSE_B64;
  setupSmokePaths();
  initStars();
  initSparks();
  initLightning();
});

// Fade out the veil once fonts and assets are ready
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('veil').classList.add('gone'), 150);
});


// ── STARS ──────────────────────────────────────────────────
// Creates 55 star divs with randomised size, position and twinkle timing.
// CSS custom properties (--lo, --hi, --d) give each star a unique animation.
function initStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 55; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = 0.8 + Math.random() * 1.8;
    star.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*68}%;left:${Math.random()*100}%`;
    star.style.setProperty('--lo', (0.04 + Math.random() * 0.12).toFixed(2));
    star.style.setProperty('--hi', (0.18 + Math.random() * 0.45).toFixed(2));
    star.style.setProperty('--d',  (1.5  + Math.random() * 3.5).toFixed(1) + 's');
    star.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
    container.appendChild(star);
  }
}


// ── SPARKS ──────────────────────────────────────────────────
// Each spark is a tiny div created above the candle, animated upward,
// then removed when its animation ends ("fire and forget" pattern).
let candleWrap;
function initSparks() {
  candleWrap = document.getElementById('candle-wrap');
  setInterval(spawnSpark, 700);
}

function spawnSpark() {
  const spark = document.createElement('div');
  spark.className = 'spark';
  // CSS reads --dx and --dur via var() to make each spark unique
  spark.style.setProperty('--dx',  (Math.random() - 0.5) * 28 + 'px');
  spark.style.setProperty('--dur', (0.9 + Math.random() * 0.8).toFixed(2) + 's');
  spark.style.left = (50 + (Math.random() - 0.5) * 12) + '%';
  spark.style.top  = '4px';
  candleWrap.appendChild(spark);
  spark.addEventListener('animationend', () => spark.remove());
}


// ── LIGHTNING ───────────────────────────────────────────────
// JS-controlled lightning (not a CSS infinite loop) so we can
// use random intervals — real lightning is never perfectly timed.
//
// Each strike:
//   1. Adds .flash to sky, bolt, and house simultaneously
//   2. Makes the flame thrash (flickerWild animation)
//   3. Bursts extra sparks
//   4. Removes .flash after 720ms so the animation can re-trigger
//   5. Schedules the next strike at a random 3–8s interval
function initLightning() {
  setTimeout(strike, 1500); // first strike at 1.5s so user sees house quickly
}

function strike() {
  const sky       = document.getElementById('sky');
  const bolt      = document.getElementById('bolt');
  const houseWrap = document.getElementById('house-wrap');

  [sky, bolt, houseWrap].forEach(el => el.classList.add('flash'));

  // Flame thrashes during lightning (only if not already snuffed)
  const fo = document.querySelector('.flame-outer');
  if (fo && !fo.classList.contains('snuffing')) {
    fo.style.animation = 'flickerWild 0.22s ease-in-out 4';
    setTimeout(() => {
      if (!fo.classList.contains('snuffing')) {
        fo.style.animation = 'flicker 1.1s ease-in-out infinite alternate';
      }
    }, 1000);
    for (let i = 0; i < 6; i++) setTimeout(spawnSpark, i * 75);
  }

  // Remove .flash — IMPORTANT: the browser won't re-trigger a CSS animation
  // if the class is still applied. Remove + re-add = new animation each time.
  setTimeout(() => {
    [sky, bolt, houseWrap].forEach(el => el.classList.remove('flash'));
  }, 720);

  // Random 3–8s until next strike
  setTimeout(strike, Math.random() * 5000 + 3000);
}


// ── SMOKE PATHS ─────────────────────────────────────────────
// getTotalLength() measures SVG path length in user units.
// Setting strokeDasharray = length makes the whole path one "dash".
// Setting strokeDashoffset = length hides it completely.
// Animating offset to 0 draws the path on like a pen tracing it.
function setupSmokePaths() {
  ['wpath1', 'wpath2', 'wpath3'].forEach(id => {
    const path = document.getElementById(id);
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray  = length;
    path.style.strokeDashoffset = length; // fully hidden initially
  });
}


// ── BELL — Web Audio API ─────────────────────────────────────
// Synthesised bell — no audio files needed.
// Two sine waves at different pitches + exponential decay = bell tone.
// await ctx.resume() is required on iOS — AudioContext starts suspended.
let audioCtx = null;
async function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  return audioCtx;
}

async function playBell() {
  const ctx = await getAudioCtx();
  function tone(freq, vol, delay) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol,      ctx.currentTime + delay);
    // Exponential decay — can't use exact 0 (math asymptote), so 0.0001
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 4.5);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime  + delay + 5);
  }
  // First toll: three overlapping frequencies = richer bell texture
  tone(220, 0.70, 0.00); // A3 — deep fundamental
  tone(293, 0.40, 0.00); // D4 — shimmer overtone
  tone(220, 0.30, 0.09); // slight echo for depth
  // Second softer toll after 2.3s
  setTimeout(() => { tone(196, 0.45, 0); tone(261, 0.28, 0); }, 2300);
}


// ── ENTER / SNUFF SEQUENCE ───────────────────────────────────
// Timeline when Enter is tapped:
//   t=0ms    Disable button, start flame snuff + glow fade
//   t=500ms  Wick ember begins
//   t=440ms  Smoke wisps start rising
//   t=800ms  Bell tolls
//   t=1600ms Screen fade starts
//   t=2900ms Splash hidden, app shell shown
let hasEntered = false;

async function enterApp() {
  if (hasEntered) return;
  hasEntered = true;
  document.getElementById('enter-btn').disabled = true;

  const flameOuter = document.getElementById('flameOuter');
  const flameGlow  = document.getElementById('flameGlow');
  const wick       = document.getElementById('wick');
  const smokeWrap  = document.getElementById('smoke-wrap');

  // Snuff the flame
  flameOuter.classList.add('snuffing');
  flameGlow.style.opacity = '0';

  // Wick glows like an ember briefly after flame dies
  setTimeout(() => wick.classList.add('ember'), 500);

  // Smoke rises
  setTimeout(() => {
    smokeWrap.classList.add('active');
    const wispData = [
      { wispId: 'wisp1', pathId: 'wpath1', dur: 2000, delay: 0   },
      { wispId: 'wisp2', pathId: 'wpath2', dur: 2400, delay: 130 },
      { wispId: 'wisp3', pathId: 'wpath3', dur: 1800, delay: 260 },
    ];
    wispData.forEach(({ wispId, pathId, dur, delay }) => {
      setTimeout(() => {
        const wisp = document.getElementById(wispId);
        const path = document.getElementById(pathId);
        // Animate the path drawing on via dashoffset transition
        path.style.transition       = `stroke-dashoffset ${dur * 0.55}ms ease-out`;
        path.style.strokeDashoffset = '0';
        // Rise and fade the whole wisp element
        wisp.style.animation = `wispRise ${dur}ms ease-out forwards`;
      }, delay);
    });
  }, 440);

  setTimeout(playBell, 800);

  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
  }, 1600);

  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    initApp();
  }, 2900);
}


/* ══════════════════════════════════════════════════════════
   2. APP INIT
   Called once, after the splash exits.
   ══════════════════════════════════════════════════════════ */
function initApp() {
  buildEvGrid();
  buildGhostCards();
  buildQuickRef();
  renderHuntResults(); // renders empty state message
}


/* ══════════════════════════════════════════════════════════
   3. MENU
   ══════════════════════════════════════════════════════════ */
let menuOpen = false;

function toggleMenu() {
  menuOpen ? closeMenu() : openMenu();
}
function openMenu() {
  menuOpen = true;
  document.getElementById('menuOverlay').classList.add('open');
}
function closeMenu() {
  menuOpen = false;
  document.getElementById('menuOverlay').classList.remove('open');
}
function handleOverlayClick(event) {
  // Only close if the click was on the dark overlay, not the panel itself
  if (event.target === document.getElementById('menuOverlay')) closeMenu();
}

function switchTab(tab) {
  // Hide all views, deactivate all menu items
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

  // Show selected view and highlight menu item
  document.getElementById('view-' + tab).classList.add('active');
  document.getElementById('mi-' + tab).classList.add('active');

  // Update header label
  document.getElementById('currentTabLabel').textContent = TAB_LABELS[tab];

  // Reset scroll position and close menu
  document.getElementById('app-content').scrollTop = 0;
  closeMenu();
}


/* ══════════════════════════════════════════════════════════
   4. HUNT TAB
   ══════════════════════════════════════════════════════════ */
let activeFilters = new Set();

function toggleFilter(btn) {
  const filter = btn.dataset.f;
  if (activeFilters.has(filter)) {
    activeFilters.delete(filter);
    btn.classList.remove('sel');
  } else {
    activeFilters.add(filter);
    btn.classList.add('sel');
  }
  renderHuntResults();
}

function resetFilters() {
  activeFilters.clear();
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('sel'));
  renderHuntResults();
}

function renderHuntResults() {
  const el = document.getElementById('huntResults');

  if (activeFilters.size === 0) {
    el.innerHTML = '<p class="results-empty">Tap filters above to narrow down ghosts</p>';
    return;
  }

  // A ghost matches only if it has ALL active filter tags
  const matches = GHOSTS.filter(ghost =>
    [...activeFilters].every(filter => ghost.tags.includes(filter))
  );

  if (matches.length === 0) {
    el.innerHTML = '<p class="results-empty">No ghosts match — try fewer filters</p>';
    return;
  }

  el.innerHTML = matches.map(ghost => `
    <div class="result-card">
      <div class="rc-name">${ghost.name}</div>
      <div class="rc-speed">${ghost.speed} m/s</div>
      <span class="rc-action ${ACTION_CLASS[ghost.action]}">${ghost.actionTxt}</span>
      <div class="rc-tell">${ghost.tell}</div>
    </div>
  `).join('');
}


/* ══════════════════════════════════════════════════════════
   5. SMUDGE TAB
   ══════════════════════════════════════════════════════════ */

// ── SMUDGE TIMER ────────────────────────────────────────────
// Three simultaneous countdowns — Spirit (180s), Others (90s), Demon (60s)
// The ghost that hunts tells you which threshold it crossed.
const SMUDGE_TIMES = { spirit: 180, others: 90, demon: 60 };
let smudgeInterval = null;
let smudgeStartTime = null;

function startSmudge() {
  if (smudgeInterval) clearInterval(smudgeInterval);
  smudgeStartTime = Date.now();
  document.getElementById('smudgeBtn').textContent = 'Running...';

  smudgeInterval = setInterval(() => {
    const elapsed = (Date.now() - smudgeStartTime) / 1000;

    for (const [key, total] of Object.entries(SMUDGE_TIMES)) {
      const remaining = Math.max(total - elapsed, 0);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);

      const timerEl = document.getElementById('t-' + key);
      const barEl   = document.getElementById('b-' + key);

      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      timerEl.className = 'timer-val' + (remaining <= 0 ? ' expired' : remaining < 15 ? ' warning' : '');
      barEl.style.width      = Math.max((remaining / total) * 100, 0) + '%';
      barEl.style.background = remaining <= 0 ? '#e07070' : remaining < 15 ? '#e8a050' : 'var(--gold)';
    }

    if (elapsed > 180) {
      clearInterval(smudgeInterval);
      document.getElementById('smudgeBtn').textContent = 'Start smudge timer';
    }
  }, 250);
}

function resetSmudge() {
  clearInterval(smudgeInterval);
  smudgeInterval = null;
  for (const [key, total] of Object.entries(SMUDGE_TIMES)) {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    document.getElementById('t-' + key).textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('t-' + key).className = 'timer-val';
    document.getElementById('b-' + key).style.cssText = 'width:100%;background:var(--gold)';
  }
  document.getElementById('smudgeBtn').textContent = 'Start smudge timer';
}

// ── HUNT COOLDOWN TIMER ──────────────────────────────────────
// After a hunt ends: Demon can rehunt in 20s, all others in 25s.
const COOLDOWN_TIMES = { demon: 20, others: 25 };
let cooldownInterval = null;
let cooldownStartTime = null;

function startCooldown() {
  if (cooldownInterval) clearInterval(cooldownInterval);
  cooldownStartTime = Date.now();
  document.getElementById('cdBtn').textContent = 'Running...';

  cooldownInterval = setInterval(() => {
    const elapsed = (Date.now() - cooldownStartTime) / 1000;

    for (const [key, total] of Object.entries(COOLDOWN_TIMES)) {
      const remaining = Math.max(total - elapsed, 0);
      const secs = Math.floor(remaining);

      const timerEl = document.getElementById('cd-' + key);
      const barEl   = document.getElementById('bcd-' + key);

      timerEl.textContent = `0:${secs.toString().padStart(2, '0')}`;
      timerEl.className = 'timer-val' + (remaining <= 0 ? ' expired' : '');
      barEl.style.width      = Math.max((remaining / total) * 100, 0) + '%';
      barEl.style.background = remaining <= 0 ? '#e07070' : 'var(--gold)';
    }

    if (elapsed >= 25) {
      clearInterval(cooldownInterval);
      document.getElementById('cdBtn').textContent = 'Hunt just ended';
    }
  }, 250);
}

function resetCooldown() {
  clearInterval(cooldownInterval);
  document.getElementById('cd-demon').textContent  = '0:20';
  document.getElementById('cd-others').textContent = '0:25';
  ['cd-demon', 'cd-others'].forEach(id => {
    document.getElementById(id).className = 'timer-val';
  });
  ['bcd-demon', 'bcd-others'].forEach(id => {
    document.getElementById(id).style.cssText = 'width:100%;background:var(--gold)';
  });
  document.getElementById('cdBtn').textContent = 'Hunt just ended';
}


/* ══════════════════════════════════════════════════════════
   6. EVIDENCE TAB
   ══════════════════════════════════════════════════════════ */

// Evidence state: 0 = neutral, 1 = found (green), 2 = ruled out (red)
let evState = {};

function buildEvGrid() {
  EVIDENCE.forEach(e => evState[e.key] = 0);
  document.getElementById('evGrid').innerHTML = EVIDENCE.map(e => `
    <div class="ev-btn" id="eb-${e.key}" onclick="cycleEv('${e.key}')">
      <i class="ti ${e.icon}"></i>${e.label}
    </div>
  `).join('');
}

function cycleEv(key) {
  evState[key] = (evState[key] + 1) % 3; // 0 → 1 → 2 → 0
  const btn = document.getElementById('eb-' + key);
  btn.className = 'ev-btn' +
    (evState[key] === 1 ? ' found' : evState[key] === 2 ? ' ruled' : '');
  renderEvGhosts();
}

function renderEvGhosts() {
  const found = Object.entries(evState).filter(([, v]) => v === 1).map(([k]) => k);
  const ruled = Object.entries(evState).filter(([, v]) => v === 2).map(([k]) => k);
  const list  = document.getElementById('evGhostList');

  if (!found.length && !ruled.length) {
    list.innerHTML = '';
    return;
  }

  // Count ghosts still possible
  const remaining = GHOSTS.filter(g => {
    const gev = EV_MAP[g.name] || [];
    return !found.some(e => !gev.includes(e)) && !ruled.some(e => gev.includes(e));
  }).length;

  list.innerHTML = `<div class="ev-count">${remaining} ghost${remaining !== 1 ? 's' : ''} remaining</div>` +
    GHOSTS.map(g => {
      const gev  = EV_MAP[g.name] || [];
      const elim = found.some(e => !gev.includes(e)) || ruled.some(e => gev.includes(e));
      return `
        <div class="ghost-row${elim ? ' eliminated' : ''}">
          <div>
            <div class="gr-name">${g.name}</div>
            <div class="gr-ev">${gev.join(' · ')}</div>
          </div>
        </div>`;
    }).join('');
}


/* ══════════════════════════════════════════════════════════
   7. GHOST CARDS TAB
   ══════════════════════════════════════════════════════════ */
function buildGhostCards(filter = '') {
  const fl = filter.toLowerCase();
  const list = GHOSTS.filter(g => !fl || g.name.toLowerCase().includes(fl));

  document.getElementById('ghostCards').innerHTML = list.map(g => `
    <div class="ghost-card-full"
         onclick="this.querySelector('.gcf-body').classList.toggle('open')">
      <div class="gcf-header">
        <div class="gcf-name">${g.name}</div>
        <i class="ti ti-chevron-down gcf-chevron"></i>
      </div>
      <div class="gcf-ev">${g.ev}</div>
      <div class="gcf-body">
        <div class="gcf-row">
          <span class="gcf-lbl">Speed</span>
          <span class="gcf-val">${g.speed} m/s</span>
        </div>
        <div class="gcf-row">
          <span class="gcf-lbl">Action</span>
          <span class="gcf-val">${g.actionTxt}</span>
        </div>
        <div class="gcf-row">
          <span class="gcf-lbl">Tell</span>
          <span class="gcf-val">${g.tell}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function filterGhosts(value) {
  buildGhostCards(value);
}


/* ══════════════════════════════════════════════════════════
   8. QUICK REF TAB
   ══════════════════════════════════════════════════════════ */
function buildQuickRef() {
  document.getElementById('quickList').innerHTML = GHOSTS.map(g => `
    <div class="qr-row">
      <div class="qr-name">${g.name}</div>
      <div class="qr-tip">${g.tell}</div>
    </div>
  `).join('');
}
