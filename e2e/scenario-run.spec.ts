import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { ONE_ORDER_DIGEST } from './fixtures/one-order-digest';

const ONE_ORDER_FILE = 'src/infrastructure/scenarios/built-in/one-order.json';
const OPEN_BUILT_IN = 'Open: One order, happy path';

async function openBuiltIn(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: OPEN_BUILT_IN }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ready');
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
}

async function runToTheEnd(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

test('the built-in scenario passes in the browser, on all four criteria', async ({ page }) => {
    await openBuiltIn(page);

    await runToTheEnd(page);

    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toHaveText('Passed');
    const statusVerdict = page.getByTestId('status-verdict');
    await expect(statusVerdict).toHaveText('Passed');
    const runCriteria = page.getByTestId('run-criteria');
    await expect(runCriteria).toContainText('Valid final state: passed');
    const secondRunCriteria = page.getByTestId('run-criteria');
    await expect(secondRunCriteria).toContainText('Modules agree: passed');
    const thirdRunCriteria = page.getByTestId('run-criteria');
    await expect(thirdRunCriteria).toContainText('Exactly-once effect: passed');
    const fourthRunCriteria = page.getByTestId('run-criteria');
    await expect(fourthRunCriteria).toContainText('Outbox for every event: passed');
});

test('a live run gives the same run as headless', async ({ page }) => {
    await openBuiltIn(page);

    await runToTheEnd(page);

    const runDigest = page.getByTestId('run-digest');
    await expect(runDigest).toHaveText(ONE_ORDER_DIGEST);
});

test('a scenario file opens paused at time 0', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Open a scenario file').setInputFiles(ONE_ORDER_FILE);

    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toHaveText('One order, happy path');
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ready');
    const statusTime = page.getByTestId('status-time');
    await expect(statusTime).toHaveText('h00:m00:s00:ms00');
});

test('an invalid scenario file says what is wrong', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Open a scenario file').setInputFiles('e2e/fixtures/invalid.json');

    const scenarioProblems = page.getByTestId('scenario-problems');
    await expect(scenarioProblems).toContainText('name: is missing');
});

test("a scenario's rule value outside its valid range is warned about in the run", async ({
    page,
}) => {
    await page.goto('/');

    await page
        .getByLabel('Open a scenario file')
        .setInputFiles('e2e/fixtures/out-of-range-rules.json');

    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toHaveText('Rules outside their ranges');
    const warnings = page.getByTestId('scenario-warnings');
    await expect(warnings).toHaveText(
        'rules[0].value: is outside its valid range, from 500 to 10000',
    );
});

test('a scenario with no warnings shows none', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Open a scenario file').setInputFiles(ONE_ORDER_FILE);

    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    const warnings = page.getByTestId('scenario-warnings');
    await expect(warnings).toHaveCount(0);
});

test('a user starts, pauses, steps, and changes the speed of a run', async ({ page }) => {
    await openBuiltIn(page);
    const time = page.getByTestId('status-time');

    await page.getByRole('button', { name: '10x' }).click();
    const statusSpeed = page.getByTestId('status-speed');
    await expect(statusSpeed).toHaveText('10x');

    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Running');
    await expect(time).not.toHaveText('h00:m00:s00:ms00');

    await page.getByRole('button', { name: 'Pause' }).click();
    const secondStatusState = page.getByTestId('status-state');
    await expect(secondStatusState).toHaveText('Paused');
    const pausedAt = await time.textContent();
    await expect(time).toHaveText(pausedAt ?? '');

    await page.getByRole('button', { name: 'Step' }).click();
    const thirdStatusState = page.getByTestId('status-state');
    await expect(thirdStatusState).toHaveText('Paused');
});

test('a typed speed works, and a wrong one says so', async ({ page }) => {
    await openBuiltIn(page);
    const box = page.getByLabel('Other speed');

    await box.fill('250');
    await page.getByRole('button', { name: 'Set' }).click();
    const statusSpeed = page.getByTestId('status-speed');
    await expect(statusSpeed).toHaveText('250x');

    await box.fill('fast');
    await page.getByRole('button', { name: 'Set' }).click();
    const speedInvalid = page.getByTestId('speed-invalid');
    await expect(speedInvalid).toBeVisible();
    const secondStatusSpeed = page.getByTestId('status-speed');
    await expect(secondStatusSpeed).toHaveText('250x');
});

test('the keyboard starts and pauses a run, and chooses a speed', async ({ page }) => {
    await openBuiltIn(page);

    await page.keyboard.press('2');
    const statusSpeed = page.getByTestId('status-speed');
    await expect(statusSpeed).toHaveText('10x');

    await page.keyboard.press('Space');
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Running');

    await page.keyboard.press('Space');
    const secondStatusState = page.getByTestId('status-state');
    await expect(secondStatusState).toHaveText('Paused');
});

test('a run with no orders passes, and says that no orders were judged', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Open a scenario file').setInputFiles('e2e/fixtures/no-orders.json');
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toHaveText('No orders');

    await runToTheEnd(page);

    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toHaveText('Passed');
    const runVerdictNote = page.getByTestId('run-verdict-note');
    await expect(runVerdictNote).toContainText('No orders were judged');
});

test('a run with orders has no such note', async ({ page }) => {
    await openBuiltIn(page);

    await runToTheEnd(page);

    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toBeVisible();
    const runVerdictNote = page.getByTestId('run-verdict-note');
    await expect(runVerdictNote).toBeHidden();
});

test('a run keeps going past its end when asked, and can run again', async ({ page }) => {
    await openBuiltIn(page);
    await runToTheEnd(page);

    await page.getByRole('button', { name: 'Keep going' }).click();
    await page.getByRole('button', { name: 'Resume' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Running');
    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toHaveText('Passed');

    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Run again' }).click();
    const secondStatusState = page.getByTestId('status-state');
    await expect(secondStatusState).toHaveText('Ready');
    const statusTime = page.getByTestId('status-time');
    await expect(statusTime).toHaveText('h00:m00:s00:ms00');
});

test('leaving a running run pauses it, and coming back resumes it', async ({ page }) => {
    await openBuiltIn(page);
    await page.getByRole('button', { name: '10x' }).click();
    await page.getByRole('button', { name: 'Start' }).click();

    await page.getByRole('link', { name: 'Findings' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Paused');

    await page.goBack();
    const secondStatusState = page.getByTestId('status-state');
    await expect(secondStatusState).toHaveText('Running');
});

test('the detail panel resizes by dragging its divider', async ({ page }) => {
    await openBuiltIn(page);
    const panel = page.getByTestId('detail-panel');
    const divider = page.getByTestId('detail-divider');
    const before = (await panel.boundingBox())!.width;
    const box = (await divider.boundingBox())!;

    await page.mouse.move(box.x + 2, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x - 100, box.y + 40, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(before + 50);
});
