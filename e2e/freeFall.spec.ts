import { expect, test } from '@playwright/test';

test('starts paused, runs real free fall, measures contact, and resets defaults', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/experiments/free-fall');
  await expect(page.locator('canvas')).toBeVisible();
  const start = page.getByRole('button', { name: 'Start trial' });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('height')).toHaveText('4.50');
  await expect(page.getByTestId('acceleration')).toHaveText('—');
  await start.click();
  await expect(page.getByTestId('contact-time')).not.toHaveText('—');
  expect(
    Math.abs(
      Number(await page.getByTestId('contact-time').textContent()) -
        Math.sqrt(8 / 9.81),
    ),
  ).toBeLessThan(0.03);
  await expect(page.getByTestId('height')).toHaveText('0.50');
  await expect(page.getByTestId('velocity')).toHaveText('0.00');
  await expect(page.getByTestId('acceleration')).toHaveText('0.00');
  await expect(
    page.getByText('Last free-fall sample', { exact: false }),
  ).toBeVisible();
  const contactTime = await page.getByTestId('contact-time').textContent();
  await page.getByRole('button', { name: 'Replay same conditions' }).click();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('contact-time')).toHaveText('—');
  await page.getByLabel('Playback speed').selectOption('2');
  await page.getByRole('button', { name: 'Start trial' }).click();
  await expect(page.getByTestId('contact-time')).toHaveText(contactTime!);
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(start).toBeEnabled();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('height')).toHaveText('4.50');
  await expect(page.getByTestId('contact-time')).toHaveText('—');
  await expect(page.getByTestId('acceleration')).toHaveText('—');
  expect(errors).toEqual([]);
});

test('applies physical parameters, pauses exactly, keeps camera interactive, and resumes', async ({
  page,
}) => {
  await page.goto('/#/experiments/free-fall');
  await page.getByLabel('Gravity magnitude').fill('1.62');
  await page.getByLabel('Release height (center)').fill('10');
  await page.getByLabel('Cube mass').fill('5');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(page.getByTestId('height')).toHaveText('10.00');
  await page.getByRole('button', { name: 'Start trial' }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.2);
  await expect(page.getByTestId('acceleration')).toHaveText('-1.62');
  await page.getByRole('button', { name: 'Pause', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const time = await page.getByTestId('time').textContent();
  const height = await page.getByTestId('height').textContent();
  const canvas = page.locator('canvas');
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 120,
    box.y + box.height / 2 + 20,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  for (const preset of ['Top', 'Front', 'Side', 'Perspective']) {
    const button = page.getByRole('button', { name: preset, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByLabel('Coordinate axes').uncheck();
  await expect(page.getByLabel('Coordinate axes')).not.toBeChecked();
  await page.waitForTimeout(250);
  await expect(page.getByTestId('time')).toHaveText(time!);
  await expect(page.getByTestId('height')).toHaveText(height!);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(Number(time));
  await page.getByLabel('Gravity magnitude').fill('20');
  await expect(page.getByTestId('acceleration')).toHaveText('-1.62');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.getByLabel('Gravity magnitude')).toHaveValue('9.81');
  await expect(page.getByLabel('Cube mass')).toHaveValue('1');
  await expect(page.getByLabel('Coordinate axes')).toBeChecked();
  await expect(page.getByTestId('time')).toHaveText('0.00');
});

test('zero gravity stays at rest while time advances, and invalid settings are rejected', async ({
  page,
}) => {
  await page.goto('/#/experiments/free-fall');
  await page.getByLabel('Gravity magnitude').fill('');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(page.getByRole('alert')).toContainText('within the limits');
  await page.getByLabel('Gravity magnitude').fill('-1');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Gravity magnitude').fill('0');
  await page.getByRole('button', { name: 'Apply & reset trial' }).click();
  await expect(page.getByTestId('predicted-contact')).toHaveText(
    'No fall at g = 0',
  );
  await page.getByRole('button', { name: 'Start trial' }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.3);
  await expect(page.getByTestId('height')).toHaveText('4.50');
  await expect(page.getByTestId('velocity')).toHaveText('0.00');
  await expect(page.getByTestId('acceleration')).toHaveText('0.00');
  await expect(page.getByTestId('contact-time')).toHaveText('—');
});

test('keeps scene, controls, and comparison within a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/experiments/free-fall');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeEnabled({
    timeout: 30_000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
