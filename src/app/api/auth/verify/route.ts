import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (token) {
      const db = getClient();
      try { await db.run(sql`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`); } catch {}
      try { await db.run(sql`ALTER TABLE users ADD COLUMN verification_token TEXT`); } catch {}

      const users = await db.select().from(schema.users).where(eq(schema.users.verificationToken, token)).limit(1);
      if (users.length > 0 && !users[0].emailVerified) {
        await db.update(schema.users)
          .set({ emailVerified: true, verificationToken: null, updatedAt: new Date() })
          .where(eq(schema.users.id, users[0].id));
      }
    }

    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
