/*
 * Pre-Work Report:
 * Schema columns used:
 *   matches: id, status, homeScore, awayScore, homeTeamId, awayTeamId
 *   predictions: id, userId, matchId, homeScore, awayScore, points, pointsType
 *   users: id, totalPoints
 *   teams: id, name, nameAr
 * finalizeMatch: created fresh (no existing admin.ts)
 * DB access: getClient() from lib/db/index for local dev
 */

import { eq } from 'drizzle-orm';
import { getClient, schema } from './db/index';
import { calculatePoints } from './scoring';

const { matches, predictions, users } = schema;

export interface FinalizeResult {
  matchId: string;
  predictionsScored: number;
  alreadyFinalized: boolean;
  error?: string;
}

/**
 * Finalize a match with actual scores and score all predictions.
 * This is the single source of truth for match finalization.
 */
export async function finalizeMatch(
  matchId: string,
  actualHomeScore: number,
  actualAwayScore: number
): Promise<FinalizeResult> {
  const db = getClient();

  // 1. Check if match exists and is not already finalized
  const matchResult = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  const match = matchResult[0];

  if (!match) {
    return { matchId, predictionsScored: 0, alreadyFinalized: false, error: `Match ${matchId} not found` };
  }

  if (match.status === 'finished') {
    return { matchId, predictionsScored: 0, alreadyFinalized: true };
  }

  // 2. Update match with actual scores and set status to finished
  await db.update(matches)
    .set({
      homeScore: actualHomeScore,
      awayScore: actualAwayScore,
      status: 'finished',
    })
    .where(eq(matches.id, matchId));

  // 3. Fetch all predictions for this match
  const matchPredictions = await db.select().from(predictions).where(eq(predictions.matchId, matchId));

  if (matchPredictions.length === 0) {
    return { matchId, predictionsScored: 0, alreadyFinalized: false };
  }

  // 4. Score each prediction and collect affected user IDs
  const affectedUserIds = new Set<string>();

  for (const prediction of matchPredictions) {
    const result = calculatePoints(
      prediction.homeScore,
      prediction.awayScore,
      actualHomeScore,
      actualAwayScore
    );

    await db.update(predictions)
      .set({ points: result.points, pointsType: result.pointsType })
      .where(eq(predictions.id, prediction.id));

    affectedUserIds.add(prediction.userId);
  }

  // 5. Recalculate totalPoints for every affected user
  for (const userId of affectedUserIds) {
    const userPredictions = await db.select().from(predictions).where(eq(predictions.userId, userId));
    const finished = userPredictions.filter(p => p.points !== null);
    const totalPoints = finished.reduce((sum, p) => sum + (p.points ?? 0), 0);

    await db.update(users)
      .set({ totalPoints })
      .where(eq(users.id, userId));
  }

  return {
    matchId,
    predictionsScored: matchPredictions.length,
    alreadyFinalized: false,
  };
}
