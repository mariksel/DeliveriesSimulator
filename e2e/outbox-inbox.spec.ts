import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function opened(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
}

async function ranToTheEnd(page: Page): Promise<void> {
    await opened(page);
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

test('it shows nothing written before a run starts', async ({ page }) => {
    await opened(page);

    const byRole = page.getByRole('tab', { name: 'Outbox and inbox' });
    await expect(byRole).toBeVisible();
    const inspectorCount = page.getByTestId('inspector-counts').first();
    await expect(inspectorCount).toHaveText('0 written, 0 read, 0 waiting');
});

test('at the end of a run, everything written has been read', async ({ page }) => {
    await ranToTheEnd(page);

    const inspectorCounts = page.getByTestId('inspector-counts').nth(0);
    await expect(inspectorCounts).toHaveText('5 written, 5 read, 0 waiting');
    const secondInspectorCounts = page.getByTestId('inspector-counts').nth(1);
    await expect(secondInspectorCounts).toHaveText('5 written, 5 read, 0 waiting');
    const inspectorRow = page.getByTestId('inspector-row');
    await expect(inspectorRow).toHaveCount(10);
});

test('at a moment during a run, it shows what is still waiting', async ({ page }) => {
    await opened(page);
    const step = page.getByRole('button', { name: 'Step' });
    const waiting = page.locator('[data-testid="inspector-row"].is-waiting');

    await expect
        .poll(
            async () => {
                await step.click();
                return waiting.count();
            },
            { intervals: [50], timeout: 20_000 },
        )
        .toBeGreaterThan(0);

    const secondWaiting = waiting.first();
    await expect(secondWaiting).toContainText('waiting');
    const inspectorCount = page.getByTestId('inspector-counts').first();
    await expect(inspectorCount).toContainText('1 waiting');
});

test('it toggles between each direction and each module', async ({ page }) => {
    await ranToTheEnd(page);
    const inspectorTable = page.getByTestId('inspector-table');
    await expect(inspectorTable).toHaveCount(2);

    await page.getByRole('button', { name: 'By module' }).click();

    const secondInspectorTable = page.getByTestId('inspector-table');
    await expect(secondInspectorTable).toHaveCount(4);
    const inspectorCounts = page.getByTestId('inspector-counts').nth(0);
    await expect(inspectorCounts).toHaveText('5 written, 0 waiting');
    const secondInspectorCounts = page.getByTestId('inspector-counts').nth(1);
    await expect(secondInspectorCounts).toHaveText('5 read');

    await page.getByRole('button', { name: 'By flow' }).click();
    const thirdInspectorTable = page.getByTestId('inspector-table');
    await expect(thirdInspectorTable).toHaveCount(2);
});

test('every column stays inside its table, in each view', async ({ page }) => {
    await ranToTheEnd(page);

    for (const view of ['By flow', 'By module']) {
        await page.getByRole('button', { name: view }).click();
        const tables = await page.getByTestId('inspector-table').all();
        for (const table of tables) {
            const box = (await table.boundingBox())!;
            const waited = (await table.getByTestId('inspector-waited').first().boundingBox())!;
            expect(waited.x + waited.width).toBeLessThanOrEqual(box.x + box.width);
        }
    }
});

test('the chosen view is still there after leaving and coming back', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByRole('button', { name: 'By module' }).click();

    await page.getByRole('link', { name: 'Findings' }).click();
    const notBuilt = page.getByTestId('not-built');
    await expect(notBuilt).toBeVisible();
    await page.goBack();

    const inspectorTable = page.getByTestId('inspector-table');
    await expect(inspectorTable).toHaveCount(4);
});

test('clicking a row selects its outbox entry', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('inspector-row').first().click();

    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('OutboxEventWritten');
    const inspectorRow = page.getByTestId('inspector-row').first();
    await expect(inspectorRow).toHaveClass(/is-selected/);
});

test('the read time links to the inbox read', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('inspector-read-link').first().click();

    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('InboxEventRead');
});
