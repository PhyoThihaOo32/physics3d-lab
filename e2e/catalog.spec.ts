import { expect, test } from '@playwright/test';

test('navigates from directory to a lab and experiment, then starts a fresh trial after leaving', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Choose a lab. Start exploring.' }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Open motion lab' }).click();
  await expect(page).toHaveURL(/#\/labs\/motion$/);
  await expect(page.getByRole('heading', { name: 'Motion lab' })).toBeVisible();
  await page.getByRole('link', { name: 'Open free fall' }).click();
  await expect(page).toHaveURL(/#\/experiments\/free-fall$/);
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeEnabled({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Start trial' }).click();
  await expect
    .poll(async () => Number(await page.getByTestId('time').textContent()))
    .toBeGreaterThan(0.1);
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Motion lab' })
    .click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Open free fall' }).click();
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeEnabled();
  await expect(page.getByTestId('time')).toHaveText('0.00');
  await expect(page.getByTestId('height')).toHaveText('4.50');
  await expect(page.getByTestId('contact-time')).toHaveText('—');
  expect(errors).toEqual([]);
});

test('planned experiments have honest previews and support direct links, refresh, and browser history', async ({
  page,
}) => {
  await page.goto('/#/labs/vectors');
  await page.getByRole('link', { name: 'View vector operations plan' }).click();
  await expect(page).toHaveURL(/#\/experiments\/vector-lab$/);
  await expect(
    page.getByRole('heading', { name: 'Vector operations', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('The simulation is not available yet.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start trial' })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Vector operations', exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Vectors lab', exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: 'Vector operations', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Physics3D Lab home' }).click();
  await expect(
    page.getByRole('heading', { name: 'Choose a lab. Start exploring.' }),
  ).toBeVisible();
  for (const lab of ['vectors']) {
    await page.goto(`/#/labs/${lab}`);
    await expect(
      page.getByRole('link', { name: /View .* plan/ }),
    ).toBeVisible();
  }
});

test('handles missing routes and keeps directory navigation usable on mobile', async ({
  page,
}) => {
  await page.goto('/#/experiments/missing');
  await expect(
    page.getByRole('heading', { name: 'Let’s get back to the lab.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Return to all labs' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('link', { name: 'Open motion lab' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Open motion lab' }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('keyboard users can skip the header without changing the current route', async ({
  page,
}) => {
  await page.goto('/#/labs/rotation');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page).toHaveURL(/#\/labs\/rotation$/);
  await expect(
    page.getByRole('heading', { name: 'Rotation lab', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Physics3D Lab home' }),
  ).not.toBeFocused();
});
