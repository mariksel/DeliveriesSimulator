import { expect, test } from '@playwright/test';

test('the application opens without errors, on the runs section', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') {
            const text = message.text();
            errors.push(text);
        }
    });

    await page.goto('/');

    const byRole = page.getByRole('heading', { name: 'Deliveries Simulator' });
    await expect(byRole).toBeVisible();
    const heading = page.getByRole('heading', { name: 'Runs and scenarios' });
    await expect(heading).toBeVisible();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('No run open');
    expect(errors).toEqual([]);
});

test('every section opens from the sidebar, and one not built says so', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Findings' }).click();

    const byRole = page.getByRole('heading', { name: 'Findings' });
    await expect(byRole).toBeVisible();
    const notBuilt = page.getByTestId('not-built');
    await expect(notBuilt).toHaveText('Not built yet');
    const link = page.getByRole('navigation').getByRole('link');
    await expect(link).toHaveCount(10);
});
