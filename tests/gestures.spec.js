// Hand gestures, driven by simulated hand landmarks through the page's real
// gesture code (only the MediaPipe model itself is replaced).
const { test, expect } = require('@playwright/test');
const { openGallery, hand, feed, hold, noHand, tapAt, hoveredIdx, selectedIdx, enlarged } = require('./helpers');

const photoUnderCursor = (page) => page.evaluate(() => {
  const c = document.getElementById('cursor').getBoundingClientRect();
  return document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2)?.closest('.photo')?.dataset.idx ?? null;
});
const scrollTop = (page) => page.evaluate(() => document.querySelector('.grid-wrap').scrollTop);

test.beforeEach(async ({ page }) => { await openGallery(page); });

test('no hover outline before a hand appears', async ({ page }) => {
  expect(await hoveredIdx(page)).toEqual([]);
});

test('open palm: the photo under the cursor is outlined, and follows the hand', async ({ page }) => {
  await hold(page, hand(0.6, 0.5, 'OPEN'), 10);
  const first = await hoveredIdx(page);
  expect(first).toHaveLength(1);
  expect(first[0]).toBe(await photoUnderCursor(page));
  await hold(page, hand(0.3, 0.3, 'OPEN'), 20);   // clear of the guide card (bottom right)
  const second = await hoveredIdx(page);
  expect(second[0]).toBe(await photoUnderCursor(page));
  expect(second[0]).not.toBe(first[0]);
});

test('the outline clears when the hand leaves the frame', async ({ page }) => {
  await hold(page, hand(0.6, 0.5, 'OPEN'), 10);
  await noHand(page);
  expect(await hoveredIdx(page)).toEqual([]);
});

test('OK sign grabs the photo; moving the hand back enlarges it; opening the fingers lets go', async ({ page }) => {
  await hold(page, hand(0.6, 0.5, 'OPEN'), 10);
  const target = (await hoveredIdx(page))[0];
  await hold(page, hand(0.6, 0.5, 'OPEN', { pinch: true }), 4);
  expect(await enlarged(page)).toEqual([target]);
  await hold(page, hand(0.6, 0.5, 'OPEN', { pinch: true, size: 0.09 }), 10);   // hand further from camera
  const scale = await page.evaluate((i) => parseFloat(/scale\(([\d.]+)/.exec(document.querySelector(`[data-idx="${i}"]`).style.transform)[1]), target);
  expect(scale).toBeGreaterThan(2);
  await hold(page, hand(0.6, 0.5, 'OPEN', { size: 0.09 }), 4);
  await page.waitForTimeout(450);
  expect(await enlarged(page)).toEqual([]);
});

test('a curled-finger pinch does not grab (prevents grabs while closing a fist)', async ({ page }) => {
  await hold(page, hand(0.5, 0.5, 'POINTING', { pinch: true }), 10);
  expect(await enlarged(page)).toEqual([]);
});

test('point and dip the fingertip selects the photo under the cursor', async ({ page }) => {
  await hold(page, hand(0.4, 0.4, 'POINTING'), 10);
  const target = await photoUnderCursor(page);
  await tapAt(page, 0.4, 0.4);
  expect(await selectedIdx(page)).toEqual([target]);
});

test('a fist moved up scrolls the grid', async ({ page }) => {
  await hold(page, hand(0.5, 0.7, 'FIST'), 6);
  const frames = [];
  for (let y = 0.7; y >= 0.3; y -= 0.025) frames.push(hand(0.5, y, 'FIST'));
  await feed(page, frames);
  expect(await scrollTop(page)).toBeGreaterThan(100);
});

test.describe('while a photo is enlarged with keyboard or mouse', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.photo').nth(2).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  });

  test('the hand cannot hover, grab, select or scroll underneath it', async ({ page }) => {
    await hold(page, hand(0.9, 0.8, 'OPEN'), 8);
    expect(await hoveredIdx(page)).toEqual([]);
    await hold(page, hand(0.9, 0.8, 'OPEN', { pinch: true }), 4);
    expect(await page.evaluate(() => document.querySelectorAll('.previewing:not(.still)').length)).toBe(0);
    await tapAt(page, 0.9, 0.8);
    expect(await selectedIdx(page)).toEqual([]);
    const before = await scrollTop(page);
    const frames = [];
    for (let y = 0.7; y >= 0.3; y -= 0.025) frames.push(hand(0.5, y, 'FIST'));
    await feed(page, frames);
    expect(await scrollTop(page)).toBe(before);
  });
});

test('no page errors during a full gesture session', async ({ page }) => {
  await hold(page, hand(0.5, 0.5, 'OPEN'), 10);
  await hold(page, hand(0.5, 0.5, 'OPEN', { pinch: true }), 6);
  await hold(page, hand(0.5, 0.5, 'OPEN'), 4);
  await tapAt(page, 0.3, 0.3);
  await noHand(page);
  expect(page.errors).toEqual([]);
});
