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
  (Playwright is approved as a test-only dev dependency; nothing ships to visitors.)
- Run `npm test` before pushing, and add or update a test in `tests/` with each change.

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
- Tiles are free-licence Unsplash photos via Lorem Picsum (fixed seed per tile), with a
  generated gradient underneath as placeholder and offline fallback. Credit lives in the
  guide card and README. The README demo GIF (`docs/demo.gif`) was recorded on an earlier
  build; if the visuals change a lot, re-record it.

## Status

Shipped: keyboard + mouse fallback; camera status card (no full-screen loader);
first-run tour with Back/Next and live OK-sign hints; Unsplash photos; Remove/Undo;
performance work and camera release in hidden tabs; non-interactive decorative frame;
58-test Playwright suite running on every PR.

Open (confirm with Divy before starting any):
- Calibration indicator ("too close / too far / move into frame"). Deprioritised: the
  tour's live hints already cover the main confusion.
- Performance has only been measured in Chromium with CPU throttling, not on a real
  mid-range laptop.
- The README demo GIF predates the photos, tour and Remove/Undo; Divy chose to keep it.

Not planned: mobile support, new gestures, extra animations — they don't change how a
reviewer judges the piece.
