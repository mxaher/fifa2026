import { Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'admin@almarshad.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Admin@FIFA2026!';

export async function loginHelper(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForFunction(() => localStorage.getItem('fifa26_user') !== null);
}

export async function getAuthCookies(page: Page) {
  return page.context().cookies();
}

export { TEST_EMAIL, TEST_PASSWORD };
