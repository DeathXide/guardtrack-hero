import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8081';
const SHIFT_INVOICE_ID = '73a11f34-0ad3-4fb0-998a-ba0ace616c66';
const MONTHLY_INVOICE_ID = '910fb6b9-5c98-4586-bbcf-1edc89906528';

async function login(page) {
  await page.goto(`${BASE}/auth`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder="Enter your email"]').fill('hruthu1303@gmail.com');
  await page.locator('input[placeholder="Enter your password"]').fill('Fire@1234');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Invoice Edit - Man Days Auto-Calculate', () => {

  test('shift invoice: Man Days label is visible', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/invoices/${SHIFT_INVOICE_ID}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const manDays = page.getByText('Man Days').first();
    await expect(manDays).toBeVisible({ timeout: 5000 });
  });

  test('shift invoice: calculator button shows date inputs', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/invoices/${SHIFT_INVOICE_ID}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Before clicking: count date inputs (should be 3: Period From, Period To, Invoice Date)
    const datesBefore = await page.locator('input[type="date"]').count();
    console.log('Date inputs before:', datesBefore);

    // Click the calculator icon button
    const calcBtn = page.locator('button').filter({ has: page.locator('.lucide-calculator') }).first();
    await expect(calcBtn).toBeVisible({ timeout: 3000 });
    await calcBtn.click();
    await page.waitForTimeout(500);

    // After clicking: should have 2 more date inputs (from/to for the line item)
    const datesAfter = await page.locator('input[type="date"]').count();
    console.log('Date inputs after:', datesAfter);

    await page.screenshot({ path: 'tests/screenshots/after-calc-click.png', fullPage: true });

    expect(datesAfter).toBe(datesBefore + 2);
  });

  test('shift invoice: changing dates recalculates man days', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/invoices/${SHIFT_INVOICE_ID}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Switch to date mode
    const calcBtn = page.locator('button').filter({ has: page.locator('.lucide-calculator') }).first();
    await calcBtn.click();
    await page.waitForTimeout(500);

    // Find the line-item date inputs. The last two date inputs on the page are our new ones.
    const allDates = page.locator('input[type="date"]');
    const totalDates = await allDates.count();

    // The new from/to are the last two
    const fromInput = allDates.nth(totalDates - 2);
    const toInput = allDates.nth(totalDates - 1);

    // Clear and set custom dates: Sep 5 to Sep 25 = 21 days
    await fromInput.fill('2025-09-05');
    await page.waitForTimeout(300);
    await toInput.fill('2025-09-25');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/after-date-change.png', fullPage: true });

    // The man-days display is now a bold number inside the date-range row
    const manDaysSpan = page.locator('.font-mono.font-bold').filter({ hasText: /^\d+$/ });
    const manDaysText = await manDaysSpan.first().innerText().catch(() => 'NOT_FOUND');
    console.log('Man days after date change:', manDaysText);

    expect(manDaysText).toBe('21');
  });

  test('shift invoice: pencil button switches back to manual input', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/invoices/${SHIFT_INVOICE_ID}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Switch to date mode
    const calcBtn = page.locator('button').filter({ has: page.locator('.lucide-calculator') }).first();
    await calcBtn.click();
    await page.waitForTimeout(500);

    // Now click the pencil button to switch back
    const pencilBtn = page.locator('button').filter({ has: page.locator('.lucide-pencil') }).first();
    await expect(pencilBtn).toBeVisible({ timeout: 3000 });
    await pencilBtn.click();
    await page.waitForTimeout(500);

    // The calculator button should be back (not pencil)
    const calcBtnAgain = page.locator('button').filter({ has: page.locator('.lucide-calculator') }).first();
    await expect(calcBtnAgain).toBeVisible({ timeout: 3000 });

    // And the man days number input should be visible again
    const manDaysInput = page.locator('input[type="number"]').last();
    await expect(manDaysInput).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/after-pencil-click.png', fullPage: true });
  });

  test('monthly invoice: Man Days is NOT visible', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/invoices/${MONTHLY_INVOICE_ID}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const manDays = page.getByText('Man Days');
    const visible = await manDays.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBeFalsy();
  });
});
