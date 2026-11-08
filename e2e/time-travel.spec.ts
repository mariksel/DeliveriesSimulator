import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function ranToTheEnd(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    // Down to the commits, which these tests pick out (FND-87).
    await page.getByTestId('zoom-Commits').click();
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

/** The run's latest place, from the slider's maximum. */
async function latestPlace(page: Page): Promise<number> {
    const slider = page.getByTestId('place-slider');
    const max = await slider.getAttribute('max');
    return Number(max);
}

test('Back shows the commit before, and Forward the latest again', async ({ page }) => {
    await ranToTheEnd(page);
    const latest = await latestPlace(page);

    await page.getByTestId('back').click();

    const place = page.getByTestId('status-place');
    await expect(place).toHaveText(`Commit ${latest - 1} of ${latest}`);
    const start = page.getByTestId('start');
    await expect(start).toBeDisabled();
    await page.getByTestId('forward').click();
    await expect(place).toHaveCount(0);
});

test('the slider shows any commit, and Latest returns', async ({ page }) => {
    await ranToTheEnd(page);
    const latest = await latestPlace(page);

    await page.getByTestId('place-slider').fill('0');

    const place = page.getByTestId('status-place');
    await expect(place).toHaveText(`Commit 0 of ${latest}`);
    const events = page.getByTestId('status-events');
    await expect(events).toHaveText('0');
    const time = page.getByTestId('status-time');
    await expect(time).toHaveText('h00:m00:s00:ms00');
    await page.getByTestId('latest').click();
    await expect(place).toHaveCount(0);
});

test('a step can be a whole job run or API call', async ({ page }) => {
    await ranToTheEnd(page);
    const latest = await latestPlace(page);
    const byGroup = page.getByTestId('step-by-group');

    await byGroup.click();
    await page.getByTestId('back').click();
    await page.getByTestId('back').click();

    await expect(byGroup).toHaveAttribute('aria-pressed', 'true');
    const slider = page.getByTestId('place-slider');
    const value = await slider.inputValue();
    const place = Number(value);
    expect(place).toBeLessThanOrEqual(latest - 2);
});

test('Repeat from here says every commit came out the same', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('place-slider').fill('10');

    await page.getByTestId('repeat').click();

    const result = page.getByTestId('repeat-result');
    await expect(result).toContainText('came out the same');
});

test('showing an earlier commit dims the later ones on the timeline', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('place-slider').fill('38');

    const place = page.getByTestId('status-place');
    await expect(place).toBeVisible();
    const later = page.locator('[data-testid="commit-cell"].is-later');
    const firstLater = later.first();
    await expect(firstLater).toBeVisible();
});
