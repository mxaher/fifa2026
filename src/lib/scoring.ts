export type PointsType = 'exact' | 'correct' | 'wrong';

export interface ScoreResult {
  points: number;
  pointsType: PointsType;
}

export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): ScoreResult {
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
