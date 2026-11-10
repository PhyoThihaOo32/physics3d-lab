import { expect, test } from '@playwright/test';

for (const experiment of [
  {
    id: 'free-fall',
    start: 'Start trial',
    height: 'height',
    parameter: 'Cube mass',
    nextValue: '1.1',
  },
  {
    id: 'projectile-motion',
    start: 'Launch',
    height: 'projectile-height',
    parameter: 'Sphere mass',
    nextValue: '1.1',
  },
  {
    id: 'angular-momentum',
    start: 'Start spin',
    height: 'inertia',
    parameter: /Initial angular velocity/,
    nextValue: '2.1',
  },
]) {
  test(`${experiment.id}: keyboard pans the focused view, preserves physics, and leaves inputs usable`, async ({
    page,
  }) => {
    // Multiple WebGL screenshots are slower on CI's software graphics renderer.
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/#/experiments/${experiment.id}`);
    await expect(
      page.getByRole('button', { name: experiment.start, exact: false }),
    ).toBeEnabled({ timeout: 30_000 });
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    await canvas.click();
    await expect(canvas).toBeFocused();
    const height = await page.getByTestId(experiment.height).textContent();
    let before = await canvas.screenshot();
    const scroll = await page.evaluate(() => window.scrollY);
    for (const key of [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      '<',
      '>',
    ]) {
      await page.keyboard.press(key, { delay: 60 });
      expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
      const previous = before;
      await expect
        .poll(async () => (await canvas.screenshot()).equals(previous))
        .toBe(false);
      before = await canvas.screenshot();
      await expect(page.getByTestId('time')).toHaveText('0.00');
      await expect(page.getByTestId(experiment.height)).toHaveText(height!);
    }
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(180);
    await page.keyboard.press('Escape');
    await page.keyboard.up('ArrowRight');
    await expect(canvas).not.toBeFocused();
    await expect(page.getByTestId('time')).toHaveText('0.00');
    const setting = page.getByRole('spinbutton', {
      name: experiment.parameter,
      exact: true,
    });
    await setting.focus();
    const stopped = await canvas.screenshot();
    await setting.press('ArrowUp');
    await expect(setting).toHaveValue(experiment.nextValue);
    await page.waitForTimeout(150);
    expect((await canvas.screenshot()).equals(stopped)).toBe(true);
    await expect(page.getByTestId(experiment.height)).toHaveText(height!);
    await page
      .getByRole('button', { name: 'Perspective', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Perspective', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await canvas.focus();
    await expect(canvas).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(canvas).not.toBeFocused();
    expect(errors).toEqual([]);
  });
}
