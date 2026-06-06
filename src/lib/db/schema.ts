import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// Users / employees
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  avatarEmoji: text("avatar_emoji").default("⚽"),
  totalPoints: integer("total_points").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("users_email_unique").on(table.email),
]);

// 48 teams in 12 groups
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  flag: text("flag").notNull(),
  groupLetter: text("group_letter").notNull(),
  fifaRank: integer("fifa_rank"),
  region: text("region"),
}, (table) => [
  index("teams_group_idx").on(table.groupLetter),
]);

// 72+ matches
export const matches = sqliteTable("matches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  matchNumber: integer("match_number").notNull(),
  stage: text("stage").notNull().default("group"),
  groupLetter: text("group_letter"),
  homeTeamId: text("home_team_id").notNull().references(() => teams.id),
  awayTeamId: text("away_team_id").notNull().references(() => teams.id),
  kickoff: integer("kickoff", { mode: "timestamp" }).notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: text("status").notNull().default("upcoming"),
  venue: text("venue"),
}, (table) => [
  index("matches_group_idx").on(table.groupLetter),
  index("matches_status_idx").on(table.status),
]);

// User predictions
export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  matchId: text("match_id").notNull().references(() => matches.id),
  homeScore: integer("home_score").notNull(),
  awayScore: integer("away_score").notNull(),
  points: integer("points"),
  pointsType: text("points_type"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("predictions_user_match_unique").on(table.userId, table.matchId),
  index("predictions_user_idx").on(table.userId),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
