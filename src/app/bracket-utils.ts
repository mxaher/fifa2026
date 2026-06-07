export interface TeamInfo {
  id: string;
  name: string;
  nameAr: string | null;
  flag: string;
  groupLetter: string;
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  nameAr: string | null;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  position: number;
}

export interface BracketMatch {
  slot: number;
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'Final';
  roundIndex: number;
  team1: { id: string; name: string; flag: string } | null;
  team2: { id: string; name: string; flag: string } | null;
  score1: number | null;
  score2: number | null;
  winner: string | null;
  predictedWinner: string | null;
  date: string | null;
  venue: string | null;
  status: string;
}

export interface BracketData {
  groups: { letter: string; standings: GroupStanding[] }[];
  rounds: { key: string; label: string; matches: BracketMatch[] }[];
}

export interface MatchWithTeams {
  id: string;
  matchNumber: number;
  stage: string;
  groupLetter: string | null;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  venue: string | null;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  prediction: { homeScore: number; awayScore: number; points: number | null; pointsType: string | null } | null;
}

export function computeGroupStandings(matches: MatchWithTeams[], teams: TeamInfo[]): GroupStanding[] {
  const stats = new Map<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; pts: number }>();

  for (const t of teams) {
    stats.set(t.id, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
  }

  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore === null || m.awayScore === null) continue;
    const h = stats.get(m.homeTeam.id);
    const a = stats.get(m.awayTeam.id);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { h.won++; h.pts += 3; a.lost++; }
    else if (m.homeScore < m.awayScore) { a.won++; a.pts += 3; h.lost++; }
    else { h.drawn++; h.pts++; a.drawn++; a.pts++; }
  }

  const teamMap = new Map(teams.map(t => [t.id, t]));
  const hasAnyPlayed = Array.from(stats.values()).some(s => s.played > 0);
  const standings: GroupStanding[] = Array.from(stats.entries())
    .map(([teamId, s]) => {
      const t = teamMap.get(teamId)!;
      return {
        teamId, teamName: t.name, nameAr: t.nameAr, flag: t.flag,
        played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
        gf: s.gf, ga: s.ga, gd: s.gf - s.ga, pts: s.pts,
        position: 0,
      };
    });

  if (hasAnyPlayed) {
    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    standings.forEach((s, i) => s.position = i + 1);
  }
  return standings;
}

export function buildBracketData(matches: MatchWithTeams[], teams: TeamInfo[]): BracketData {
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const groups = groupLetters.map(letter => {
    const groupTeams = teams.filter(t => t.groupLetter === letter);
    const groupMatches = matches.filter(m => m.groupLetter === letter);
    return { letter, standings: computeGroupStandings(groupMatches, groupTeams) };
  });

  const knockoutMatches = matches.filter(m => !m.groupLetter);

  function teamRef(id: string | null) {
    if (!id) return null;
    const t = teamMap.get(id);
    return t ? { id: t.id, name: t.nameAr || t.name, flag: t.flag } : null;
  }

  function makeBracketMatch(knMatch: any, slot: number, round: BracketMatch['round'], roundIndex: number): BracketMatch {
    return {
      slot,
      round,
      roundIndex,
      team1: knMatch ? teamRef(knMatch.homeTeam?.id) : null,
      team2: knMatch ? teamRef(knMatch.awayTeam?.id) : null,
      score1: knMatch?.homeScore ?? null,
      score2: knMatch?.awayScore ?? null,
      winner: knMatch?.homeScore != null && knMatch?.awayScore != null
        ? (knMatch.homeScore > knMatch.awayScore ? knMatch.homeTeam?.id
          : knMatch.awayScore > knMatch.homeScore ? knMatch.awayTeam?.id : null)
        : null,
      predictedWinner: knMatch?.prediction
        ? null
        : null,
      date: knMatch?.kickoff || null,
      venue: knMatch?.venue || null,
      status: knMatch?.status || 'upcoming',
    };
  }

  const km = knockoutMatches.sort((a, b) => a.matchNumber - b.matchNumber);

  const r32Matches: BracketMatch[] = Array.from({ length: 16 }, (_, i) => {
    const kn = km[i] || null;
    return makeBracketMatch(kn, i, 'R32', i);
  });

  const r16Matches: BracketMatch[] = Array.from({ length: 8 }, (_, i) => {
    const kn = km[16 + i] || null;
    return makeBracketMatch(kn, i, 'R16', i);
  });

  const qfMatches: BracketMatch[] = Array.from({ length: 4 }, (_, i) => {
    const kn = km[24 + i] || null;
    return makeBracketMatch(kn, i, 'QF', i);
  });

  const sfMatches: BracketMatch[] = Array.from({ length: 2 }, (_, i) => {
    const kn = km[28 + i] || null;
    return makeBracketMatch(kn, i, 'SF', i);
  });

  const finalMatch: BracketMatch = makeBracketMatch(km[30] || null, 0, 'Final', 0);

  return {
    groups,
    rounds: [
      { key: 'groups', label: 'دور المجموعات', matches: [] },
      { key: 'R32', label: 'دور 32', matches: r32Matches },
      { key: 'R16', label: 'دور 16', matches: r16Matches },
      { key: 'QF', label: 'ربع النهائي', matches: qfMatches },
      { key: 'SF', label: 'نصف النهائي', matches: sfMatches },
      { key: 'Final', label: 'النهائي', matches: [finalMatch] },
    ],
  };
}
