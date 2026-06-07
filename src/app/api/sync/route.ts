import { NextResponse } from "next/server";
import { syncResults } from "@/lib/sync";

function verifyAdmin(request: Request): boolean {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  return !!token && token === expectedToken;
}

export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const startTime = Date.now();
    const report = await syncResults('admin');
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      summary: {
        source: report.source,
        fetchedMatches: report.fetchedMatches,
        completedFound: report.completedFound,
        newlyFinalized: report.newlyFinalized,
        alreadyDone: report.alreadyDone,
        errorCount: report.errors.length,
        errors: report.errors,
        elapsedMs: elapsed,
        timestamp: report.timestamp,
      },
      message: `تمت المزامنة: ${report.newlyFinalized} مباراة جديدة تم إغلاقها`,
    });
  } catch (err) {
    console.error("[sync] Manual sync failed:", err);
    return NextResponse.json({
      success: false,
      error: String(err),
    }, { status: 500 });
  }
}

// GET endpoint for cron-triggered sync (can be called by external schedulers)
export async function GET(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const report = await syncResults('cron');
    return NextResponse.json({
      success: true,
      source: report.source,
      newlyFinalized: report.newlyFinalized,
      timestamp: report.timestamp,
    });
  } catch (err) {
    console.error("[sync] Cron sync failed:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
