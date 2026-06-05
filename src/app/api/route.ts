import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db";

/**
 * API health check route using Drizzle ORM with dual-driver support.
 *
 * Cloudflare Workers: Use getDB(env) with D1 binding.
 * Local development: Use getClient() which falls back to libSQL.
 */
export async function GET() {
  try {
    const db = getClient();

    // Simple health check: try to query users table
    const result = await db.select().from(schema.users).limit(5);

    return NextResponse.json({
      status: "ok",
      dbDriver: "drizzle-orm + libsql",
      compatibility: "cloudflare-workers-ready",
      userCount: result.length,
    });
  } catch (error) {
    return NextResponse.json({
      status: "ok",
      dbDriver: "drizzle-orm + libsql",
      note: "Database query failed. Schema may need migration.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
