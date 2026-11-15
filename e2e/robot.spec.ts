import { expect, test } from '@playwright/test';

test('opens the robot separately, catches two weights, and slides the backpack', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  test.setTimeout(60_000);
  await page.goto('/#/labs/rotation', { waitUntil: 'domcontentloaded' });
  for (const lab of [
    'spinning ballet dancer',
    'spinning robot',
    'mass on a string',
    'mass on a spring',
    'person on a turntable',
    'spinning bicycle wheel',
    'gyroscope',
  ]) {
    await expect(
      page.getByRole('link', { name: `Open ${lab}`, exact: false }),
    ).toBeVisible();
  }
  await page.getByRole('link', { name: 'Open spinning robot' }).click();
  await expect(page).toHaveURL(/#\/experiments\/spinning-robot$/);
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
  await page.getByLabel('Playback speed').selectOption('2');
  await mass.fill('3');
  await drop.click();
  await expect(page.getByTestId('robot-load')).toHaveText('5.00', {
    timeout: 15000,
  });
  await page.getByText('Cargo · 2 weights', { exact: true }).click();
  await expect(page.getByTestId('robot-cargo-weight')).toHaveText([
    '2.00 kg',
    '3.00 kg',
  ]);
  await page.getByRole('slider', { name: 'Backpack radius' }).fill('0.75');
  await expect(page.getByTestId('robot-radius')).toHaveText('0.75', {
    timeout: 15000,
  });
  await expect(page.getByTestId('robot-omega')).toHaveText('0.485');
  await expect(page.getByTestId('robot-momentum')).toHaveText('1.800');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Backpack', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Backpack', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
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
  await page.getByRole('link', { name: 'Rotation lab' }).click();
  await page.getByRole('link', { name: 'Open spinning ballet dancer' }).click();
  await expect(
    page.getByRole('heading', { name: 'Spinning ballet dancer' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start spin' })).toBeEnabled({
    timeout: 20000,
  });
  await expect(page.getByTestId('time')).toHaveText('0.00');
});
