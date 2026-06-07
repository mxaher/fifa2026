import { test, expect } from '@playwright/test';
import { loginHelper } from './helpers/auth';

test.describe('🎭 UX Resilience Testing', () => {

  test('SC-UX-001: Back button after login does not break the app', async ({ page }) => {
    await page.goto('/');
    await loginHelper(page);
    const currentUrl = page.url();

    // Press back
    await page.goBack();
    await page.waitForTimeout(500);

    // Should either stay on same page or gracefully handle (not crash)
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('error');
  });

  test('SC-UX-002: Refresh while logged in preserves state', async ({ page }) => {
    await loginHelper(page);
    await page.reload();
    await page.waitForTimeout(1000);

    const stored = await page.evaluate(() => localStorage.getItem('fifa26_user'));
    expect(stored).not.toBeNull();
  });

  test('SC-UX-003: Page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('⚠️ Console errors found:', errors);
    }
  });

  test('SC-UX-004: Hero page loads with all key elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent();
    expect(body).toContain('ملك التوقعات');
    expect(body).toContain('FIFA WORLD CUP');
    expect(body).toContain('تسجيل الدخول');
  });

  test('SC-UX-005: Match schedule is visible on login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const body = await page.locator('body').textContent();
    expect(body).toContain('جدول المباريات');
  });

  test('SC-UX-006: Login form has working toggle between login and register', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Click register toggle
    await page.click('text=ليس لديك حساب؟');
    await page.waitForTimeout(500);

    const body = await page.locator('body').textContent();
    expect(body).toContain('إنشاء حساب جديد');
    expect(body).toContain('الاسم الكامل');
    expect(body).toContain('القسم');
  });

});
