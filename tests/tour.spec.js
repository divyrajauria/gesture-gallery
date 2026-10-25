// First-run tour: teaches one gesture at a time and moves on when you do it.
const { test, expect } = require('@playwright/test');
const { openGallery, hand, feed, hold, tapAt, centreOf, announced, isShown } = require('./helpers');

const coach = (page) => page.evaluate(() => ({
  visible: !document.getElementById('coach').classList.contains('hidden'),
  count: document.getElementById('coach-count').textContent,
  title: document.getElementById('coach-title').textContent,
  emoji: document.getElementById('coach-emoji').textContent,
  hint: document.getElementById('coach-hint').hidden ? '' : document.getElementById('coach-hint').textContent,
  backDisabled: document.getElementById('coach-back').disabled,
  next: document.getElementById('coach-next-label').textContent,
}));
const afterTick = (page) => page.waitForTimeout(900);   // the ✓ pause before the next step

test('first visit: the tour runs all four steps as each gesture is done', async ({ page }) => {
  await openGallery(page, { tour: true });
  let c = await coach(page);
  expect(c).toMatchObject({ visible: true, count: 'Step 1 of 4', backDisabled: true });
  expect(await isShown(page, '#guide')).toBe(false);
  expect(await announced(page)).toMatch(/^Step 1 of 4\. Move your open palm/);

  // A hand merely appearing at the edge doesn't count as moving it
  await hold(page, hand(0.95, 0.9, 'OPEN'), 4);
  expect((await coach(page)).count).toBe('Step 1 of 4');
  const sweep = [];
  for (let x = 0.95; x > 0.3; x -= 0.03) sweep.push(hand(x, 0.6, 'OPEN'));
  await feed(page, sweep);
  await afterTick(page);
  expect((await coach(page)).count).toBe('Step 2 of 4');

  await tapAt(page, 0.5, 0.5);
  await afterTick(page);
  expect((await coach(page)).count).toBe('Step 3 of 4');

  await hold(page, hand(0.5, 0.5, 'OPEN'), 12);
  await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true }), 4);
  await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true, size: 0.09 }), 14);
  await hold(page, hand(0.5, 0.5, 'OPEN', { size: 0.09 }), 4);
  await afterTick(page);
  expect((await coach(page)).count).toBe('Step 4 of 4');

  await hold(page, hand(0.5, 0.8, 'FIST'), 6);
  const lift = [];
  for (let y = 0.8; y >= 0.3; y -= 0.025) lift.push(hand(0.5, y, 'FIST'));
  await feed(page, lift);
  await afterTick(page);
  c = await coach(page);
  expect(c.count).toBe('All done');
  expect(await page.locator('#coach-text').textContent()).toContain('Take the tour');

  await page.waitForTimeout(4300);
  expect((await coach(page)).visible).toBe(false);
  await expect(page.locator('#guide-reopen')).toBeVisible();
  expect(page.errors).toEqual([]);
});

test('returning visitors get the regular guide, which can replay the tour', async ({ page }) => {
  await openGallery(page, { tour: false });
  expect((await coach(page)).visible).toBe(false);
  expect(await isShown(page, '#guide')).toBe(true);
  await expect(page.locator('#guide-tour')).toHaveText('Take the tour');
  await page.click('#guide-tour');
  expect(await coach(page)).toMatchObject({ visible: true, count: 'Step 1 of 4' });
});

test('?tour in the URL always starts it (for demos)', async ({ page }) => {
  await openGallery(page, { tour: false, path: '/index.html?tour' });
  expect((await coach(page)).visible).toBe(true);
});

test('Back and Next move between steps; Next becomes Finish on the last one', async ({ page }) => {
  await openGallery(page, { tour: true });
  await page.click('#coach-back', { force: true });                 // disabled on step 1
  expect((await coach(page)).count).toBe('Step 1 of 4');
  await page.click('#coach-next');
  await page.click('#coach-next');
  expect((await coach(page)).count).toBe('Step 3 of 4');
  await page.click('#coach-back');
  let c = await coach(page);
  expect(c.count).toBe('Step 2 of 4');
  expect(c.title).toMatch(/Point and tap/);
  await page.click('#coach-next');
  await page.click('#coach-next');
  c = await coach(page);
  expect(c).toMatchObject({ count: 'Step 4 of 4', next: 'Finish' });
  await page.click('#coach-next');
  expect((await coach(page)).count).toBe('All done');
});

test('Back during the ✓ pause stays put (no stray auto-advance)', async ({ page }) => {
  await openGallery(page, { tour: true });
  await page.click('#coach-next');                                  // step 2
  await tapAt(page, 0.5, 0.5);                                      // completes it → ✓ pause
  await page.click('#coach-back');
  await page.waitForTimeout(900);
  expect((await coach(page)).count).toBe('Step 1 of 4');
});

test('Skip tour closes it, and can be pressed by hand', async ({ page }) => {
  await openGallery(page, { tour: true });
  const [x, y] = await centreOf(page, '#coach-end');
  await tapAt(page, x, y);
  expect((await coach(page)).visible).toBe(false);
});

test('still works when the browser blocks storage (some private modes)', async ({ page }) => {
  await openGallery(page, {
    tour: true,
    init: () => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }),
  });
  expect((await coach(page)).visible).toBe(true);
  await page.click('#coach-end');
  expect(page.errors).toEqual([]);
});

test.describe('the OK-sign step coaches from what the camera sees', () => {
  test.beforeEach(async ({ page }) => {
    await openGallery(page, { tour: true });
    await page.click('#coach-next');
    await page.click('#coach-next');
  });

  test('shows 👌 and the real instructions', async ({ page }) => {
    expect(await coach(page)).toMatchObject({ count: 'Step 3 of 4', emoji: '👌', title: 'OK sign, then pull back', hint: '' });
  });

  test('curled-finger pinch → "keep your other fingers up"', async ({ page }) => {
    await hold(page, hand(0.5, 0.5, 'POINTING', { pinch: true }), 10);
    expect((await coach(page)).hint).toMatch(/middle, ring and little fingers up/);
  });

  test('OK sign away from the photos → "do it over a photo"', async ({ page }) => {
    await hold(page, hand(0.02, 0.5, 'OPEN'), 20);
    await hold(page, hand(0.02, 0.5, 'OPEN', { pinch: true }), 6);
    expect((await coach(page)).hint).toBe('Do it over a photo.');
  });

  test('grabbed but not moving → "move your hand back"; moving → "keep going"; done → step 4', async ({ page }) => {
    await hold(page, hand(0.5, 0.5, 'OPEN'), 20);
    await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true }), 45);
    expect((await coach(page)).hint).toMatch(/move your hand back, away from the screen/);
    await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true, size: 0.12 }), 8);
    const hint = (await coach(page)).hint;
    const step = (await coach(page)).count;
    expect(/further back/.test(hint) || step === 'Step 4 of 4').toBe(true);
    await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true, size: 0.09 }), 14);
    await afterTick(page);
    expect(await coach(page)).toMatchObject({ count: 'Step 4 of 4', hint: '' });
  });
});
