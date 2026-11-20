import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** Opens the one-order scenario and runs it to its end. */
async function ranOneOrder(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

/** Saves the run being watched under a name, at a level, from the run controls. */
async function saved(page: Page, name: string, level: string): Promise<void> {
    await page.getByTestId('save-open').click();
    const form = page.getByTestId('save-form');
    await form.getByTestId('save-name').fill(name);
    await form.getByTestId('save-level').selectOption(level);
    await form.getByTestId('save-run').click();
    const savedAs = page.getByTestId('saved-as');
    await expect(form).toHaveCount(0);
    await expect(savedAs).toHaveText(`Saved as “${name}”`);
}

test('a run saved from the run controls is stored in the browser under its name', async ({
    page,
}) => {
    await ranOneOrder(page);

    await saved(page, 'My one order', 'Minimum');

    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
});

test('a saved run is listed with its size, and opens like a live run, with the same timeline', async ({
    page,
}) => {
    await ranOneOrder(page);
    const slider = page.getByTestId('place-slider');
    const latest = await slider.getAttribute('max');
    const events = await page.getByTestId('status-events').textContent();
    await saved(page, 'Kept', 'Minimum');

    await page.getByRole('link', { name: 'Runs and scenarios' }).click();
    const row = page.getByTestId('saved-run');
    const savedName = row.getByTestId('saved-run-name');
    const savedDetails = row.getByTestId('saved-run-details');
    await expect(savedName).toHaveText('Kept');
    await expect(savedDetails).toContainText('Minimum ·');
    await row.getByTestId('saved-run-open').click();

    const statusState = page.getByTestId('status-state');
    const statusEvents = page.getByTestId('status-events');
    await expect(statusState).toHaveText('Ended');
    await expect(slider).toHaveAttribute('max', latest ?? '');
    await expect(statusEvents).toHaveText(events ?? '');
});

test('opening over a run with changes not saved asks first', async ({ page }) => {
    await ranOneOrder(page);
    await saved(page, 'First', 'Everything');
    await page.getByTestId('state-indirect').click();
    const indirectForm = page.getByTestId('indirect-form');
    await indirectForm.getByTestId('indirect-kind').selectOption('customer-wont-take-order');
    await indirectForm.getByTestId('indirect-state').click();
    await expect(indirectForm).toHaveCount(0);

    await page.getByRole('link', { name: 'Runs and scenarios' }).click();
    await page.getByTestId('saved-run-open').click();

    const confirm = page.getByTestId('saved-run-confirm');
    await expect(confirm).toContainText('not saved');
    await page.getByTestId('saved-run-confirm-yes').click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
});

test('deleting a fork of a saved run takes it from the saved run too, and watches Main', async ({
    page,
}) => {
    await ranOneOrder(page);
    await page.getByTestId('place-slider').fill('40');
    await page.getByTestId('fork-here').click();
    const headings = page.getByTestId('branch-heading');
    await expect(headings).toHaveCount(2);
    await saved(page, 'With a fork', 'Everything');
    const mainDelete = headings.first().getByTestId('branch-delete');
    await expect(mainDelete).toHaveCount(0);

    await headings.last().getByTestId('branch-delete').click();
    const confirm = page.getByTestId('branch-delete-confirm');
    await expect(confirm).toContainText('Delete Fork 1 and its own commits?');
    await page.getByTestId('branch-delete-yes').click();

    const current = page.locator('[data-testid="branch-heading"].is-current');
    await expect(headings).toHaveCount(1);
    await expect(current).toContainText('Main');
    await page.getByRole('link', { name: 'Runs and scenarios' }).click();
    const details = page.getByTestId('saved-run-details');
    await expect(details).toContainText('· 1 branch ·');
    await page.getByTestId('saved-run-open').click();
    const confirmOpen = page.getByTestId('saved-run-confirm');
    await expect(headings).toHaveCount(1);
    await expect(confirmOpen).toHaveCount(0);
});

test('a snapshot test of a saved run finds every commit the same, both ways', async ({ page }) => {
    await ranOneOrder(page);
    await saved(page, 'Tested', 'Minimum');

    await page.getByRole('link', { name: 'Runs and scenarios' }).click();
    await page.getByTestId('saved-run-snapshot').click();

    const result = page.getByTestId('saved-run-snapshot-result');
    await expect(result).toContainText(/With its own versions: all \d+ state commits match\./);
    await expect(result).toContainText(/With the newest versions: all \d+ state commits match\./);
});
