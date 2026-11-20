import { expect, test } from '@playwright/test';

const OPEN_DEMONSTRATION = 'Open: Demonstration: a busy lunch';

test('the start page lists the demonstration first, before the one-order scenario', async ({
    page,
}) => {
    await page.goto('/');

    const opens = page.getByRole('button', { name: /^Open: / });
    const first = opens.first();
    const second = opens.nth(1);
    await expect(first).toHaveAccessibleName(OPEN_DEMONSTRATION);
    await expect(second).toHaveAccessibleName('Open: One order, happy path');
});

test('the demonstration opens on its city, runs to its end, and passes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: OPEN_DEMONSTRATION }).click();
    const restaurants = page.getByTestId('map-Restaurant');
    const drivers = page.getByTestId('map-Driver');
    await expect(restaurants).toHaveCount(4);
    await expect(drivers).toHaveCount(10);

    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();

    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toHaveText('Passed');
    const delivered = page.getByTestId('map-Delivered');
    await expect(delivered).toHaveCount(10);
});
