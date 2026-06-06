import { NextResponse } from "next/server";
import { getClient } from "@/lib/db/index";

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
    const { sql } = await import("drizzle-orm");

    const results: string[] = [];

    try {
      await db.run(sql`CREATE TABLE IF NOT EXISTS email_config (
        id TEXT PRIMARY KEY DEFAULT 'default',
        api_key TEXT NOT NULL DEFAULT '',
        from_email TEXT NOT NULL DEFAULT '',
        from_name TEXT NOT NULL DEFAULT 'ملك التوقعات',
        recipients TEXT NOT NULL DEFAULT '[]',
        auto_send_daily INTEGER DEFAULT 0,
        last_sent_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);
      results.push("email_config table created/verified");
    } catch (err) {
      results.push(`email_config error: ${String(err)}`);
    }

    try {
      await db.run(sql`CREATE TABLE IF NOT EXISTS email_log (
        id TEXT PRIMARY KEY,
        recipient_count INTEGER NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,
        message_id TEXT,
        error TEXT,
        sent_by TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);
      results.push("email_log table created/verified");
    } catch (err) {
      results.push(`email_log error: ${String(err)}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
