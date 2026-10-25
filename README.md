# Gesture Gallery

Control a photo gallery with hand gestures — no mouse, no touch, no headset. Just your webcam and a browser tab.

![A hand moving in front of a laptop webcam while the cursor glides over a grid of photos and grabs one](docs/demo.gif)

<sub>Recorded on an earlier build. The live version uses free-licence photos from Unsplash (via Lorem Picsum); if they can't load, tiles fall back to generated colours so the demo still works offline.</sub>

Move your open palm to glide a cursor over photos, make an OK sign to grab one and move your hand back to enlarge it, point and tap to select, and make a fist to scroll. Everything runs locally in your browser using your webcam; the camera feed never leaves your device.

> **Live demo:** [divyrajauria.github.io/gesture-photo-gallery](https://divyrajauria.github.io/gesture-photo-gallery/) — open in desktop Chrome or Edge and allow camera access.

## Gestures

| Pose | Motion | What it does |
|------|--------|--------------|
| ✋ Open palm | Move your hand | Cursor follows; the photo under it gets a white border |
| 👌 OK sign (thumb touches index, other three fingers up) | Over a photo | Grab the photo under the cursor. A curled-finger pinch 🤏 won't grab: the other three fingers must stay up |
| 👌 OK sign, then move back | Move your whole hand back, away from the screen (not up, down or sideways) | The grabbed photo scales up; moving sideways drags it. Open your fingers to let go |
| 👆 Point (index out) | Dip the fingertip briefly | Select / deselect the photo under the cursor (blue checkmark), or press the button under it (Remove, Undo…) |
| ✊ Fist | Move your hand up / down | Grab-and-drag scroll through the grid |

## No camera? Keyboard and mouse

Every gesture has a keyboard and mouse equivalent, and the gallery is usable from the first second — before hand tracking has loaded, or if camera access is denied. A small card in the corner says what's happening (loading, camera blocked, no camera found, camera in use by another app) and how to fix it.

| Gesture | Keyboard | Mouse |
|---------|----------|-------|
| Move open palm | Arrow keys (Tab or any arrow key to start) | Hover |
| Point + tap to select | Space | Click |
| OK sign + move back to enlarge | Enter (Esc closes) | Double-click (click outside closes) |
| Fist scroll | Page Up / Page Down, Home / End | Scroll wheel |
| — | Delete removes selected photos; Ctrl/Cmd+Z undoes | **Remove** / **Undo** buttons |

With photos selected, a **Remove** and **Clear** bar appears next to the "N Selected" title; an **Undo** toast follows a removal. Nothing is really deleted — a reload brings every photo back. With the camera on, point-and-tap presses these buttons too: a tap works on any button under the cursor, not just photos.

Esc with nothing enlarged clears the selection. Selection changes and previews are announced to screen readers, and `prefers-reduced-motion` removes decorative animation.

## How it's built, and why

One `index.html`: vanilla HTML, CSS and JavaScript, no framework, no build step. [MediaPipe Hands](https://developers.google.com/mediapipe) (pinned, from a CDN) finds 21 points on your hand in each camera frame; everything after that is this file.

**Reading the hand**
- **Poses from finger geometry.** Each fingertip is compared with its middle joint to tell an open palm, a pointing finger and a fist apart. A pose has to hold for ~90 ms before it counts, so the cursor doesn't flicker between modes.
- **Grabbing needs an OK sign, not a pinch.** Closing your hand into a fist passes through a pinch-like shape on the way. Requiring the other three fingers to stay up, checked on the current frame rather than the smoothed one, is what stops accidental grabs.
- **"Move back to enlarge" without a depth camera.** The hand's size in the image stands in for distance: as it shrinks, the photo grows.
- **A tap is a fingertip dip.** It's measured relative to hand size within a 220 ms window, with a cooldown, so slow finger drift doesn't select things.
- **A steady cursor.** A One-Euro filter keeps it still when your hand is still and responsive when it moves.

**Usable by everyone, not just webcam owners**
- Every gesture has a keyboard and mouse equivalent. The grid is a multi-select listbox with a single Tab stop. Selections, removals and previews are announced to screen readers. `prefers-reduced-motion` removes decorative animation but keeps hand-driven movement, because that's the interface.
- The gallery works from the first second. Hand tracking loads in the background, and if the camera is blocked, missing or busy, a small card says which and how to fix it. The camera is requested directly rather than through MediaPipe's helper, which shows a raw `alert()` on every failure.

**Teaching the gestures**
- A first-run tour moves on when you actually do each gesture, and gives live hints from what the camera sees ("keep your other three fingers up", "now move your hand back").

**Light on the machine.** Measured in Chromium at 4× CPU slowdown, the page's own work per frame dropped from ~14 ms to ~2 ms when idle, and from ~22 ms to ~9 ms with a hand moving. The hand model's own cost isn't included. What fixed it:
- A hidden loading spinner was forcing a full repaint every frame. It now animates only when its card is visible.
- Only the photo being enlarged gets its own compositing layer, instead of all 200.
- One hit-test per frame finds the photo under the cursor, instead of measuring every tile.
- The model runs once per new camera frame (~30/s), not once per screen refresh (~60/s).
- Switching tabs releases the camera (its light goes off), and it quietly reconnects when you come back.

**Details**
- The sidebar and top-bar icons are a decorative app frame. They're deliberately not buttons, so nothing looks clickable that isn't.
- Photos are free-licence images from [Unsplash](https://unsplash.com) via [Lorem Picsum](https://picsum.photos), a fixed one per tile, with a generated gradient underneath as placeholder and offline fallback.
- Tuning constants (pinch, tap, scroll, cursor smoothing) sit at the top of the `<script>` in `index.html`.

## Run it locally

This is a single, self-contained HTML file — no build step, no dependencies to install.

1. Download or clone this repository.
2. Open `index.html` in **Google Chrome** or **Microsoft Edge** (desktop).
3. Allow camera access when prompted.
4. Raise one hand in view of your webcam. On your first visit a short tour teaches the four gestures one at a time, moving on as you do each one (← Back / Next → move between steps; replay it anytime from ⓘ → **Take the tour**, or add `?tour` to the URL). The on-screen guide (ⓘ button, bottom-right) lists every gesture.

**Tip:** browsers only grant camera access on secure origins. Opening the file directly (`file://`) works in Chrome/Edge; if your browser blocks the camera, serve it locally instead, e.g. `python3 -m http.server` and visit `http://localhost:8000`.

## Tests

[![Tests](https://github.com/divyrajauria/gesture-photo-gallery/actions/workflows/tests.yml/badge.svg)](https://github.com/divyrajauria/gesture-photo-gallery/actions/workflows/tests.yml)

58 end-to-end tests in [`tests/`](tests/) run in Chromium on every pull request. The site itself still has no dependencies; [Playwright](https://playwright.dev) is used only to test it.

Hand tracking is the hard part to test without a webcam. The tests swap MediaPipe's model for a stand-in that feeds **simulated hand landmarks** (see `hand()` in [`tests/helpers.js`](tests/helpers.js)), so the page's real gesture code (poses, the OK-sign grab, taps, fist scroll) runs exactly as it would with a hand in front of the camera. They also cover:
- keyboard and mouse;
- every camera failure state, using Chromium's fake webcam;
- releasing the camera in a hidden tab;
- the tour and its hints;
- Remove/Undo;
- the offline photo fallback;
- reduced motion.

```sh
npm install
npx playwright install chromium   # first time only
npm test
```

## Requirements

- A webcam for hand gestures (optional — keyboard and mouse work without one)
- Desktop Chrome or Edge (other Chromium browsers generally work; mobile and Safari are not officially supported)

## License

[MIT](LICENSE) © 2026 Divyanshi Rajauria

---

_Designed and built by Divyanshi Rajauria, with AI assistance._

_Independent educational demo. Not affiliated with, endorsed by, or connected to Apple Inc. or iCloud._
