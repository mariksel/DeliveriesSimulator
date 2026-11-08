import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function openRun(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    // Down to the commits, which these tests pick out (FND-87).
    await page.getByTestId('zoom-Commits').click();
}

const backgroundOf = (control: Locator): Promise<string> =>
    control.evaluate((element) => getComputedStyle(element).backgroundColor);

const borderOf = (control: Locator): Promise<string> =>
    control.evaluate((element) => getComputedStyle(element).borderTopColor);

/** Each control starts where the last one ends, with the two sharing a border. */
async function expectJoined(controls: readonly Locator[]): Promise<void> {
    for (let i = 1; i < controls.length; i++) {
        const left = (await controls[i - 1]!.boundingBox())!;
        const right = (await controls[i]!.boundingBox())!;
        const abs = Math.abs(left.x + left.width - 1 - right.x);
        expect(abs).toBeLessThan(1);
    }
    const roundedLeftOf = (control: Locator): Promise<string> =>
        control.evaluate((element) => getComputedStyle(element).borderTopLeftRadius);
    const roundedLeft = await roundedLeftOf(controls[0]!);
    expect(roundedLeft).not.toBe('0px');
    const secondRoundedLeft = await roundedLeftOf(controls[1]!);
    expect(secondRoundedLeft).toBe('0px');
}

test('the speed presets are one joined group', async ({ page }) => {
    await openRun(page);

    const controls = await page.getByRole('group', { name: 'Speed' }).getByRole('button').all();
    await expectJoined(controls);
});

test('the view toggles are one joined group', async ({ page }) => {
    await openRun(page);

    const controls = await page.getByRole('group', { name: 'Show' }).getByRole('button').all();
    await expectJoined(controls);
});

test('the speed box and its Set button are joined', async ({ page }) => {
    await openRun(page);

    await expectJoined([
        page.getByLabel('Other speed'),
        page.getByRole('button', { name: 'Set' }),
    ]);
});

test('the Start button looks different in each state of a run', async ({ page }) => {
    await openRun(page);
    const start = page.getByTestId('start');
    await page.getByRole('button', { name: '1x', exact: true }).click();
    const ready = await backgroundOf(start);

    await start.click();
    await expect(start).toHaveText('Pause');
    await page.mouse.move(0, 0);
    const running = await backgroundOf(start);

    await start.click();
    await expect(start).toHaveAttribute('data-state', 'Paused');
    await page.mouse.move(0, 0);
    const paused = await backgroundOf(start);

    await page.getByRole('button', { name: 'max', exact: true }).click();
    await start.click();
    await expect(start).toHaveAttribute('data-state', 'Ended');
    await expect(start).toBeDisabled();
    await page.mouse.move(0, 0);
    const ended = await backgroundOf(start);

    expect(new Set([ready, running, paused, ended]).size).toBe(4);
});

test('a button shows when it is hovered, chosen, or disabled', async ({ page }) => {
    await openRun(page);
    const step = page.getByRole('button', { name: 'Step' });
    await page.mouse.move(0, 0);
    const resting = await backgroundOf(step);

    await step.hover();
    const background = await backgroundOf(step);
    expect(background).not.toBe(resting);

    await page.mouse.move(0, 0);
    const preset = page.getByRole('button', { name: '600x' });
    const secondBackground = await backgroundOf(preset);
    expect(secondBackground).toBe(resting);
    await preset.click();
    await page.mouse.move(0, 0);
    const thirdBackground = await backgroundOf(preset);
    expect(thirdBackground).not.toBe(resting);

    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByTestId('start').click();
    await expect(step).toBeDisabled();
    await page.mouse.move(0, 0);
    const fourthBackground = await backgroundOf(step);
    expect(fourthBackground).not.toBe(resting);
});

test('the speed box shows focus, a wrong speed, and a speed in use', async ({ page }) => {
    await openRun(page);
    const box = page.getByLabel('Other speed');
    const resting = await borderOf(box);

    await box.focus();
    const focused = await borderOf(box);
    expect(focused).not.toBe(resting);

    await box.fill('fast');
    await page.getByRole('button', { name: 'Set' }).click();
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    const wrong = await borderOf(box);
    expect(wrong).not.toBe(focused);

    await box.fill('250');
    await expect(box).toHaveAttribute('aria-invalid', 'false');
    await page.getByRole('button', { name: 'Set' }).click();
    await expect(box).toHaveClass(/is-current/);

    await page.getByRole('button', { name: '600x' }).click();
    await expect(box).toHaveValue('');
    await expect(box).not.toHaveClass(/is-current/);
});

test('the speed box still shows a typed speed after leaving and coming back', async ({ page }) => {
    await openRun(page);
    await page.getByLabel('Other speed').fill('250');
    await page.getByRole('button', { name: 'Set' }).click();
    const statusSpeed = page.getByTestId('status-speed');
    await expect(statusSpeed).toHaveText('250x');

    await page.getByRole('link', { name: 'Findings' }).click();
    const notBuilt = page.getByTestId('not-built');
    await expect(notBuilt).toBeVisible();
    await page.goBack();

    const byLabel = page.getByLabel('Other speed');
    await expect(byLabel).toHaveValue('250');
    const otherSpeed = page.getByLabel('Other speed');
    await expect(otherSpeed).toHaveClass(/is-current/);
});

test('the main button says what it will do', async ({ page }) => {
    await openRun(page);
    const start = page.getByTestId('start');
    await expect(start).toHaveText('Start');

    await page.getByRole('button', { name: '1x', exact: true }).click();
    await start.click();
    await expect(start).toHaveText('Pause');

    await start.click();
    await expect(start).toHaveText('Resume');
});

test('the status bar colours the state of the run', async ({ page }) => {
    await openRun(page);
    const state = page.getByTestId('status-state');
    const ready = await backgroundOf(state);

    await page.getByRole('button', { name: '1x', exact: true }).click();
    await page.getByTestId('start').click();
    await expect(state).toHaveText('Running');

    const background = await backgroundOf(state);
    expect(background).not.toBe(ready);
});

test('the verdict has a banner, and each criterion a mark', async ({ page }) => {
    await openRun(page);
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByTestId('start').click();
    const banner = page.getByTestId('run-verdict');
    await expect(banner).toHaveText('Passed');

    const background = await backgroundOf(banner);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    const mark = await page
        .getByTestId('run-criteria')
        .locator('li')
        .first()
        .evaluate((item) => getComputedStyle(item, '::before').content);
    expect(mark).toContain('✓');
});

test('a scenario file can be dropped on the runs page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
        const source = document.createElement('input');
        source.type = 'file';
        source.id = 'file-to-drop';
        document.body.append(source);
    });
    await page
        .locator('#file-to-drop')
        .setInputFiles('src/infrastructure/scenarios/built-in/one-order.json');
    const transfer = await page.evaluateHandle(() => {
        const data = new DataTransfer();
        data.items.add(document.querySelector<HTMLInputElement>('#file-to-drop')!.files![0]!);
        return data;
    });

    await page.getByTestId('drop-area').dispatchEvent('drop', { dataTransfer: transfer });

    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
});

test('the Follow button is small and round', async ({ page }) => {
    await openRun(page);
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByTestId('start').click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
    await page.locator('[data-testid="commit-cell"].is-shown').click();

    const box = (await page.getByTestId('timeline-follow').boundingBox())!;

    expect(box.width).toBe(box.height);
    expect(box.width).toBeLessThanOrEqual(32);
});
