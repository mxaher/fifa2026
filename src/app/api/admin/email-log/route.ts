import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { desc } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

// GET — Get email send log
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const logs = await db.select().from(schema.emailLog).orderBy(desc(schema.emailLog.createdAt)).limit(50);

    return NextResponse.json({
      logs: logs.map(l => ({
        id: l.id,
        recipientCount: l.recipientCount,
        subject: l.subject,
        status: l.status,
        messageId: l.messageId,
        error: l.error,
        sentBy: l.sentBy,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Email log GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
