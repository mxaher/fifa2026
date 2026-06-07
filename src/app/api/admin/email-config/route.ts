import { NextResponse } from "next/server";
import { getClient, getD1Binding, schema } from "@/lib/db/index";
import { eq, sql } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

function getRawD1() {
  try { return getD1Binding() as any; } catch { return null; }
}

function configResponse(config: any) {
  return {
    apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "",
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    recipients: JSON.parse(config.recipients || "[]"),
    autoSendDaily: config.autoSendDaily,
    notifyOnSyncError: config.notifyOnSyncError ?? false,
    lastSentAt: config.lastSentAt,
    hasApiKey: !!config.apiKey,
  };
}

const EMPTY_CONFIG = { apiKey: "", fromEmail: "", fromName: "ملك التوقعات", recipients: [], autoSendDaily: false, notifyOnSyncError: false, lastSentAt: null };

// GET
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const d1 = getRawD1();
    if (d1) {
      const { results } = await d1.prepare("SELECT * FROM email_config LIMIT 1").all() as any;
      if (!results?.length) return NextResponse.json({ config: EMPTY_CONFIG });
      const row = results[0];
      return NextResponse.json({ config: {
        apiKey: row.api_key ? "••••••••" + row.api_key.slice(-4) : "",
        fromEmail: row.from_email,
        fromName: row.from_name,
        recipients: JSON.parse(row.recipients || "[]"),
        autoSendDaily: !!row.auto_send_daily,
        notifyOnSyncError: !!row.notify_on_sync_error,
        lastSentAt: row.last_sent_at ? new Date(row.last_sent_at * 1000) : null,
        hasApiKey: !!row.api_key,
      }});
    }

    const db = getClient();
    const configs = await db.select().from(schema.emailConfig).limit(1);
    return NextResponse.json({ config: configs[0] ? configResponse(configs[0]) : EMPTY_CONFIG });
  } catch (error) {
    return NextResponse.json({ error: "خطأ في السيرفر", detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST
export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { apiKey, fromEmail, fromName, recipients, autoSendDaily, notifyOnSyncError } = await request.json();
    if (!fromEmail) return NextResponse.json({ error: "البريد الإلكتروني للمرسل مطلوب" }, { status: 400 });
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0)
      return NextResponse.json({ error: "يجب إدخال بريد إلكتروني واحد على الأقل للمستقبلين" }, { status: 400 });

    const d1 = getRawD1();
    if (d1) {
      await d1.prepare("ALTER TABLE email_config ADD COLUMN notify_on_sync_error INTEGER DEFAULT 0").run().catch(() => {});
      const { results } = await d1.prepare("SELECT id, api_key FROM email_config LIMIT 1").all() as any;
      const existing = results?.[0];
      const savedKey = existing && apiKey?.startsWith("••••") ? existing.api_key : (apiKey || "");
      const now = Math.floor(Date.now() / 1000);
      if (existing) {
        await d1.prepare("UPDATE email_config SET api_key=?, from_email=?, from_name=?, recipients=?, auto_send_daily=?, notify_on_sync_error=?, updated_at=? WHERE id=?")
          .bind(savedKey, fromEmail, fromName || "ملك التوقعات", JSON.stringify(recipients), autoSendDaily ? 1 : 0, notifyOnSyncError ? 1 : 0, now, existing.id).run();
      } else {
        await d1.prepare("INSERT INTO email_config (id,api_key,from_email,from_name,recipients,auto_send_daily,notify_on_sync_error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind("default", savedKey, fromEmail, fromName || "ملك التوقعات", JSON.stringify(recipients), autoSendDaily ? 1 : 0, notifyOnSyncError ? 1 : 0, now, now).run();
      }
      return NextResponse.json({ success: true, message: "تم حفظ الإعدادات" });
    }

    const db = getClient();
    try { await db.run(sql`ALTER TABLE email_config ADD COLUMN notify_on_sync_error INTEGER DEFAULT 0`); } catch {}
    const existing = await db.select().from(schema.emailConfig).limit(1);
    if (existing.length > 0) {
      const e = existing[0];
      await db.update(schema.emailConfig).set({
        apiKey: apiKey?.startsWith("••••") ? e.apiKey : (apiKey || ""),
        fromEmail, fromName: fromName || "ملك التوقعات", recipients: JSON.stringify(recipients),
        autoSendDaily: !!autoSendDaily, notifyOnSyncError: !!notifyOnSyncError, updatedAt: new Date(),
      }).where(eq(schema.emailConfig.id, e.id));
    } else {
      await db.insert(schema.emailConfig).values({
        id: "default", apiKey: apiKey || "", fromEmail, fromName: fromName || "ملك التوقعات",
        recipients: JSON.stringify(recipients), autoSendDaily: !!autoSendDaily, notifyOnSyncError: !!notifyOnSyncError,
      });
    }
    return NextResponse.json({ success: true, message: "تم حفظ الإعدادات" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "خطأ في السيرفر", detail: msg }, { status: 500 });
  }
}
