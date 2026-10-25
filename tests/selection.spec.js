// Selecting photos leads somewhere: Remove (with Undo) and Clear.
const { test, expect } = require('@playwright/test');
const { openGallery, hold, hand, noHand, tapAt, centreOf, activeIdx, selectedIdx, hiddenIdx, announced } = require('./helpers');

const toast = (page) => page.evaluate(() =>
  document.getElementById('toast').classList.contains('hidden') ? null : document.getElementById('toast-msg').textContent);
const firstLabel = (page) => page.locator('.photo:not([hidden])').first().getAttribute('aria-label');

async function selectFirstThree(page) {
  await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight'); }
  await page.keyboard.press('ArrowLeft');
}

test.beforeEach(async ({ page }) => {
  await openGallery(page);
  await page.click('#guide-dismiss');
  await page.waitForTimeout(400);
});

test('the action bar appears with a selection, without shifting the grid', async ({ page }) => {
  const top = () => page.evaluate(() => document.querySelector('.grid-wrap').getBoundingClientRect().top);
  const before = await top();
  await expect(page.locator('#sel-bar')).toBeHidden();
  await selectFirstThree(page);
  await expect(page.locator('#page-title')).toHaveText('3 Selected');
  await expect(page.locator('#sel-bar')).toBeVisible();
  expect(await top()).toBe(before);
});

test('Delete removes, announces, moves focus on, renumbers; Ctrl+Z restores', async ({ page }) => {
  await selectFirstThree(page);
  await page.keyboard.press('Delete');
  expect(await hiddenIdx(page)).toEqual(['0', '1', '2']);
  await expect(page.locator('#sel-bar')).toBeHidden();
  expect(await toast(page)).toBe('3 photos removed');
  expect(await announced(page)).toContain('Control Z');
  expect(await activeIdx(page)).toBe('3');
  expect(await firstLabel(page)).toBe('Photo 1 of 197');
  await page.keyboard.press('Home');
  expect(await activeIdx(page)).toBe('3');                          // navigation skips removed photos
  await page.keyboard.press('Control+z');
  expect(await hiddenIdx(page)).toEqual([]);
  expect(await selectedIdx(page)).toEqual(['0', '1', '2']);         // back, still selected
  expect(await firstLabel(page)).toBe('Photo 1 of 200');
  expect(await toast(page)).toBeNull();
});

test('Remove and Undo buttons work with the mouse, and focus returns to the photos', async ({ page }) => {
  await selectFirstThree(page);
  await page.click('#sel-remove');
  expect(await hiddenIdx(page)).toHaveLength(3);
  expect(await activeIdx(page)).toBe('3');
  await page.click('#toast-undo');
  expect(await hiddenIdx(page)).toEqual([]);
  await page.click('#sel-clear');
  expect(await selectedIdx(page)).toEqual([]);
  expect(await activeIdx(page)).not.toBeNull();
});

test('Delete works with nothing focused', async ({ page }) => {
  await page.locator('.photo').nth(20).click();
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Delete');
  expect(await hiddenIdx(page)).toEqual(['20']);
});

test('the Undo toast waits while hovered, then leaves; Ctrl+Z still works after', async ({ page }) => {
  await page.locator('.photo').nth(20).click();
  await page.keyboard.press('Delete');
  await page.hover('#toast');
  await page.waitForTimeout(5600);
  expect(await toast(page)).not.toBeNull();
  await page.mouse.move(10, 10);
  await page.waitForTimeout(5400);
  expect(await toast(page)).toBeNull();
  await page.keyboard.press('Control+z');
  expect(await hiddenIdx(page)).toEqual([]);
});

test('by hand: tap a photo, tap Remove (it lights up first), tap Undo', async ({ page }) => {
  const [px, py] = await centreOf(page, '[data-idx="9"]');
  await tapAt(page, px, py);
  expect(await selectedIdx(page)).toEqual(['9']);
  const [rx, ry] = await centreOf(page, '#sel-remove');
  await hold(page, hand(rx, ry, 'POINTING'), 30);
  await expect(page.locator('#sel-remove')).toHaveClass(/hand-hover/);
  await tapAt(page, rx, ry);
  expect(await hiddenIdx(page)).toEqual(['9']);
  const [ux, uy] = await centreOf(page, '#toast-undo');
  await tapAt(page, ux, uy);
  expect(await hiddenIdx(page)).toEqual([]);
  await noHand(page);
  expect(await page.locator('.hand-hover').count()).toBe(0);
});

test('removing every photo, then navigating, is safe; Undo brings all 200 back', async ({ page }) => {
  await page.evaluate(() => document.querySelectorAll('.photo')
    .forEach((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))));
  await expect(page.locator('#page-title')).toHaveText('200 Selected');
  await page.keyboard.press('Delete');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Home');
  expect(await page.locator('.photo:not([hidden])').count()).toBe(0);
  await page.keyboard.press('Control+z');
  expect(await page.locator('.photo:not([hidden])').count()).toBe(200);
  expect(page.errors).toEqual([]);
});
