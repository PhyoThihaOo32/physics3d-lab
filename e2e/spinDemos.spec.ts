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
  const pull = page.getByRole('button', { name: 'Pull string' });
  await expect(pull).toBeDisabled();
  await page.getByRole('button', { name: 'Start spin' }).click();
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
