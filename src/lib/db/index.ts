import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Environment type for Cloudflare Workers with D1 binding.
 * When running on Workers, the D1 database is accessed via `env.DB`.
 */
export interface CloudflareEnv {
  DB: D1Database;
  [key: string]: unknown;
}

/**
 * Get a Drizzle ORM client for Cloudflare D1 (production / Workers runtime).
 *
 * This function accepts the Worker env object and returns a Drizzle client
 * initialized with the D1 binding. It is created per-request, never at
 * module level.
 *
 * @param env - The Worker environment context containing the D1 binding
 * @returns Drizzle ORM client connected to D1
 */
export function getDB(env: CloudflareEnv) {
  return drizzleD1(env.DB, { schema });
}

/**
 * Get a Drizzle ORM client for local SQLite development via libSQL.
 *
 * Uses @libsql/client which is a pure JavaScript SQLite client — no native
 * bindings required. Fully compatible with edge runtimes.
 *
 * Supports both:
 * - Local file: "file:./db/custom.db"
 * - Remote Turso: "libsql://your-db.turso.io"
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
 * - If `env` is provided with a D1 binding (Cloudflare Workers), uses D1.
 * - Otherwise, falls back to libSQL with local SQLite or Turso.
 *
 * @param env - Optional Worker environment context
 * @returns Drizzle ORM client
 */
export function getClient(env?: CloudflareEnv) {
  if (env?.DB) {
    return getDB(env);
  }

  return getLocalDB();
}

export { schema };
