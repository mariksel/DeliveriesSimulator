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

/** Selects the orders outbox write of the delivery request, entry 6, and opens its trace. */
async function tracedTheFirstOutboxWrite(page: Page): Promise<void> {
    await ranToTheEnd(page);
    await page
        .getByTestId('inspector-row')
        .first()
        .getByRole('button', { name: 'orders-outbox-1' })
        .click();
    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('#6');
    await page.getByTestId('payload-show-trace').click();
}

test('it asks for a selection until there is one', async ({ page }) => {
    await opened(page);

    await page.getByRole('tab', { name: 'Trace' }).click();

    const traceHint = page.getByTestId('trace-hint');
    await expect(traceHint).toBeVisible();
});

test('selecting an event shows every related step in both modules, in order', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    const traceTitle = page.getByTestId('trace-title');
    await expect(traceTitle).toHaveText('Trace #2: 8 steps');
    const traceStep = page.getByTestId('trace-step');
    await expect(traceStep).toContainText([
        '#2 Command',
        '#3 OrderDeliveryRequest',
        '#4 OrderDeliveryRequest',
        '#5 Written: OrderDeliveryRequest',
        '#6 Written: OrderDeliveryRequest',
        '#7 Read: OrderDeliveryRequest',
        '#8 Read: OrderDeliveryRequest',
        '#9 NotificationSent',
    ]);
});

test('each step sits in its lane', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    const dots = page.getByTestId('trace-dot');

    await expect(dots).toHaveCount(8);
    const lanes = await dots.evaluateAll((all) => all.map((dot) => dot.getAttribute('data-lane')));
    expect(lanes).toEqual([
        'Actor',
        'Orders',
        'Deliveries',
        'Deliveries outbox and inbox',
        'Orders outbox and inbox',
        'Orders outbox and inbox',
        'Deliveries outbox and inbox',
        'Deliveries',
    ]);
});

test('the chain through the selected event is highlighted', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    const onPath = page.locator('[data-testid="trace-step"].is-on-path');

    await expect(onPath).toHaveCount(4);
    await expect(onPath).toContainText(['#2', '#3', '#6', '#8']);
    const dataTestidtraceStepisSelected = page.locator('[data-testid="trace-step"].is-selected');
    await expect(dataTestidtraceStepisSelected).toContainText('#6');
});

test('clicking a step selects it, and the trace stays', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    await page.getByTestId('trace-step').filter({ hasText: '#9' }).click();

    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText('#9');
    const traceTitle = page.getByTestId('trace-title');
    await expect(traceTitle).toHaveText('Trace #2: 8 steps');
    const dataTestidtraceStepisSelected = page.locator('[data-testid="trace-step"].is-selected');
    await expect(dataTestidtraceStepisSelected).toContainText('#9');
});

test('the arrows through the outbox are dashed, and the path stands out', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    const path = page.locator('[data-testid="trace-arrow"].is-on-path');
    const dashed = page.locator('[data-testid="trace-arrow"].is-on-path.is-dashed');

    await expect(path).toHaveCount(6);
    await expect(dashed).toHaveCount(2);
    const evaluate = await dashed
        .first()
        .evaluate((line) => getComputedStyle(line).strokeDasharray);
    expect(evaluate).not.toBe('none');
    const secondEvaluate = await path
        .first()
        .evaluate((line) => getComputedStyle(line).strokeWidth);
    expect(secondEvaluate).toBe('2px');
});

test('it marks the time that passed between steps', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    const traceStep = page.getByTestId('trace-step').filter({ hasText: '#7' });
    await expect(traceStep).toContainText('+3 s');
});

test('during a run it grows, and shows what is still waiting', async ({ page }) => {
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
    await waiting.first().getByRole('button').first().click();
    await page.getByTestId('payload-show-trace').click();
    const traceWaiting = page.getByTestId('trace-waiting').first();
    await expect(traceWaiting).toBeVisible();
    const before = await page.getByTestId('trace-step').count();
    // Selecting an event shows the run at its commit, so the run goes on from the latest one.
    await page.getByTestId('latest').click();

    await step.click();
    await step.click();
    await step.click();

    await expect.poll(() => page.getByTestId('trace-step').count()).toBeGreaterThan(before);
});

test('the Trace tab is still open after leaving and coming back', async ({ page }) => {
    await tracedTheFirstOutboxWrite(page);

    await page.getByRole('link', { name: 'Findings' }).click();
    const notBuilt = page.getByTestId('not-built');
    await expect(notBuilt).toBeVisible();
    await page.goBack();

    const traceTitle = page.getByTestId('trace-title');
    await expect(traceTitle).toBeVisible();
});

test('the inspector is one click back, with its view as chosen', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByRole('button', { name: 'By module' }).click();

    await page.getByRole('tab', { name: 'Trace' }).click();
    await page.getByRole('tab', { name: 'Outbox and inbox' }).click();

    const inspectorTable = page.getByTestId('inspector-table');
    await expect(inspectorTable).toHaveCount(4);
});
