import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { verifyPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL || "https://fifa26-predictions.moh-zaher.workers.dev";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const db = getClient();
    const users = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

    if (users.length === 0) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const user = users[0];

    if (user.banned) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash, user.salt);

    if (!valid) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    // Check email verification
    if (!user.emailVerified) {
      // Try to resend verification email if config exists
      let resendMessage = "";
      try {
        const configs = await db.select().from(schema.emailConfig).limit(1);
        const config = configs[0];
        if (config?.apiKey && config?.fromEmail && user.verificationToken) {
          const verifyLink = `${BASE_URL}/api/auth/verify?token=${user.verificationToken}`;
          const html = `
            <div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0F2137;color:#e0e0e0;border-radius:12px;">
              <div style="text-align:center;padding:20px 0;">
                <span style="font-size:48px;">⚽🏆</span>
                <h1 style="color:#FFD700;margin:10px 0;">تأكيد البريد الإلكتروني</h1>
              </div>
              <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;margin:15px 0;">
                <p style="margin:0 0 15px 0;">مرحباً ${user.name}، يرجى تأكيد بريدك الإلكتروني بالنقر على الرابط أدناه:</p>
                <div style="text-align:center;margin:20px 0;">
                  <a href="${verifyLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#FFD700,#FFA000);color:#000;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">تأكيد البريد الإلكتروني</a>
                </div>
              </div>
            </div>
          `;
          await sendEmail(
            { apiKey: config.apiKey, fromEmail: config.fromEmail, fromName: config.fromName || "ملك التوقعات", recipients: [email] },
            "تأكيد البريد الإلكتروني - ملك التوقعات فيفا ٢٠٢٦",
            html
          );
          resendMessage = " تم إعادة إرسال رابط التحقق إلى بريدك.";
        }
      } catch {
        // Email resend failed silently
      }

      return NextResponse.json({
        error: `البريد الإلكتروني غير مؤكد. يرجى التحقق من بريدك الإلكتروني وتأكيد الحساب.${resendMessage}`,
        needsVerification: true,
      }, { status: 403 });
    }

    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarEmoji: user.avatarEmoji,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin ?? false,
        banned: user.banned ?? false,
        department: user.department,
      },
      ...(ADMIN_TOKEN && user.isAdmin ? { adminToken: ADMIN_TOKEN } : {}),
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 });
  }
}
