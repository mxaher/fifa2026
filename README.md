# ملك التوقعات — FIFA 2026 Prediction Game

Internal employee prediction game for **مجموعة المرشد القابضة** (Al-Marshad Holding Group). Employees predict FIFA 2026 World Cup match scores and compete on a live leaderboard.

**Stack:** Next.js 16 (App Router) · TypeScript · Cloudflare D1 (SQLite) · Drizzle ORM · Tailwind CSS 4 · Resend (email)

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Core Algorithms](#2-core-algorithms)
3. [External Sync Engine](#3-external-sync-engine)
4. [Authentication](#4-authentication)
5. [API Reference](#5-api-reference)
6. [Data Flow](#6-data-flow)
7. [Business Rules](#7-business-rules)

---

## 1. Database Schema

8 tables defined in `src/lib/db/schema.ts`.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (PK) | UUID via `crypto.randomUUID()` |
| `email` | TEXT | Unique index |
| `name` | TEXT | Display name |
| `password_hash` | TEXT | PBKDF2-SHA256 hex |
| `salt` | TEXT | 16-byte random hex |
| `avatar_emoji` | TEXT | Default `"⚽"`, random from pool `["⚽","🏆","🎯","🥅","🎪","🌟","💪","🔥","⭐","🎮"]` |
| `total_points` | INTEGER | Running sum of all scored predictions |
| `is_admin` | BOOLEAN | Admin flag |
| `banned` | BOOLEAN | Blocks login |
| `department` | TEXT | FK → `departments.id` |

### `departments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (PK) | UUID or admin-chosen slug |
| `name` | TEXT | English name |
| `name_ar` | TEXT | Arabic name (nullable) |

### `teams`

48 teams across 12 groups (A–L).

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (PK) | 3-letter code (e.g. `"BRA"`, `"MEX"`) |
| `name` | TEXT | English name |
| `name_ar` | TEXT | Arabic name |
| `flag` | TEXT | Emoji flag |
| `group_letter` | TEXT | A–L, indexed |
| `fifa_rank` | INTEGER | Current FIFA ranking |
| `region` | TEXT | Confederation (UEFA, CAF, CONMEBOL, CONCACAF, AFC, OFC) |

### `matches`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (PK) | UUID |
| `match_number` | INTEGER | Sequential (1–72 for group stage + knockout) |
| `stage` | TEXT | `"group"`, `"round_of_32"`, `"round_of_16"`, `"quarter_final"`, `"semi_final"`, `"final"` |
| `group_letter` | TEXT | A–L (nullable for knockout) |
| `home_team_id` | TEXT | FK → `teams.id` |
| `away_team_id` | TEXT | FK → `teams.id` |
| `kickoff` | TIMESTAMP | Match start time (ISO UTC) |
| `home_score` | INTEGER | Actual result (null = pending) |
| `away_score` | INTEGER | Actual result (null = pending) |
| `status` | TEXT | `"upcoming"`, `"live"`, `"finished"` |

### `predictions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (PK) | UUID |
| `user_id` | TEXT | FK → `users.id`, indexed |
| `match_id` | TEXT | FK → `matches.id` |
| `home_score` | INTEGER | Predicted home score |
| `away_score` | INTEGER | Predicted away score |
| `points` | INTEGER | Null until match is finalized |
| `points_type` | TEXT | `"exact"`, `"correct"`, `"wrong"`, or null |

Unique index on `(user_id, match_id)` — one prediction per user per match.

### `sync_log`

Audit trail for every external API sync run.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER (PK, autoincrement) | |
| `triggered_by` | TEXT | `"cron"` or `"admin"` |
| `source_api` | TEXT | `"primary"`, `"backup"`, or `"none"` |
| `fetched_matches` | INTEGER | Total matches fetched |
| `completed_found` | INTEGER | Completed matches in response |
| `newly_finalized` | INTEGER | Matches finalized this run |
| `already_done` | INTEGER | Already finished matches |
| `error_count` | INTEGER | Number of errors |
| `errors_json` | TEXT | JSON array of error strings |
| `duration_ms` | INTEGER | Wall-clock time |

### `email_config` / `email_log`

Singleton email config (Resend API key, recipients, auto-send toggle) and send history.

### Entity Relationships

```
users.department ──→ departments.id
matches.home_team_id ──→ teams.id
matches.away_team_id ──→ teams.id
predictions.user_id ──→ users.id
predictions.match_id ──→ matches.id
```

---

## 2. Core Algorithms

### 2a. Prediction Scoring — `src/lib/scoring.ts`

```typescript
calculatePoints(predictedHome, predictedAway, actualHome, actualAway)
  → { points: 3 | 2 | 0, pointsType: 'exact' | 'correct' | 'wrong' }
```

| Condition | Points | `pointsType` |
|-----------|--------|------|
| `predictedHome === actualHome && predictedAway === actualAway` | **3** | `exact` |
| `sign(predictedHome - predictedAway) === sign(actualHome - actualAway)` | **2** | `correct` |
| Otherwise | **0** | `wrong` |

Outcome sign: positive = home win, zero = draw, negative = away win.

### 2b. Match Finalization — `src/lib/finalize.ts`

`finalizeMatch(matchId, actualHomeScore, actualAwayScore)`:

1. **Validate** — match exists and status is not already `"finished"`
2. **Lock result** — update match row with scores, set `status = 'finished'`
3. **Score predictions** — fetch all predictions for this match, run `calculatePoints()` on each, write points back
4. **Recalculate totals** — for every affected user, sum **all** their scored predictions (not just this match) and update `users.totalPoints`

This is the single source of truth for match finalization. It is called by:
- Manual admin result submission (`POST /api/admin/result`)
- External sync engine (`syncResults()`)

### 2c. Leaderboard — `src/app/api/leaderboard/route.ts`

1. Fetch all users ordered by `totalPoints DESC`
2. Filter out admin users
3. Fetch all predictions, aggregate stats per user (total, exact, correct, wrong, pending)
4. Assign sequential ranks (1, 2, 3, …)

```typescript
leaderboard = users
  .filter(u => !u.isAdmin)
  .sort(desc(totalPoints))
  .map((user, index) => ({
    rank: index + 1,
    ...user,
    predictions: { total, exact, correct, wrong, pending }
  }))
```

### 2d. Password Hashing — `src/lib/auth.ts`

Uses **Web Crypto API** (no Node.js `crypto` dependency, fully edge-compatible):

**`hashPassword(password)`**
1. Generate 16 random bytes as salt (`crypto.getRandomValues`)
2. PBKDF2-SHA256 with 100,000 iterations, 256-bit output
3. Return `{ hash: hexString, salt: hexString }`

**`verifyPassword(password, hash, saltHex)`**
1. Parse salt hex → `Uint8Array`
2. Same PBKDF2 derivation
3. Constant-time comparison via string equality

---

## 3. External Sync Engine — `src/lib/sync.ts`

Automatically fetches real match results from external APIs and finalizes matches.

### API Sources (fallback chain)

| Priority | API | Format | Timeout |
|----------|-----|--------|---------|
| Primary | `worldcup26.ir/get/games` | `{ games: [...] }` | 8s |
| Backup | `worldcupjson.net/matches?status=completed` | `[{ home_team: {...}, ... }]` | 8s |

### Algorithm (`syncResults(triggeredBy)`)

```
1. Fetch from primary API
   ├── Success → parse NormalizedMatch[]
   └── Fail → log error, try backup API
        ├── Success → parse NormalizedMatch[]
        └── Fail → log error, return early

2. Filter to completed matches (isCompleted && homeScore !== null && awayScore !== null)

3. For each completed match:
   a. findMatchInDB() — match external team names to DB teams
      - Normalize names via 100+ entry TEAM_NAME_MAP (handles "USA"→"United States", "Korea Republic"→"South Korea", etc.)
      - Case-insensitive matching
      - Checks both direct and reversed home/away order (neutral venue swap)
   b. Skip if match not found (log error)
   c. Skip if already finalized (status === "finished")
   d. If reversed order, swap home/away scores
   e. finalizeMatch() — lock scores, score predictions

4. Write sync_log entry

5. Return SyncReport
```

### Team Name Mapping (`TEAM_NAME_MAP`)

110+ entries normalizing FIFA/common name variants to DB canonical names:

| External Name | DB Name |
|--------------|---------|
| `USA`, `United States of America`, `USMNT` | `United States` |
| `Korea Republic`, `Republic of Korea`, `Korea` | `South Korea` |
| `IR Iran`, `Islamic Republic of Iran` | `Iran` |
| `Czechia`, `Czech` | `Czech Republic` |
| `Côte d'Ivoire`, `Cote d'Ivoire` | `Ivory Coast` |
| `Congo DR`, `Democratic Republic of the Congo` | `DR Congo` |
| `Curaçao`, `Curacao` | `Curaçao` |
| `Cabo Verde` | `Cape Verde` |
| `Bosnia Herzegovina`, `Bosnia & Herzegovina` | `Bosnia & Herzegovina` |
| `NZ` | `New Zealand` |
| `KSA`, `Saudi` | `Saudi Arabia` |

Names not in the map are used as-is (trimmed).

### Cron Schedule (from `wrangler.toml`)

| Period | Frequency |
|--------|-----------|
| June–July, 12:00–23:59 | Every **5 minutes** |
| June–July, 00:00–11:59 | Every **30 minutes** |
| Off-season | Every **1 hour** |

During World Cup months, results sync aggressively every 5 minutes during the match window.

---

## 4. Authentication

### Model: Simple email/password (no sessions, no JWTs)

| Endpoint | Logic |
|----------|-------|
| `POST /api/auth/register` | Validate inputs → check dept exists → check email unique → hash password → insert user → return user object |
| `POST /api/auth/login` | Lookup by email → check banned → verify password hash → return user object |
| `POST /api/auth/logout` | No-op (client clears localStorage) |

### Admin auth

Admin endpoints are authenticated via the `X-Admin-Token` header, compared against the `ADMIN_TOKEN` environment variable. Admins are identified by `isAdmin=true` in the database.

### Session persistence (client-side)

- On login: stores user object as `fifa26_user` in `localStorage`
- Admin token stored as `fifa26_admin_token` in `localStorage`
- The admin email `admin@almarshad.com` is hardcoded in the UI for identifying admin users

---

## 5. API Reference

### Public Endpoints

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| `GET` | `/api` | — | Health check |
| `GET` | `/api/departments` | — | List all departments |
| `GET` | `/api/matches` | `?userId` | List matches with team info and optional user prediction |
| `GET` | `/api/predictions` | `?userId` (required) | Get user's predictions with match details |
| `POST` | `/api/predictions` | — | Create or update prediction (upsert) |
| `GET` | `/api/leaderboard` | — | Get ranked leaderboard with prediction stats |
| `GET` | `/api/sync` | — | Cron-triggered sync |
| `POST` | `/api/auth/register` | — | Register new user |
| `POST` | `/api/auth/login` | — | Login |
| `POST` | `/api/auth/logout` | — | Logout |

### Prediction Upsert Logic (`POST /api/predictions`)

1. Validate body: `{ userId, matchId, homeScore, awayScore }`
2. **Block admin** users (403)
3. Match must exist (404) and be **upcoming** (400)
4. If prediction exists → **update** it
5. Else → **insert** with `points: null, pointsType: null`

### Admin Endpoints (require `X-Admin-Token`)

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/admin/users` | List / create users |
| `PUT` | `/api/admin/users` | Update user fields |
| `DELETE` | `/api/admin/users?id=` | Delete user (cannot delete admins) |
| `GET/POST/PUT/DELETE` | `/api/admin/matches` | CRUD matches |
| `GET/POST` | `/api/admin/result` | Submit match results (calls `finalizeMatch()`) |
| `GET/POST/PUT/DELETE` | `/api/admin/departments` | CRUD departments |
| `GET/POST` | `/api/admin/email` | Preview / send daily summary email |
| `GET/POST` | `/api/admin/email-config` | View / update Resend email settings |
| `GET` | `/api/admin/email-log` | Last 50 email send logs |
| `POST` | `/api/admin/migrate-email` | Create email tables (migration helper) |
| `GET/POST` | `/api/admin/fix-match-ids` | Fix matches with null IDs |

---

## 6. Data Flow

```
User Registration / Login
  │
  ▼
User makes prediction ──→ POST /api/predictions
  │                        └── Inserted with points=null (pending)
  │
  ▼
External API sync (cron or admin)
  │
  ├── fetchFromPrimary() → worldcup26.ir
  ├── (fallback) fetchFromBackup() → worldcupjson.net
  ├── findMatchInDB() — team name matching via TEAM_NAME_MAP
  ├── finalizeMatch() for each newly completed match
  │     ├── Update match: scores + status='finished'
  │     ├── calculatePoints() on each prediction
  │     ├── Write points + pointsType to prediction rows
  │     └── Recalculate user.totalPoints (full sum)
  │
  ▼
Leaderboard — GET /api/leaderboard
  └── Sorted by totalPoints DESC, admins excluded
```

**Alternative path:**
```
Admin manually submits result ──→ POST /api/admin/result
  └── Same finalizeMatch() path as sync engine
```

---

## 7. Business Rules

| Rule | Detail |
|------|--------|
| **Scoring** | Exact score = **3pts**, Correct outcome = **2pts**, Wrong = **0pts** |
| **Prediction deadline** | Before match kickoff; match must have `status: "upcoming"` |
| **One prediction per match per user** | Upsert — re-predicting overwrites the previous |
| **Admins cannot predict** | 403 on prediction POST for admin users |
| **Admins excluded from leaderboard** | Filtered out in leaderboard query |
| **Banned users blocked** | 403 on login |
| **Admin accounts protected** | Cannot be deleted via API |
| **Departments with users protected** | Cannot be deleted if users are assigned |
| **Sync fallback** | Primary → backup → failure logged, no crash |
| **Total points recalculation** | Full sum of all scored predictions, computed every time a match is finalized |

---

## Architecture: Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | All 8 table definitions with Drizzle ORM |
| `src/lib/db/index.ts` | DB client factory (D1 in prod, libSQL local) |
| `src/lib/scoring.ts` | Prediction scoring algorithm |
| `src/lib/finalize.ts` | Match finalization + scoring pipeline |
| `src/lib/sync.ts` | External API sync engine (dual-source, team name mapping) |
| `src/lib/auth.ts` | PBKDF2-SHA256 password hashing |
| `src/lib/email.ts` | Resend API email sender |
| `src/lib/seed.ts` | 48 teams + 72 matches seed data |
| `src/middleware.ts` | CORS middleware |
| `src/app/api/predictions/route.ts` | Prediction CRUD (upsert logic) |
| `src/app/api/leaderboard/route.ts` | Leaderboard computation |
| `src/app/api/matches/route.ts` | Match listing with predictions |
| `src/app/api/admin/result/route.ts` | Admin match result submission |
| `src/hooks/use-toast.ts` | Toast notification hook |
| `wrangler.toml` | Cloudflare config, D1 binding, cron triggers |
