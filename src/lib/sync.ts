/*
 * Pre-Work Report:
 * Columns used from schema: matches.id, matches.matchNumber, matches.status,
 *   matches.homeScore, matches.awayScore, matches.homeTeamId, matches.awayTeamId,
 *   matches.groupLetter, matches.kickoff
 * Teams joined via: teams.id, teams.name, teams.nameAr
 * finalizeMatch: created fresh in src/lib/finalize.ts
 * DB access: getClient() from lib/db/index for local dev
 */

import { eq } from 'drizzle-orm';
import { getClient, schema } from './db/index';
import { finalizeMatch, type FinalizeResult } from './finalize';

const { matches, teams, syncLog } = schema;

// ── Normalized internal shape ──────────────────────────────────
export interface NormalizedMatch {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  isCompleted: boolean;
  matchDatetime: string;   // ISO UTC
  source: 'primary' | 'backup';
}

export interface SyncReport {
  source: 'primary' | 'backup' | 'none';
  fetchedMatches: number;
  completedFound: number;
  newlyFinalized: number;
  alreadyDone: number;
  errors: string[];
  results: FinalizeResult[];
  timestamp: string;
}

// ── Primary API: worldcup26.ir ─────────────────────────────────
// Actual response shape: { games: [...] }
// Each game has: id, home_team_name_en, away_team_name_en,
//   home_score (string), away_score (string), finished ("TRUE"/"FALSE"),
//   local_date, type, group, time_elapsed
async function fetchFromPrimary(): Promise<NormalizedMatch[]> {
  const res = await fetch('https://worldcup26.ir/get/games', {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`worldcup26.ir responded with HTTP ${res.status}`);
  }

  const raw = await res.json() as any;
  // API wraps results in a `games` array
  const data: any[] = Array.isArray(raw) ? raw : (raw.games ?? raw.data ?? []);

  return data.map((g): NormalizedMatch => {
    // Score fields are strings ("0", "2", etc.) — parse to int, treat "0" during unfinished as null
    const isFinished = String(g.finished ?? g.status ?? '').toUpperCase() === 'TRUE' ||
      ['finished', 'completed', 'ft', 'full-time'].includes(String(g.status ?? '').toLowerCase());

    const rawHome = g.home_score ?? g.home_goals ?? null;
    const rawAway = g.away_score ?? g.away_goals ?? null;
    // Only treat scores as valid if match is finished
    const homeScore = isFinished && rawHome != null ? parseInt(String(rawHome), 10) : null;
    const awayScore = isFinished && rawAway != null ? parseInt(String(rawAway), 10) : null;

    return {
      externalId: String(g.id ?? g.match_number ?? ''),
      homeTeam: g.home_team_name_en ?? g.home_team ?? g.home ?? '',
      awayTeam: g.away_team_name_en ?? g.away_team ?? g.away ?? '',
      homeScore: homeScore !== null && !isNaN(homeScore) ? homeScore : null,
      awayScore: awayScore !== null && !isNaN(awayScore) ? awayScore : null,
      isCompleted: isFinished,
      matchDatetime: g.local_date ?? g.datetime ?? g.date ?? '',
      source: 'primary',
    };
  });
}

// ── Backup API: worldcupjson.net ───────────────────────────────
async function fetchFromBackup(): Promise<NormalizedMatch[]> {
  const res = await fetch('https://worldcupjson.net/matches?status=completed', {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`worldcupjson.net responded with HTTP ${res.status}`);
  }

  const data = await res.json() as any[];

  return data.map((m): NormalizedMatch => ({
    externalId: String(m.fifa_id ?? m.id ?? ''),
    homeTeam: m.home_team?.country ?? m.home_team_country ?? '',
    awayTeam: m.away_team?.country ?? m.away_team_country ?? '',
    homeScore: m.home_team?.goals ?? null,
    awayScore: m.away_team?.goals ?? null,
    isCompleted: String(m.status ?? '').toLowerCase() === 'completed',
    matchDatetime: m.datetime ?? '',
    source: 'backup',
  }));
}

// ── Team name matching ─────────────────────────────────────────
// Maps external API team names to our DB team names
const TEAM_NAME_MAP: Record<string, string> = {
  'USA': 'United States',
  'United States of America': 'United States',
  'USMNT': 'United States',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Korea': 'South Korea',
  'IR Iran': 'Iran',
  'Islamic Republic of Iran': 'Iran',
  'Czechia': 'Czech Republic',
  'Czech': 'Czech Republic',
  'Bosnia Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia': 'Bosnia and Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Ivory Coast': 'Ivory Coast',
  'Congo DR': 'DR Congo',
  'Democratic Republic of the Congo': 'DR Congo',
  'DR Congo': 'DR Congo',
  'Congo': 'DR Congo',
  'KSA': 'Saudi Arabia',
  'Saudi': 'Saudi Arabia',
  'Curaçao': 'Curaçao',
  'Curacao': 'Curaçao',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  'New Zealand': 'New Zealand',
  'NZ': 'New Zealand',
  'South Korea': 'South Korea',
  'Czech Republic': 'Czech Republic',
  'Burkina Faso': 'Burkina Faso',
  'Cape Verde': 'Cape Verde',
  'Cabo Verde': 'Cape Verde',
  'Equatorial Guinea': 'Equatorial Guinea',
  'United States': 'United States',
  'England': 'England',
  'France': 'France',
  'Spain': 'Spain',
  'Germany': 'Germany',
  'Brazil': 'Brazil',
  'Argentina': 'Argentina',
  'Portugal': 'Portugal',
  'Belgium': 'Belgium',
  'Netherlands': 'Netherlands',
  'Japan': 'Japan',
  'Morocco': 'Morocco',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Mexico': 'Mexico',
  'Ecuador': 'Ecuador',
  'Uruguay': 'Uruguay',
  'Senegal': 'Senegal',
  'Switzerland': 'Switzerland',
  'Algeria': 'Algeria',
  'Egypt': 'Egypt',
  'Tunisia': 'Tunisia',
  'Sweden': 'Sweden',
  'Norway': 'Norway',
  'Croatia': 'Croatia',
  'Denmark': 'Denmark',
  'Ireland': 'Ireland',
  'Scotland': 'Scotland',
  'Wales': 'Wales',
  'Poland': 'Poland',
  'Serbia': 'Serbia',
  'Ukraine': 'Ukraine',
  'Turkey': 'Turkey',
  'Ghana': 'Ghana',
  'Cameroon': 'Cameroon',
  'Nigeria': 'Nigeria',
  'Panama': 'Panama',
  'Haiti': 'Haiti',
  'Jamaica': 'Jamaica',
  'Canada': 'Canada',
  'Costa Rica': 'Costa Rica',
  'Honduras': 'Honduras',
  'Paraguay': 'Paraguay',
  'Chile': 'Chile',
  'Colombia': 'Colombia',
  'Peru': 'Peru',
  'Bolivia': 'Bolivia',
  'Venezuela': 'Venezuela',
  'Qatar': 'Qatar',
  'Iraq': 'Iraq',
  'Saudi Arabia': 'Saudi Arabia',
  'Jordan': 'Jordan',
  'Lebanon': 'Lebanon',
  'Oman': 'Oman',
  'Uzbekistan': 'Uzbekistan',
  'Iran': 'Iran',
  'Syria': 'Syria',
  'China': 'China',
  'India': 'India',
  'Thailand': 'Thailand',
  'Vietnam': 'Vietnam',
  'Malaysia': 'Malaysia',
  'Indonesia': 'Indonesia',
  'Philippines': 'Philippines',
  'Singapore': 'Singapore',
  'New Caledonia': 'New Caledonia',
  'Tahiti': 'Tahiti',
  'Fiji': 'Fiji',
  'Papua New Guinea': 'Papua New Guinea',
};

function normalizeTeamName(name: string): string {
  const trimmed = name.trim();
  if (TEAM_NAME_MAP[trimmed]) return TEAM_NAME_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(TEAM_NAME_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }
  return trimmed;
}

// ── Match lookup — find our DB record by team names ─────────────
async function findMatchInDB(
  db: ReturnType<typeof getClient>,
  homeTeam: string,
  awayTeam: string
): Promise<{ id: string; status: string; isReversed: boolean } | null> {
  const normHome = normalizeTeamName(homeTeam);
  const normAway = normalizeTeamName(awayTeam);

  // Get all matches with their team info
  const allMatches = await db.select().from(matches);
  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map(t => [t.id, t]));

  // Find match by home/away team names
  for (const match of allMatches) {
    const home = teamMap.get(match.homeTeamId);
    const away = teamMap.get(match.awayTeamId);
    if (!home || !away) continue;

    const homeNameLower = home.name.toLowerCase();
    const awayNameLower = away.name.toLowerCase();
    const normHomeLower = normHome.toLowerCase();
    const normAwayLower = normAway.toLowerCase();

    // Direct match
    if (
      (homeNameLower === normHomeLower || (home.nameAr && home.nameAr === normHome)) &&
      (awayNameLower === normAwayLower || (away.nameAr && away.nameAr === normAway))
    ) {
      return { id: match.id, status: match.status, isReversed: false };
    }

    // Reversed match (neutral venue swap)
    if (
      (homeNameLower === normAwayLower || (home.nameAr && home.nameAr === normAway)) &&
      (awayNameLower === normHomeLower || (away.nameAr && away.nameAr === normHome))
    ) {
      return { id: match.id, status: match.status, isReversed: true };
    }
  }

  return null;
}

// ── Write sync log ─────────────────────────────────────────────
async function writeSyncLog(report: SyncReport, durationMs: number, triggeredBy: string): Promise<void> {
  try {
    const db = getClient();
    await db.insert(syncLog).values({
      triggeredBy,
      sourceApi: report.source,
      fetchedMatches: report.fetchedMatches,
      completedFound: report.completedFound,
      newlyFinalized: report.newlyFinalized,
      alreadyDone: report.alreadyDone,
      errorCount: report.errors.length,
      errorsJson: report.errors.length > 0 ? JSON.stringify(report.errors) : null,
      durationMs,
    });
  } catch (logErr) {
    // Never let logging failure break the sync
    console.warn('[sync] Failed to write sync_log:', logErr);
  }
}

// ── Main sync function ─────────────────────────────────────────
export async function syncResults(triggeredBy: string = 'cron'): Promise<SyncReport> {
  const startTime = Date.now();
  const report: SyncReport = {
    source: 'none',
    fetchedMatches: 0,
    completedFound: 0,
    newlyFinalized: 0,
    alreadyDone: 0,
    errors: [],
    results: [],
    timestamp: new Date().toISOString(),
  };

  // 1. Fetch from primary, fall back to backup on any error
  let normalizedMatches: NormalizedMatch[] = [];

  try {
    normalizedMatches = await fetchFromPrimary();
    report.source = 'primary';
  } catch (primaryErr) {
    report.errors.push(`Primary failed: ${String(primaryErr)}`);
    console.warn('[sync] Primary API failed, trying backup:', primaryErr);

    try {
      normalizedMatches = await fetchFromBackup();
      report.source = 'backup';
    } catch (backupErr) {
      report.errors.push(`Backup failed: ${String(backupErr)}`);
      console.error('[sync] Both APIs failed:', backupErr);
      // Still log the failure
      await writeSyncLog(report, Date.now() - startTime, triggeredBy);
      return report;
    }
  }

  report.fetchedMatches = normalizedMatches.length;

  // 2. Filter to completed matches with valid scores
  const completedMatches = normalizedMatches.filter(m =>
    m.isCompleted && m.homeScore !== null && m.awayScore !== null
  );
  report.completedFound = completedMatches.length;

  if (completedMatches.length === 0) {
    await writeSyncLog(report, Date.now() - startTime, triggeredBy);
    return report;
  }

  const db = getClient();

  // 3. Process each completed match
  for (const externalMatch of completedMatches) {
    try {
      const dbMatch = await findMatchInDB(db, externalMatch.homeTeam, externalMatch.awayTeam);

      if (!dbMatch) {
        report.errors.push(
          `No DB match found for: ${externalMatch.homeTeam} vs ${externalMatch.awayTeam}`
        );
        continue;
      }

      if (dbMatch.status === 'finished') {
        report.alreadyDone++;
        continue;
      }

      // Determine scores (swap if team order is reversed in our DB)
      const homeScore = dbMatch.isReversed ? externalMatch.awayScore! : externalMatch.homeScore!;
      const awayScore = dbMatch.isReversed ? externalMatch.homeScore! : externalMatch.awayScore!;

      // Finalize the match
      const result = await finalizeMatch(dbMatch.id, homeScore, awayScore);
      report.results.push(result);

      if (!result.alreadyFinalized && !result.error) {
        report.newlyFinalized++;
        console.log(
          `[sync] ✅ Finalized match ${dbMatch.id}: ` +
          `${externalMatch.homeTeam} ${externalMatch.homeScore} - ` +
          `${externalMatch.awayScore} ${externalMatch.awayTeam} | ` +
          `${result.predictionsScored} predictions scored`
        );
      }
    } catch (matchErr) {
      report.errors.push(
        `Error processing ${externalMatch.homeTeam} vs ${externalMatch.awayTeam}: ${String(matchErr)}`
      );
    }
  }

  // 5. Check for stale unfinished matches (ended but not updated)
  try {
    const allDbMatches = await db.select().from(matches);
    const allDbTeams = await db.select().from(teams);
    const teamNameMap = new Map(allDbTeams.map(t => [t.id, t]));
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const newlyFinalizedIds = new Set(report.results.filter(r => !r.alreadyFinalized).map(r => r.matchId));

    for (const m of allDbMatches) {
      if (m.status !== 'finished' && m.kickoff < threeHoursAgo && !newlyFinalizedIds.has(m.id)) {
        const home = teamNameMap.get(m.homeTeamId);
        const away = teamNameMap.get(m.awayTeamId);
        const matchLabel = home && away ? `${home.name} vs ${away.name}` : `المباراة ${m.id}`;
        report.errors.push(
          `❌ ${matchLabel} انتهت ولكن لم يتم تحديث النتيجة — يرجى إدخالها يدويًا`
        );
      }
    }
  } catch (staleErr) {
    console.warn('[sync] Failed to check stale matches:', staleErr);
  }

  // 6. Write sync log
  await writeSyncLog(report, Date.now() - startTime, triggeredBy);

  return report;
}
