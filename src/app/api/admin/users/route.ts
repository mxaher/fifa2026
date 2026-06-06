import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { hashPassword } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

// GET — List all users with prediction counts
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const users = await db.select().from(schema.users);

    // Get prediction counts per user
    const predCounts = await db.select({
      userId: schema.predictions.userId,
      count: sql<number>`cast(count(*) as integer)`,
    }).from(schema.predictions).groupBy(schema.predictions.userId);

    const predMap = new Map(predCounts.map(p => [p.userId, p.count]));

    const usersWithStats = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarEmoji: u.avatarEmoji,
      totalPoints: u.totalPoints ?? 0,
      isAdmin: u.isAdmin ?? false,
      banned: u.banned ?? false,
      predictionCount: predMap.get(u.id) ?? 0,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// POST — Create a new user
export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { name, email, password, avatarEmoji, isAdmin } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "الاسم والبريد وكلمة المرور مطلوبة" }, { status: 400 });
    }

    const db = getClient();

    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);

    const result = await db.insert(schema.users).values({
      name,
      email,
      passwordHash: hash,
      salt,
      avatarEmoji: avatarEmoji || "⚽",
      totalPoints: 0,
      isAdmin: isAdmin ?? false,
      banned: false,
    }).returning();

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// PUT — Update user (name, email, avatarEmoji, isAdmin, banned, password)
export async function PUT(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id, name, email, avatarEmoji, isAdmin, banned, password } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "User ID مطلوب" }, { status: 400 });
    }

    const db = getClient();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (avatarEmoji !== undefined) updateData.avatarEmoji = avatarEmoji;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (banned !== undefined) updateData.banned = banned;

    if (password) {
      const { hash, salt } = await hashPassword(password);
      updateData.passwordHash = hash;
      updateData.salt = salt;
    }

    await db.update(schema.users).set(updateData).where(eq(schema.users.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin users PUT error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// DELETE — Delete user
export async function DELETE(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID مطلوب" }, { status: 400 });
    }

    const db = getClient();

    // Don't delete admin user
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (user.length > 0 && user[0].isAdmin) {
      return NextResponse.json({ error: "لا يمكن حذف حساب المشرف" }, { status: 400 });
    }

    // Delete user's predictions first
    await db.delete(schema.predictions).where(eq(schema.predictions.userId, id));
    // Delete user
    await db.delete(schema.users).where(eq(schema.users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin users DELETE error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
