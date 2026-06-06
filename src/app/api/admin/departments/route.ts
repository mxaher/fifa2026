import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq } from "drizzle-orm";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

// GET — List all departments
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const deptList = await db.select().from(schema.departments);

    return NextResponse.json({ departments: deptList });
  } catch (error) {
    console.error("Admin departments GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// POST — Add a new department
export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id, name, nameAr } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
    }

    const db = getClient();
    const deptId = id || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check if ID already exists
    const existing = await db.select().from(schema.departments).where(eq(schema.departments.id, deptId)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "معرف القسم موجود بالفعل" }, { status: 409 });
    }

    const result = await db.insert(schema.departments).values({
      id: deptId,
      name,
      nameAr: nameAr || null,
    }).returning();

    return NextResponse.json({ department: result[0] });
  } catch (error) {
    console.error("Admin departments POST error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// PUT — Update a department
export async function PUT(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id, name, nameAr } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "معرف القسم مطلوب" }, { status: 400 });
    }

    const db = getClient();
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    await db.update(schema.departments).set(updateData).where(eq(schema.departments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin departments PUT error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// DELETE — Delete a department
export async function DELETE(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "معرف القسم مطلوب" }, { status: 400 });
    }

    const db = getClient();

    // Check if any users are in this department
    const usersInDept = await db.select().from(schema.users).where(eq(schema.users.department, id)).limit(1);
    if (usersInDept.length > 0) {
      return NextResponse.json({ error: "لا يمكن حذف قسم يحتوي على مستخدمين" }, { status: 400 });
    }

    await db.delete(schema.departments).where(eq(schema.departments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin departments DELETE error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
