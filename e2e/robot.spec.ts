import { expect, test } from '@playwright/test';

test('switches models and observes the backpack capture at slow playback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/experiments/angular-momentum', {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name: 'Robot', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Spinning robot' }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  const drop = page.getByRole('button', { name: 'Drop load' });
  const omega = page.getByTestId('robot-omega');
  await expect(drop).toBeDisabled();
  await expect(omega).toHaveText('2.000');
  await page.getByLabel('Playback speed').selectOption('0.1');
  await page.getByRole('button', { name: 'Start spin' }).click();
  const mass = page.getByLabel('Load to drop');
  await mass.fill('6');
  await expect(drop).toBeDisabled();
  await mass.fill('2');
  await drop.click();
  await expect(page.getByText('Load falling', { exact: true })).toBeVisible();
  await expect(page.getByTestId('robot-load')).toHaveText('0.00');
  await expect(omega).toHaveText('2.000');
  await expect(drop).toBeDisabled();
  await expect(page.getByTestId('robot-capture')).toContainText(
    '2.000 → 1.323 rad/s',
    { timeout: 15000 },
  );
  await expect(page.getByTestId('robot-load')).toHaveText('2.00');
  await expect(page.getByTestId('robot-inertia')).toHaveText('1.361');
  await expect(page.getByTestId('robot-momentum')).toHaveText('1.800');
  await expect(omega).toHaveText('1.323');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(drop).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.getByTestId('robot-load')).toHaveText('0.00');
  await expect(page.getByTestId('robot-capture')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start spin' }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Dancer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Spinning ballet dancer' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled({
    timeout: 20000,
  });
  await expect(page.getByTestId('time')).toHaveText('0.00');
});
