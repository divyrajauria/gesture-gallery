# Gesture Gallery

Control a photo gallery with hand gestures — no mouse, no touch, no headset. Just your webcam and a browser tab.

Move your open palm to glide a cursor over photos, pinch to grab one and pull your hand back to enlarge it, point and tap to select, and make a fist to scroll. Everything runs locally in your browser using your webcam; the camera feed never leaves your device.

> **Live demo:** [divyrajauria.github.io/gesture-photo-gallery](https://divyrajauria.github.io/gesture-photo-gallery/) — open in desktop Chrome or Edge and allow camera access.

## Gestures

| Pose | Motion | What it does |
|------|--------|--------------|
| ✋ Open palm | Move your hand | Cursor follows; the photo under it gets a white border |
| 🤏 Pinch (thumb + index) | From an open palm | Grab the photo under the cursor |
| 🤏 Pinch, then pull back | Move your hand away from the camera | The grabbed photo scales up and follows your hand; release the pinch to spring it back |
| 👆 Point (index out) | Dip the fingertip briefly | Select / deselect the photo under the cursor (blue checkmark) |
| ✊ Fist | Move your hand up / down | Grab-and-drag scroll through the grid |

## Run it locally

This is a single, self-contained HTML file — no build step, no dependencies to install.

1. Download or clone this repository.
2. Open `index.html` in **Google Chrome** or **Microsoft Edge** (desktop).
3. Allow camera access when prompted.
4. Raise one hand in view of your webcam and start gesturing. The on-screen guide (ⓘ button, bottom-right) lists every gesture.

**Tip:** browsers only grant camera access on secure origins. Opening the file directly (`file://`) works in Chrome/Edge; if your browser blocks the camera, serve it locally instead, e.g. `python3 -m http.server` and visit `http://localhost:8000`.

## How it works

- **Hand tracking:** [MediaPipe Hands](https://developers.google.com/mediapipe) (loaded from a CDN) detects 21 hand landmarks per frame.
- **Cursor smoothing:** a One-Euro filter keeps the cursor steady at rest and snappy in motion.
- **Photo tiles:** generated gradients (no external images), so the gallery works fully offline.
- **Stack:** vanilla HTML, CSS, and JavaScript in one file. No framework, no build.

Key tuning constants live near the top of the `<script>` in `index.html` (sensitivity for pinch, scroll, tap, and cursor smoothing) if you want to adjust the feel.

## Requirements

- A webcam
- Desktop Chrome or Edge (other Chromium browsers generally work; mobile and Safari are not officially supported)

## License

[MIT](LICENSE) © 2026 Divyanshi Rajauria

---

_Designed and built by Divyanshi Rajauria, with AI assistance._

_Independent educational demo. Not affiliated with, endorsed by, or connected to Apple Inc. or iCloud._
