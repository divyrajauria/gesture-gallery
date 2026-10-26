# Gesture Gallery

[![Tests](https://github.com/divyrajauria/gesture-photo-gallery/actions/workflows/tests.yml/badge.svg)](https://github.com/divyrajauria/gesture-photo-gallery/actions/workflows/tests.yml)

Browse a photo gallery with hand gestures, right in the browser. Webcam optional: every gesture also works with keyboard and mouse.

**[Try it live →](https://divyrajauria.github.io/gesture-photo-gallery/)** Desktop Chrome or Edge. Hand tracking runs on your device; the camera feed never leaves it.

![A hand moving in front of a laptop webcam while the cursor glides over a grid of photos and grabs one](docs/demo.gif)

<sub>Recorded on an earlier build.</sub>

## Gestures

| Pose | Motion | What it does |
|------|--------|--------------|
| ✋ Open palm | Move your hand | Cursor follows; the photo under it is outlined |
| 👆 Point | Dip the fingertip | Select the photo under the cursor, or press the button under it |
| 👌 OK sign (thumb touches index, other three fingers up) | Over a photo | Grab it. A curled-finger pinch 🤏 won't grab |
| 👌 then move back | Move your whole hand away from the screen | The photo grows; open your fingers to let go |
| ✊ Fist | Move up or down | Scroll the grid |

On a first visit, a short tour teaches these one at a time and moves on as you do each one. Replay it from **ⓘ → Take the tour**, or add `?tour` to the URL.

## Keyboard and mouse

| Gesture | Keyboard | Mouse |
|---------|----------|-------|
| Move palm | Arrow keys | Hover |
| Point and tap | Space | Click |
| OK sign, move back | Enter (Esc closes) | Double-click |
| Fist scroll | Page Up / Down, Home / End | Scroll wheel |

With photos selected, **Remove** (or the Delete key) and **Clear** appear next to the title. Remove can be undone (**Undo** or Ctrl/Cmd+Z), and nothing is really deleted. The gallery is usable before hand tracking loads, and if the camera is blocked, missing or busy, a small card says which and how to fix it.

## How it's built, and why

One `index.html`: vanilla HTML, CSS and JavaScript, no framework, no build step. [MediaPipe Hands](https://developers.google.com/mediapipe) (pinned, from a CDN) finds 21 points on the hand in each camera frame; everything after that is this file.

**Reading the hand**
- **Poses from finger geometry.** Each fingertip is compared with its middle joint to tell an open palm, a pointing finger and a fist apart. A pose must hold for ~90 ms before it counts, so the cursor doesn't flicker between modes.
- **Grabbing needs an OK sign, not a pinch.** A hand closing into a fist passes through a pinch-like shape. Requiring the other three fingers to stay up, checked on the current frame rather than the smoothed one, stops accidental grabs.
- **Depth without a depth camera.** The hand's size in the image stands in for distance: as it shrinks, the photo grows.
- **A tap is a fingertip dip,** measured relative to hand size within a 220 ms window, with a cooldown, so slow drift doesn't select things.
- **A steady cursor.** A One-Euro filter keeps it still when the hand is still and responsive when it moves.

**For everyone, not just webcam owners**
- The grid is a multi-select listbox with a single Tab stop. Selections, removals and previews are announced to screen readers. `prefers-reduced-motion` removes decorative animation but keeps hand-driven movement, because that is the interface.
- The camera is requested directly rather than through MediaPipe's helper, which shows a raw `alert()` on every failure.
- The tour coaches from what the camera sees ("keep your other three fingers up", "now move your hand back").

**Light on the machine.** In Chromium at 4× CPU slowdown, the page's own work per frame (not counting the hand model) went from ~14 ms to ~2 ms when idle, and from ~22 ms to ~9 ms with a hand moving:
- A hidden loading spinner was forcing a repaint every frame. It now animates only while visible.
- Only the photo being enlarged gets its own compositing layer, not all 200.
- One hit-test per frame finds the photo under the cursor, instead of measuring every tile.
- The model runs once per new camera frame (~30/s), not once per screen refresh (~60/s).
- Switching tabs releases the camera (its light goes off); it reconnects quietly on return.

**Details**
- The sidebar and top-bar icons are a decorative frame, deliberately not buttons, so nothing looks clickable that isn't.
- Photos are free-licence images from [Unsplash](https://unsplash.com) via [Lorem Picsum](https://picsum.photos), a fixed one per tile, over a generated gradient that doubles as the offline fallback.
- Tuning constants (pinch, tap, scroll, smoothing) sit at the top of the `<script>`.

## Run it locally

1. Clone the repository.
2. Open `index.html` in Chrome or Edge. Nothing to install or build.
3. Allow the camera and raise one hand.

If your browser blocks the camera on `file://`, serve the folder instead (`python3 -m http.server`, then visit `http://localhost:8000`).

## Tests

58 end-to-end tests in [`tests/`](tests/) run in Chromium on every pull request. [Playwright](https://playwright.dev) is used only for testing; the site itself has no dependencies.

Hand tracking is tested without a webcam: the tests swap MediaPipe's model for a stand-in that feeds simulated hand landmarks (`hand()` in [`tests/helpers.js`](tests/helpers.js)). The page's real gesture code therefore runs as it would with a hand in front of the camera. Chromium's fake webcam covers the camera states.

```sh
npm install
npx playwright install chromium   # first time only
npm test
```

## Requirements

- Desktop Chrome or Edge (other Chromium browsers generally work; mobile and Safari aren't supported)
- A webcam for gestures (optional)

## License

[MIT](LICENSE) © 2026 Divyanshi Rajauria

---

_Designed and built by Divyanshi Rajauria, with AI assistance._

_Independent educational demo. Not affiliated with, endorsed by, or connected to Apple Inc. or iCloud._
