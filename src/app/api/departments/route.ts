import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";

// GET — List all departments (public, for registration form)
export async function GET() {
  try {
    const db = getClient();
    const deptList = await db.select().from(schema.departments);
    return NextResponse.json({ departments: deptList });
  } catch (error) {
    console.error("Departments GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
