import { expect, test } from '@playwright/test';

const route = '/#/experiments/angular-momentum';

test('pulls the puck to the slide radius and reaches the predicted speed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Mass on a string', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Mass on a string' }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Top', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('string-speed')).toHaveText('2.40');
  await expect(page.getByText('Expected vₜ at target 4.00 m/s')).toBeVisible();
  const viewport = page.getByRole('region', {
    name: 'Puck on a frictionless tabletop',
  });
  const vectors = viewport.getByRole('button', {
    name: 'Vectors',
    exact: true,
  });
  await vectors.click();
  await expect(vectors).toHaveAttribute('aria-pressed', 'false');
  await vectors.click();
  await expect(vectors).toHaveAttribute('aria-pressed', 'true');
  const pull = page.getByRole('button', { name: 'Pull string' });
  await expect(pull).toBeDisabled();
  await viewport.getByRole('button', { name: 'Start spin' }).click();
  await pull.click();
  await expect(page.getByText('Pulling string', { exact: true })).toBeVisible();
  await expect(page.getByTestId('string-speed')).toHaveText('4.00', {
    timeout: 15000,
  });
  await expect(page.getByText('Circling', { exact: true })).toBeVisible();
  await expect(page.getByTestId('string-radius')).toHaveText('0.48');
  await expect(page.getByTestId('string-omega')).toHaveText('8.33');
  await expect(page.getByTestId('string-momentum')).toHaveText('1.920');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.getByTestId('string-radius')).toHaveText('0.80');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test('turntable reverses both angular momentum arrows and preserves their sum', async ({
  page,
}) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Person on a turntable', exact: true })
    .click();
  await expect(page.getByTestId('person-direction')).toHaveText('No direction');
  await page.getByRole('button', { name: 'Start walking' }).click();
  await expect(page.getByTestId('person-momentum')).toHaveText('60.00', {
    timeout: 15000,
  });
  await expect(page.getByTestId('person-direction')).toHaveText('↑ Up');
  await expect(page.getByTestId('platform-direction')).toHaveText('↓ Down');
  await expect(page.getByTestId('platform-momentum')).toHaveText('-60.00');
  await page.getByRole('button', { name: 'Clockwise', exact: true }).click();
  await expect(page.getByTestId('person-momentum')).toHaveText('-60.00', {
    timeout: 15000,
  });
  await expect(page.getByTestId('person-direction')).toHaveText('↓ Down');
  await expect(page.getByTestId('platform-direction')).toHaveText('↑ Up');
  await expect(page.getByTestId('platform-momentum')).toHaveText('60.00');
  await expect(page.getByTestId('turntable-total')).toHaveText('0.00');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await page.getByLabel('Platform inertia').selectOption('240');
  await page.getByRole('button', { name: 'Start walking' }).click();
  await expect(page.getByTestId('platform-omega')).toHaveText('-0.30', {
    timeout: 15000,
  });
  await expect(page.getByTestId('person-omega')).toHaveText('1.20');
  await expect(page.getByTestId('turntable-total')).toHaveText('0.00');
  await page.getByRole('button', { name: 'Robot', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Spinning robot' }),
  ).toBeVisible();
  await expect(page.getByTestId('time')).toHaveText('0.00');
});

test('flips the bicycle wheel, measures the platform response, and flips it back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Bicycle wheel', exact: true })
    .click();
  await expect(page.locator('canvas')).toBeVisible();
  const spin = page.getByRole('slider', { name: 'Initial wheel spin' });
  const flip = page.getByRole('button', { name: 'Flip wheel', exact: true });
  await expect(flip).toBeDisabled();
  await spin.fill('25');
  await expect(page.getByTestId('wheel-total')).toHaveText('4.00');
  await expect(page.getByTestId('wheel-momentum')).toHaveText('4.00');
  await expect(page.getByTestId('wheel-support-omega')).toHaveText('0.00');
  await page.getByRole('button', { name: 'Start wheel' }).click();
  await expect(spin).toBeDisabled();
  await flip.click();
  await expect(page.getByText('Flipping', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Wheel spin points down', { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('wheel-tilt')).toHaveText('180°');
  await expect(page.getByTestId('wheel-momentum')).toHaveText('-3.79');
  await expect(page.getByTestId('wheel-support-momentum')).toHaveText('7.79');
  await expect(page.getByTestId('wheel-support-omega')).toHaveText('1.30');
  await expect(page.getByTestId('wheel-total')).toHaveText('4.00');
  await page.getByRole('button', { name: 'Flip back', exact: true }).click();
  await expect(
    page.getByText('Wheel spin points up', { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('wheel-support-omega')).toHaveText('0.00');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(spin).toHaveValue('20');
  await expect(page.getByTestId('wheel-total')).toHaveText('3.20');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test('compares stopped and opposite spinning wheel responses to the same lift', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Gyroscope', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  const lift = page.getByRole('button', { name: 'Try lifting' });
  const complete = page.getByText('Lift complete', { exact: true });
  const rise = page.getByTestId('gyro-rise');
  const swerve = page.getByTestId('gyro-swerve');
  const impulse = page.getByTestId('gyro-impulse');
  await lift.click();
  await expect(complete).toBeVisible({ timeout: 12000 });
  await expect(swerve).toHaveText('13.8');
  await expect(impulse).toHaveText('1.00');
  await lift.click();
  await expect(complete).toBeVisible({ timeout: 12000 });
  await expect(swerve).toHaveText('13.8');
  await page.getByRole('button', { name: 'Stopped', exact: true }).click();
  await expect(swerve).toHaveText('0.0');
  await lift.click();
  await expect(complete).toBeVisible({ timeout: 12000 });
  await expect(rise).toHaveText('47.7');
  await expect(impulse).toHaveText('1.00');
  await page.getByRole('button', { name: 'Reverse spin', exact: true }).click();
  await lift.click();
  await expect(complete).toBeVisible({ timeout: 12000 });
  await expect(swerve).toHaveText('-13.8');
  await expect(impulse).toHaveText('1.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
