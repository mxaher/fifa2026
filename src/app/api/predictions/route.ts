import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const db = getClient();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const predictions = await db.select().from(schema.predictions).where(eq(schema.predictions.userId, userId));
    const allMatches = await db.select().from(schema.matches);
    const allTeams = await db.select().from(schema.teams);
    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const matchMap = new Map(allMatches.map(m => [m.id, m]));

    const predictionsWithDetails = predictions.map(pred => ({
      ...pred,
      match: matchMap.get(pred.matchId) ? {
        ...matchMap.get(pred.matchId)!,
        homeTeam: teamMap.get(matchMap.get(pred.matchId)!.homeTeamId),
        awayTeam: teamMap.get(matchMap.get(pred.matchId)!.awayTeamId),
      } : null,
    }));

    return NextResponse.json({ predictions: predictionsWithDetails });
  } catch (error) {
    console.error("Predictions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getClient();
    const { userId, matchId, homeScore, awayScore } = await request.json();

    if (!userId || !matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    // Check if match is still upcoming
    const matchResult = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (matchResult.length === 0) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }

    const match = matchResult[0];
    if (match.status !== "upcoming") {
      return NextResponse.json({ error: "لا يمكن التوقع على مباراة بدأت بالفعل" }, { status: 400 });
    }

    // Check if prediction already exists
    const existing = await db.select().from(schema.predictions)
      .where(and(eq(schema.predictions.userId, userId), eq(schema.predictions.matchId, matchId)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing prediction
      await db.update(schema.predictions)
        .set({ homeScore, awayScore, updatedAt: new Date() })
        .where(eq(schema.predictions.id, existing[0].id));

      return NextResponse.json({ prediction: { ...existing[0], homeScore, awayScore } });
    }

    // Create new prediction
    const result = await db.insert(schema.predictions).values({
      userId,
      matchId,
      homeScore,
      awayScore,
      points: null,
      pointsType: null,
    }).returning();

    return NextResponse.json({ prediction: result[0] });
  } catch (error) {
    console.error("Predictions POST error:", error);
    return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
  }
}
