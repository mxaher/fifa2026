import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("X-Admin-Token");
    const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;

    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();

    const predictionCount = await db.delete(schema.predictions);
    const userCount = await db.update(schema.users).set({ totalPoints: 0 });
    const matchCount = await db.update(schema.matches).set({ homeScore: null, awayScore: null, status: 'upcoming' });

    return NextResponse.json({
      success: true,
      message: "تم إعادة ضبط التطبيق بنجاح",
      summary: {
        predictionsDeleted: predictionCount,
        usersReset: userCount,
        matchesReset: matchCount,
      },
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
