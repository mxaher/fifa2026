import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

// GET — Get email config
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const configs = await db.select().from(schema.emailConfig).limit(1);
    const config = configs[0];

    if (!config) {
      return NextResponse.json({
        config: {
          apiKey: "",
          fromEmail: "",
          fromName: "ملك التوقعات",
          recipients: [],
          autoSendDaily: false,
          lastSentAt: null,
        },
      });
    }

    return NextResponse.json({
      config: {
        apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "",
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        recipients: JSON.parse(config.recipients || "[]"),
        autoSendDaily: config.autoSendDaily,
        lastSentAt: config.lastSentAt,
        hasApiKey: !!config.apiKey,
      },
    });
  } catch (error) {
    console.error("Email config GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// POST — Save email config
export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, fromEmail, fromName, recipients, autoSendDaily } = body;

    if (!fromEmail) {
      return NextResponse.json({ error: "البريد الإلكتروني للمرسل مطلوب" }, { status: 400 });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "يجب إدخال بريد إلكتروني واحد على الأقل للمستقبلين" }, { status: 400 });
    }

    const db = getClient();
    const existing = await db.select().from(schema.emailConfig).limit(1);

    const updateData: Record<string, unknown> = {
      fromEmail,
      fromName: fromName || "ملك التوقعات",
      recipients: JSON.stringify(recipients),
      autoSendDaily: autoSendDaily ?? false,
      updatedAt: new Date(),
    };

    // Only update apiKey if a new one was provided (not masked)
    if (apiKey && !apiKey.startsWith("••••")) {
      updateData.apiKey = apiKey;
    }

    if (existing.length > 0) {
      await db.update(schema.emailConfig)
        .set(updateData)
        .where(eq(schema.emailConfig.id, "default"));
    } else {
      await db.insert(schema.emailConfig).values({
        id: "default",
        apiKey: apiKey || "",
        fromEmail,
        fromName: fromName || "ملك التوقعات",
        recipients: JSON.stringify(recipients),
        autoSendDaily: autoSendDaily ?? false,
      });
    }

    return NextResponse.json({ success: true, message: "تم حفظ الإعدادات" });
  } catch (error) {
    console.error("Email config POST error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
