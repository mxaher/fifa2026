import { NextResponse } from "next/server";
import { seed } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("X-Admin-Token");
    const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;

    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const result = await seed();

    return NextResponse.json({
      success: true,
      message: "تم إعادة ضبط الفرق والمباريات بنجاح",
      ...result,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
