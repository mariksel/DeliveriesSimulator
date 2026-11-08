import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** Runs a scenario to its end, with the timeline down to its commits. */
async function ranToTheEnd(page: Page): Promise<void> {
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    await page.getByTestId('zoom-Commits').click();
    await page.getByRole('button', { name: 'max', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    const statusState = page.getByTestId('status-state');
    await expect(statusState).toHaveText('Ended');
}

async function openedOneOrder(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    await ranToTheEnd(page);
}

/** States that the customer won't take order A, from the form in the run controls. */
async function statedCustomerWont(page: Page): Promise<void> {
    await page.getByTestId('state-indirect').click();
    const form = page.getByTestId('indirect-form');
    await expect(form).toBeVisible();
    await form.getByTestId('indirect-kind').selectOption('customer-wont-take-order');
    await form.getByTestId('indirect-order').selectOption('A');
    await form.getByTestId('indirect-state').click();
}

test('stating an indirect effect makes a hollow commit the service does not see', async ({
    page,
}) => {
    await openedOneOrder(page);

    await statedCustomerWont(page);

    const form = page.getByTestId('indirect-form');
    await expect(form).toHaveCount(0);
    const indirect = page.locator('[data-testid="commit-cell"][data-mark="Indirect"]');
    await expect(indirect).toHaveCount(1);
    await expect(indirect).toContainText("The customer won't take an order");
    const headings = page.getByTestId('branch-heading');
    await expect(headings).toHaveCount(1);
});

test('stating one while an earlier commit is shown forks first', async ({ page }) => {
    await openedOneOrder(page);
    await page.getByTestId('place-slider').fill('40');

    await statedCustomerWont(page);

    const headings = page.getByTestId('branch-heading');
    await expect(headings).toHaveCount(2);
    const fork = headings.nth(1);
    await expect(fork).toHaveClass(/is-current/);
    const indirect = page.locator('[data-testid="commit-cell"][data-mark="Indirect"]');
    await expect(indirect).toHaveCount(1);
});

test('the form says what is missing, and Cancel closes it stating nothing', async ({ page }) => {
    await openedOneOrder(page);
    await page.getByTestId('state-indirect').click();
    const form = page.getByTestId('indirect-form');
    await form.getByTestId('indirect-kind').selectOption('restaurant-runs-late');

    await form.getByTestId('indirect-state').click();

    const problem = form.getByTestId('indirect-problem');
    await expect(problem).toContainText('How much later');
    await form.getByTestId('indirect-cancel').click();
    await expect(form).toHaveCount(0);
    const indirect = page.locator('[data-testid="commit-cell"][data-mark="Indirect"]');
    await expect(indirect).toHaveCount(0);
});

/**
 * Scrolls the timeline down from its top, a screen at a time, until a row is drawn: its rows are
 * drawn only near where it is scrolled to, and it follows the latest commit.
 */
async function scrolledDownTo(page: Page, row: Locator, isFromTop: boolean): Promise<void> {
    const list = page.getByTestId('timeline-rows');
    if (isFromTop) {
        await list.evaluate((element) => {
            element.scrollTop = 0;
        });
    }
    await expect
        .poll(
            async () => {
                await list.evaluate((element) => {
                    element.scrollTop += element.clientHeight / 2;
                });
                return row.count();
            },
            { intervals: [100], timeout: 20_000 },
        )
        .toBeGreaterThan(0);
}

test("a scenario's indirect step shows how long the service was unaware", async ({ page }) => {
    await page.goto('/');
    await page
        .getByLabel('Open a scenario file')
        .setInputFiles('e2e/fixtures/indirect-effects.json');

    await ranToTheEnd(page);

    const indirect = page.locator('[data-testid="commit-cell"][data-mark="Indirect"]');
    await scrolledDownTo(page, indirect, true);
    await expect(indirect).toContainText('A driver ignores a request');
    await expect(indirect).toHaveAttribute('data-unaware', 'start');
    const time = page.getByTestId('unaware-time');
    await scrolledDownTo(page, time, false);
    await expect(time).toHaveText('Unaware for h00:m00:s25:ms00');
});
