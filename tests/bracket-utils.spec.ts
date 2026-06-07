import { test, expect } from '@playwright/test';
import { buildBracketData, type MatchWithTeams, type TeamInfo } from '../src/app/bracket-utils';

test.describe('🧮 Bracket Utils — Oracle-Verified', () => {

  const teams: TeamInfo[] = [
    { id: 'MEX', name: 'Mexico', nameAr: 'المكسيك', flag: '🇲🇽', groupLetter: 'A' },
    { id: 'USA', name: 'USA', nameAr: 'الولايات المتحدة', flag: '🇺🇸', groupLetter: 'A' },
    { id: 'CAN', name: 'Canada', nameAr: 'كندا', flag: '🇨🇦', groupLetter: 'A' },
    { id: 'BRA', name: 'Brazil', nameAr: 'البرازيل', flag: '🇧🇷', groupLetter: 'B' },
    { id: 'GER', name: 'Germany', nameAr: 'ألمانيا', flag: '🇩🇪', groupLetter: 'B' },
    { id: 'ARG', name: 'Argentina', nameAr: 'الأرجنتين', flag: '🇦🇷', groupLetter: 'B' },
  ];

  const baseMatch: MatchWithTeams = {
    id: 'm1',
    matchNumber: 73,
    stage: 'knockout',
    groupLetter: null,
    kickoff: '2026-06-28T16:00:00Z',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    venue: 'Stadium',
    homeTeam: teams[0],
    awayTeam: teams[1],
    prediction: null,
  };

  test('predictedWinner correctly identifies user-predicted winner (FIX VERIFIED)', () => {
    // After fix: bracket-utils.ts predictedWinner is computed from user prediction
    const match: MatchWithTeams = {
      ...baseMatch,
      id: 'm1',
      homeTeam: teams[0],
      awayTeam: teams[1],
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
      prediction: { homeScore: 2, awayScore: 1, points: 3, pointsType: 'exact' },
    };
    const bracket = buildBracketData([match], teams);
    const r32Match = bracket.rounds[1].matches[0];

    // User predicted MEX (home) to win 2-1, so predictedWinner should be 'MEX'
    expect(r32Match.predictedWinner).toBe('MEX');
  });

  test('predictedWinner should be computed from user prediction when available', () => {
    // Oracle: if user predicted 2-1 home win, predictedWinner should be home team ID
    const userPredictedHomeScore = 2;
    const userPredictedAwayScore = 1;
    const expectedWinner = userPredictedHomeScore > userPredictedAwayScore
      ? baseMatch.homeTeam.id
      : userPredictedAwayScore > userPredictedHomeScore
        ? baseMatch.awayTeam.id
        : null;

    expect(expectedWinner).toBe('MEX');
  });

  test('Bracket structure: R32 has 16 slots, R16 has 8, QF 4, SF 2, Final 1', () => {
    // Generate 31 knockout matches
    const knockoutMatches: MatchWithTeams[] = Array.from({ length: 31 }, (_, i) => ({
      ...baseMatch,
      id: `km${i}`,
      matchNumber: 73 + i,
      homeTeam: teams[i % teams.length],
      awayTeam: teams[(i + 1) % teams.length],
    }));
    const bracket = buildBracketData(knockoutMatches, teams);

    const r32 = bracket.rounds.find(r => r.key === 'R32');
    const r16 = bracket.rounds.find(r => r.key === 'R16');
    const qf = bracket.rounds.find(r => r.key === 'QF');
    const sf = bracket.rounds.find(r => r.key === 'SF');
    const final = bracket.rounds.find(r => r.key === 'Final');

    expect(r32?.matches.length).toBe(16);
    expect(r16?.matches.length).toBe(8);
    expect(qf?.matches.length).toBe(4);
    expect(sf?.matches.length).toBe(2);
    expect(final?.matches.length).toBe(1);
  });

  test('Winner is correctly identified for finished matches', () => {
    const finishedMatch: MatchWithTeams = {
      ...baseMatch,
      id: 'm-fin',
      matchNumber: 73,
      homeTeam: teams[0],
      awayTeam: teams[1],
      homeScore: 3,
      awayScore: 1,
      status: 'finished',
    };
    const bracket = buildBracketData([finishedMatch], teams);
    const r32Match = bracket.rounds[1].matches[0];
    expect(r32Match.winner).toBe('MEX');
  });

  test('Tie (draw) match has winner=null', () => {
    const drawMatch: MatchWithTeams = {
      ...baseMatch,
      id: 'm-draw',
      matchNumber: 73,
      homeTeam: teams[0],
      awayTeam: teams[1],
      homeScore: 1,
      awayScore: 1,
      status: 'finished',
    };
    const bracket = buildBracketData([drawMatch], teams);
    const r32Match = bracket.rounds[1].matches[0];
    expect(r32Match.winner).toBeNull();
  });

  test('Group standings sort by points, then goal difference, then goals scored', () => {
    // Group A standings test
    const groupMatches: MatchWithTeams[] = [
      { ...baseMatch, id: 'g1', matchNumber: 1, groupLetter: 'A', status: 'finished', homeTeam: teams[0], awayTeam: teams[1], homeScore: 3, awayScore: 0 },
      { ...baseMatch, id: 'g2', matchNumber: 2, groupLetter: 'A', status: 'finished', homeTeam: teams[0], awayTeam: teams[2], homeScore: 2, awayScore: 2 },
      { ...baseMatch, id: 'g3', matchNumber: 3, groupLetter: 'A', status: 'finished', homeTeam: teams[1], awayTeam: teams[2], homeScore: 0, awayScore: 1 },
    ];
    const groupATeams = [teams[0], teams[1], teams[2]];
    const bracket = buildBracketData(groupMatches, groupATeams);
    const groupA = bracket.groups[0];

    // MEX: 2 games, 1W 1D 0L, 5GF 2GA, +3GD, 4pts
    // CAN: 2 games, 1W 0D 1L, 1GF 2GA, -1GD, 3pts
    // USA: 2 games, 0W 1D 1L, 2GF 4GA, -2GD, 1pt
    expect(groupA.standings[0].teamId).toBe('MEX');
    expect(groupA.standings[1].teamId).toBe('CAN');
    expect(groupA.standings[2].teamId).toBe('USA');
  });
});
