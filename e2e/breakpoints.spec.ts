import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function opened(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    await page.getByRole('button', { name: 'max', exact: true }).click();
}

/** Adds a breakpoint on an event kind in the Breakpoints tab. */
async function addedOn(page: Page, kind: string): Promise<void> {
    await page.getByTestId('breakpoints-tab').click();
    await page.getByTestId('breakpoint-kind').fill(kind);
    await page.getByTestId('breakpoint-add').click();
}

test('a breakpoint pauses the run at the commit that wrote an event of its kind', async ({
    page,
}) => {
    await opened(page);
    await addedOn(page, 'OrderPickedUp');

    await page.getByTestId('start').click();

    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Paused');
    const hit = page.getByTestId('breakpoint-hit');
    await expect(hit).toContainText('OrderPickedUp');
    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('OrderPickedUp');
    const place = page.getByTestId('status-place');
    await expect(place).toBeVisible();
    const step = page.getByRole('button', { name: 'Step', exact: true });
    await expect(step).toBeEnabled();
});

test('Resume goes on from a hit, to the end when no more events reach it', async ({ page }) => {
    await opened(page);
    await addedOn(page, 'OrderPickedUp');
    await page.getByTestId('start').click();
    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Paused');

    await page.getByTestId('start').click();

    await expect(state).toHaveText('Ended');
    const hit = page.getByTestId('breakpoint-hit');
    await expect(hit).toHaveCount(0);
});

test("an event's dot sets a breakpoint on its kind, kept when the run starts again", async ({
    page,
}) => {
    await opened(page);
    await page.getByTestId('start').click();
    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Ended');
    await page.getByTestId('events-tab').click();
    const row = page.getByTestId('event-row').filter({ hasText: 'InboxEventRead' }).first();
    await row.hover();

    await row.getByTestId('event-pause').click();
    await page.getByRole('button', { name: 'Run again' }).click();
    await page.getByTestId('start').click();

    await expect(state).toHaveText('Paused');
    await page.getByTestId('breakpoints-tab').click();
    const hit = page.getByTestId('breakpoint-hit');
    await expect(hit).toContainText('InboxEventRead');
});

test('a breakpoint switched off pauses nothing, and a removed one is gone', async ({ page }) => {
    await opened(page);
    await addedOn(page, 'OrderPickedUp');
    const breakpoint = page.getByTestId('breakpoint');

    await breakpoint.getByTestId('breakpoint-switch').uncheck();
    await page.getByTestId('start').click();

    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Ended');
    await breakpoint.getByTestId('breakpoint-remove').click();
    await expect(breakpoint).toHaveCount(0);
    const none = page.getByTestId('no-breakpoints');
    await expect(none).toBeVisible();
});
