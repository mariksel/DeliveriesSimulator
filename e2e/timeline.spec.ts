import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** A commit of the one-order run whose state change wrote three events. */
const COMMIT_WITH_EVENTS = '38';

async function opened(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    // Down to the commits, which these tests pick out (FND-87).
    await page.getByTestId('zoom-Commits').click();
}

async function ranToTheEnd(page: Page): Promise<void> {
    await opened(page);
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

const shownCommit = (page: Page): Locator => page.locator('[data-testid="commit-cell"].is-shown');

/** Shows a commit with events, and chooses it, which opens it to its events. */
async function chosenCommitWithEvents(page: Page): Promise<void> {
    await ranToTheEnd(page);
    await page.getByTestId('place-slider').fill(COMMIT_WITH_EVENTS);
    await shownCommit(page).click();
}

test('the timeline starts empty, and fills as a run goes', async ({ page }) => {
    await opened(page);
    const noEvents = page.getByTestId('no-commits');
    await expect(noEvents).toBeVisible();

    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();

    const commit = page.getByTestId('commit-cell').first();
    await expect(commit).toBeVisible();
});

test('it follows the commit shown to the end of a run, with its groups open', async ({ page }) => {
    await ranToTheEnd(page);

    const shown = shownCommit(page);
    await expect(shown).toBeInViewport();
    await expect(shown).toContainText('#231');
});

test('it follows the commit shown back in time too, on a fork as well', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('place-slider').fill('110');
    await page.getByTestId('fork-here').click();

    await page.getByTestId('place-slider').fill(COMMIT_WITH_EVENTS);

    const shown = shownCommit(page);
    await expect(shown).toBeInViewport();
    await expect(shown).toContainText(`#${COMMIT_WITH_EVENTS}`);
    const follow = page.getByTestId('timeline-follow');
    await expect(follow).toBeHidden();
});

test("choosing a commit opens it to its events, and shows the first one's payload", async ({
    page,
}) => {
    await chosenCommitWithEvents(page);

    const events = page.getByTestId('timeline-event');
    await expect(events).toHaveCount(3);
    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toBeVisible();
    const selected = page.locator('[data-testid="timeline-event"].is-selected');
    await expect(selected).toHaveCount(1);
});

test('choosing an event shows its full payload', async ({ page }) => {
    await chosenCommitWithEvents(page);
    const second = page.getByTestId('timeline-event').nth(1);
    const text = await second.textContent();
    const sequence = /#(\d+)/.exec(text ?? '')?.[1] ?? '';

    await second.click();

    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toContainText(`#${sequence}`);
    const payloadSource = page.getByTestId('payload-source');
    await expect(payloadSource).not.toBeEmpty();
});

test('a group opens and closes', async ({ page }) => {
    await ranToTheEnd(page);
    await page.getByTestId('zoom-Middle').click();
    const minute = page.getByTestId('timeline-row').filter({ hasText: 'h00:m04' }).first();
    const toggle = minute.getByTestId('timeline-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('zoomed out, a closed group is a summary node, and the one holding the commit shown stands out', async ({
    page,
}) => {
    await ranToTheEnd(page);

    await page.getByTestId('zoom-Top').click();

    const summaries = page.getByTestId('summary-node');
    const firstSummary = summaries.first();
    await expect(firstSummary).toBeVisible();
    const holding = page.locator('[data-testid="summary-node"].has-shown');
    await expect(holding).toHaveCount(1);
    const count = holding.locator('.summary');
    await expect(count).toHaveText('231');
    const commits = page.getByTestId('commit-cell');
    await expect(commits).toHaveCount(0);
});

test("clicking a group's summary node opens the group, and clicking it again closes it", async ({
    page,
}) => {
    await ranToTheEnd(page);
    await page.getByTestId('zoom-Top').click();
    const rows = page.getByTestId('timeline-row');
    await expect(rows).toHaveCount(1);
    const summary = page.getByTestId('summary-node').first();

    await summary.click();
    const minute = rows.filter({ hasText: 'h00:m04' });
    await expect(minute).toHaveCount(1);
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await summary.click();

    await expect(rows).toHaveCount(1);
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
});

test('calls between modules show as badges and arrows, and as a path when closed', async ({
    page,
}) => {
    await ranToTheEnd(page);
    // Commit 9 is where Deliveries calls back to Orders, in the API call requesting a delivery.
    await page.getByTestId('place-slider').fill('9');

    const shown = shownCommit(page);
    const module = shown.getByTestId('commit-module');
    await expect(module).toHaveText('Orders');
    // An arrow comes in from the commit before, which changed Deliveries.
    const call = shown.getByTestId('commit-call');
    await expect(call).toHaveCount(1);
    const select = shown.locator('.select');
    await expect(select).toHaveAttribute('aria-label', /called from Deliveries/);

    await page.getByTestId('zoom-Middle').click();
    const minute = page.getByTestId('timeline-row').filter({ hasText: 'h00:m00' }).first();
    await minute.getByTestId('timeline-toggle').click();
    const request = page
        .getByTestId('timeline-row')
        .filter({ hasText: 'API call: request-delivery' });
    await expect(request).toContainText('Orders → Deliveries → Orders');
});

test('the zoom switch shows hours, minutes, or every commit', async ({ page }) => {
    await ranToTheEnd(page);
    const rows = page.getByTestId('timeline-row');
    const commits = page.getByTestId('commit-cell');

    await page.getByTestId('zoom-Top').click();
    await expect(rows).toHaveCount(1);
    const firstRow = rows.first();
    await expect(firstRow).toContainText('h00');

    await page.getByTestId('zoom-Middle').click();
    const minute = rows.filter({ hasText: 'h00:m04' });
    await expect(minute).toHaveCount(1);
    await expect(commits).toHaveCount(0);

    await page.getByTestId('zoom-Commits').click();
    const firstCommit = commits.first();
    await expect(firstCommit).toBeVisible();
});

test('rows line up by number too, under blocks of job runs and API calls', async ({ page }) => {
    await ranToTheEnd(page);

    await page.getByTestId('rows-by-number').click();

    const shown = shownCommit(page);
    await expect(shown).toContainText('#231');
    const list = page.getByTestId('timeline-rows');
    await list.evaluate((element) => {
        element.scrollTop = 0;
    });
    const firstRow = page.getByTestId('timeline-row').first();
    await expect(firstRow).toContainText('Job runs and calls 1–100');
});

test('the verdict and the event have their own tabs', async ({ page }) => {
    await ranToTheEnd(page);
    const runVerdict = page.getByTestId('run-verdict');
    await expect(runVerdict).toBeVisible();

    await page.getByTestId('place-slider').fill(COMMIT_WITH_EVENTS);
    await shownCommit(page).click();
    const payloadKind = page.getByTestId('payload-kind');
    await expect(payloadKind).toBeVisible();
    await expect(runVerdict).toBeHidden();

    await page.getByRole('tab', { name: 'Verdict' }).click();
    await expect(runVerdict).toBeVisible();

    await page.getByRole('tab', { name: 'Event', exact: true }).click();
    await expect(payloadKind).toBeVisible();
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

test('Caused by selects the entry that caused this one, shown on the timeline', async ({
    page,
}) => {
    await chosenCommitWithEvents(page);
    const lastEvent = page.getByTestId('timeline-event').last();
    await lastEvent.click();
    const payloadKind = page.getByTestId('payload-kind');
    const before = await payloadKind.textContent();

    await page.getByTestId('payload-caused-by').click();

    await expect(payloadKind).not.toHaveText(before ?? '');
    const selected = page.locator('[data-testid="timeline-event"].is-selected');
    await expect(selected).toBeInViewport();
});

test('choosing a commit stops following, and Follow turns it back on', async ({ page }) => {
    await opened(page);
    await page.getByRole('button', { name: '600x' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const commit = page.getByTestId('commit-cell').first();
    await expect(commit).toBeVisible();

    await commit.click();
    const follow = page.getByTestId('timeline-follow');
    await expect(follow).toBeVisible();

    await follow.click();
    await expect(follow).toBeHidden();
});

test('pressing a commit stops following before the press is released', async ({ page }) => {
    await ranToTheEnd(page);
    await shownCommit(page).hover();

    await page.mouse.down();
    const follow = page.getByTestId('timeline-follow');
    await expect(follow).toBeVisible();

    await page.mouse.up();
});

test('the Follow button does not change the height of the timeline', async ({ page }) => {
    await ranToTheEnd(page);
    const list = page.getByTestId('timeline-rows');
    const before = (await list.boundingBox())!.height;

    await shownCommit(page).click();
    const follow = page.getByTestId('timeline-follow');
    await expect(follow).toBeVisible();

    expect((await list.boundingBox())!.height).toBe(before);
});

test('Copy says what happened', async ({ page }) => {
    await chosenCommitWithEvents(page);

    await page.getByTestId('payload-copy').click();

    const payloadCopied = page.getByTestId('payload-copied');
    await expect(payloadCopied).toHaveText(/Copied|Could not copy/);
});
