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

function mask(val: string | null | undefined): string {
  return val ? "••••••••" + val.slice(-4) : "";
}

function configResponse(config: any) {
  return {
    apiKey: mask(config.apiKey),
    mailjetApiKey: mask(config.mailjetApiKey),
    mailjetSecretKey: config.mailjetSecretKey ? "••••••••" + config.mailjetSecretKey.slice(-4) : "",
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    recipients: JSON.parse(config.recipients || "[]"),
    autoSendDaily: config.autoSendDaily,
    notifyOnSyncError: config.notifyOnSyncError ?? false,
    lastSentAt: config.lastSentAt,
    hasApiKey: !!config.apiKey,
    hasMailjet: !!(config.mailjetApiKey && config.mailjetSecretKey),
  };
}

const EMPTY_CONFIG = { apiKey: "", mailjetApiKey: "", mailjetSecretKey: "", fromEmail: "", fromName: "ملك التوقعات", recipients: [], autoSendDaily: false, notifyOnSyncError: false, lastSentAt: null, hasApiKey: false, hasMailjet: false };

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
        apiKey: mask(row.api_key),
        mailjetApiKey: mask(row.mailjet_api_key),
        mailjetSecretKey: row.mailjet_secret_key ? "••••••••" + row.mailjet_secret_key.slice(-4) : "",
        fromEmail: row.from_email,
        fromName: row.from_name,
        recipients: JSON.parse(row.recipients || "[]"),
        autoSendDaily: !!row.auto_send_daily,
        notifyOnSyncError: !!row.notify_on_sync_error,
        lastSentAt: row.last_sent_at ? new Date(row.last_sent_at * 1000) : null,
        hasApiKey: !!row.api_key,
        hasMailjet: !!(row.mailjet_api_key && row.mailjet_secret_key),
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

    const { apiKey, mailjetApiKey, mailjetSecretKey, fromEmail, fromName, recipients, autoSendDaily, notifyOnSyncError } = await request.json();
    if (!fromEmail) return NextResponse.json({ error: "البريد الإلكتروني للمرسل مطلوب" }, { status: 400 });
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0)
      return NextResponse.json({ error: "يجب إدخال بريد إلكتروني واحد على الأقل للمستقبلين" }, { status: 400 });

    function keepIfMasked(newVal: string, oldVal: string): string {
      return newVal?.startsWith("••••") ? oldVal : (newVal || "");
    }

    const d1 = getRawD1();
    if (d1) {
      await d1.prepare("ALTER TABLE email_config ADD COLUMN notify_on_sync_error INTEGER DEFAULT 0").run().catch(() => {});
      await d1.prepare("ALTER TABLE email_config ADD COLUMN mailjet_api_key TEXT DEFAULT ''").run().catch(() => {});
      await d1.prepare("ALTER TABLE email_config ADD COLUMN mailjet_secret_key TEXT DEFAULT ''").run().catch(() => {});
      const { results } = await d1.prepare("SELECT * FROM email_config LIMIT 1").all() as any;
      const existing = results?.[0];
      const savedApiKey = keepIfMasked(apiKey, existing?.api_key || "");
      const savedMjKey = keepIfMasked(mailjetApiKey, existing?.mailjet_api_key || "");
      const savedMjSecret = keepIfMasked(mailjetSecretKey, existing?.mailjet_secret_key || "");
      const now = Math.floor(Date.now() / 1000);
      if (existing) {
        await d1.prepare("UPDATE email_config SET api_key=?, mailjet_api_key=?, mailjet_secret_key=?, from_email=?, from_name=?, recipients=?, auto_send_daily=?, notify_on_sync_error=?, updated_at=? WHERE id=?")
          .bind(savedApiKey, savedMjKey, savedMjSecret, fromEmail, fromName || "ملك التوقعات", JSON.stringify(recipients), autoSendDaily ? 1 : 0, notifyOnSyncError ? 1 : 0, now, existing.id).run();
      } else {
        await d1.prepare("INSERT INTO email_config (id,api_key,mailjet_api_key,mailjet_secret_key,from_email,from_name,recipients,auto_send_daily,notify_on_sync_error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
          .bind("default", savedApiKey, savedMjKey, savedMjSecret, fromEmail, fromName || "ملك التوقعات", JSON.stringify(recipients), autoSendDaily ? 1 : 0, notifyOnSyncError ? 1 : 0, now, now).run();
      }
      return NextResponse.json({ success: true, message: "تم حفظ الإعدادات" });
    }

    const db = getClient();
    try { await db.run(sql`ALTER TABLE email_config ADD COLUMN notify_on_sync_error INTEGER DEFAULT 0`); } catch {}
    try { await db.run(sql`ALTER TABLE email_config ADD COLUMN mailjet_api_key TEXT DEFAULT ''`); } catch {}
    try { await db.run(sql`ALTER TABLE email_config ADD COLUMN mailjet_secret_key TEXT DEFAULT ''`); } catch {}
    const existing = await db.select().from(schema.emailConfig).limit(1);
    if (existing.length > 0) {
      const e = existing[0];
      await db.update(schema.emailConfig).set({
        apiKey: keepIfMasked(apiKey, e.apiKey),
        mailjetApiKey: keepIfMasked(mailjetApiKey, e.mailjetApiKey || ""),
        mailjetSecretKey: keepIfMasked(mailjetSecretKey, e.mailjetSecretKey || ""),
        fromEmail, fromName: fromName || "ملك التوقعات", recipients: JSON.stringify(recipients),
        autoSendDaily: !!autoSendDaily, notifyOnSyncError: !!notifyOnSyncError, updatedAt: new Date(),
      }).where(eq(schema.emailConfig.id, e.id));
    } else {
      await db.insert(schema.emailConfig).values({
        id: "default", apiKey: apiKey || "", mailjetApiKey: mailjetApiKey || "", mailjetSecretKey: mailjetSecretKey || "",
        fromEmail, fromName: fromName || "ملك التوقعات", recipients: JSON.stringify(recipients),
        autoSendDaily: !!autoSendDaily, notifyOnSyncError: !!notifyOnSyncError,
      });
    }
    return NextResponse.json({ success: true, message: "تم حفظ الإعدادات" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "خطأ في السيرفر", detail: msg }, { status: 500 });
  }
}
