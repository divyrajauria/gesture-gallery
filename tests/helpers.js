// Shared test helpers: a stand-in for MediaPipe Hands, simulated hand
// landmarks, and small page queries.

// ---------------------------------------------------------------------------
// Simulated hand
// ---------------------------------------------------------------------------
// Builds MediaPipe's 21 hand landmarks so the page's cursor lands at screen
// fraction (sx, sy) in the given pose: 'OPEN', 'POINTING' or 'FIST'.
//   size  — hand size in the image (smaller = further from the camera)
//   pinch — thumb tip touches index tip
//   dip   — index fingertip bent down (a tap)
function hand(sx, sy, pose, opts = {}) {
  // The page maps cursor = mirror(0.4·wrist + 0.6·middle-knuckle), with an 8% edge
  // pad; invert that so the cursor lands where asked.
  const PAD = 0.08, px = PAD + sx * (1 - 2 * PAD), py = PAD + sy * (1 - 2 * PAD);
  const cx = 1 - px, s = opts.size || 0.15;
  const mcpY = py - 0.4 * s;
  const lm = Array.from({ length: 21 }, () => ({ x: cx, y: mcpY, z: 0 }));
  lm[0] = { x: cx, y: mcpY + s, z: 0 };   // wrist
  const ext = { index: pose !== 'FIST', middle: pose === 'OPEN', ring: pose === 'OPEN', pinky: pose === 'OPEN' };
  const F = { index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
  let k = 0;
  for (const [name, [m, p, d, t]] of Object.entries(F)) {
    const x = cx + (k++ - 1.5) * 0.03 * s / 0.15;
    lm[m] = { x, y: mcpY, z: 0 };
    if (ext[name]) { lm[p] = { x, y: mcpY - 0.35 * s, z: 0 }; lm[d] = { x, y: mcpY - 0.5 * s, z: 0 }; lm[t] = { x, y: mcpY - 0.65 * s, z: 0 }; }
    else           { lm[p] = { x, y: mcpY - 0.25 * s, z: 0 }; lm[d] = { x, y: mcpY - 0.15 * s, z: 0 }; lm[t] = { x, y: mcpY - 0.05 * s, z: 0 }; }
  }
  if (opts.dip) lm[8] = { x: lm[8].x + 0.3 * s, y: lm[8].y + 0.15 * s, z: 0 };
  const tx = cx + 0.12 * s / 0.15;
  lm[1] = { x: tx, y: mcpY + 0.8 * s, z: 0 };
  lm[2] = { x: tx + 0.01, y: mcpY + 0.6 * s, z: 0 };
  lm[3] = { x: tx + 0.02, y: mcpY + 0.4 * s, z: 0 };
  lm[4] = opts.pinch ? { ...lm[8] } : { x: tx + 0.04, y: mcpY + 0.25 * s, z: 0 };
  return lm;
}

// ---------------------------------------------------------------------------
// Stand-ins for MediaPipe Hands (the CDN script is intercepted)
// ---------------------------------------------------------------------------
const FAKE_HANDS = {
  // Tests push results themselves via window.__h.cb(...)
  manual: 'window.Hands=class{constructor(){window.__h=this}setOptions(){}onResults(c){this.cb=c}send(){}}',
  // Answers the first frame (tracking "starts"), counts frames sent to the model.
  auto: 'window.__sends=0;window.Hands=class{constructor(){window.__h=this}setOptions(){}onResults(c){this.cb=c}send(){window.__sends++;if(!this.d){this.d=1;setTimeout(()=>this.cb({multiHandLandmarks:[]}),10)}return Promise.resolve()}}',
  // Model never answers (stays "loading").
  silent: 'window.Hands=class{setOptions(){}onResults(){}send(){return new Promise(()=>{})}}',
  // Model files fail to download on first use.
  failing: 'window.Hands=class{setOptions(){}onResults(){}send(){return Promise.reject(new Error("model download failed"))}}',
};

// A simple stand-in photo (photo service is replaced so tests are offline).
function stubPhoto(url) {
  const h = [...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${h},55%,45%)"/><circle cx="200" cy="170" r="70" fill="hsl(${(h + 40) % 360},60%,70%)"/></svg>`;
}

/**
 * Open the gallery with controlled conditions.
 *   hands:   'manual' | 'auto' | 'silent' | 'failing' | null (tracker script fails to load)
 *   camera:  'pending' (never answers) | 'real' (Chromium's fake webcam) | an error name, e.g. 'NotAllowedError'
 *   tour:    false = tour already seen (default), true = first visit
 *   photos:  'offline' (default) | 'stub'
 *   start:   for hands:'manual', simulate tracking starting (first result)
 */
async function openGallery(page, { hands = 'manual', camera = 'pending', tour = false, photos = 'offline', start = true, path = '/index.html', init } = {}) {
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.dialogs = [];
  page.on('dialog', (d) => { page.dialogs.push(d.message()); d.dismiss(); });
  await page.addInitScript(({ camera, tour }) => {
    if (!tour) { try { localStorage.setItem('gesture-gallery-tour-done', '1'); } catch (e) {} }
    if (camera === 'pending') navigator.mediaDevices.getUserMedia = () => new Promise(() => {});
    else if (camera !== 'real') navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('test', camera));
  }, { camera, tour });
  if (init) await page.addInitScript(init);
  await page.route(/mediapipe\/hands/, (r) => hands ? r.fulfill({ contentType: 'text/javascript', body: FAKE_HANDS[hands] }) : r.abort());
  await page.route(/picsum\.photos/, (r) => photos === 'stub'
    ? r.fulfill({ contentType: 'image/svg+xml', body: stubPhoto(r.request().url()) })
    : r.abort());
  await page.goto(path);
  if (hands === 'manual' && start) await page.evaluate(() => window.__h.cb({ multiHandLandmarks: [] }));
  await page.waitForTimeout(300);
}

/** Feed a list of frames (each a hand, or null for "no hand") at ~30 fps from
 *  inside the page — steady timing, like a webcam. */
async function feed(page, list, gapMs = 30) {
  await page.evaluate(async ({ list, gapMs }) => {
    for (const lm of list) {
      window.__h.cb({ multiHandLandmarks: lm ? [lm] : [] });
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }, { list, gapMs });
}
/** Repeat one hand pose for n frames. */
const hold = (page, lm, n = 8) => feed(page, Array.from({ length: n }, () => lm));
/** No hand in view for n frames. */
const noHand = (page, n = 2) => feed(page, Array.from({ length: n }, () => null));

/** Point at (x, y), dip the fingertip once, and hold still afterwards. */
async function tapAt(page, x, y) {
  await hold(page, hand(x, y, 'POINTING'), 30);
  await feed(page, [hand(x, y, 'POINTING'), hand(x, y, 'POINTING'), hand(x, y, 'POINTING'), hand(x, y, 'POINTING', { dip: true })]);
  await hold(page, hand(x, y, 'POINTING'), 6);
}

/** Centre of an element as screen fractions, for aiming the hand. */
const centreOf = (page, selector) => page.evaluate((sel) => {
  const r = document.querySelector(sel).getBoundingClientRect();
  return [(r.left + r.width / 2) / innerWidth, (r.top + r.height / 2) / innerHeight];
}, selector);

const activeIdx = (page) => page.evaluate(() => document.activeElement.dataset.idx ?? null);
const selectedIdx = (page) => page.evaluate(() => [...document.querySelectorAll('.photo.selected')].map((e) => e.dataset.idx));
const hiddenIdx = (page) => page.evaluate(() => [...document.querySelectorAll('.photo[hidden]')].map((e) => e.dataset.idx));
const hoveredIdx = (page) => page.evaluate(() => [...document.querySelectorAll('.photo.hovered')].map((e) => e.dataset.idx));
const enlarged = (page) => page.evaluate(() => [...document.querySelectorAll('.photo.previewing')].map((e) => e.dataset.idx));
const announced = (page) => page.locator('#sr-status').textContent();
const isShown = (page, sel) => page.evaluate((s) => !document.querySelector(s).classList.contains('hidden'), sel);

module.exports = {
  hand, FAKE_HANDS, openGallery, feed, hold, noHand, tapAt, centreOf,
  activeIdx, selectedIdx, hiddenIdx, hoveredIdx, enlarged, announced, isShown,
};
