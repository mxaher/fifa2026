import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تأكيد البريد الإلكتروني</title><style>body{margin:0;padding:0;background:#0A1628;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}div{text-align:center;padding:40px;background:#0F2137;border-radius:16px;max-width:400px}h1{color:#ef4444}</style></head><body><div><span style="font-size:64px">❌</span><h1>رابط التحقق غير صالح</h1><p style="color:#888;">الرجاء التأكد من الرابط أو طلب رابط تحقق جديد</p></div></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const db = getClient();
    const users = await db.select().from(schema.users).where(eq(schema.users.verificationToken, token)).limit(1);

    if (users.length === 0) {
      return new Response(
        `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تأكيد البريد الإلكتروني</title><style>body{margin:0;padding:0;background:#0A1628;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}div{text-align:center;padding:40px;background:#0F2137;border-radius:16px;max-width:400px}h1{color:#ef4444}</style></head><body><div><span style="font-size:64px">❌</span><h1>رابط التحقق غير صالح أو منتهي</h1><p style="color:#888;">يمكنك طلب رابط تحقق جديد من خلال تسجيل الدخول</p></div></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const user = users[0];

    if (user.emailVerified) {
      return new Response(
        `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تأكيد البريد الإلكتروني</title><style>body{margin:0;padding:0;background:#0A1628;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}div{text-align:center;padding:40px;background:#0F2137;border-radius:16px;max-width:400px}h1{color:#22c55e}</style></head><body><div><span style="font-size:64px">✅</span><h1>البريد الإلكتروني مؤكد مسبقاً</h1><p style="color:#888;">يمكنك تسجيل الدخول الآن</p></div></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    await db.update(schema.users)
      .set({ emailVerified: true, verificationToken: null, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    return new Response(
      `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تأكيد البريد الإلكتروني</title><style>body{margin:0;padding:0;background:#0A1628;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}div{text-align:center;padding:40px;background:#0F2137;border-radius:16px;max-width:400px}h1{color:#22c55e}</style></head><body><div><span style="font-size:64px">✅</span><h1>تم تأكيد البريد الإلكتروني 🎉</h1><p style="color:#888;">يمكنك الآن تسجيل الدخول إلى ملك التوقعات</p><a href="/" style="display:inline-block;margin-top:20px;padding:12px 32px;background:linear-gradient(135deg,#FFD700,#FFA000);color:#000;border-radius:8px;text-decoration:none;font-weight:bold;">تسجيل الدخول</a></div></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Verify error:", error);
    return new Response(
      `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>خطأ</title><style>body{margin:0;padding:0;background:#0A1628;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}div{text-align:center;padding:40px}</style></head><body><div><h1 style="color:#ef4444;">حدث خطأ في التحقق</h1><p style="color:#888;">الرجاء المحاولة مرة أخرى لاحقاً</p></div></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
