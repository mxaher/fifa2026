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
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false),
  banned: integer("banned", { mode: "boolean" }).default(false),
  department: text("department"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("users_email_unique").on(table.email),
]);

// Company departments
export const departments = sqliteTable("departments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

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

// Sync audit log — keeps a record of every cron and manual sync run
export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  triggeredBy: text("triggered_by").notNull(),  // 'cron' or 'admin'
  sourceApi: text("source_api").notNull(),      // 'primary' | 'backup' | 'none'
  fetchedMatches: integer("fetched_matches").default(0),
  completedFound: integer("completed_found").default(0),
  newlyFinalized: integer("newly_finalized").default(0),
  alreadyDone: integer("already_done").default(0),
  errorCount: integer("error_count").default(0),
  errorsJson: text("errors_json"),              // JSON array of error strings
  durationMs: integer("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Email configuration (single row)
export const emailConfig = sqliteTable("email_config", {
  id: text("id").primaryKey().default("default"),
  apiKey: text("api_key").notNull().default(""),
  fromEmail: text("from_email").notNull().default(""),
  fromName: text("from_name").notNull().default("ملك التوقعات"),
  recipients: text("recipients").notNull().default("[]"), // JSON array of email strings
  autoSendDaily: integer("auto_send_daily", { mode: "boolean" }).default(false),
  notifyOnSyncError: integer("notify_on_sync_error", { mode: "boolean" }).default(false),
  lastSentAt: integer("last_sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Email send log
export const emailLog = sqliteTable("email_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipientCount: integer("recipient_count").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // 'sent' | 'failed'
  messageId: text("message_id"),
  error: text("error"),
  sentBy: text("sent_by").notNull(), // 'admin' | 'cron'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type SyncLogEntry = typeof syncLog.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type EmailConfig = typeof emailConfig.$inferSelect;
export type EmailLog = typeof emailLog.$inferSelect;
