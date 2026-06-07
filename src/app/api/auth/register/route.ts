import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { eq, sql } from "drizzle-orm";

const AVATARS = ["⚽", "🏆", "🎯", "🥅", "🎪", "🌟", "💪", "🔥", "⭐", "🎮"];

const BASE_URL = process.env.BASE_URL || "https://fifa26-predictions.moh-zaher.workers.dev";

export async function POST(request: Request) {
  try {
    const { name, email, password, department } = await request.json();
    if (!name || !email || !password || !department) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة (الاسم، البريد، القسم، كلمة المرور)" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" }, { status: 400 });
    }

    if (!email.toLowerCase().endsWith('@almarshad.com')) {
      return NextResponse.json({ error: "يجب استخدام البريد الإلكتروني الخاص بالشركة (@almarshad.com)" }, { status: 400 });
    }

    const db = getClient();

    // Auto-migrate: ensure new columns exist (safe to run repeatedly)
    try { await db.run(sql`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`); } catch {}
    try { await db.run(sql`ALTER TABLE users ADD COLUMN verification_token TEXT`); } catch {}

    // Verify department exists
    const dept = await db.select().from(schema.departments).where(eq(schema.departments.id, department)).limit(1);
    if (dept.length === 0) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);
    const avatarEmoji = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const verificationToken = crypto.randomUUID();

    const result = await db.insert(schema.users).values({
      name,
      email,
      passwordHash: hash,
      salt,
      avatarEmoji,
      totalPoints: 0,
      isAdmin: false,
      banned: false,
      emailVerified: false,
      verificationToken,
      department,
    }).returning();

    const user = result[0];

    // Try to send verification email
    let emailSent = false;
    try {
      const configs = await db.select().from(schema.emailConfig).limit(1);
      const config = configs[0];

      if (config?.fromEmail && (config?.apiKey || (config?.mailjetApiKey && config?.mailjetSecretKey))) {
        const verifyLink = BASE_URL + "/api/auth/verify?token=" + verificationToken;
        const html =
          '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0F2137;color:#e0e0e0;border-radius:12px;">' +
          '<div style="text-align:center;padding:20px 0;">' +
          '<span style="font-size:48px;">⚽🏆</span>' +
          '<h1 style="color:#FFD700;margin:10px 0;">مرحباً بك في ملك التوقعات!</h1>' +
          '<h2 style="color:#4FC3F7;font-size:16px;">FIFA World Cup 2026™</h2></div>' +
          '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;margin:15px 0;">' +
          '<p style="margin:0 0 10px 0;">مرحباً ' + name + '،</p>' +
          '<p style="margin:0 0 15px 0;">شكراً لتسجيلك في ملك التوقعات. يرجى تأكيد بريدك الإلكتروني بالنقر على الرابط أدناه:</p>' +
          '<div style="text-align:center;margin:20px 0;">' +
          '<a href="' + verifyLink + '" style="color:#4FC3F7;font-weight:bold;font-size:16px;">تأكيد البريد الإلكتروني</a></div>' +
          '<p style="font-size:13px;color:#888;">إذا لم يعمل الرابط، يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>' +
          '<p style="font-size:12px;color:#aaa;word-break:break-all;background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;direction:ltr;text-align:left;">' + verifyLink + '</p></div>' +
          '<div style="text-align:center;padding-top:15px;border-top:1px solid rgba(255,255,255,0.1);margin-top:15px;">' +
          '<p style="font-size:12px;color:#666;">ملك التوقعات - فيفا ٢٠٢٦ | مجموعة المرشد القابضة</p></div></div>';

        const emailResult = await sendEmail(
          {
            apiKey: config.apiKey || "",
            mailjetApiKey: config.mailjetApiKey || undefined,
            mailjetSecretKey: config.mailjetSecretKey || undefined,
            fromEmail: config.fromEmail,
            fromName: config.fromName || "ملك التوقعات",
            recipients: [email],
          },
          "تأكيد البريد الإلكتروني - ملك التوقعات فيفا ٢٠٢٦",
          html
        );
        emailSent = emailResult.success;
      }
    } catch {
      // Email send failed silently
    }

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.",
      });
    }

    // No email configured or send failed — auto-verify the user as fallback
    try {
      await db.update(schema.users)
        .set({ emailVerified: true, verificationToken: null, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
    } catch {}

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarEmoji: user.avatarEmoji,
        totalPoints: user.totalPoints,
        isAdmin: false,
        banned: false,
        department: user.department,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ في التسجيل" }, { status: 500 });
  }
}
