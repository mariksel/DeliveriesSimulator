import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function openedRules(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open: One order, happy path' }).click();
    const scenarioName = page.getByTestId('scenario-name');
    await expect(scenarioName).toBeVisible();
    // Down to the commits, which these tests pick out (FND-87).
    await page.getByTestId('zoom-Commits').click();
    await page.getByTestId('rules-tab').click();
}

function parameterRow(page: Page, ruleId: string, parameterId: string): Locator {
    const rule = page.locator(`[data-rule-id="${ruleId}"]`);
    return rule.locator(`[data-parameter-id="${parameterId}"]`);
}

test("the Rules panel lists each module's rules with the values in use", async ({ page }) => {
    await openedRules(page);

    const panel = page.getByTestId('rules-panel');
    const headings = panel.getByRole('heading', { level: 2 });
    await expect(headings).toHaveText(['Orders', 'Drivers', 'Deliveries']);
    const interval = parameterRow(page, 'drivers.dispatch-pass', 'interval');
    const value = interval.getByTestId('parameter-value');
    await expect(value).toHaveText('h00:m00:s30:ms00');
    const online = page.locator('[data-rule-id="drivers.online"]');
    await expect(online).toContainText('It takes no values');
});

test('a person changes a rule during a run, as a config change in the log', async ({ page }) => {
    await openedRules(page);
    const interval = parameterRow(page, 'drivers.dispatch-pass', 'interval');
    const input = interval.getByTestId('parameter-input');

    await input.fill('h00:m00:s10:ms00');
    await interval.getByRole('button', { name: 'Set' }).click();

    const value = interval.getByTestId('parameter-value');
    await expect(value).toHaveText('h00:m00:s10:ms00');
    const commits = page.getByTestId('commit-cell');
    const configChanges = commits.filter({ hasText: 'ConfigChanged' });
    await expect(configChanges).toHaveCount(1);
});

test('the Rules panel marks a value outside its valid range, and still uses it', async ({
    page,
}) => {
    await openedRules(page);
    const distance = parameterRow(page, 'drivers.near-restaurant', 'max-distance');
    const input = distance.getByTestId('parameter-input');

    await input.fill('100');
    await input.press('Enter');

    const value = distance.getByTestId('parameter-value');
    await expect(value).toContainText('100');
    const mark = distance.getByTestId('out-of-range');
    await expect(mark).toBeVisible();
});

test('the Rules panel says why it cannot use a typed value', async ({ page }) => {
    await openedRules(page);
    const interval = parameterRow(page, 'drivers.dispatch-pass', 'interval');
    const input = interval.getByTestId('parameter-input');

    await input.fill('h00:m00:s00:ms00');
    await interval.getByRole('button', { name: 'Set' }).click();

    const problem = interval.getByTestId('parameter-problem');
    await expect(problem).toHaveText('The value must be a whole number above 0.');
    const value = interval.getByTestId('parameter-value');
    await expect(value).toHaveText('h00:m00:s30:ms00');
});
