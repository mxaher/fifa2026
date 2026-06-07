import { NextResponse } from "next/server";
import { syncResults } from "@/lib/sync";
import { sendEmail } from "@/lib/email";
import { getClient, schema } from "@/lib/db/index";

function verifyAdmin(request: Request): boolean {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  return !!token && token === expectedToken;
}

async function sendSyncErrorNotification(report: Awaited<ReturnType<typeof syncResults>>) {
  try {
    const db = getClient();
    const configs = await db.select().from(schema.emailConfig).limit(1);
    const config = configs[0];
    if (!config || !config.notifyOnSyncError || !config.apiKey) return;

    const recipients = JSON.parse(config.recipients || "[]") as string[];
    if (recipients.length === 0) return;

    const errorList = report.errors.map(e => `<li>${e}</li>`).join('');
    const html = `
      <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
        <div style="text-align: center; padding: 20px 0;">
          <span style="font-size: 48px;">⚠️</span>
          <h1 style="color: #FFD700; margin: 10px 0;">فشلت مزامنة النتائج</h1>
        </div>
        <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 15px; margin: 15px 0;">
          <p style="margin: 0; color: #ef4444; font-weight: bold;">تم اكتشاف ${report.errors.length} خطأ أثناء المزامنة</p>
        </div>
        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; margin: 15px 0;">
          <p><strong>المصدر:</strong> ${report.source === 'primary' ? 'worldcup26.ir' : report.source === 'backup' ? 'worldcupjson.net' : 'لا يوجد'}</p>
          <p><strong>المباريات المستلمة:</strong> ${report.fetchedMatches}</p>
          <p><strong>تم الإغلاق:</strong> ${report.newlyFinalized}</p>
          <p><strong>الأخطاء:</strong> ${report.errors.length}</p>
        </div>
        ${errorList ? `
        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; margin: 15px 0;">
          <h3 style="color: #ef4444; margin: 0 0 10px 0;">تفاصيل الأخطاء:</h3>
          <ul style="margin: 0; padding-right: 20px; font-size: 13px; color: #aaa;">
            ${errorList}
          </ul>
        </div>` : ''}
        <div style="text-align: center; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 15px;">
          <p style="font-size: 12px; color: #666;">نظام ملك التوقعات • فيفا ٢٠٢٦</p>
        </div>
      </div>
    `;

    await sendEmail(
      { apiKey: config.apiKey, mailjetApiKey: config.mailjetApiKey || undefined, mailjetSecretKey: config.mailjetSecretKey || undefined, fromEmail: config.fromEmail, fromName: config.fromName, recipients },
      `⚠️ ${report.errors.length} خطأ في مزامنة النتائج - ملك التوقعات`,
      html
    );

    await db.insert(schema.emailLog).values({
      recipientCount: recipients.length,
      subject: `⚠️ ${report.errors.length} خطأ في مزامنة النتائج`,
      status: 'sent',
      sentBy: 'admin',
    });
  } catch (err) {
    console.warn('[sync] Failed to send error notification:', err);
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const startTime = Date.now();
    const report = await syncResults('admin');
    const elapsed = Date.now() - startTime;

    if (report.errors.length > 0) {
      await sendSyncErrorNotification(report);
    }

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
