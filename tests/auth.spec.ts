import { test, expect } from '@playwright/test';
import { loginHelper, TEST_EMAIL, TEST_PASSWORD } from './helpers/auth';

const BASE = process.env.BASE_URL || 'https://fifa26-predictions.moh-zaher.workers.dev';

test.describe('🔐 Auth Flow — localStorage-based auth', () => {

  test('SC-AUTH-001: User can log in and user object is stored in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => localStorage.getItem('fifa26_user') !== null);

    const stored = await page.evaluate(() => localStorage.getItem('fifa26_user'));
    expect(stored).not.toBeNull();
    const user = JSON.parse(stored!);
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email', TEST_EMAIL);
    expect(user).toHaveProperty('name');
  });

  test('SC-AUTH-002: User session survives page refresh (localStorage)', async ({ page }) => {
    await loginHelper(page);
    const urlBefore = page.url();

    await page.reload();

    await expect(page).toHaveURL(urlBefore);
    const stored = await page.evaluate(() => localStorage.getItem('fifa26_user'));
    expect(stored).not.toBeNull();
  });

  test('SC-AUTH-003: Session persists when opening a new tab (same origin, shared localStorage)', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    await loginHelper(page1);

    const page2 = await context.newPage();
    await page2.goto(BASE);

    const stored = await page2.evaluate(() => localStorage.getItem('fifa26_user'));
    expect(stored).not.toBeNull();
  });

  test('SC-AUTH-004: Unauthenticated users see LoginView, not protected content', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').textContent();
    // Should see login/register form, not match cards or admin panels
    expect(body).toContain('تسجيل الدخول');
    expect(body).toContain('ملك التوقعات');
  });

  test('SC-AUTH-005: Logout removes user from localStorage, page returns to login', async ({ page }) => {
    await loginHelper(page);

    await page.click('button:has-text("خروج")');
    await page.waitForTimeout(500);

    const stored = await page.evaluate(() => localStorage.getItem('fifa26_user'));
    expect(stored).toBeNull();

    await page.goto(BASE);
    const body = await page.locator('body').textContent();
    expect(body).toContain('تسجيل الدخول');
  });

  test('SC-AUTH-006: Logout is a client-side only operation — server does not invalidate (by design)', async ({ page, request }) => {
    // This is a design observation: POST /api/auth/logout is a no-op
    const res = await fetch(BASE + '/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    expect(data).toEqual({ success: true });
  });

  test('SC-AUTH-007: Wrong password shows generic error, not email-specific message', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'nonexistent@almarshad.com');
    await page.fill('input[type="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    const errorText = await page.locator('text=بيانات الدخول غير صحيحة').textContent();
    expect(errorText).toBeTruthy();

    // Try existing email with wrong password
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', 'DefinitelyWrongPass!');
    await page.click('button[type="submit"]');

    const errorText2 = await page.locator('text=بيانات الدخول غير صحيحة').textContent();
    expect(errorText2).toBeTruthy();
  });

  test('SC-AUTH-008: Admin auto-authenticated on login (token auto-stored)', async ({ page }) => {
    await loginHelper(page);
    await page.goto(BASE);

    // Admin tab is visible because admin@almarshad.com email check passes
    const adminTab = page.locator('button:has-text("الإدارة")');
    await expect(adminTab).toBeVisible();

    await adminTab.click();

    // After fix: admin token is auto-returned by login and stored in localStorage.
    // The admin panel tabs are shown directly (no token prompt).
    const token = await page.evaluate(() => localStorage.getItem('fifa26_admin_token'));
    expect(token).toBeTruthy();

    // The user tabs (e.g. "المستخدمين") should be visible
    const usersTab = page.locator('text=المستخدمين');
    await expect(usersTab).toBeVisible();
  });

});
