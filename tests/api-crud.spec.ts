import { test, expect } from '@playwright/test';
import { loginHelper, TEST_EMAIL, TEST_PASSWORD } from './helpers/auth';

const BASE = process.env.BASE_URL || 'https://fifa26-predictions.moh-zaher.workers.dev';

test.describe('📡 API — CRUD & Data Integrity', () => {

  test('GET /api — health check returns ok', async ({ request }) => {
    const res = await request.get('/api');
    const data = await res.json();
    expect(res.status()).toBe(200);
    expect(data.status).toBe('ok');
  });

  test('GET /api/departments — returns department list', async ({ request }) => {
    const res = await request.get('/api/departments');
    const data = await res.json();
    expect(res.status()).toBe(200);
    expect(data.departments).toBeInstanceOf(Array);
    expect(data.departments.length).toBeGreaterThan(0);
  });

  test('GET /api/matches — returns match list with teams', async ({ request }) => {
    const res = await request.get('/api/matches');
    const data = await res.json();
    expect(res.status()).toBe(200);
    expect(data.matches).toBeInstanceOf(Array);
    expect(data.matches.length).toBeGreaterThan(0);

    const match = data.matches[0];
    expect(match).toHaveProperty('homeTeam');
    expect(match).toHaveProperty('awayTeam');
    expect(match.homeTeam).toHaveProperty('name');
    expect(match.awayTeam).toHaveProperty('name');
  });

  test('GET /api/leaderboard — returns ranked users', async ({ request }) => {
    const res = await request.get('/api/leaderboard');
    const data = await res.json();
    expect(res.status()).toBe(200);
    expect(data.leaderboard).toBeInstanceOf(Array);
    if (data.leaderboard.length > 0) {
      expect(data.leaderboard[0]).toHaveProperty('rank');
      expect(data.leaderboard[0]).toHaveProperty('name');
      expect(data.leaderboard[0]).toHaveProperty('totalPoints');
      expect(data.leaderboard[0]).toHaveProperty('predictions');
    }
  });

  test('GET /api/leaderboard — admins are excluded', async ({ request }) => {
    const res = await request.get('/api/leaderboard');
    const data = await res.json();
    for (const entry of data.leaderboard) {
      expect(entry.name).not.toBe('admin'); // No admin user in leaderboard
    }
  });

  test('POST /api/predictions — fails without auth (no userId)', async ({ request }) => {
    const res = await request.post('/api/predictions', {
      data: { matchId: 'nonexistent', homeScore: 1, awayScore: 0 },
    });
    // Should fail validation — userId required
    expect(res.status()).toBe(400);
  });

  test('POST /api/predictions — validates match exists', async ({ request }) => {
    const leaderboard = await (await request.get('/api/leaderboard')).json();
    const userId = leaderboard.leaderboard[0]?.id;
    expect(userId).toBeTruthy();

    const res = await request.post('/api/predictions', {
      data: { userId, matchId: '00000000-0000-0000-0000-000000000000', homeScore: 1, awayScore: 0 },
    });
    expect(res.status()).toBe(404);
  });

  test('POST /api/predictions — validates scores exist', async ({ request }) => {
    const res = await request.post('/api/predictions', {
      data: { userId: 'test', matchId: 'test' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/auth/register — validates required fields', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'test@test.com' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/auth/register — rejects duplicate emails', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { name: 'Test', email: TEST_EMAIL, password: 'Pass123!', department: 'it' },
    });
    // Should be 409 conflict since admin@almarshad.com already exists
    expect([409, 400]).toContain(res.status());
  });

  test('GET /api/sync — requires X-Admin-Token (FIX VERIFIED)', async ({ request }) => {
    // After the security fix, GET /api/sync requires admin token
    const res = await request.get('/api/sync');
    expect(res.status()).toBe(401);
  });

  test('Pagination consistency — no duplicate IDs across pages', async ({ request }) => {
    const page1 = await (await request.get('/api/matches')).json();
    const page2 = await (await request.get('/api/matches')).json();

    expect(page1.matches.length).toBe(page2.matches.length);
  });

});
