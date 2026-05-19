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

   iOS Safari has two hard requirements:
   1. AudioContext must be CREATED synchronously inside a user
      gesture — if you await anything before new AudioContext(),
      iOS considers the gesture "consumed" and blocks audio.
   2. AudioContext must be in RUNNING state before scheduling
      oscillators — ctx.resume() is async so we must await it
      before calling osc.start().

   The pattern that satisfies both:
     function enterApp() {             ← synchronous click handler
       const ctx = new AudioContext(); ← created synchronously ✓
       scheduleBell(ctx);              ← passes ctx to async fn
     }
     async function scheduleBell(ctx) {
       await ctx.resume();             ← awaits running state ✓
       playBell(ctx);                  ← safe to schedule now ✓
     }
   ══════════════════════════════════════════════════════════ */

function createBellContext() {
  // Must be called synchronously — no await before this line
  return new (window.AudioContext || window.webkitAudioContext)();
}

async function scheduleBell(ctx) {
  // Wait for context to actually reach running state before
  // scheduling any oscillators — this is what was missing on iOS
  try {
    await ctx.resume();
  } catch (e) {
    // resume() can fail silently on some browsers — continue anyway
  }
  playBell(ctx);
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
    // exponentialRamp needs a non-zero target — 0.0001 is inaudible
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 4.5);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime  + delay + 5);
  }
  // First toll — three overlapping frequencies for richer texture
  tone(220, 0.70, 0.00); // A3 — deep fundamental
  tone(293, 0.40, 0.00); // D4 — shimmer overtone
  tone(220, 0.30, 0.09); // slight echo
  // Second softer toll after 2.3s
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

  // Create AudioContext synchronously at the top of the click handler
  // iOS Safari requires this — if anything awaits before this line,
  // the gesture is "consumed" and audio is blocked
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

  // scheduleBell awaits ctx.resume() before playing tones
  // This is what was missing — iOS needs the context actually running
  setTimeout(() => scheduleBell(bellCtx), 800);

  // Screen fade
  setTimeout(() => document.getElementById('splash').classList.add('fade-out'), 1600);

  // Show app
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    cleanupSplash();
    initApp();
  }, 2900);
}

// ── SPLASH CLEANUP ───────────────────────────────────────────
// Once the app shell is shown, every splash element gets removed
// from the render tree entirely. This prevents:
//   - position:fixed fog/sky/ground divs covering app content
//   - Bottom strip blacked out by #ground gradient
//   - Corner ornaments floating over app UI
//   - Ongoing CSS animations consuming GPU for no reason
function cleanupSplash() {
  const splashIds = ['sky', 'stars', 'bolt', 'house-wrap', 'ground', 'veil'];
  splashIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Fog layers — selected by class since there are 3 of them
  document.querySelectorAll('.fog').forEach(el => el.style.display = 'none');
  // Corner ornaments
  document.querySelectorAll('.corner').forEach(el => el.style.display = 'none');
}


/* ══════════════════════════════════════════════════════════
   6. APP INIT
   ══════════════════════════════════════════════════════════ */
function initApp() {
  buildTestCards();
  buildSanityCards();
  buildGhostCards();
  renderHuntResults();
  // Heights are measured when the Tests tab is first opened,
  // not here — cards are hidden (display:none) so getBoundingClientRect
  // returns 0 for all of them at this point.
}


/* ══════════════════════════════════════════════════════════
   7. NAVIGATION — bottom nav bar
   switchTab activates the correct view + nav item + header label.
   No hamburger menu — bottom nav is always visible.
   ══════════════════════════════════════════════════════════ */

const TAB_HEADER_LABELS = {
  hunt:   'Hunt — Survive Right Now',
  smudge: 'Smudge Timer',
  tests:  'Ghost Tests',
  sanity: 'Sanity',
  ghosts: 'Ghosts — All 29',
};

function switchTab(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + tab).classList.add('active');
  document.getElementById('ni-' + tab).classList.add('active');
  document.getElementById('currentTabLabel').textContent = TAB_HEADER_LABELS[tab];
  document.getElementById('app-content').scrollTop = 0;

  // Measure test card heights the first time Tests tab becomes visible.
  // Cannot measure while hidden — getBoundingClientRect returns 0 for
  // elements with display:none, so we must wait until the tab is shown.
  if (tab === 'tests') {
    // One rAF to let the view render, then measure
    requestAnimationFrame(() => requestAnimationFrame(initTestCardHeights));
  }
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
   10. GHOST TESTS TAB
   Flip cards: front = test instruction, back = full details.
   Search bar filters list live as you type.
   ══════════════════════════════════════════════════════════ */
function buildTestCards(filter = '') {
  const fl   = filter.toLowerCase();
  const list = GHOST_TESTS.filter(t => !fl || t.name.toLowerCase().includes(fl));

  const diffLabel = { safe:'Safe test', risky:'Risky', hunt:'Requires a hunt' };
  const diffClass = { safe:'diff-safe',  risky:'diff-risky', hunt:'diff-hunt'  };

  document.getElementById('testCards').innerHTML = list.map((t, i) => `
    <div class="test-card-wrap">
      <div class="test-card" id="tc-flip-${i}" onclick="flipTestCard(${i})">

        <!-- FRONT: ghost name + test instruction -->
        <div class="test-face test-front">
          <div class="test-front-name">${t.name}</div>
          <span class="test-diff ${diffClass[t.difficulty]}">${diffLabel[t.difficulty]}</span>
          <div class="test-front-test">${t.test}</div>
          <div class="test-flip-hint">Tap to see results &amp; details &#8594;</div>
        </div>

        <!-- BACK: positive, negative, detail, warning -->
        <div class="test-face test-back">
          <div class="test-back-row">
            <span class="test-back-lbl">&#10003; Confirms</span>
            <span class="test-back-val test-positive">${t.positive}</span>
          </div>
          <div class="test-back-row">
            <span class="test-back-lbl">&#10007; Rules out</span>
            <span class="test-back-val test-negative">${t.negative}</span>
          </div>
          <div class="test-back-row">
            <span class="test-back-lbl">Detail</span>
            <span class="test-back-val">${t.detail}</span>
          </div>
          ${t.warning ? `<div class="test-warning">&#9888; ${t.warning}</div>` : ''}
          <div class="test-flip-back">&#8592; Tap to flip back</div>
        </div>

      </div>
    </div>
  `).join('');

  // Store count for flip tracking
  document._testCount = list.length;
}

function flipTestCard(index) {
  const card = document.getElementById(`tc-flip-${index}`);
  if (!card) return;

  const wrap      = card.parentElement;
  const isFlipped = card.classList.contains('flipped');
  const front     = card.querySelector('.test-front');
  const back      = card.querySelector('.test-back');

  card.classList.toggle('flipped');

  // Measure the face that is about to become visible
  // We briefly make it visible (off-screen via opacity) to measure it,
  // then set the wrapper height so no content overlaps below
  const targetFace = isFlipped ? front : back;

  // Measure the target face immediately (position:absolute means it
  // is always rendered even when hidden behind the other face).
  // Set the wrapper height right away so it starts animating during the flip.
  const h = targetFace.getBoundingClientRect().height;
  if (h > 0) wrap.style.height = (h + 1) + 'px';
}

// Set initial heights for all cards once DOM is ready
function initTestCardHeights() {
  document.querySelectorAll('.test-card-wrap').forEach(wrap => {
    const front = wrap.querySelector('.test-front');
    if (front) {
      const h = front.getBoundingClientRect().height;
      if (h > 0) wrap.style.height = (h + 1) + 'px';
    }
  });
}

function filterTests(value) {
  buildTestCards(value);
  // Re-measure heights after search results change
  requestAnimationFrame(initTestCardHeights);
}


/* ══════════════════════════════════════════════════════════
   11. SANITY TAB
   Slider → real-time three-state colour coding per ghost.
   States:
     safe   (grey/dim)   — ghost cannot hunt at current sanity
     warn   (gold)       — ghost can hunt at current sanity
     danger (red)        — ghost has been able to hunt for a while
                           i.e. threshold is 15+ points above current
   ══════════════════════════════════════════════════════════ */
function buildSanityCards() {
  document.getElementById('sanityCards').innerHTML = SANITY_GHOSTS.map((g, i) => `
    <div class="sanity-card state-safe" id="sc-${i}" onclick="toggleSanityCard(${i})">
      <div class="sc-header">
        <div class="sc-name">${g.name}</div>
        <div class="sc-threshold th-safe" id="sc-th-${i}">${g.threshold}%</div>
      </div>
      <div class="sc-special">${g.special}</div>
      <div class="sc-body" id="sc-body-${i}">
        ${g.drains ? `<div class="sc-drain">&#9888; Sanity drainer: ${g.drainNote}</div>` : ''}
        <div class="gcf-row" style="margin-top:${g.drains ? '6px' : '0'}">
          <span class="gcf-lbl">Threshold</span>
          <span class="gcf-val">${g.threshold}% — ${g.special}</span>
        </div>
        <div class="gcf-row">
          <span class="gcf-lbl">Danger</span>
          <span class="gcf-val">${g.danger.charAt(0).toUpperCase() + g.danger.slice(1)} threat level</span>
        </div>
      </div>
    </div>
  `).join('');

  // Initial state at 100% sanity (all safe)
  updateSanitySlider(100);
}

function toggleSanityCard(index) {
  const body = document.getElementById(`sc-body-${index}`);
  if (body) body.classList.toggle('open');
}

function updateSanitySlider(value) {
  const val     = parseInt(value);
  const display = document.getElementById('sanityValDisplay');
  const summary = document.getElementById('sanitySummary');

  // Colour the big number
  display.textContent = val + '%';
  display.className = val <= 25 ? 'danger' : val <= 50 ? 'warning' : '';

  // Update each ghost card state
  let dangerCount = 0;
  let warnCount   = 0;
  let safeCount   = 0;

  SANITY_GHOSTS.forEach((g, i) => {
    const card   = document.getElementById(`sc-${i}`);
    const thresh = document.getElementById(`sc-th-${i}`);
    if (!card || !thresh) return;

    // Determine state
    // safe   = ghost cannot hunt (threshold < current sanity)
    // warn   = ghost can hunt (threshold >= current sanity)
    // danger = ghost has been able to hunt for a long time
    //          defined as: threshold >= current sanity + 15
    let state, thClass;
    if (g.threshold < val) {
      state   = 'state-safe';
      thClass = 'th-safe';
      safeCount++;
    } else if (g.threshold >= val + 15) {
      state   = 'state-danger';
      thClass = 'th-danger';
      dangerCount++;
    } else {
      state   = 'state-warn';
      thClass = 'th-warn';
      warnCount++;
    }

    card.className  = `sanity-card ${state}`;
    thresh.className = `sc-threshold ${thClass}`;
  });

  // Summary pills
  let pills = '';
  if (dangerCount > 0)
    pills += `<span class="summary-pill pill-danger">&#9888; ${dangerCount} high danger</span>`;
  if (warnCount > 0)
    pills += `<span class="summary-pill pill-warn">${warnCount} can hunt now</span>`;
  if (safeCount > 0)
    pills += `<span class="summary-pill pill-safe">${safeCount} cannot hunt</span>`;
  if (!pills)
    pills = `<span style="font-size:11px;color:rgba(200,178,125,.3);font-family:'Oswald',sans-serif;font-weight:300">Drag slider to see threats</span>`;

  summary.innerHTML = pills;
}


/* ══════════════════════════════════════════════════════════
   12. GHOST CARDS TAB
   ══════════════════════════════════════════════════════════ */
function buildGhostCards(filter = '') {
  const fl   = filter.toLowerCase();
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
          <i class="ti ti-run gcf-icon" aria-hidden="true"></i>
          <span class="gcf-lbl">Speed</span>
          <span class="gcf-val">${g.speed} m/s</span>
        </div>
        <div class="gcf-row">
          <i class="ti ti-shield gcf-icon" aria-hidden="true"></i>
          <span class="gcf-lbl">Action</span>
          <span class="gcf-val">${g.actionTxt}</span>
        </div>
        <div class="gcf-row">
          <i class="ti ti-bulb gcf-icon" aria-hidden="true"></i>
          <span class="gcf-lbl">Tell</span>
          <span class="gcf-val">${g.tell}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleGhostCard(card) {
  const body    = card.querySelector('.gcf-body');
  const chevron = card.querySelector('.gcf-chevron');
  const isOpen  = body.classList.contains('open');
  body.classList.toggle('open');
  chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function filterGhosts(value) { buildGhostCards(value); }


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
