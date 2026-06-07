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
      emailVerified: true,
      department,
    }).returning();

    const user = result[0];

    // Try to send welcome email (purely informational, no verification needed)
    try {
      const configs = await db.select().from(schema.emailConfig).limit(1);
      const config = configs[0];

      if (config?.fromEmail && (config?.apiKey || (config?.mailjetApiKey && config?.mailjetSecretKey))) {
        const html =
          '<div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0F2137;color:#e0e0e0;border-radius:12px;">' +
          '<div style="text-align:center;padding:20px 0;">' +
          '<span style="font-size:48px;">⚽🏆</span>' +
          '<h1 style="color:#FFD700;margin:10px 0;">مرحباً بك في ملك التوقعات!</h1>' +
          '<h2 style="color:#4FC3F7;font-size:16px;">FIFA World Cup 2026™</h2></div>' +
          '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;margin:15px 0;">' +
          '<p style="margin:0 0 10px 0;">مرحباً ' + name + '،</p>' +
          '<p style="margin:0 0 15px 0;">تم إنشاء حسابك بنجاح في ملك التوقعات! يمكنك الآن تسجيل الدخول والبدء في التوقعات.</p>' +
          '<div style="text-align:center;margin:20px 0;">' +
          '<a href="' + BASE_URL + '" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#FFD700,#FFA000);border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;"><span style="color:#000000;">الدخول إلى التطبيق</span></a></div></div>' +
          '<div style="text-align:center;padding-top:15px;border-top:1px solid rgba(255,255,255,0.1);margin-top:15px;">' +
          '<p style="font-size:12px;color:#666;">ملك التوقعات - فيفا ٢٠٢٦ | مجموعة المرشد القابضة</p></div></div>';

        await sendEmail(
          {
            apiKey: config.apiKey || "",
            mailjetApiKey: config.mailjetApiKey || undefined,
            mailjetSecretKey: config.mailjetSecretKey || undefined,
            fromEmail: config.fromEmail,
            fromName: config.fromName || "ملك التوقعات",
            recipients: [email],
          },
          "مرحباً بك في ملك التوقعات - فيفا ٢٠٢٦",
          html
        );
      }
    } catch {
      // Welcome email is best-effort, never block registration
    }

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
