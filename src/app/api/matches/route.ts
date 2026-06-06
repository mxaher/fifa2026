import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq, asc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const db = getClient();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    // Get all matches with team info
    const allMatches = await db.select().from(schema.matches).orderBy(asc(schema.matches.kickoff));

    // Get all teams
    const allTeams = await db.select().from(schema.teams);
    const teamMap = new Map(allTeams.map(t => [t.id, t]));

    // Get user predictions if userId provided
    let userPredictions: Map<string, any> = new Map();
    if (userId) {
      const preds = await db.select().from(schema.predictions).where(eq(schema.predictions.userId, userId));
      userPredictions = new Map(preds.map(p => [p.matchId, p]));
    }

    const matchesWithTeams = allMatches.map(match => ({
      ...match,
      homeTeam: teamMap.get(match.homeTeamId) || null,
      awayTeam: teamMap.get(match.awayTeamId) || null,
      prediction: userPredictions.get(match.id) || null,
    }));

    return NextResponse.json({ matches: matchesWithTeams });
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
