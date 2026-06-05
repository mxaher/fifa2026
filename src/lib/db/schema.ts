import { sqliteTable, text, integer, numeric, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Drizzle ORM schema for SQLite / Cloudflare D1.
 *
 * This schema was introspected from the existing Prisma-generated database
 * to ensure exact column type compatibility. It works with both local SQLite
 * (via libsql) and Cloudflare D1.
 *
 * Key differences from Prisma schema:
 * - Timestamps stored as numeric (Unix epoch millis) per Prisma convention
 * - Boolean published field stored as numeric (0/1) per SQLite convention
 */

export const users = sqliteTable("User", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("User_email_unique").on(table.email),
]);

export const posts = sqliteTable("Post", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  content: text("content"),
  published: numeric("published").notNull().default("0"),
  authorId: text("authorId").notNull(),
  createdAt: numeric("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: numeric("updatedAt").notNull(),
});

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
