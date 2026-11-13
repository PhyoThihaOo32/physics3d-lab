import { expect, test } from '@playwright/test';

const url = '/#/experiments/projectile-motion';
test('launches, records correct landing results, and reproduces them at a different playback speed', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: 'Launch', exact: false }),
  ).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('projectile-ay')).toHaveText('—');
  await page.getByRole('button', { name: 'Launch', exact: false }).click();
  await expect(page.getByTestId('flight-status')).toHaveText('Landed');
  const flight = Number(await page.getByTestId('flight-time').textContent());
  const range = Number(await page.getByTestId('flight-range').textContent());
  expect(Math.abs(flight - 1.571)).toBeLessThan(0.03);
  expect(Math.abs(range - 11.111)).toBeLessThan(0.22);
  expect(
    Math.abs(
      Number(await page.getByTestId('flight-max-height').textContent()) - 3.548,
    ),
  ).toBeLessThan(0.05);
  await expect(page.getByTestId('projectile-vx')).toHaveText('7.07');
  await expect(page.getByTestId('projectile-ax')).toHaveText('0.00');
  await expect(page.getByTestId('projectile-ay')).toHaveText('-9.81');
  await expect(
    page.getByRole('button', { name: 'Trial complete' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Replay same conditions' }).click();
  await expect(page.getByTestId('flight-time')).toHaveText('—');
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Launch', exact: false }).click();
  await expect(page.getByTestId('flight-status')).toHaveText('Landed');
  expect(Number(await page.getByTestId('flight-time').textContent())).toBe(
    flight,
  );
  expect(Number(await page.getByTestId('flight-range').textContent())).toBe(
    range,
  );
  expect(errors).toEqual([]);
});

test('supports a ground-level vertical launch, exact pause, camera inspection, and reset', async ({
  page,
}) => {
  await page.goto(url);
  await page
    .getByRole('spinbutton', { name: 'Launch angle', exact: true })
    .fill('90');
  await page.getByLabel('Launch height h₀').fill('0');
  await page.getByLabel('Sphere mass').fill('5');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(
    page.getByRole('button', { name: 'Launch', exact: false }),
  ).toBeEnabled();
  await page.getByLabel('Playback speed').selectOption('0.25');
  await page.getByRole('button', { name: 'Launch', exact: false }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Pause', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const time = await page.getByTestId('time').textContent();
  const height = await page.getByTestId('projectile-height').textContent();
  await expect(page.getByTestId('projectile-vx')).toHaveText('0.00');
  await expect(page.getByTestId('projectile-x')).toHaveText('0.00');
  const canvas = page.locator('canvas');
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  for (const preset of ['Top', 'Front', 'Side', 'Perspective']) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    await expect(
      page.getByRole('button', { name: preset, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  for (const label of [
    'Velocity v',
    'Components vₓ / vᵧ',
    'Gravity g',
    'Predicted path',
    'Measured trail',
  ])
    await page.getByLabel(label, { exact: true }).uncheck();
  await page.waitForTimeout(200);
  await expect(page.getByTestId('time')).toHaveText(time!);
  await expect(page.getByTestId('projectile-height')).toHaveText(height!);
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByTestId('flight-status')).toHaveText('Landed');
  expect(
    Number(await page.getByTestId('flight-time').textContent()),
  ).toBeGreaterThan(2);
  expect(
    Number(await page.getByTestId('flight-range').textContent()),
  ).toBeCloseTo(0, 3);
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Launch angle', exact: true }),
  ).toHaveValue('45');
  await expect(page.getByLabel('Sphere mass')).toHaveValue('1');
  await expect(page.getByLabel('Playback speed')).toHaveValue('1');
  await expect(
    page.getByLabel('Measured trail', { exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('flight-time')).toHaveText('—');
});

test('validates settings and handles zero gravity without inventing a landing', async ({
  page,
}) => {
  await page.goto(url);
  await page.getByLabel('Gravity magnitude').fill('');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter all values.');
  await page.getByLabel('Gravity magnitude').fill('0.5');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 20');
  await page.getByLabel('Gravity magnitude').fill('0');
  await page
    .getByRole('spinbutton', { name: 'Launch speed', exact: true })
    .fill('6');
  await page
    .getByRole('spinbutton', { name: 'Launch angle', exact: true })
    .fill('30');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Launch', exact: false }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.2);
  await expect(page.getByTestId('projectile-ay')).toHaveText('0.00');
  await expect(page.getByTestId('projectile-vy')).toHaveText('3.00');
  await expect(page.getByTestId('projectile-speed')).toHaveText('6.00');
  await expect(page.getByTestId('flight-status')).toHaveText(
    'Observation complete',
    { timeout: 15_000 },
  );
  await expect(page.getByTestId('time')).toHaveText('10.00');
  await expect(page.getByTestId('flight-time')).toHaveText('—');
  await expect(page.getByTestId('flight-range')).toHaveText('—');
});

test('opens from the lab, preserves narrow-screen layout, and clears experiment state on re-entry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/labs/motion');
  await page.getByRole('link', { name: 'Open projectile motion' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Launch', exact: false }),
  ).toBeEnabled({ timeout: 30_000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Launch', exact: false }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.1);
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Motion lab' })
    .click();
  await page.getByRole('link', { name: 'Open projectile motion' }).click();
  await expect(
    page.getByRole('button', { name: 'Launch', exact: false }),
  ).toBeEnabled();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('projectile-height')).toHaveText('1.00');
});
