import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

const AVATARS = ["⚽", "🏆", "🎯", "🥅", "🎪", "🌟", "💪", "🔥", "⭐", "🎮"];

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const db = getClient();

    // Check if email already exists
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);
    const avatarEmoji = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    const result = await db.insert(schema.users).values({
      name,
      email,
      passwordHash: hash,
      salt,
      avatarEmoji,
      totalPoints: 0,
      isAdmin: false,
      banned: false,
    }).returning();

    const user = result[0];
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarEmoji: user.avatarEmoji,
        totalPoints: user.totalPoints,
        isAdmin: false,
        banned: false,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ في التسجيل" }, { status: 500 });
  }
}
