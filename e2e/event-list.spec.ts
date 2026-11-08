import type { Page } from '@playwright/test';
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
    await page.getByTestId('events-tab').click();
    const eventRow = page.getByTestId('event-list').getByTestId('event-row').last();
    await expect(eventRow).toContainText('37');
}

test('the list starts empty, and fills as a run goes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    await page.getByTestId('events-tab').click();
    const noEvents = page.getByTestId('no-events');
    await expect(noEvents).toBeVisible();

    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();

    const eventRow = page.getByTestId('event-row').first();
    await expect(eventRow).toBeVisible();
});

test('it follows the newest event to the end of a run', async ({ page }) => {
    await ranToTheEnd(page);

    const eventRow = page.getByTestId('event-row').last();
    await expect(eventRow).toBeInViewport();
    const secondEventRow = page.getByTestId('event-row').last();
    await expect(secondEventRow).toContainText('37');
});

test('selecting an event shows its full payload', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('event-row').last().click();

    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('#37');
    const payloadJson = page.getByTestId('payload-json');
    await expect(payloadJson).toContainText('"outboxEventId"');
    const payloadSource = page.getByTestId('payload-source');
    await expect(payloadSource).not.toBeEmpty();
});

test('the verdict and the event have their own tabs', async ({ page }) => {
    await ranToTheEnd(page);
    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toBeVisible();

    await page.getByTestId('event-row').last().click();
    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toBeVisible();
    const secondRunVerdict = page.getByTestId('run-verdict');
    await expect(secondRunVerdict).toBeHidden();

    await page.getByRole('tab', { name: 'Verdict' }).click();
    const thirdRunVerdict = page.getByTestId('run-verdict');
    await expect(thirdRunVerdict).toBeVisible();

    await page.getByRole('tab', { name: 'Event', exact: true }).click();
    const secondPayloadKind = page.getByTestId('payload-kind');
    await expect(secondPayloadKind).toBeVisible();
});

test('the chosen tab joins its panel, and the other sits behind the line', async ({ page }) => {
    await ranToTheEnd(page);
    const lineBelow = (name: string): Promise<string> =>
        page
            .getByRole('tab', { name, exact: true })
            .evaluate((tab) => getComputedStyle(tab).borderBottomColor);

    const chosen = await lineBelow('Verdict');
    const other = await lineBelow('Event');

    expect(chosen).toBe('rgba(0, 0, 0, 0)');
    expect(other).not.toBe(chosen);
});

test('Caused by selects the entry that caused this one', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('event-row').last().click();

    await page.getByTestId('payload-caused-by').click();

    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).not.toContainText('#37');
    const dataTestideventRowisSelected = page.locator('[data-testid="event-row"].is-selected');
    await expect(dataTestideventRowisSelected).toBeInViewport();
});

test('selecting an event stops following, and Follow turns it back on', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    await page.getByTestId('events-tab').click();
    await page.getByRole('button', { name: '600x' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const eventRow = page.getByTestId('event-row').first();
    await expect(eventRow).toBeVisible();

    await page.getByTestId('event-row').first().click();
    const follow = page.getByTestId('follow');
    await expect(follow).toBeVisible();

    await page.getByTestId('follow').click();
    const secondFollow = page.getByTestId('follow');
    await expect(secondFollow).toBeHidden();
});

test('pressing a row stops following before the press is released', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('event-row').last().hover();

    await page.mouse.down();
    const follow = page.getByTestId('follow');
    await expect(follow).toBeVisible();

    await page.mouse.up();
    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('#37');
});

test('the Follow button does not change the height of the list', async ({ page }) => {
    await ranToTheEnd(page);
    const list = page.getByTestId('event-list');
    const before = (await list.boundingBox())!.height;

    await page.getByTestId('event-row').last().click();
    const follow = page.getByTestId('follow');
    await expect(follow).toBeVisible();

    expect((await list.boundingBox())!.height).toBe(before);
    const dataTestideventRowisSelected = page.locator('[data-testid="event-row"].is-selected');
    // In the main area, the panel's edge can clip a pixel of the last row.
    await expect(dataTestideventRowisSelected).toBeInViewport({
        ratio: 0.9,
    });
});

test('Copy says what happened', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('event-row').last().click();

    await page.getByTestId('payload-copy').click();

    const payloadCopied = page.getByTestId('payload-copied');
    await expect(payloadCopied).toHaveText(/Copied|Could not copy/);
});
