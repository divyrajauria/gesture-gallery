# Gesture Gallery — rules for this repo

Divy Rajauria's hand-gesture photo gallery. A single self-contained `index.html`
(vanilla HTML/CSS/JS, MediaPipe Hands from a pinned CDN, no build step).
Live on GitHub Pages: https://divyrajauria.github.io/gesture-photo-gallery/

## Why it exists

It is a **Playground** piece on Divy's portfolio (divy.work, a separate repo). Its job is
to show a recruiter or engineering lead "designer's eye, engineer's hands" in under a
minute. Judge every change by that: does it make the piece more convincing to someone
skimming it? If not, it can wait.

Divy is not a full-time engineer and is often short on time. Do the terminal work,
explain afterwards in plain language, one task at a time.

## Working rules

- **Author commits as `Divy Rajauria <rajauriad@gmail.com>`** so they count on her
  GitHub graph. Never make filler or empty commits.
- Work on a branch (`feature/…`, `fix/…`, `docs/…`) and push it early — nothing should
  live only in the container.
- **Show Divy the change before it reaches `main`.** Merging to `main` redeploys the
  live site.
- Keep it one file, no framework, no build step, no new dependencies without asking.

## Accessibility is part of the story

- `prefers-reduced-motion` is honoured: decorative motion (spring snap-back, tap
  ripple, spinner, guide slide) is removed; hand-driven movement stays because it is
  the interface. Keep new effects inside that rule.
- Every gesture should have a keyboard/mouse equivalent, and the page must stay usable
  when camera access is denied.
- Visible focus, real semantic elements, alt text / labels on everything.

## Branding and assets

- Not affiliated with Apple or iCloud. Never add Apple logos, the iCloud name, or
  copied Apple UI assets.
- Tiles are generated gradients so the demo works offline. The README demo GIF
  (`docs/demo.gif`) was recorded on an earlier build with free-licence stock photos;
  its caption says so. If the visuals change a lot, re-record it.

## Backlog (in order — confirm with Divy before starting each)

1. Keyboard + mouse fallback (arrows move, Enter/Space select, Esc closes preview).
2. Camera-denied state: clear message and fallback controls instead of an endless loader.
3. Short in-app onboarding: a first-run hint that teaches one gesture at a time.
4. Calibration: a "too close / too far / move into frame" indicator.
5. Performance check on a mid-range laptop; reduce work when the tab is hidden.
6. Lightweight tests for the gesture classifier (pure functions fed recorded landmarks).
7. Optional, only if Divy wants: real free-licence photo set behind a toggle, matching
   the demo GIF.

Not planned: mobile support, new gestures, extra animations — they don't change how a
reviewer judges the piece.
