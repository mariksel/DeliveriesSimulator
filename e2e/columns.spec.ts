import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function ranToTheEnd(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

/** The Kind cell of the first record in the Orders outbox, and the table it is in. */
const inspectorKind = (page: Page): Locator =>
    page.getByTestId('inspector-table').first().getByTestId('inspector-kind').first();
const firstTable = (page: Page): Locator => page.getByTestId('inspector-table').first();

/** An element's width, once it is laid out: a table that has just changed may not be yet. */
async function widthOf(element: Locator): Promise<number> {
    await expect(element).toBeVisible();
    return (await element.boundingBox())!.width;
}

async function dragBy(page: Page, handle: Locator, distance: number): Promise<void> {
    await expect(handle).toBeVisible();
    // A table that has just changed may lay itself out again, so this waits until it holds still.
    await expect.poll(() => handle.boundingBox()).not.toBeNull();
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + distance / 2, y, { steps: 3 });
    await page.mouse.move(x + distance, y, { steps: 3 });
    await page.mouse.up();
}

const kindHandleIn = (scope: Locator): Locator =>
    scope.getByRole('separator', { name: 'Resize the Kind column' });

test('dragging a heading edge resizes the column in a table', async ({ page }) => {
    await ranToTheEnd(page);
    const kind = inspectorKind(page);
    const before = await widthOf(kind);

    const scope = firstTable(page);
    const handle = kindHandleIn(scope);
    await dragBy(page, handle, 60);

    const abs = Math.abs((await widthOf(kind)) - before - 60);
    expect(abs).toBeLessThan(3);
});

test('by module, a column resizes in all four tables at once', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByRole('button', { name: 'By module' }).click();
    const tables = page.getByTestId('inspector-table');
    const inspectorKind = tables.first().getByTestId('inspector-kind').first();
    const before = await widthOf(inspectorKind);

    const scope = tables.first();
    const handle = kindHandleIn(scope);
    await dragBy(page, handle, 40);

    for (const table of await tables.all()) {
        const secondInspectorKind = table.getByTestId('inspector-kind').first();
        const width = await widthOf(secondInspectorKind);
        const abs = Math.abs(width - before - 40);
        expect(abs).toBeLessThan(3);
    }
});

test('the arrow keys resize a column too', async ({ page }) => {
    await ranToTheEnd(page);
    const kind = inspectorKind(page);
    const before = await widthOf(kind);

    const scope = firstTable(page);
    await kindHandleIn(scope).focus();
    await page.keyboard.press('ArrowRight');

    await expect.poll(() => widthOf(kind)).toBe(before + 16);
});

test('a resized column stays that way after leaving and coming back', async ({ page }) => {
    await ranToTheEnd(page);
    const kind = inspectorKind(page);
    const before = await widthOf(kind);
    const scope = firstTable(page);
    const handle = kindHandleIn(scope);
    await dragBy(page, handle, 60);
    const resized = await widthOf(kind);
    expect(resized).toBeGreaterThan(before);

    await page.getByRole('link', { name: 'Findings' }).click();
    const notBuilt = page.getByTestId('not-built');
    await expect(notBuilt).toBeVisible();
    await page.goBack();

    await expect(kind).toBeVisible();
    const width = await widthOf(kind);
    expect(width).toBe(resized);
});

test('when columns outgrow a table, its headings and rows scroll sideways together', async ({
    page,
}) => {
    await ranToTheEnd(page);
    await page.getByRole('button', { name: 'By module' }).click();
    const table = page.getByTestId('inspector-table').first();
    const handle = kindHandleIn(table);
    await dragBy(page, handle, 300);
    const scroller = table.locator('.table-scroll');

    await scroller.evaluate((element) => {
        element.scrollLeft = 120;
    });

    await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBe(120);
    const heading = (await table.getByTitle('Kind', { exact: true }).boundingBox())!;
    const cell = (await table.getByTestId('inspector-kind').first().boundingBox())!;
    const abs = Math.abs(heading.x - cell.x);
    expect(abs).toBeLessThan(1);
});

test('on a wide window the columns stay together, and spare width goes to the end', async ({
    page,
}) => {
    await ranToTheEnd(page);
    const kind = inspectorKind(page);
    const kindAt1280 = await widthOf(kind);

    await page.setViewportSize({ width: 1920, height: 1080 });

    const width = await widthOf(kind);
    expect(width).toBe(kindAt1280);
});

test('on a small window the workspace scrolls sideways beside the sidebar', async ({ page }) => {
    await ranToTheEnd(page);

    await page.setViewportSize({ width: 900, height: 600 });

    const content = page.getByRole('main');
    await expect
        .poll(() => content.evaluate((element) => element.scrollWidth > element.clientWidth))
        .toBe(true);
    await content.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
    });
    const detailPanel = page.getByTestId('detail-panel');
    await expect(detailPanel).toBeInViewport();
    const byRole = page.getByRole('navigation', { name: 'Sections' });
    await expect(byRole).toBeInViewport();
});
