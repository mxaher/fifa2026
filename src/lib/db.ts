/**
 * Database client re-export.
 *
 * This file provides backward-compatible exports while the migration
 * from Prisma to Drizzle is in progress.
 *
 * For Cloudflare Workers: Use `getDB(env)` with D1 binding.
 * For local development: Use `getClient()` which falls back to libSQL.
 *
 * @see src/lib/db/index.ts for the full implementation
 * @see src/lib/db/schema.ts for the Drizzle schema
 */

// Re-export everything from the new DB module
export { getDB, getLocalDB, getClient, schema } from "./db/index";
export type { CloudflareEnv } from "./db/index";
export type { User, NewUser, Post, NewPost } from "./db/schema";
