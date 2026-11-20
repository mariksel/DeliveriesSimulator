import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** A commit of the one-order run whose state change wrote three events, about the order. */
const COMMIT_WITH_EVENTS = '40';

async function ranToTheEnd(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    // A run opens on the map; these tests look at the outbox and inbox inspector.
    await page.getByRole('tab', { name: 'Outbox and inbox' }).click();
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

const shownCommit = (page: Page): Locator => page.locator('[data-testid="commit-cell"].is-shown');

test('by order, the rows group under the order, with zoom levels of their own', async ({
    page,
}) => {
    await ranToTheEnd(page);

    await page.getByTestId('view-ByOrder').click();
    await page.getByTestId('zoom-Top').click();

    const top = page.getByTestId('zoom-Top');
    const middle = page.getByTestId('zoom-Middle');
    await expect(top).toHaveText('Orders');
    await expect(middle).toHaveText('Work');
    const rows = page.getByTestId('timeline-row');
    const firstRow = rows.first();
    await expect(rows).toHaveCount(1);
    await expect(firstRow).toHaveAttribute('data-kind', 'Order');
});

test('by driver, the rows group under the driver', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('view-ByDriver').click();
    await page.getByTestId('zoom-Top').click();

    const rows = page.getByTestId('timeline-row');
    const firstRow = rows.first();
    await expect(rows).toHaveCount(1);
    await expect(firstRow).toContainText('Driver driver-1');
});

test('the commit shown stays shown when the view changes', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('zoom-Commits').click();
    await page.getByTestId('place-slider').fill(COMMIT_WITH_EVENTS);

    await page.getByTestId('view-ByOrder').click();

    const shown = shownCommit(page).first();
    await expect(shown).toContainText(`#${COMMIT_WITH_EVENTS}`);
});

test('highlighting an order marks its commits in every view, and shows its versions', async ({
    page,
}) => {
    await ranToTheEnd(page);
    await page.getByTestId('view-ByOrder').click();
    await page.getByTestId('zoom-Top').click();

    const highlight = page.getByTestId('subject-highlight');
    await highlight.click();
    await page.getByTestId('view-ByTime').click();
    await page.getByTestId('zoom-Top').click();

    await expect(highlight).toHaveCount(0);
    const marked = page.locator('[data-testid="summary-node"].is-highlighted');
    const markedHour = marked.first();
    await expect(markedHour).toBeVisible();
    const versions = page.getByTestId('order-versions');
    await expect(versions).toBeVisible();
    const records = versions.getByTestId('record-versions');
    await expect(records).toHaveCount(4);
});

test("an order's version shows the commit that made it, and Clear closes its versions", async ({
    page,
}) => {
    await ranToTheEnd(page);
    await page.getByTestId('view-ByOrder').click();
    await page.getByTestId('zoom-Top').click();
    await page.getByTestId('subject-highlight').click();

    const commit = page.getByTestId('record-version-commit').first();
    const text = await commit.textContent();
    const place = /#(\d+)/.exec(text ?? '')?.[1] ?? '';
    await commit.click();
    await page.getByTestId('zoom-Commits').click();

    const shown = shownCommit(page).first();
    await expect(shown).toContainText(`#${place}`);
    await page.getByTestId('clear-selected-subject').click();
    const versions = page.getByTestId('order-versions');
    await expect(versions).toBeHidden();
});
