import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { verifyPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { eq, sql } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL || "https://fifa26-predictions.moh-zaher.workers.dev";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const db = getClient();
    // Auto-migrate: ensure new columns exist (safe to run repeatedly)
    try { await db.run(sql`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`); } catch {}
    try { await db.run(sql`ALTER TABLE users ADD COLUMN verification_token TEXT`); } catch {}

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

    // Check email verification (skip for admins)
    if (!user.isAdmin && !user.emailVerified) {
      return NextResponse.json({
        error: "البريد الإلكتروني غير مؤكد. يرجى التحقق من بريدك الإلكتروني أو التواصل مع المشرف لتأكيد الحساب.",
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
