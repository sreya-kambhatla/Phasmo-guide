/*
  PHASMO GUIDE — app.js  (Commit 4)
  ===================================
  Changes from Commit 3:
  - Bell iOS fix: AudioContext created synchronously inside click handler
  - Lightning/house removed from app shell (splash only)
  - Hamburger menu replaces tab bar — full names, no truncation
  - All animations: ripple, card stagger, threshold flash, timer bump, ev pulse
  - scrollIntoView when ≤2 hunt results
  - Larger font sizes via CSS — no JS changes needed for that
  - Special Elite + Oswald font references in generated HTML strings

  Sections:
    1. Splash init
    2. Stars + sparks + lightning
    3. Smoke paths
    4. Bell — iOS-safe
    5. Enter / snuff sequence
    6. App init
    7. Menu
    8. Hunt tab
    9. Smudge tab
    10. Evidence tab
    11. Ghost cards tab
    12. Quick ref tab
    13. Ripple helper
*/


/* ══════════════════════════════════════════════════════════
   1. SPLASH INIT
   ══════════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  // Set house image from data.js constant
  document.getElementById('house-img').src = 'data:image/webp;base64,' + HOUSE_B64;
  setupSmokePaths();
  initStars();
  initSparks();
  initLightning();
});

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('veil').classList.add('gone'), 150);
});


/* ══════════════════════════════════════════════════════════
   2. STARS + SPARKS + LIGHTNING
   These run on the splash screen only. Once enterApp() fires
   the splash is hidden — these keep running harmlessly in the
   background but are invisible behind the app shell.
   ══════════════════════════════════════════════════════════ */

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

let candleWrap;
function initSparks() {
  candleWrap = document.getElementById('candle-wrap');
  setInterval(spawnSpark, 700);
}
function spawnSpark() {
  const spark = document.createElement('div');
  spark.className = 'spark';
  spark.style.setProperty('--dx',  (Math.random() - 0.5) * 28 + 'px');
  spark.style.setProperty('--dur', (0.9 + Math.random() * 0.8).toFixed(2) + 's');
  spark.style.left = (50 + (Math.random() - 0.5) * 12) + '%';
  spark.style.top  = '4px';
  candleWrap.appendChild(spark);
  spark.addEventListener('animationend', () => spark.remove());
}

function initLightning() {
  setTimeout(strike, 1500);
}
function strike() {
  const sky       = document.getElementById('sky');
  const bolt      = document.getElementById('bolt');
  const houseWrap = document.getElementById('house-wrap');

  [sky, bolt, houseWrap].forEach(el => el.classList.add('flash'));

  const fo = document.querySelector('.flame-outer');
  if (fo && !fo.classList.contains('snuffing')) {
    fo.style.animation = 'flickerWild 0.22s ease-in-out 4';
    setTimeout(() => {
      if (!fo.classList.contains('snuffing'))
        fo.style.animation = 'flicker 1.1s ease-in-out infinite alternate';
    }, 1000);
    for (let i = 0; i < 6; i++) setTimeout(spawnSpark, i * 75);
  }

  setTimeout(() => {
    [sky, bolt, houseWrap].forEach(el => el.classList.remove('flash'));
  }, 720);

  setTimeout(strike, Math.random() * 5000 + 3000);
}


/* ══════════════════════════════════════════════════════════
   3. SMOKE PATHS
   ══════════════════════════════════════════════════════════ */
function setupSmokePaths() {
  ['wpath1','wpath2','wpath3'].forEach(id => {
    const path = document.getElementById(id);
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray  = length;
    path.style.strokeDashoffset = length;
  });
}


/* ══════════════════════════════════════════════════════════
   4. BELL — iOS-SAFE WEB AUDIO API
   
   THE FIX:
   iOS Safari requires AudioContext to be created AND resumed
   synchronously inside a user gesture handler. If you await
   anything before creating the context, iOS considers the
   gesture "consumed" and blocks audio.

   OLD (broken on iOS):
     async function enterApp() {
       const ctx = await getAudioCtx();  // await = gesture consumed
       ...
     }

   NEW (works on iOS):
     function enterApp() {
       // Create context synchronously — no await before this
       const ctx = new AudioContext();
       ctx.resume();  // fire and forget — no await
       playBell(ctx); // pass context directly
     }
   ══════════════════════════════════════════════════════════ */

function createBellContext() {
  // Must be called synchronously inside the click handler
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  // resume() is a promise but we don't await it here
  // iOS resumes it as part of the user gesture
  ctx.resume();
  return ctx;
}

function playBell(ctx) {
  function tone(freq, vol, delay) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol,      ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 4.5);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime  + delay + 5);
  }
  tone(220, 0.70, 0.00);
  tone(293, 0.40, 0.00);
  tone(220, 0.30, 0.09);
  setTimeout(() => { tone(196, 0.45, 0); tone(261, 0.28, 0); }, 2300);
}


/* ══════════════════════════════════════════════════════════
   5. ENTER / SNUFF SEQUENCE
   ══════════════════════════════════════════════════════════ */
let hasEntered = false;

function enterApp() {
  if (hasEntered) return;
  hasEntered = true;
  document.getElementById('enter-btn').disabled = true;

  // Create AudioContext SYNCHRONOUSLY here — before any async work
  // This is the iOS fix — must happen at the top of the click handler
  const bellCtx = createBellContext();

  const flameOuter = document.getElementById('flameOuter');
  const flameGlow  = document.getElementById('flameGlow');
  const wick       = document.getElementById('wick');
  const smokeWrap  = document.getElementById('smoke-wrap');

  // Snuff flame
  flameOuter.classList.add('snuffing');
  flameGlow.style.opacity = '0';

  // Wick ember
  setTimeout(() => wick.classList.add('ember'), 500);

  // Smoke wisps
  setTimeout(() => {
    smokeWrap.classList.add('active');
    const wisps = [
      { wId:'wisp1', pId:'wpath1', dur:2000, delay:0   },
      { wId:'wisp2', pId:'wpath2', dur:2400, delay:130 },
      { wId:'wisp3', pId:'wpath3', dur:1800, delay:260 },
    ];
    wisps.forEach(({ wId, pId, dur, delay }) => {
      setTimeout(() => {
        const wisp = document.getElementById(wId);
        const path = document.getElementById(pId);
        path.style.transition       = `stroke-dashoffset ${dur * 0.55}ms ease-out`;
        path.style.strokeDashoffset = '0';
        wisp.style.animation        = `wispRise ${dur}ms ease-out forwards`;
      }, delay);
    });
  }, 440);

  // Bell — use the context we created synchronously above
  setTimeout(() => playBell(bellCtx), 800);

  // Screen fade
  setTimeout(() => document.getElementById('splash').classList.add('fade-out'), 1600);

  // Show app
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    initApp();
  }, 2900);
}


/* ══════════════════════════════════════════════════════════
   6. APP INIT
   ══════════════════════════════════════════════════════════ */
function initApp() {
  buildEvGrid();
  buildGhostCards();
  buildQuickRef();
  renderHuntResults(); // renders empty state
}


/* ══════════════════════════════════════════════════════════
   7. MENU
   ══════════════════════════════════════════════════════════ */
let menuOpen = false;

function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }
function openMenu()  { menuOpen = true;  document.getElementById('menuOverlay').classList.add('open'); }
function closeMenu() { menuOpen = false; document.getElementById('menuOverlay').classList.remove('open'); }
function handleOverlayClick(e) {
  if (e.target === document.getElementById('menuOverlay')) closeMenu();
}

function switchTab(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById('view-' + tab).classList.add('active');
  document.getElementById('mi-' + tab).classList.add('active');
  document.getElementById('currentTabLabel').textContent = TAB_LABELS[tab];
  document.getElementById('app-content').scrollTop = 0;
  closeMenu();
}


/* ══════════════════════════════════════════════════════════
   8. HUNT TAB
   ══════════════════════════════════════════════════════════ */
let activeFilters = new Set();

function toggleFilter(btn, event) {
  // Ripple from tap point
  addRipple(btn, event);

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
    el.innerHTML = '<p class="results-empty">// tap filters to narrow down ghosts</p>';
    return;
  }

  const matches = GHOSTS.filter(ghost =>
    [...activeFilters].every(f => ghost.tags.includes(f))
  );

  if (matches.length === 0) {
    el.innerHTML = '<p class="results-empty">// no matches — try fewer filters</p>';
    return;
  }

  // Cards stagger in via CSS nth-child animation delays
  el.innerHTML = matches.map(ghost => `
    <div class="result-card card-${ghost.action}">
      <div class="rc-name">${ghost.name}</div>
      <div class="rc-speed">${ghost.speed} m/s</div>
      <span class="rc-action ${ACTION_CLASS[ghost.action]}">${ghost.actionTxt}</span>
      <div class="rc-tell">${ghost.tell}</div>
    </div>
  `).join('');

  // Scroll results into view when ≤2 matches — FIX for single result visibility
  if (matches.length <= 2) {
    setTimeout(() => {
      el.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 100);
  }
}


/* ══════════════════════════════════════════════════════════
   9. SMUDGE TAB
   ══════════════════════════════════════════════════════════ */

// ── Smudge timer ──
const SMUDGE_TIMES   = { spirit:180, others:90, demon:60 };
let smudgeInterval   = null;
let smudgeStartTime  = null;
// Track previous timer state to detect threshold crossings
const prevTimerClass = { spirit:'', others:'', demon:'' };

function startSmudge(btn, event) {
  addRipple(btn, event);
  if (smudgeInterval) clearInterval(smudgeInterval);
  smudgeStartTime = Date.now();
  btn.textContent = 'Running...';
  // Reset threshold flags
  Object.keys(SMUDGE_TIMES).forEach(k => {
    delete document.getElementById('tc-' + k).dataset.flashed;
    prevTimerClass[k] = '';
  });
  smudgeInterval = setInterval(tickSmudge, 250);
}

function tickSmudge() {
  const elapsed = (Date.now() - smudgeStartTime) / 1000;

  for (const [key, total] of Object.entries(SMUDGE_TIMES)) {
    const remaining = Math.max(total - elapsed, 0);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);

    const timerEl = document.getElementById('t-' + key);
    const barEl   = document.getElementById('b-' + key);
    const cardEl  = document.getElementById('tc-' + key);

    timerEl.textContent = `${mins}:${secs.toString().padStart(2,'0')}`;

    // Determine new class
    const newClass = remaining <= 0 ? 'timer-val expired'
                   : remaining < 15 ? 'timer-val warning'
                   : 'timer-val';

    // Bump animation when class changes (state transition)
    if (newClass !== prevTimerClass[key] && prevTimerClass[key] !== '') {
      timerEl.className = newClass + ' bump';
      setTimeout(() => {
        timerEl.classList.remove('bump');
      }, 250);
    } else {
      timerEl.className = newClass;
    }
    prevTimerClass[key] = newClass;

    // Progress bar colour
    barEl.style.width      = Math.max((remaining / total) * 100, 0) + '%';
    barEl.style.background = remaining <= 0 ? '#c04040'
                           : remaining < 15 ? '#c07820'
                           : 'var(--gold)';

    // Threshold flash on the Demon card when it hits 0
    if (remaining <= 0 && !cardEl.dataset.flashed) {
      cardEl.dataset.flashed = '1';
      cardEl.classList.add('threshold-hit');
      setTimeout(() => cardEl.classList.remove('threshold-hit'), 600);
    }
  }

  if (elapsed > 180) {
    clearInterval(smudgeInterval);
    document.getElementById('smudgeBtn').textContent = 'Start smudge timer';
  }
}

function resetSmudge() {
  clearInterval(smudgeInterval);
  smudgeInterval = null;
  for (const [key, total] of Object.entries(SMUDGE_TIMES)) {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    document.getElementById('t-'  + key).textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
    document.getElementById('t-'  + key).className   = 'timer-val';
    document.getElementById('b-'  + key).style.cssText = 'width:100%;background:var(--gold)';
    const card = document.getElementById('tc-' + key);
    delete card.dataset.flashed;
    card.classList.remove('threshold-hit');
    prevTimerClass[key] = '';
  }
  document.getElementById('smudgeBtn').textContent = 'Start smudge timer';
}

// ── Hunt cooldown timer ──
const COOLDOWN_TIMES   = { demon:20, others:25 };
let cooldownInterval   = null;
let cooldownStartTime  = null;

function startCooldown(btn, event) {
  addRipple(btn, event);
  if (cooldownInterval) clearInterval(cooldownInterval);
  cooldownStartTime = Date.now();
  btn.textContent = 'Running...';

  cooldownInterval = setInterval(() => {
    const elapsed = (Date.now() - cooldownStartTime) / 1000;
    for (const [key, total] of Object.entries(COOLDOWN_TIMES)) {
      const remaining = Math.max(total - elapsed, 0);
      document.getElementById('cd-'  + key).textContent  = `0:${Math.floor(remaining).toString().padStart(2,'0')}`;
      document.getElementById('cd-'  + key).className    = 'timer-val' + (remaining <= 0 ? ' expired' : '');
      document.getElementById('bcd-' + key).style.width  = Math.max((remaining/total)*100,0)+'%';
      document.getElementById('bcd-' + key).style.background = remaining <= 0 ? '#c04040' : 'var(--gold)';
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
  ['cd-demon','cd-others'].forEach(id => {
    document.getElementById(id).className = 'timer-val';
  });
  ['bcd-demon','bcd-others'].forEach(id => {
    document.getElementById(id).style.cssText = 'width:100%;background:var(--gold)';
  });
  document.getElementById('cdBtn').textContent = 'Hunt just ended';
}


/* ══════════════════════════════════════════════════════════
   10. EVIDENCE TAB
   ══════════════════════════════════════════════════════════ */
let evState = {};

function buildEvGrid() {
  EVIDENCE.forEach(e => evState[e.key] = 0);
  document.getElementById('evGrid').innerHTML = EVIDENCE.map(e => `
    <div class="ev-btn" id="eb-${e.key}" onclick="cycleEv('${e.key}', this)">
      <i class="ti ${e.icon}"></i>${e.label}
    </div>
  `).join('');
}

function cycleEv(key, btn) {
  evState[key] = (evState[key] + 1) % 3;
  btn.className = 'ev-btn' +
    (evState[key] === 1 ? ' found' : evState[key] === 2 ? ' ruled' : '');

  // Ring pulse on state change
  btn.classList.add('ev-pulse');
  setTimeout(() => btn.classList.remove('ev-pulse'), 400);

  renderEvGhosts();
}

function renderEvGhosts() {
  const found = Object.entries(evState).filter(([,v]) => v === 1).map(([k]) => k);
  const ruled = Object.entries(evState).filter(([,v]) => v === 2).map(([k]) => k);
  const list  = document.getElementById('evGhostList');

  if (!found.length && !ruled.length) { list.innerHTML = ''; return; }

  const remaining = GHOSTS.filter(g => {
    const gev = EV_MAP[g.name] || [];
    return !found.some(e => !gev.includes(e)) && !ruled.some(e => gev.includes(e));
  }).length;

  list.innerHTML = `<div class="ev-count">// ${remaining} ghost${remaining !== 1 ? 's' : ''} remaining</div>` +
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
   11. GHOST CARDS TAB
   ══════════════════════════════════════════════════════════ */
function buildGhostCards(filter = '') {
  const fl = filter.toLowerCase();
  const list = GHOSTS.filter(g => !fl || g.name.toLowerCase().includes(fl));

  document.getElementById('ghostCards').innerHTML = list.map(g => `
    <div class="ghost-card-full" onclick="toggleGhostCard(this)">
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

function toggleGhostCard(card) {
  const body     = card.querySelector('.gcf-body');
  const chevron  = card.querySelector('.gcf-chevron');
  const isOpen   = body.classList.contains('open');
  body.classList.toggle('open');
  chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function filterGhosts(value) { buildGhostCards(value); }


/* ══════════════════════════════════════════════════════════
   12. QUICK REF TAB
   ══════════════════════════════════════════════════════════ */
function buildQuickRef() {
  document.getElementById('quickList').innerHTML = GHOSTS.map(g => `
    <div class="qr-row">
      <div class="qr-name">${g.name}</div>
      <div class="qr-tip">${g.tell}</div>
    </div>
  `).join('');
}


/* ══════════════════════════════════════════════════════════
   13. RIPPLE HELPER
   Creates a ripple div at the tap point inside a button.
   The ripple div uses the .ripple CSS class which animates
   scale(0) → scale(4) + opacity fade via @keyframes rippleOut.
   ══════════════════════════════════════════════════════════ */
function addRipple(el, event) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x    = (event.clientX || rect.left + rect.width  / 2) - rect.left - size / 2;
  const y    = (event.clientY || rect.top  + rect.height / 2) - rect.top  - size / 2;
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}
