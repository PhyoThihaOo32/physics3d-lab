import { expect, test } from '@playwright/test';

const route = '/#/experiments/vector-lab';

test('compares live products, reverses the normal, and handles degenerate inputs', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page
    .getByRole('button', { name: 'Perpendicular', exact: true })
    .click();
  const cross = page.getByTestId('vector-cross');
  const dot = page.getByTestId('vector-dot');
  const angle = page.getByTestId('vector-angle');
  await expect(angle).toHaveText('90°');
  await expect(dot).toHaveText('0');
  await expect(cross).toHaveText('⟨0, 0, 4⟩');
  await expect(
    page.getByText('Parallelogram area', { exact: true }).locator('..'),
  ).toHaveText('Parallelogram area4');
  const canvas = page.locator('canvas');
  const before = await canvas.screenshot();
  await page.getByRole('button', { name: 'Swap A and B' }).click();
  await expect(cross).toHaveText('⟨0, 0, -4⟩');
  await expect(
    page.getByRole('spinbutton', { name: 'Ay', exact: true }),
  ).toHaveValue('2');
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Top', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Parallel', exact: true }).click();
  await expect(angle).toHaveText('0°');
  await expect(dot).toHaveText('6');
  await expect(cross).toHaveText('⟨0, 0, 0⟩');
  await page.getByRole('button', { name: 'Opposite', exact: true }).click();
  await expect(angle).toHaveText('180°');
  await expect(dot).toHaveText('-4');
  await page.getByRole('button', { name: 'Zero vector', exact: true }).click();
  await expect(angle).toHaveText('Undefined');
  await expect(dot).toHaveText('0');
  await page.getByRole('spinbutton', { name: 'Bz', exact: true }).fill('2');
  await expect(cross).toHaveText('⟨0, -4, 0⟩');
  await page.getByRole('spinbutton', { name: 'Bz', exact: true }).fill('');
  await expect(page.getByRole('alert')).toContainText('Enter a finite value');
  await expect(cross).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('connects vector operations to physics applications on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(route);
  const application = page.getByLabel('Physics application');
  const result = page.getByTestId('vector-application-result');
  await application.selectOption('work');
  await expect(result).toHaveText('6 J');
  await page.getByRole('spinbutton', { name: 'dx', exact: true }).fill('-2');
  await expect(result).toHaveText('-6 J');
  await application.selectOption('power');
  await expect(result).toHaveText('6 W');
  await application.selectOption('torque');
  await expect(result).toHaveText('⟨0, 0, 6⟩ N·m');
  await application.selectOption('particle');
  await expect(result).toHaveText('⟨0, -4, 4⟩ kg·m²/s');
  await page.getByRole('spinbutton', { name: 'Particle mass (kg)' }).fill('3');
  await expect(result).toHaveText('⟨0, -6, 6⟩ kg·m²/s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});
