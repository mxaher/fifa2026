import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { isNull } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const allMatches = await db.select().from(schema.matches);
    const matchesWithNullId = allMatches.filter(m => !m.id);

    if (matchesWithNullId.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All matches already have IDs",
        fixed: 0,
        total: allMatches.length,
      });
    }

    let fixed = 0;
    const errors: string[] = [];

    for (const match of matchesWithNullId) {
      try {
        const newId = crypto.randomUUID();
        const { sql } = await import("drizzle-orm");
        await db.run(sql`UPDATE matches SET id = ${newId} WHERE match_number = ${match.matchNumber} AND home_team_id = ${match.homeTeamId} AND away_team_id = ${match.awayTeamId}`);
        fixed++;
      } catch (err) {
        errors.push(`Match #${match.matchNumber}: ${String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      total: allMatches.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `تم إصلاح ${fixed} مباراة من أصل ${allMatches.length}`,
    });
  } catch (error) {
    console.error("Fix match IDs error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const allMatches = await db.select().from(schema.matches);
    const nullIds = allMatches.filter(m => !m.id).length;
    const validIds = allMatches.filter(m => m.id).length;

    return NextResponse.json({
      total: allMatches.length,
      withIds: validIds,
      nullIds,
      needsFix: nullIds > 0,
    });
  } catch (error) {
    console.error("Fix match IDs status error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
