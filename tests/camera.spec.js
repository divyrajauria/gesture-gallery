// The gallery works from the first second, explains every camera problem,
// and releases the camera when the tab is hidden.
const { test, expect } = require('@playwright/test');
const { openGallery, hand, hold, activeIdx, selectedIdx, announced, isShown } = require('./helpers');

const card = (page) => page.evaluate(() => ({
  visible: !document.getElementById('status').classList.contains('hidden'),
  title: document.getElementById('status-title').textContent,
  buttons: [...document.querySelectorAll('#status-actions button')].map((b) => b.textContent),
  keyHelp: !document.getElementById('status-keys').hidden,
  cameraIconOff: document.getElementById('cam-toggle').classList.contains('off'),
}));
const cardButton = (page, name) => page.locator('#status-actions button', { hasText: name });

test('camera working: no status card, normal camera icon, camera button opens the preview', async ({ page }) => {
  await openGallery(page, { hands: 'auto', camera: 'real' });
  await page.waitForTimeout(500);
  const c = await card(page);
  expect(c.visible).toBe(false);
  expect(c.cameraIconOff).toBe(false);
  await page.click('#cam-toggle');
  await expect(page.locator('#cam')).toHaveClass(/expanded/);
  expect(page.dialogs).toEqual([]);
  expect(page.errors).toEqual([]);
});

test('while tracking loads, a small card says so and the gallery already works', async ({ page }) => {
  await openGallery(page, { hands: 'silent', camera: 'real' });
  const c = await card(page);
  expect(c.visible).toBe(true);
  expect(c.title).toBe('Starting hand tracking…');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  expect(await selectedIdx(page)).toEqual(['0']);
});

const failures = [
  { error: 'NotAllowedError', title: 'Camera is off', buttons: ['Try camera again', 'Use keyboard & mouse'] },
  { error: 'NotFoundError', title: 'No camera found', buttons: ['Use keyboard & mouse'] },
  { error: 'NotReadableError', title: 'Camera in use', buttons: ['Try again', 'Use keyboard & mouse'] },
  { error: 'TypeError', title: 'Camera couldn’t start', buttons: ['Try again', 'Use keyboard & mouse'] },
];
for (const f of failures) {
  test(`${f.error}: "${f.title}" with the right buttons, key help, no browser popup`, async ({ page }) => {
    await openGallery(page, { hands: 'auto', camera: f.error });
    const c = await card(page);
    expect(c).toMatchObject({ visible: true, title: f.title, buttons: f.buttons, keyHelp: true, cameraIconOff: true });
    expect(page.dialogs).toEqual([]);                       // MediaPipe's helper used to alert() here
    expect(await announced(page)).toContain(f.title);
  });
}

test('camera refused twice: explains the address-bar icon; "Use keyboard & mouse" hands focus to the photos', async ({ page }) => {
  await openGallery(page, { hands: 'auto', camera: 'NotAllowedError' });
  await cardButton(page, 'Try camera again').click();
  expect((await card(page)).title).toBe('Camera is blocked');
  await cardButton(page, 'Use keyboard & mouse').click();
  await page.waitForTimeout(400);
  expect((await card(page)).visible).toBe(false);
  expect(await activeIdx(page)).toBe('0');
  await expect(page.locator('#guide-reopen')).toBeVisible();
  // The slashed camera icon brings the explanation back
  await page.click('#cam-toggle');
  expect((await card(page)).title).toBe('Camera is blocked');
});

test('once the camera is allowed, "Try again" starts tracking', async ({ page }) => {
  await openGallery(page, { hands: 'auto', camera: 'NotAllowedError' });
  await page.evaluate(() => { delete navigator.mediaDevices.getUserMedia; });   // back to the (fake) real camera
  await cardButton(page, 'Try camera again').click();
  await page.waitForTimeout(800);
  const c = await card(page);
  expect(c.visible).toBe(false);
  expect(c.cameraIconOff).toBe(false);
});

test('tracker script blocked: says so and offers Retry', async ({ page }) => {
  await openGallery(page, { hands: null, camera: 'real' });
  const c = await card(page);
  expect(c.title).toBe('Hand tracking couldn’t load');
  expect(c.buttons).toEqual(['Retry', 'Use keyboard & mouse']);
});

test('tracker model fails to download: says so instead of spinning forever', async ({ page }) => {
  await openGallery(page, { hands: 'failing', camera: 'real' });
  await page.waitForTimeout(500);
  expect((await card(page)).title).toBe('Hand tracking couldn’t load');
});

test('the status card never takes keyboard focus on its own', async ({ page }) => {
  await openGallery(page, { hands: 'auto', camera: 'NotAllowedError' });
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test.describe('hidden tab', () => {
  // Let the test flip page visibility the way switching tabs does.
  const visibilityControl = () => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible') });
    window.__setHidden = (h) => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
  };
  const cameraLive = (page) => page.evaluate(() => {
    const s = document.getElementById('video').srcObject;
    return !!s && s.getVideoTracks().some((t) => t.readyState === 'live');
  });
  const framesPerSecond = async (page) => {
    const a = await page.evaluate(() => window.__sends);
    await page.waitForTimeout(1000);
    return (await page.evaluate(() => window.__sends)) - a;
  };

  test.beforeEach(async ({ page }) => {
    await openGallery(page, { hands: 'auto', camera: 'real', init: visibilityControl });
    await page.waitForTimeout(800);
  });

  test('the model runs once per camera frame, not once per screen refresh', async ({ page }) => {
    const fps = await framesPerSecond(page);
    expect(fps).toBeGreaterThan(5);
    expect(fps).toBeLessThan(40);          // a 60 Hz screen would give ~60 if every refresh ran it
  });

  test('switching away releases the camera and any held gesture; coming back reconnects quietly', async ({ page }) => {
    expect(await cameraLive(page)).toBe(true);
    await hold(page, hand(0.5, 0.5, 'OPEN'), 12);
    await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true }), 4);
    await expect(page.locator('#cursor')).toHaveClass(/pinching/);
    const track = await page.evaluateHandle(() => document.getElementById('video').srcObject.getVideoTracks()[0]);

    await page.evaluate(() => window.__setHidden(true));
    await page.waitForTimeout(400);
    expect(await cameraLive(page)).toBe(false);
    expect(await track.evaluate((t) => t.readyState)).toBe('ended');      // camera light off
    await expect(page.locator('#cursor')).not.toHaveClass(/pinching/);
    expect(await framesPerSecond(page)).toBe(0);

    await page.evaluate(() => window.__setHidden(false));
    await page.waitForTimeout(1200);
    expect(await cameraLive(page)).toBe(true);
    expect(await isShown(page, '#status')).toBe(false);
  });

  test('rapid tab switching never leaves two tracking loops running', async ({ page }) => {
    const before = await framesPerSecond(page);
    for (let i = 0; i < 6; i++) { await page.evaluate((h) => window.__setHidden(h), i % 2 === 0); await page.waitForTimeout(40); }
    await page.waitForTimeout(1500);
    const after = await framesPerSecond(page);
    expect(after).toBeGreaterThan(5);
    expect(after).toBeLessThanOrEqual(Math.ceil(before * 1.3));
  });

  test('if another app took the camera meanwhile, coming back says so', async ({ page }) => {
    await page.evaluate(() => window.__setHidden(true));
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('busy', 'NotReadableError')); });
    await page.evaluate(() => window.__setHidden(false));
    await page.waitForTimeout(500);
    expect((await card(page)).title).toBe('Camera in use');
  });
});
