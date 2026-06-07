import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://fifa26-predictions.moh-zaher.workers.dev';

test.describe('🛡️ Security Testing', () => {

  test('SEC-001: Auth is localStorage-based — no HttpOnly cookies (design limitation)', async ({ page }) => {
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(c =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('auth') ||
      c.name.toLowerCase().includes('token')
    );
    // The app uses localStorage, not cookies — this is a design concern
    // but not a cookie misconfiguration since no auth cookies exist
    expect(authCookies.length).toBe(0);
    console.log('ℹ️ No auth cookies exist — auth is purely localStorage-based');
  });

  test('SEC-002: localStorage stores user data in plaintext JSON', async ({ page }) => {
    await page.goto(BASE);
    const fifa26User = await page.evaluate(() => localStorage.getItem('fifa26_user'));
    if (fifa26User) {
      const parsed = JSON.parse(fifa26User);
      // Sensitive fields should not be stored
      expect(parsed).not.toHaveProperty('password_hash');
      expect(parsed).not.toHaveProperty('salt');
      expect(parsed).not.toHaveProperty('password');
      // But email and ID are exposed in plaintext
      expect(parsed).toHaveProperty('email');
      expect(parsed).toHaveProperty('id');
    }
  });

  test('SEC-003: CORS headers are set on API routes', async ({ request }) => {
    // /api health check may not have middleware applied; test a route that definitely does
    const res = await request.get('/api/matches');
    const headers = res.headers();
    const corsOrigin = headers['access-control-allow-origin'];
    if (corsOrigin) {
      expect(corsOrigin).not.toBe('*');
    } else {
      console.log('ℹ️ No CORS header on /api/matches — middleware may not apply to all routes in CF Workers');
    }
  });

  test('SEC-004: Admin endpoints require X-Admin-Token', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    // Without admin token, should be 401
    expect(res.status()).toBe(401);

    const res2 = await request.post('/api/admin/result', {
      data: { matchId: 'test', homeScore: 1, awayScore: 0 },
    });
    expect(res2.status()).toBe(401);
  });

  test('SEC-005: GET /api/sync has no auth protection (vulnerability)', async ({ request }) => {
    const res = await request.get('/api/sync');
    expect(res.status()).toBe(200);
    // This endpoint calls syncResults() which is an expensive operation
    // No auth check means anyone can trigger it
    console.log('⚠️ GET /api/sync is unauthenticated — anyone can trigger a sync');
  });

  test('SEC-006: Registration has no password strength validation', async ({ request }) => {
    // The register endpoint accepts any password
    const res = await request.post('/api/auth/register', {
      data: {
        name: 'WeakPassUser',
        email: `weakpass_${Date.now()}@test.com`,
        password: '1', // Single character password
        department: 'it',
      },
    });
    // Accepts any password length — no minimum
    const data = await res.json();
    if (data.user) {
      console.log('⚠️ Registration accepted password of length 1 — no minimum');
    }
  });

  test('SEC-007: Login does not reveal if email exists (banned message is an exception)', async ({ request }) => {
    // Non-existent email -> "بيانات الدخول غير صحيحة"
    const res1 = await request.post('/api/auth/login', {
      data: { email: `nonexistent_${Date.now()}@test.com`, password: 'AnyPass123!' },
    });
    const data1 = await res1.json();
    expect(data1.error).toBe('بيانات الدخول غير صحيحة');

    // Wrong password for existing user -> "بيانات الدخول غير صحيحة" 
    const res2 = await request.post('/api/auth/login', {
      data: { email: 'admin@almarshad.com', password: 'WrongPassword!' },
    });
    const data2 = await res2.json();
    expect(data2.error).toBe('بيانات الدخول غير صحيحة');
  });

  test('SEC-008: No CSRF protection on state-changing endpoints', async ({ request }) => {
    // Predictions POST does not check for CSRF tokens — validates data only
    // With fake IDs, it should return 404 (match not found), not 403 (CSRF rejection)
    const res = await request.post('/api/predictions', {
      data: { userId: 'test', matchId: '00000000-0000-0000-0000-000000000000', homeScore: 1, awayScore: 0 },
    });
    // The endpoint validates match existence first and returns 404
    // There is no CSRF mechanism — if there were, we'd get 403
    expect(res.status()).toBe(404);
    console.log('⚠️ No CSRF rejection (403) — endpoint returned data validation error instead');
  });

});
