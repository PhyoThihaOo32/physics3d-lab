import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.setTimeout(90_000);
async function number(page: import('@playwright/test').Page, id: string) {
  return Number(await page.getByTestId(id).textContent());
}
test('articulated dancer conserves momentum, records comparisons, exports and resets', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/#/labs/rotation');
  await page.getByRole('link', { name: 'Open spinning ballet dancer' }).click();
  await expect(
    page.getByRole('heading', { name: 'Spinning ballet dancer', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled({
    timeout: 30_000,
  });
  await page.screenshot({
    path: 'test-results/dancer-initial.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Record paused sample' }).click();
  await page.getByLabel('Playback speed').selectOption('2');
  const initialL = await number(page, 'momentum');
  await page.getByRole('button', { name: 'Arms in', exact: true }).click();
  await page.getByRole('button', { name: 'Start spin' }).click();
  await expect
    .poll(() => number(page, 'time'), { timeout: 40_000 })
    .toBeGreaterThan(3.6);
  await page.getByRole('button', { name: /^Ⅱ Pause$/ }).click();
  expect(await number(page, 'omega')).toBeGreaterThan(3.7);
  expect(await number(page, 'omega')).toBeLessThan(4.2);
  expect(await number(page, 'momentum')).toBeCloseTo(initialL, 1);
  expect(
    parseFloat(
      (await page.getByTestId('spin-energy-change').textContent()) ?? '0',
    ),
  ).toBeGreaterThan(4);
  await page.getByRole('button', { name: 'Record paused sample' }).click();
  await expect(
    page
      .getByRole('table', { name: 'Recorded dancer measurements' })
      .locator('tbody tr'),
  ).toHaveCount(2);
  await page.screenshot({
    path: 'test-results/dancer-tucked.png',
    fullPage: true,
  });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trial CSV' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('dancer-trial.csv');
  const csv = await readFile((await download.path())!, 'utf8');
  const lines = csv.trim().split('\n');
  expect(lines[0]).toContain('expected_momentum_kg_m2_s');
  expect(lines.length).toBeGreaterThan(30);
  expect(Number(lines[1].split(',')[0])).toBe(0);
  expect(Number(lines.at(-1)!.split(',')[3])).toBeGreaterThan(3.7);
  await page.getByRole('button', { name: 'Arms out', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect
    .poll(() => number(page, 'time'), { timeout: 40_000 })
    .toBeGreaterThan(7);
  await page.getByRole('button', { name: /^Ⅱ Pause$/ }).click();
  expect(await number(page, 'omega')).toBeCloseTo(2, 1);
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('omega')).toHaveText('2.000');
  await expect(
    page.getByText('No samples recorded yet.', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Rotation lab' })
    .click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Open spinning ballet dancer' }).click();
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  expect(errors).toEqual([]);
});
test('validates trial settings and keeps zero-spin controls usable on mobile', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/experiments/angular-momentum');
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled({
    timeout: 30_000,
  });
  const input = page.getByLabel('Initial angular velocity', { exact: false });
  await input.fill('4');
  await page.getByRole('button', { name: 'Apply & start fresh trial' }).click();
  await expect(page.getByRole('alert')).toContainText('between −3 and 3');
  await input.fill('0');
  await page.getByRole('button', { name: 'Apply & start fresh trial' }).click();
  await expect(page.getByTestId('omega')).toHaveText('0.000');
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled();
  await page.getByRole('button', { name: 'Arms in', exact: true }).click();
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Start spin' }).click();
  await expect
    .poll(() => number(page, 'time'), { timeout: 40_000 })
    .toBeGreaterThan(3);
  await page.getByRole('button', { name: /^Ⅱ Pause$/ }).click();
  expect(Math.abs(await number(page, 'omega'))).toBeLessThan(0.002);
  await page.getByLabel('Support model').selectOption('resistance');
  await input.fill('2');
  await page.getByRole('button', { name: 'Apply & start fresh trial' }).click();
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled();
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Start spin' }).click();
  await expect
    .poll(() => number(page, 'time'), { timeout: 40_000 })
    .toBeGreaterThan(2);
  await page.getByRole('button', { name: /^Ⅱ Pause$/ }).click();
  expect(await number(page, 'momentum')).toBeLessThan(4.4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/dancer-mobile.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
