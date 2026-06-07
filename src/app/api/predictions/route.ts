import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq, and } from "drizzle-orm";

const ROUND_RANGES: Record<string, [number, number]> = {
  R32: [73, 88],
  R16: [89, 96],
  QF:  [97, 100],
  SF:  [101, 102],
  F:   [103, 103],
};

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "F"] as const;

function getMatchRound(matchNumber: number, groupLetter: string | null): typeof ROUND_ORDER[number] | null {
  if (groupLetter) return null;
  if (matchNumber >= 73 && matchNumber <= 88) return "R32";
  if (matchNumber >= 89 && matchNumber <= 96) return "R16";
  if (matchNumber >= 97 && matchNumber <= 100) return "QF";
  if (matchNumber >= 101 && matchNumber <= 102) return "SF";
  if (matchNumber === 103) return "F";
  return null;
}

function isMatchLocked(match: { matchNumber: number; groupLetter: string | null; status: string; homeScore: number | null; awayScore: number | null }, allMatches: { matchNumber: number; groupLetter: string | null; status: string; homeScore: number | null; awayScore: number | null }[]): { locked: boolean; reason?: string } {
  const round = getMatchRound(match.matchNumber, match.groupLetter);
  if (!round) return { locked: false };
  if (round === "R32") {
    const groupMatches = allMatches.filter(m => m.groupLetter);
    if (groupMatches.length === 0) return { locked: true, reason: "سيتم فتح التوقعات بعد انتهاء جميع مباريات دور المجموعات" };
    const allDone = groupMatches.every(m => m.status === "finished" && m.homeScore != null && m.awayScore != null);
    if (!allDone) return { locked: true, reason: "سيتم فتح التوقعات بعد انتهاء جميع مباريات دور المجموعات" };
    return { locked: false };
  }
  const idx = ROUND_ORDER.indexOf(round);
  const prev = ROUND_ORDER[idx - 1];
  const [min, max] = ROUND_RANGES[prev];
  const prevMatches = allMatches.filter(m => m.matchNumber >= min && m.matchNumber <= max);
  if (prevMatches.length === 0) return { locked: true, reason: `سيتم فتح التوقعات بعد انتهاء ${prev}` };
  const allDone = prevMatches.every(m => m.status === "finished" && m.homeScore != null && m.awayScore != null);
  if (!allDone) return { locked: true, reason: `سيتم فتح التوقعات بعد انتهاء ${prev}` };
  return { locked: false };
}

export async function GET(request: Request) {
  try {
    const db = getClient();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    const allPredictions = userId
      ? await db.select().from(schema.predictions).where(eq(schema.predictions.userId, userId))
      : await db.select().from(schema.predictions);

    const allMatches = await db.select().from(schema.matches);
    const allTeams = await db.select().from(schema.teams);
    const allUsers = await db.select().from(schema.users);
    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const matchMap = new Map(allMatches.map(m => [m.id, m]));
    const userMap = new Map(allUsers.filter(u => !u.isAdmin).map(u => [u.id, { id: u.id, name: u.name, avatarEmoji: u.avatarEmoji, department: u.department }]));

    const predictionsWithDetails = allPredictions.map(pred => ({
      ...pred,
      match: matchMap.get(pred.matchId) ? {
        ...matchMap.get(pred.matchId)!,
        homeTeam: teamMap.get(matchMap.get(pred.matchId)!.homeTeamId),
        awayTeam: teamMap.get(matchMap.get(pred.matchId)!.awayTeamId),
      } : null,
      user: userMap.get(pred.userId) || null,
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

    // Block admin from making predictions
    const userResult = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    if (userResult.length > 0 && userResult[0].isAdmin) {
      return NextResponse.json({ error: "المشرف لا يمكنه التوقع على المباريات" }, { status: 403 });
    }

    // Check if match exists
    const matchResult = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1);
    if (matchResult.length === 0) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }

    const match = matchResult[0];
    if (match.status !== "upcoming") {
      return NextResponse.json({ error: "لا يمكن التوقع على مباراة بدأت بالفعل" }, { status: 400 });
    }

    // Block predictions on locked knockout matches
    const allMatches = await db.select().from(schema.matches);
    const lockCheck = isMatchLocked({
      matchNumber: match.matchNumber,
      groupLetter: match.groupLetter,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    }, allMatches);
    if (lockCheck.locked) {
      return NextResponse.json({ error: lockCheck.reason || "التوقعات غير متاحة لهذه المباراة بعد" }, { status: 400 });
    }

    if (typeof homeScore !== "number" || typeof awayScore !== "number" || homeScore < 0 || awayScore < 0 || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      return NextResponse.json({ error: "النتيجة يجب أن تكون أرقام صحيحة غير سالبة" }, { status: 400 });
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
