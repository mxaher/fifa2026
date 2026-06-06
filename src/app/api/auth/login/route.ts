import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

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
    const valid = await verifyPassword(password, user.passwordHash, user.salt);

    if (!valid) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, avatarEmoji: user.avatarEmoji, totalPoints: user.totalPoints },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 });
  }
}
