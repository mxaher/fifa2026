import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { finalizeMatch } from "@/lib/finalize";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("X-Admin-Token");
    const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;

    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { matchId, homeScore, awayScore } = await request.json();

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة: matchId, homeScore, awayScore" }, { status: 400 });
    }

    if (typeof homeScore !== "number" || typeof awayScore !== "number" || !Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: "النتيجة يجب أن تكون أرقام صحيحة غير سالبة" }, { status: 400 });
    }

    const db = getClient();

    // Verify match exists
    const matchResult = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (matchResult.length === 0) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }

    const match = matchResult[0];
    if (match.status === "finished") {
      return NextResponse.json({ error: "المباراة منتهية بالفعل" }, { status: 400 });
    }

    // Finalize the match
    const result = await finalizeMatch(matchId, homeScore, awayScore);

    return NextResponse.json({
      success: true,
      matchId,
      homeScore,
      awayScore,
      predictionsScored: result.predictionsScored,
      alreadyFinalized: result.alreadyFinalized,
    });
  } catch (error) {
    console.error("Admin result error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get("X-Admin-Token");
    const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;

    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const matches = await db.select().from(schema.matches);
    const teams = await db.select().from(schema.teams);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const matchesWithTeams = matches.map(m => ({
      id: m.id,
      matchNumber: m.matchNumber,
      groupLetter: m.groupLetter,
      homeTeam: teamMap.get(m.homeTeamId)?.name || m.homeTeamId,
      awayTeam: teamMap.get(m.awayTeamId)?.name || m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      kickoff: m.kickoff,
    }));

    return NextResponse.json({ matches: matchesWithTeams });
  } catch (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
