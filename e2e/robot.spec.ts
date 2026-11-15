import { expect, test } from '@playwright/test';

test('groups backpack loads into visible blocks and removes their angular momentum', async ({
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
  const target = page.getByRole('slider', { name: 'Target load' });
  const omega = page.getByTestId('robot-omega');
  const load = page.getByTestId('robot-load');
  const blocks = page.getByTestId('robot-cargo-weight');
  const action = (name: string) =>
    page.getByRole('button', { name, exact: true });
  await expect(
    page.getByRole('slider', { name: 'Backpack radius' }),
  ).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Drop height' })).toHaveCount(
    0,
  );
  await target.fill('2');
  await expect(action('Add 2.0 kg')).toBeDisabled();
  await expect(omega).toHaveText('2.000');
  await page.getByLabel('Playback speed').selectOption('0.1');
  await page.getByRole('button', { name: 'Start spin' }).click();
  await action('Add 2.0 kg').click();
  await expect(page.getByText('Load falling', { exact: true })).toBeVisible();
  await expect(load).toHaveText('0.00');
  await expect(omega).toHaveText('2.000');
  await expect(target).toBeDisabled();
  await expect(load).toHaveText('2.00', { timeout: 15000 });
  await expect(omega).toHaveText('1.323');
  await expect(blocks).toHaveText(['2.0 kg']);

  await page.getByLabel('Playback speed').selectOption('2');
  await target.fill('4.5');
  await action('Add 2.5 kg').click();
  await expect(blocks).toHaveText(['4.5 kg']);
  await target.fill('5.5');
  await action('Add 1.0 kg').click();
  await expect(blocks).toHaveText(['5.0 kg', '0.5 kg']);
  await target.fill('12.5');
  await action('Add 7.0 kg').click();
  await expect(blocks).toHaveText(['5.0 kg', '5.0 kg', '2.5 kg']);
  await expect(omega).toHaveText('0.476');
  await expect(page.getByTestId('robot-momentum')).toHaveText('1.800');

  await page.getByLabel('Playback speed').selectOption('0.25');
  await target.fill('7.5');
  await action('Remove 5.0 kg').click();
  await expect(page.getByText('Lifting load', { exact: true })).toBeVisible();
  await expect(omega).toHaveText('0.476');
  await expect(load).toHaveText('7.50', { timeout: 15000 });
  await expect(blocks).toHaveText(['5.0 kg', '2.5 kg']);
  await expect(omega).toHaveText('0.476');
  await expect(page.getByTestId('robot-momentum')).toHaveText('1.251');
  await expect(page.getByTestId('robot-capture')).toContainText(
    '5.0 kg removed',
  );
  await page.getByLabel('Playback speed').selectOption('2');
  await target.fill('0');
  await action('Remove 7.5 kg').click();
  await expect(load).toHaveText('0.00');
  await expect(blocks).toHaveCount(0);
  await expect(omega).toHaveText('0.476');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Backpack', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Backpack', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(action('Set load')).toBeDisabled();
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
