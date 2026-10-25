// Photos load lazily over a gradient placeholder, sharpen when enlarged,
// and fall back to the gradient when the photo service is unreachable.
const { test, expect } = require('@playwright/test');
const { openGallery } = require('./helpers');

test('tiles load fixed-seed photos, marked for lazy loading', async ({ page }) => {
  const requested = [];
  page.on('request', (r) => { if (/picsum\.photos/.test(r.url())) requested.push(r.url()); });
  await openGallery(page, { photos: 'stub' });
  await page.waitForTimeout(800);
  expect(await page.locator('.tile-img.loaded').count()).toBeGreaterThan(30);
  // How far ahead lazy images preload is the browser's call, so check the hint, not a count.
  expect(await page.locator('.tile-img:not([loading="lazy"])').count()).toBe(0);
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.every((u) => /seed\/gesture-gallery-\d+\/400\/400/.test(u))).toBe(true);
});

test('an enlarged photo switches to a sharper 1200px copy', async ({ page }) => {
  await openGallery(page, { photos: 'stub' });
  await page.locator('.photo').nth(1).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  expect(await page.locator('[data-idx="1"] .tile-img').getAttribute('src')).toMatch(/\/1200\/1200$/);
});

test('offline: failed photos are removed and the gradient tiles remain', async ({ page }) => {
  await openGallery(page, { photos: 'offline' });
  await page.waitForTimeout(800);
  expect(await page.locator('.tile-img').count()).toBeLessThan(200);
  const bg = await page.locator('.photo').first().evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(bg).toContain('gradient');
  expect(page.errors).toEqual([]);
});
