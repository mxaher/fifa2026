import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = getClient();

    const allUsers = await db.select().from(schema.users).orderBy(desc(schema.users.totalPoints));

    const allPredictions = await db.select().from(schema.predictions);

    // Build prediction stats per user
    const userStats = new Map<string, { total: number; exact: number; correct: number; wrong: number; pending: number }>();

    for (const pred of allPredictions) {
      if (!userStats.has(pred.userId)) {
        userStats.set(pred.userId, { total: 0, exact: 0, correct: 0, wrong: 0, pending: 0 });
      }
      const stats = userStats.get(pred.userId)!;
      stats.total++;
      if (pred.pointsType === "exact") stats.exact++;
      else if (pred.pointsType === "correct") stats.correct++;
      else if (pred.pointsType === "wrong") stats.wrong++;
      else stats.pending++;
    }

    const leaderboard = allUsers.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.name,
      avatarEmoji: user.avatarEmoji,
      totalPoints: user.totalPoints || 0,
      predictions: userStats.get(user.id) || { total: 0, exact: 0, correct: 0, wrong: 0, pending: 0 },
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
