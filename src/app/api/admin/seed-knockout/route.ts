import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

const KNOCKOUT_MATCHES = [
  { matchNumber: 73,  homeTeamId: "MEX", awayTeamId: "CAN", kickoff: "2026-06-28T16:00:00Z", venue: "Estadio Azteca" },
  { matchNumber: 74,  homeTeamId: "USA", awayTeamId: "BRA", kickoff: "2026-06-28T19:00:00Z", venue: "SoFi Stadium" },
  { matchNumber: 75,  homeTeamId: "GER", awayTeamId: "NED", kickoff: "2026-06-28T21:00:00Z", venue: "NRG Stadium" },
  { matchNumber: 76,  homeTeamId: "BEL", awayTeamId: "POR", kickoff: "2026-06-29T16:00:00Z", venue: "MetLife Stadium" },
  { matchNumber: 77,  homeTeamId: "FRA", awayTeamId: "ARG", kickoff: "2026-06-29T19:00:00Z", venue: "AT&T Stadium" },
  { matchNumber: 78,  homeTeamId: "ESP", awayTeamId: "ENG", kickoff: "2026-06-29T21:00:00Z", venue: "Levi's Stadium" },
  { matchNumber: 79,  homeTeamId: "MEX", awayTeamId: "USA", kickoff: "2026-06-30T16:00:00Z", venue: "BMO Field" },
  { matchNumber: 80,  homeTeamId: "BRA", awayTeamId: "GER", kickoff: "2026-06-30T19:00:00Z", venue: "Lumen Field" },
  { matchNumber: 81,  homeTeamId: "NED", awayTeamId: "BEL", kickoff: "2026-06-30T21:00:00Z", venue: "Hard Rock Stadium" },
  { matchNumber: 82,  homeTeamId: "POR", awayTeamId: "FRA", kickoff: "2026-07-01T16:00:00Z", venue: "Mercedes-Benz Stadium" },
  { matchNumber: 83,  homeTeamId: "ARG", awayTeamId: "ESP", kickoff: "2026-07-01T19:00:00Z", venue: "Arrowhead Stadium" },
  { matchNumber: 84,  homeTeamId: "ENG", awayTeamId: "MEX", kickoff: "2026-07-01T21:00:00Z", venue: "Gillette Stadium" },
  { matchNumber: 85,  homeTeamId: "USA", awayTeamId: "GER", kickoff: "2026-07-02T16:00:00Z", venue: "BC Place" },
  { matchNumber: 86,  homeTeamId: "NED", awayTeamId: "POR", kickoff: "2026-07-02T19:00:00Z", venue: "Estadio Akron" },
  { matchNumber: 87,  homeTeamId: "FRA", awayTeamId: "ENG", kickoff: "2026-07-02T21:00:00Z", venue: "Lincoln Financial Field" },
  { matchNumber: 88,  homeTeamId: "BRA", awayTeamId: "ARG", kickoff: "2026-07-03T16:00:00Z", venue: "Estadio BBVA" },
  { matchNumber: 89,  homeTeamId: "MEX", awayTeamId: "NED", kickoff: "2026-07-04T16:00:00Z", venue: "Estadio Azteca" },
  { matchNumber: 90,  homeTeamId: "POR", awayTeamId: "ENG", kickoff: "2026-07-04T19:00:00Z", venue: "SoFi Stadium" },
  { matchNumber: 91,  homeTeamId: "USA", awayTeamId: "FRA", kickoff: "2026-07-05T16:00:00Z", venue: "NRG Stadium" },
  { matchNumber: 92,  homeTeamId: "GER", awayTeamId: "ARG", kickoff: "2026-07-05T19:00:00Z", venue: "MetLife Stadium" },
  { matchNumber: 93,  homeTeamId: "BEL", awayTeamId: "BRA", kickoff: "2026-07-06T16:00:00Z", venue: "AT&T Stadium" },
  { matchNumber: 94,  homeTeamId: "ESP", awayTeamId: "MEX", kickoff: "2026-07-06T19:00:00Z", venue: "Levi's Stadium" },
  { matchNumber: 95,  homeTeamId: "FRA", awayTeamId: "USA", kickoff: "2026-07-07T16:00:00Z", venue: "BMO Field" },
  { matchNumber: 96,  homeTeamId: "ENG", awayTeamId: "GER", kickoff: "2026-07-07T19:00:00Z", venue: "Lumen Field" },
  { matchNumber: 97,  homeTeamId: "MEX", awayTeamId: "POR", kickoff: "2026-07-09T16:00:00Z", venue: "Estadio Azteca" },
  { matchNumber: 98,  homeTeamId: "USA", awayTeamId: "ENG", kickoff: "2026-07-09T19:00:00Z", venue: "SoFi Stadium" },
  { matchNumber: 99,  homeTeamId: "GER", awayTeamId: "FRA", kickoff: "2026-07-10T16:00:00Z", venue: "NRG Stadium" },
  { matchNumber: 100, homeTeamId: "BEL", awayTeamId: "BRA", kickoff: "2026-07-10T19:00:00Z", venue: "MetLife Stadium" },
  { matchNumber: 101, homeTeamId: "MEX", awayTeamId: "USA", kickoff: "2026-07-14T16:00:00Z", venue: "AT&T Stadium" },
  { matchNumber: 102, homeTeamId: "GER", awayTeamId: "BEL", kickoff: "2026-07-15T16:00:00Z", venue: "Mercedes-Benz Stadium" },
  { matchNumber: 103, homeTeamId: "MEX", awayTeamId: "GER", kickoff: "2026-07-19T18:00:00Z", venue: "MetLife Stadium" },
];

export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();

    // Check which match numbers already exist
    const existing = await db.select({ matchNumber: schema.matches.matchNumber })
      .from(schema.matches)
      .where((await import("drizzle-orm")).inArray(
        schema.matches.matchNumber,
        KNOCKOUT_MATCHES.map(m => m.matchNumber)
      ));
    const existingNums = new Set(existing.map((m: any) => m.matchNumber));

    const toInsert = KNOCKOUT_MATCHES.filter(m => !existingNums.has(m.matchNumber));

    if (toInsert.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: "جميع مباريات الإقصائيات موجودة مسبقاً" });
    }

    const inserted = await db.insert(schema.matches).values(
      toInsert.map(m => ({
        matchNumber: m.matchNumber,
        stage: "knockout",
        groupLetter: null,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        kickoff: new Date(m.kickoff),
        venue: m.venue,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      }))
    ).returning();

    return NextResponse.json({
      success: true,
      created: inserted.length,
      message: `تم إنشاء ${inserted.length} مباراة إقصائية`,
    });
  } catch (error) {
    console.error("Seed knockout error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
