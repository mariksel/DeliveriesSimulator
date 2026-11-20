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

/** A commit early in the one-order run, after the order is created and before it is delivered. */
const EARLY_PLACE = '10';

test('a run opens on the map, with the city, its restaurant, and its driver', async ({ page }) => {
    await opened(page);

    const tab = page.getByTestId('map-tab');
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    const areas = page.getByTestId('map-area');
    const restaurants = page.getByTestId('map-Restaurant');
    const drivers = page.getByTestId('map-Driver');
    await expect(areas).toHaveCount(4);
    await expect(restaurants).toHaveCount(1);
    await expect(drivers).toHaveCount(1);
});

test("the map draws each area's waiting point, where idle drivers wait", async ({ page }) => {
    await opened(page);

    const points = page.getByTestId('map-waiting-point');
    await expect(points).toHaveCount(4);
});

test("the map draws the city's streets, main roads apart from local ones", async ({ page }) => {
    await opened(page);

    const main = page.getByTestId('map-streets-main');
    const local = page.getByTestId('map-streets-local');
    await expect(main).toHaveAttribute('d', /^M.+L/);
    await expect(local).toHaveAttribute('d', /^M.+L/);
});

test('partway through, the order shows in its views, and a switch hides a kind', async ({
    page,
}) => {
    await ranToTheEnd(page);

    await page.getByTestId('place-slider').fill(EARLY_PLACE);

    const restaurantViews = page.getByTestId('map-RestaurantOrder');
    const parcels = page.getByTestId('map-Parcel');
    await expect(restaurantViews).toHaveCount(1);
    await expect(parcels).toHaveCount(1);
    await page.getByTestId('map-layer-Restaurants').click();
    await expect(restaurantViews).toHaveCount(0);
    await expect(parcels).toHaveCount(1);
});

test('clicking the driver selects them, as the timeline does', async ({ page }) => {
    await opened(page);
    const driver = page.getByTestId('map-Driver');

    await driver.click();

    await expect(driver).toHaveAttribute('aria-pressed', 'true');
});

test('the wheel zooms the map, and Fit brings the whole city back', async ({ page }) => {
    await opened(page);
    const map = page.getByTestId('map');
    const fitted = await map.getAttribute('viewBox');

    await map.hover();
    await page.mouse.wheel(0, -200);

    await expect(map).not.toHaveAttribute('viewBox', fitted ?? '');
    await page.getByTestId('map-fit').click();
    await expect(map).toHaveAttribute('viewBox', fitted ?? '');
});

test('once delivered, the order stays faint at its address; partway, its address has a pin', async ({
    page,
}) => {
    await ranToTheEnd(page);
    const pins = page.getByTestId('map-Pin');
    const delivered = page.getByTestId('map-Delivered');

    await expect(delivered).toHaveCount(1);
    await expect(pins).toHaveCount(0);
    await page.getByTestId('map-layer-Delivered').click();
    await expect(delivered).toHaveCount(0);

    await page.getByTestId('place-slider').fill(EARLY_PLACE);
    await expect(pins).toHaveCount(1);
});

test('while the driver rides to the restaurant, the map draws their route still to go', async ({
    page,
}) => {
    await ranToTheEnd(page);
    const routes = page.getByTestId('map-route');

    // Commit 65 is just after the driver accepts and sets off, at one minute.
    await page.getByTestId('place-slider').fill('65');

    await expect(routes).toHaveCount(1);
    await page.getByTestId('map-layer-Drivers').click();
    await expect(routes).toHaveCount(0);
});
