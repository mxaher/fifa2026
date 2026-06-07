import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Get the D1 binding from the Cloudflare Workers environment.
 * Uses @opennextjs/cloudflare's getCloudflareContext() to access env bindings.
 */
export function getD1Binding() {
  const { env } = getCloudflareContext();
  const db = (env as Record<string, unknown>).DB;
  if (!db) {
    throw new Error(
      "D1 binding not found. Ensure DB is declared in wrangler.toml and you're running on Cloudflare Workers."
    );
  }
  return db;
}

/**
 * Get a Drizzle ORM client for Cloudflare D1 (production / Workers runtime).
 *
 * @returns Drizzle ORM client connected to D1
 */
export function getD1DB() {
  return drizzleD1(getD1Binding(), { schema });
}

/**
 * Get a Drizzle ORM client for local SQLite development via libSQL.
 *
 * Uses @libsql/client which is a pure JavaScript SQLite client — no native
 * bindings required. Fully compatible with edge runtimes.
 *
 * @param dbUrl - Database URL (file path or libsql:// remote URL)
 * @param authToken - Optional auth token for remote Turso databases
 * @returns Drizzle ORM client connected to local/remote SQLite
 */
export function getLocalDB(dbUrl?: string, authToken?: string) {
  const url = dbUrl || process.env.DATABASE_URL || "file:./db/custom.db";
  const client = createClient({
    url,
    authToken,
  });
  return drizzleLibSQL(client, { schema });
}

/**
 * Convenience: Get a DB client appropriate for the current environment.
 *
 * - If D1 binding exists (Cloudflare Workers), uses D1.
 * - Otherwise, falls back to libSQL with local SQLite.
 *
 * @returns Drizzle ORM client
 */
export function getClient() {
  try {
    const { env } = getCloudflareContext();
    if ((env as Record<string, unknown>).DB) {
      return getD1DB();
    }
  } catch {
    // Not in Cloudflare context — fall through to local
  }
  return getLocalDB();
}

export { schema };
