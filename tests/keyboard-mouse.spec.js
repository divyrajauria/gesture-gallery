// Every gesture has a keyboard and mouse equivalent.
const { test, expect } = require('@playwright/test');
const { openGallery, activeIdx, selectedIdx, enlarged, announced } = require('./helpers');

const scrollTop = (page) => page.evaluate(() => document.querySelector('.grid-wrap').scrollTop);

test.describe('keyboard', () => {
  test.beforeEach(async ({ page }) => { await openGallery(page); });

  test('the photo grid is the first Tab stop; decorative icons are skipped', async ({ page }) => {
    await page.keyboard.press('Tab');
    expect(await activeIdx(page)).toBe('0');
  });

  test('an arrow key reaches the photos from anywhere, then moves through the grid', async ({ page }) => {
    await page.keyboard.press('ArrowDown');                       // jump in
    expect(await activeIdx(page)).toBe('0');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    expect(await activeIdx(page)).toBe('9');                      // 8 per row
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await activeIdx(page)).toBe('7');                      // wraps to the row above
    // Only one photo is ever in the Tab order (roving tabindex)
    expect(await page.locator('.photo[tabindex="0"]').count()).toBe(1);
  });

  test('Home, End and Page Up jump, and the grid scrolls to follow', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('End');
    expect(await activeIdx(page)).toBe('199');
    expect(await scrollTop(page)).toBeGreaterThan(1000);
    await page.keyboard.press('PageUp');
    expect(Number(await activeIdx(page))).toBeLessThan(199);
    await page.keyboard.press('Home');
    expect(await activeIdx(page)).toBe('0');
  });

  test('Space selects and announces; Esc clears', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    expect(await selectedIdx(page)).toEqual(['0']);
    await expect(page.locator('#page-title')).toHaveText('1 Selected');
    expect(await announced(page)).toBe('1 photo selected');
    await page.keyboard.press('Escape');
    expect(await selectedIdx(page)).toEqual([]);
    await expect(page.locator('#page-title')).toHaveText('Library');
  });

  test('Enter enlarges on top of everything; arrows are ignored; Esc closes and keeps the selection', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect(await enlarged(page)).toEqual(['0']);
    expect(await announced(page)).toContain('enlarged');
    // The enlarged photo is above the dimmed backdrop, not behind it
    const top = await page.evaluate(() => document.elementFromPoint(830, 500).closest('.photo')?.dataset.idx);
    expect(top).toBe('0');
    await page.keyboard.press('ArrowRight');
    expect(await activeIdx(page)).toBe('0');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(450);
    expect(await enlarged(page)).toEqual([]);
    expect(await selectedIdx(page)).toEqual(['0']);
  });

  test('the dismissed guide card is out of the Tab order, and back when reopened', async ({ page }) => {
    await page.click('#guide-dismiss');
    await page.waitForTimeout(400);
    const stops = [];
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); stops.push(await page.evaluate(() => document.activeElement.id)); }
    expect(stops).not.toContain('guide-dismiss');
    await page.click('#guide-reopen');
    await page.waitForTimeout(400);
    const again = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); again.push(await page.evaluate(() => document.activeElement.id)); }
    expect(again).toContain('guide-dismiss');
  });
});

test.describe('mouse', () => {
  test.beforeEach(async ({ page }) => { await openGallery(page); });

  test('hover outlines, click selects, click again deselects', async ({ page }) => {
    const tile = page.locator('.photo').nth(3);
    await tile.hover();
    await expect(tile).toHaveClass(/hovered/);
    await tile.click();
    expect(await selectedIdx(page)).toEqual(['3']);
    await tile.click();
    expect(await selectedIdx(page)).toEqual([]);
  });

  test('double-click enlarges without selecting, even right after load', async ({ page }) => {
    await page.locator('.photo').nth(7).dblclick();
    await page.waitForTimeout(300);
    expect(await enlarged(page)).toEqual(['7']);
    expect(await selectedIdx(page)).toEqual([]);
  });

  test('clicking the dimmed background closes the enlarged photo', async ({ page }) => {
    await page.locator('.photo').nth(5).dblclick();
    await page.waitForTimeout(300);
    await page.mouse.click(20, 880);
    await page.waitForTimeout(450);
    expect(await enlarged(page)).toEqual([]);
  });

  test('the scroll wheel scrolls the grid', async ({ page }) => {
    await page.locator('.photo').nth(10).hover();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    expect(await scrollTop(page)).toBeGreaterThan(0);
  });
});

test.describe('decorative app frame', () => {
  test.beforeEach(async ({ page }) => { await openGallery(page); });

  test('nothing hidden from screen readers can receive focus', async ({ page }) => {
    const focusable = await page.evaluate(() => [...document.querySelectorAll('[aria-hidden="true"]')]
      .flatMap((h) => [...h.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])')]).length);
    expect(focusable).toBe(0);
  });

  test('sidebar, tabs and top-bar icons look static: arrow cursor, no hover', async ({ page }) => {
    const cursors = await page.evaluate(() => [...document.querySelectorAll('.sidebar-item, .content-tab, .top-icon-btn')].map((e) => getComputedStyle(e).cursor));
    expect(cursors.every((c) => c === 'default' || c === 'auto')).toBe(true);
    const item = page.locator('.sidebar-item').nth(1);
    await item.hover();
    expect(await item.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  });
});

test('reduced motion removes the enlarge animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openGallery(page);
  const duration = await page.evaluate(() => {
    const el = document.querySelector('.photo');
    el.classList.add('previewing', 'still');
    return parseFloat(getComputedStyle(el).transitionDuration);
  });
  expect(duration).toBeLessThan(0.001);
  await context.close();
});
