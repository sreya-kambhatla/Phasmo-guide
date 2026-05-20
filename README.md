# 👻 Phasmo Guide

> *A ghost hunting companion app built for no-evidence runs.*
> *Because dying to a Demon at 80% sanity because you didn't know it could hunt that early gets old fast.*

---

## Link to Application: https://sreya-kambhatla.github.io/Phasmo-guide/

---

## 🕯 What is this?

Phasmo Guide is a mobile-first companion app for **Phasmophobia** — a co-op horror investigation game where you identify ghosts using evidence and observation. This app is built specifically for **no-evidence runs**, where you have to identify the ghost purely by watching how it behaves.

It started as a spreadsheet. The spreadsheet was a nightmare to use mid-game in a dark room with shaking hands. So it became this.

---

## ✨ The App

Five tabs. One purpose — keep you alive and help you figure out what's trying to kill you.

### ⚡ Hunt
Filter by what you observe — speed, behaviour, sound, visibility. Filters collapse into compact chips once suspects appear so the results take centre stage. A live suspect count updates in the header as you narrow things down. Scroll further down and the **Speed Calculator** lets you tap in rhythm with ghost footsteps to measure its speed in m/s.

### ⏱ Smudge Timer
Three simultaneous countdowns — Spirit (3:00), All Others (1:30), Demon (1:00). Start it the moment you smudge. The Demon threshold card has a permanently breathing red badge because if you miss that window, you're going to have a bad time.

### 🧪 Ghost Tests
Confirmation tests for all 29 ghosts. Search by name and the list filters live. Each ghost is a flip card — front shows the test to run, back shows what a positive result looks like, what rules it out, extra context, and any safety warnings. Difficulty badges tell you upfront whether a test is safe, risky, or requires surviving a hunt.

### 🧠 Sanity
Drag the slider to your current team sanity. Every ghost on the list reacts in real time — grey means it can't hunt you yet, gold means it can, red means it's been able to hunt you for a while and you may not have known. A health bar above the slider drains and shifts colour as you move it.

### 👻 Ghosts
Full expandable reference cards for all 29 ghosts. Searchable. Each card expands to show speed, survival action, and the one tell that identifies them. For studying between rounds, not panicking mid-hunt.

---
### Fonts

- **Special Elite** — headers, ghost names, section labels. Typewriter feel. Closest thing to the actual Phasmophobia UI font.
- **Oswald** — body text, labels, numbers. Condensed and readable at small sizes on mobile.

### Animations

Everything is CSS-driven where possible. `@keyframes` for the candle snuff sequence, fog drift, lightning flash, card stagger, timer bumps, danger badge breathing. JavaScript only kicks in for timing-sensitive things — the ripple from tap point, the threshold flash, the flip card height measurement.

### The splash screen

Fully built from scratch — no images except the haunted house photo (sky removed in Python, darkened to a silhouette, converted to base64 WebP and embedded in `data.js`). The lightning bolt is a layered SVG with four strokes at different widths and opacities. The candle is four CSS divs. The smoke wisps use SVG `stroke-dashoffset` animation — the path length is measured with `getTotalLength()` and then drawn on like a pen tracing it.

### The bell

Web Audio API — synthesised in JavaScript, no audio files. Three overlapping sine wave oscillators at different frequencies decay exponentially to simulate a church bell. The iOS fix was non-trivial — `AudioContext` must be created synchronously inside the user gesture handler, then `await ctx.resume()` must complete before scheduling any oscillator starts. Getting both right took three attempts.

### Speed Calculator

Tap in rhythm with ghost footsteps. Each tap timestamp is recorded. The median interval between taps is calculated (median rather than mean — more robust against one accidental off-beat tap). Speed is derived as `0.76 / interval_seconds`, a constant calibrated against known ghost speeds from community testing. Results cross-reference any active Hunt filters.

## 🗂 Commit History

| # | Description |
|---|---|
| 1–3 | Initial build — splash screen, Hunt tab, Smudge timer |
| 4 | Full UI overhaul — Special Elite + Oswald, hamburger menu, all animations, iOS bell fix |
| 5 | Ghost Tests flip cards + Sanity slider — replace Evidence + Quick Ref tabs |
| 6 | Fix blank tabs on mobile + splash blackout fix |
| 7 | iOS bell audio fix — await ctx.resume() before scheduling tones |
| 8 | Modern UI — bottom nav, pill filter chips, card shadows, 36px timers |
| 9 | Fix flip card overlap — dynamic wrapper height on flip |
| 10 | Fix Ghost Tests invisible on mobile — measure heights after tab is visible |
| 11 | UI polish — nav pill, live suspect count, directional transitions, sanity health bar, filter collapse |
| 12 | Hunt Speed Calculator — tap with footsteps, calculates m/s, cross-references filters |

---
*Built for Phasmophobia. Not affiliated with Kinetic Games.*

*// good luck out there*
