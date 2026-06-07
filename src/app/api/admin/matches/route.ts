import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq, sql } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

// GET — List all matches with team names
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const matches = await db.select().from(schema.matches).orderBy(schema.matches.matchNumber);
    const teams = await db.select().from(schema.teams);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const matchesWithTeams = matches.map(m => ({
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage,
      groupLetter: m.groupLetter,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: teamMap.get(m.homeTeamId)?.name || m.homeTeamId,
      awayTeamName: teamMap.get(m.awayTeamId)?.name || m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      kickoff: m.kickoff,
      venue: m.venue,
    }));

    return NextResponse.json({ matches: matchesWithTeams });
  } catch (error) {
    console.error("Admin matches GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// POST — Add a new match
export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { matchNumber, stage, groupLetter, homeTeamId, awayTeamId, kickoff, venue } = await request.json();

    if (!matchNumber || !homeTeamId || !awayTeamId || !kickoff) {
      return NextResponse.json({ error: "الحقول المطلوبة: matchNumber, homeTeamId, awayTeamId, kickoff" }, { status: 400 });
    }

    const db = getClient();

    // Get next match number if not provided
    const maxNum = await db.select({ max: sql<number>`coalesce(max(${schema.matches.matchNumber}), 0)` }).from(schema.matches);
    const num = matchNumber || (maxNum[0]?.max ?? 0) + 1;

    const result = await db.insert(schema.matches).values({
      matchNumber: num,
      stage: stage || "group",
      groupLetter: groupLetter || null,
      homeTeamId,
      awayTeamId,
      kickoff: new Date(kickoff),
      homeScore: null,
      awayScore: null,
      status: "upcoming",
      venue: venue || null,
    }).returning();

    return NextResponse.json({ match: result[0] });
  } catch (error) {
    console.error("Admin matches POST error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// PUT — Edit a match
export async function PUT(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id, matchNumber, stage, groupLetter, homeTeamId, awayTeamId, kickoff, venue, status, homeScore, awayScore } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Match ID مطلوب" }, { status: 400 });
    }

    const db = getClient();
    const updateData: Record<string, unknown> = {};

    if (matchNumber !== undefined) updateData.matchNumber = matchNumber;
    if (stage !== undefined) updateData.stage = stage;
    if (groupLetter !== undefined) updateData.groupLetter = groupLetter;
    if (homeTeamId !== undefined) updateData.homeTeamId = homeTeamId;
    if (awayTeamId !== undefined) updateData.awayTeamId = awayTeamId;
    if (kickoff !== undefined) updateData.kickoff = new Date(kickoff);
    if (venue !== undefined) updateData.venue = venue;
    if (status !== undefined) updateData.status = status;
    if (homeScore !== undefined) {
      if (typeof homeScore !== "number" || !Number.isInteger(homeScore) || homeScore < 0) {
        return NextResponse.json({ error: "النتيجة يجب أن تكون رقماً صحيحاً غير سالب" }, { status: 400 });
      }
      updateData.homeScore = homeScore;
    }
    if (awayScore !== undefined) {
      if (typeof awayScore !== "number" || !Number.isInteger(awayScore) || awayScore < 0) {
        return NextResponse.json({ error: "النتيجة يجب أن تكون رقماً صحيحاً غير سالب" }, { status: 400 });
      }
      updateData.awayScore = awayScore;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    await db.update(schema.matches).set(updateData).where(eq(schema.matches.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin matches PUT error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// DELETE — Delete a match
export async function DELETE(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Match ID مطلوب" }, { status: 400 });
    }

    const db = getClient();
    // Delete predictions for this match first
    await db.delete(schema.predictions).where(eq(schema.predictions.matchId, id));
    // Delete match
    await db.delete(schema.matches).where(eq(schema.matches.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin matches DELETE error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
