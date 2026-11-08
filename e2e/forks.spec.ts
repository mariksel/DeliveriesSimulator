import type { Locator, Page } from '@playwright/test';
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

/** Forks at an earlier commit. */
async function forkedEarlier(page: Page): Promise<void> {
    await ranToTheEnd(page);
    await page.getByTestId('place-slider').fill('40');
    await page.getByTestId('fork-here').click();
}

const headings = (page: Page): Locator => page.getByTestId('branch-heading');

test('Fork here starts a new branch at an earlier commit, in its own column', async ({ page }) => {
    await forkedEarlier(page);

    const all = headings(page);
    await expect(all).toHaveCount(2);
    const fork = all.nth(1);
    await expect(fork).toContainText('Fork 1');
    await expect(fork).toContainText('From Main at commit');
    await expect(fork).toHaveClass(/is-current/);
    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Paused');
    const start = page.getByTestId('start');
    await expect(start).toBeEnabled();
});

test('a fork runs on to its own verdict, and Main keeps its own', async ({ page }) => {
    await forkedEarlier(page);
    await page.getByRole('button', { name: 'Resume' }).click();
    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Ended');

    const main = headings(page).first();
    await main.getByTestId('watch-branch').click();

    await expect(main).toHaveClass(/is-current/);
    const verdict = page.getByTestId('status-verdict');
    await expect(verdict).toHaveText('Passed');
});

test('clicking anywhere on a heading, not only its name, watches its branch', async ({ page }) => {
    await forkedEarlier(page);
    const main = headings(page).first();

    // Near the heading's left edge, away from the name.
    await main.click({ position: { x: 4, y: 4 } });

    await expect(main).toHaveClass(/is-current/);
});

test('a branch can be renamed in its heading', async ({ page }) => {
    await forkedEarlier(page);
    const fork = headings(page).nth(1);
    const input = fork.getByTestId('branch-rename-input');
    await expect(input).toHaveCount(0);

    await fork.getByTestId('branch-rename').click();
    await input.fill('Faster passes');
    await fork.getByTestId('branch-save-name').click();

    await expect(fork).toContainText('Faster passes');
});

test("choosing a commit in another branch's column watches that branch there", async ({
    page,
}) => {
    await forkedEarlier(page);
    const main = headings(page).first();
    // Named by its place: the rows move as the timeline follows, so a first would change.
    const mainCommit = page
        .locator('[data-testid="commit-cell"][data-branch-id="main"]')
        .filter({ hasText: 'commit #38 ' });

    await mainCommit.click();

    await expect(main).toHaveClass(/is-current/);
    await expect(mainCommit).toHaveClass(/is-shown/);
});

test('a fork point carries a fork icon, which starts a branch after that commit', async ({
    page,
}) => {
    await ranToTheEnd(page);
    // Commit 40 ends a job run, so a fork can start after it.
    await page.getByTestId('place-slider').fill('40');
    const forkPoint = page.locator('[data-testid="commit-cell"].is-fork-point.is-shown');

    await forkPoint.getByTestId('commit-fork').click();

    const fork = page.locator('[data-testid="branch-heading"].is-current');
    await expect(fork).toContainText('From Main at commit 40');
    const state = page.getByTestId('status-state');
    await expect(state).toHaveText('Paused');
});

test('a commit inside a job run or API call has no fork icon', async ({ page }) => {
    await ranToTheEnd(page);
    // Commit 38 is a state change inside an API call.
    await page.getByTestId('place-slider').fill('38');

    const inside = page.locator('[data-testid="commit-cell"]:not(.is-fork-point)').first();

    await expect(inside).toBeVisible();
    const forkIcons = inside.getByTestId('commit-fork');
    await expect(forkIcons).toHaveCount(0);
});

test('scrolling sideways keeps the time column in place and the headings over their columns', async ({
    page,
}) => {
    await ranToTheEnd(page);
    // Each fork is of the one before, so each starts earlier.
    for (const place of ['80', '60', '40']) {
        await page.getByTestId('place-slider').fill(place);
        await page.getByTestId('fork-here').click();
    }
    const rows = page.getByTestId('timeline-rows');
    const label = page.getByTestId('timeline-row').first().locator('.label');
    const before = (await label.boundingBox())!.x;

    await rows.evaluate((element) => {
        element.scrollLeft = 300;
    });

    await expect.poll(async () => (await label.boundingBox())!.x).toBe(before);
    const heading = headings(page).last();
    const lastBranch = (await heading.getAttribute('data-branch-id')) ?? '';
    const cell = page
        .locator(`[data-branch-id="${lastBranch}"]`)
        .filter({ hasNot: heading })
        .last();
    const headingBox = (await heading.boundingBox())!;
    const cellBox = (await cell.boundingBox())!;
    const offset = Math.abs(headingBox.x - cellBox.x);
    expect(offset).toBeLessThan(2);
});

test('a control says what it does when the pointer rests on it', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('repeat').hover();

    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toHaveText(
        'Run again from the commit shown, and check every commit comes out the same',
    );
});
