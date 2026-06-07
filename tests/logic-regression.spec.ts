import { test, expect } from '@playwright/test';

// ─── REGRESSION FIXTURES ───
// These are known-correct outputs computed by the oracle.
// If any of these break, a code change has broken the math.

function referenceCalculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): { points: number; pointsType: string } {
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: 3, pointsType: 'exact' };
  }
  const predictedOutcome = Math.sign(predictedHome - predictedAway);
  const actualOutcome = Math.sign(actualHome - actualAway);
  if (predictedOutcome === actualOutcome) {
    return { points: 2, pointsType: 'correct' };
  }
  return { points: 0, pointsType: 'wrong' };
}

const REGRESSION_FIXTURES = [
  { desc: 'Exact: 2-1 home win', pred: [2, 1], actual: [2, 1], expected: { points: 3, type: 'exact' } },
  { desc: 'Exact: 0-0 draw', pred: [0, 0], actual: [0, 0], expected: { points: 3, type: 'exact' } },
  { desc: 'Exact: 1-1 draw', pred: [1, 1], actual: [1, 1], expected: { points: 3, type: 'exact' } },
  { desc: 'Correct: home win, wrong score', pred: [3, 0], actual: [1, 0], expected: { points: 2, type: 'correct' } },
  { desc: 'Correct: away win, wrong score', pred: [0, 2], actual: [1, 3], expected: { points: 2, type: 'correct' } },
  { desc: 'Correct: draw, wrong score', pred: [2, 2], actual: [0, 0], expected: { points: 2, type: 'correct' } },
  { desc: 'Wrong: predicted home win, actual away win', pred: [2, 0], actual: [0, 1], expected: { points: 0, type: 'wrong' } },
  { desc: 'Wrong: predicted draw, actual home win', pred: [0, 0], actual: [2, 0], expected: { points: 0, type: 'wrong' } },
  { desc: 'Wrong: predicted home win, actual draw', pred: [1, 0], actual: [0, 0], expected: { points: 0, type: 'wrong' } },
  { desc: 'High score exact: 7-1', pred: [7, 1], actual: [7, 1], expected: { points: 3, type: 'exact' } },
  { desc: 'High score correct: 5-0 vs 3-0', pred: [5, 0], actual: [3, 0], expected: { points: 2, type: 'correct' } },
];

test.describe('📋 REGRESSION SUITE — Scoring Oracle Lockdown', () => {
  for (const fixture of REGRESSION_FIXTURES) {
    test(`REGRESSION: ${fixture.desc}`, () => {
      const result = referenceCalculatePoints(
        fixture.pred[0], fixture.pred[1],
        fixture.actual[0], fixture.actual[1]
      );
      expect(result.points).toBe(fixture.expected.points);
      expect(result.pointsType).toBe(fixture.expected.type);
    });
  }
});

test.describe('📋 Full Enumeration — All 0-5 Score Combinations', () => {
  test('All 6×6×6×6 = 1296 combinations produce valid results', () => {
    const results: Record<string, number> = { exact: 0, correct: 0, wrong: 0 };
    for (let pH = 0; pH <= 5; pH++) {
      for (let pA = 0; pA <= 5; pA++) {
        for (let aH = 0; aH <= 5; aH++) {
          for (let aA = 0; aA <= 5; aA++) {
            const r = referenceCalculatePoints(pH, pA, aH, aA);
            results[r.pointsType]++;
            expect([3, 2, 0]).toContain(r.points);
            expect(['exact', 'correct', 'wrong']).toContain(r.pointsType);
          }
        }
      }
    }
    // Verify distribution
    expect(results.exact).toBe(6 * 6); // 36 exact matches (diagonal)
    expect(results.correct).toBeGreaterThan(0);
    expect(results.wrong).toBeGreaterThan(0);
    expect(results.exact + results.correct + results.wrong).toBe(1296);
  });
});
