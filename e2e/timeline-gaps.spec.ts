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
    await page.getByTestId('zoom-Commits').click();
    const list = page.getByTestId('timeline-rows');
    const follow = page.getByTestId('timeline-follow');
    // Scrolling to the top stops the timeline following the last commit, but only once following
    // has scrolled down: at the top already, nothing scrolls, and following would scroll it down
    // later. So this scrolls up until the Follow button shows that following stopped.
    await expect(async () => {
        await list.evaluate((element) => {
            element.scrollTop = 0;
        });
        await expect(follow).toBeVisible({ timeout: 500 });
    }).toPass();
}

/** How far each step scrolls the timeline down, and how many steps it takes at most. */
const STEP_PX = 200;
const MOST_STEPS = 30;

/** Scrolls the timeline down step by step until a row is drawn: it draws only rows in sight. */
async function scrolledTo(page: Page, row: Locator): Promise<void> {
    const list = page.getByTestId('timeline-rows');
    for (let step = 0; step < MOST_STEPS && (await row.count()) === 0; step += 1) {
        await list.evaluate((element, by) => {
            element.scrollTop += by;
        }, STEP_PX);
        await page.waitForTimeout(50);
    }
}

/** Opens a row from its toggle, once it is in sight, and waits until it is open. */
async function openedRow(row: Locator): Promise<void> {
    await expect(row).toBeInViewport();
    const toggle = row.getByTestId('timeline-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

test('back-to-back empty job runs collapse into one row, which opens to them by job', async ({
    page,
}) => {
    await ranToTheEnd(page);

    const collapsed = page.locator('[data-testid="timeline-row"][data-kind="EmptyRuns"]').first();
    await expect(collapsed).toContainText('empty job runs');
    await openedRow(collapsed);
    const job = page.locator('[data-testid="timeline-row"][data-kind="JobRuns"]').first();
    await expect(job).toContainText(/: \d+ empty runs?/);
    await openedRow(job);

    const run = page.locator('[data-testid="timeline-row"][data-kind="Session"]').first();
    await expect(run).toBeVisible();
});

test('an empty job run stays selectable once its collapsed row is opened', async ({ page }) => {
    await ranToTheEnd(page);
    const collapsed = page.locator('[data-testid="timeline-row"][data-kind="EmptyRuns"]').first();
    await openedRow(collapsed);
    const job = page.locator('[data-testid="timeline-row"][data-kind="JobRuns"]').first();
    await openedRow(job);

    const row = page.locator('[data-testid="timeline-row"][data-kind="Commit"]').first();
    const commit = row.getByTestId('commit-cell');
    const text = await commit.textContent();
    const place = /#(\d+)/.exec(text ?? '')?.[1] ?? '';
    await commit.click();

    const shown = page.locator('[data-testid="commit-cell"].is-shown').first();
    await expect(shown).toContainText(`#${place}`);
});

test('hiding job runs hides only their own commits, and the filter says how to undo it', async ({
    page,
}) => {
    await ranToTheEnd(page);

    const hideJobs = page.getByTestId('show-Job');
    await hideJobs.click();

    const jobCommits = page.locator('[data-testid="commit-cell"][data-mark="Job"]');
    const stateCommits = page.locator('[data-testid="commit-cell"][data-mark="State"]');
    await expect(jobCommits).toHaveCount(0);
    const firstState = stateCommits.first();
    await expect(firstState).toBeVisible();
    await expect(hideJobs).toHaveAttribute('aria-pressed', 'false');
});

test('with job runs hidden, gaps between state commits show as rows, and on the axis', async ({
    page,
}) => {
    await ranToTheEnd(page);
    await page.getByTestId('show-Job').click();

    await page.getByTestId('gap-threshold').selectOption({ label: '10 s' });

    const gaps = page.locator('[data-testid="timeline-row"][data-gap]');
    const firstGap = gaps.first();
    await scrolledTo(page, firstGap);
    await expect(firstGap).toContainText('Gap of');
    await page.getByTestId('gaps-as-Axis').click();
    const sized = page.locator('[data-testid="timeline-row"][data-gap][style*="--gap-height"]');
    const firstSized = sized.first();
    await scrolledTo(page, firstSized);
    await expect(firstSized).toBeAttached();
});

test('the filter and the gaps stay as chosen in another view, and gaps show by time only', async ({
    page,
}) => {
    await ranToTheEnd(page);
    await page.getByTestId('show-Job').click();

    await page.getByTestId('view-ByNumber').click();

    const threshold = page.getByTestId('gap-threshold');
    const hideJobs = page.getByTestId('show-Job');
    const gaps = page.locator('[data-testid="timeline-row"][data-gap]');
    await expect(threshold).toHaveCount(0);
    await expect(gaps).toHaveCount(0);
    await expect(hideJobs).toHaveAttribute('aria-pressed', 'false');
});
