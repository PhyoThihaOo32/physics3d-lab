import { expect, test } from '@playwright/test';

const route = '/#/experiments/vector-lab';

test('adds, subtracts and scales vectors with a live result on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const result = page.getByTestId('vector-result');
  await expect(result).toHaveText('⟨4, 2, 1⟩');
  await page.getByRole('button', { name: 'Subtract', exact: true }).click();
  await expect(result).toHaveText('⟨2, -2, -1⟩');
  const bz = page.getByRole('spinbutton', { name: 'Bz', exact: true });
  await bz.fill('');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Scale', exact: true }).click();
  await expect(bz).toHaveCount(0);
  await expect(result).toHaveText('⟨6, 0, 0⟩');
  const scalar = page.getByRole('spinbutton', { name: 'Scalar multiplier k' });
  await page.getByRole('spinbutton', { name: 'Ay', exact: true }).fill('2');
  await scalar.fill('-0.5');
  await expect(result).toHaveText('⟨-1.5, -1, 0⟩');
  await scalar.fill('0');
  await expect(result).toHaveText('⟨0, 0, 0⟩');
  await scalar.fill('1001');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(result).toHaveCount(0);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(bz).toHaveValue('');
  await bz.fill('1');
  await expect(result).toHaveText('⟨4, 4, 1⟩');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});

test('shows scalar dot results and reverses the cross product when operands swap', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Cross', exact: true }).click();
  await page.getByText('Examples', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Perpendicular', exact: true })
    .click();
  const result = page.getByTestId('vector-result');
  await expect(result).toHaveText('⟨0, 0, 4⟩');
  const canvas = page.locator('canvas');
  const before = await canvas.screenshot();
  await page.getByRole('button', { name: 'Swap A and B' }).click();
  await expect(result).toHaveText('⟨0, 0, -4⟩');
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  await page.getByText('Steps', { exact: true }).click();
  await expect(
    page.getByText('Area = |A × B| = 4', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dot', exact: true }).click();
  await expect(result).toHaveText('0');
  await expect(page.getByLabel('Scalar result', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Parallel', exact: true }).click();
  await expect(result).toHaveText('6');
  await page.getByRole('button', { name: 'Opposite', exact: true }).click();
  await expect(result).toHaveText('-4');
  await page.getByRole('button', { name: 'Zero vector', exact: true }).click();
  await expect(result).toHaveText('0');
  await page.getByText('Steps', { exact: true }).click();
  await expect(page.getByText('θ', { exact: true }).locator('..')).toHaveText(
    'θUndefined',
  );
  expect(errors).toEqual([]);
});
