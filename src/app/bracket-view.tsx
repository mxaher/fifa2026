'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { buildBracketData, BracketData, BracketMatch, GroupStanding, MatchWithTeams, TeamInfo } from './bracket-utils';

const FIFA_TO_ISO: Record<string, string> = {
  MEX:'mx', ZAF:'za', KOR:'kr', CZE:'cz', CAN:'ca', BIH:'ba', QAT:'qa',
  CHE:'ch', BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct', USA:'us', PAR:'py',
  AUS:'au', TUR:'tr', GER:'de', CUW:'cw', CIV:'ci', ECU:'ec', NED:'nl',
  JPN:'jp', SWE:'se', TUN:'tn', BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz',
  POR:'pt', CRO:'hr', UZB:'uz', ALG:'dz', FRA:'fr', URU:'uy', PAN:'pa',
  IRQ:'iq', ARG:'ar', COL:'co', GHA:'gh', JOR:'jo', ESP:'es', COD:'cd',
  SEN:'sn', NOR:'no', ENG:'gb-eng', KSA:'sa', CPV:'cv', BFA:'bf',
};

function FlagImg({ id, name, className }: { id?: string; name?: string; className?: string }) {
  const code = id ? FIFA_TO_ISO[id] : null;
  if (!code) return null;
  const src = code.includes('-')
    ? `https://hatscripts.github.io/circle-flags/flags/${code}.svg`
    : `https://flagcdn.com/${code}.svg`;
  return <img src={src} alt={name || ''} className={`inline-block align-middle ${className || ''}`}
    style={{ width: 'auto', height: '1.1em' }} />;
}

function getWinner(m: BracketMatch): string | null {
  if (m.score1 !== null && m.score2 !== null) {
    if (m.score1 > m.score2) return m.team1?.id || null;
    if (m.score2 > m.score1) return m.team2?.id || null;
    return null;
  }
  return m.predictedWinner || null;
}

function getLoser(m: BracketMatch): string | null {
  if (m.score1 !== null && m.score2 !== null) {
    if (m.score1 < m.score2) return m.team1?.id || null;
    if (m.score2 < m.score1) return m.team2?.id || null;
    return null;
  }
  return null;
}

const COLORS = {
  gold: '#FFD700',
  sky: '#4FC3F7',
  surface: 'var(--bg-card, #1a1a2e)',
  primary: 'var(--text-primary, #e0e0e0)',
  muted: 'var(--text-muted, #888)',
  border: 'var(--border-color, rgba(255,255,255,0.08))',
  divider: 'rgba(255,255,255,0.12)',
  goldSurface: 'rgba(255,215,0,0.08)',
  greenSurface: 'rgba(76,175,80,0.1)',
  greenBorder: 'rgba(76,175,80,0.3)',
};

function GroupCard({ group, compact }: { group: BracketData['groups'][0]; compact: boolean }) {
  const { letter, standings } = group;
  return (
    <div className="rounded-lg" style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      width: compact ? 180 : 220,
      flexShrink: 0,
    }}>
      <div className="px-3 py-2 text-center" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>المجموعة {letter}</div>
      </div>
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <th className="px-2 py-1 text-right font-medium" style={{ color: COLORS.muted, width: 24 }}>#</th>
            <th className="px-2 py-1 text-right font-medium" style={{ color: COLORS.muted }}>{compact ? '' : 'الفريق'}</th>
            <th className="px-1 py-1 text-center font-medium tabular-nums" style={{ color: COLORS.muted }}>ل</th>
            <th className="px-1 py-1 text-center font-medium tabular-nums" style={{ color: COLORS.muted }}>ف</th>
            <th className="px-1 py-1 text-center font-medium tabular-nums" style={{ color: COLORS.muted }}>ت</th>
            <th className="px-1 py-1 text-center font-medium tabular-nums" style={{ color: COLORS.muted }}>خ</th>
            {!compact && <th className="px-1 py-1 text-center font-medium tabular-nums" style={{ color: COLORS.muted }}>فرق</th>}
            <th className="px-2 py-1 text-center font-bold tabular-nums" style={{ color: COLORS.gold }}>ن</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isTop2 = i < 2;
            return (
              <tr key={s.teamId} style={{
                background: isTop2 ? COLORS.goldSurface : undefined,
                borderBottom: i < standings.length - 1 ? `1px solid ${COLORS.border}` : undefined,
              }}>
                <td className="px-2 py-1 text-right" style={{ color: isTop2 ? COLORS.gold : COLORS.muted }}>
                  {isTop2 && <span className="text-[8px] mr-0.5">⬤</span>}
                  {s.position}
                </td>
                <td className="px-2 py-1 text-right truncate" style={{ maxWidth: compact ? 80 : 120 }}>
                  <FlagImg id={s.teamId} name={s.teamName} className="ml-1" />
                  {compact ? s.teamId : (s.nameAr || s.teamName)}
                </td>
                <td className="px-1 py-1 text-center tabular-nums" style={{ color: COLORS.primary }}>{s.played}</td>
                <td className="px-1 py-1 text-center tabular-nums" style={{ color: COLORS.primary }}>{s.won}</td>
                <td className="px-1 py-1 text-center tabular-nums" style={{ color: COLORS.primary }}>{s.drawn}</td>
                <td className="px-1 py-1 text-center tabular-nums" style={{ color: COLORS.primary }}>{s.lost}</td>
                {!compact && <td className="px-1 py-1 text-center tabular-nums" style={{ color: s.gd > 0 ? '#4CAF50' : s.gd < 0 ? '#f44336' : COLORS.primary }}>{s.gd > 0 ? `+${s.gd}` : s.gd}</td>}
                <td className="px-2 py-1 text-center font-bold tabular-nums" style={{ color: COLORS.gold }}>{s.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamSlot({ team, score, winner, predicted, onClick, compact }: {
  team: { id: string; name: string; flag: string } | null;
  score: number | null;
  winner?: boolean;
  predicted?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const bg = predicted ? COLORS.greenSurface : winner ? COLORS.goldSurface : undefined;
  const txtColor = winner ? (predicted ? '#4CAF50' : COLORS.gold) : predicted ? '#4CAF50' : COLORS.primary;
  return (
    <div
      role={onClick ? 'button' : undefined}
      aria-pressed={predicted ? 'true' : undefined}
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded transition-all"
      style={{
        background: bg,
        opacity: !team ? 0.3 : 1,
        cursor: onClick ? 'pointer' : 'default',
        border: predicted ? '1px solid rgba(76,175,80,0.3)' : '1px solid transparent',
        minHeight: 28,
      }}>
      {team ? (
        <>
          <FlagImg id={team.id} name={team.name} />
          <span className="truncate text-xs flex-1" style={{
            color: txtColor,
            maxWidth: compact ? 50 : 100,
          }}>
            {compact ? team.id : team.name}
          </span>
          <span className="text-xs font-bold tabular-nums" style={{ color: txtColor, minWidth: 20, textAlign: 'right' }}>
            {score !== null ? score : '-'}
          </span>
        </>
      ) : (
        <span className="text-xs" style={{ color: COLORS.muted, fontStyle: 'italic' }}>TBD</span>
      )}
    </div>
  );
}

function MatchNode({ match, compact, onPredict, predictedWinner }: {
  match: BracketMatch;
  compact?: boolean;
  onPredict?: (teamId: string) => void;
  predictedWinner?: string | null;
}) {
  const isFinished = match.score1 !== null && match.score2 !== null;
  const pWinner = predictedWinner || match.predictedWinner;
  const winner = isFinished ? getWinner(match) : null;
  const isFinal = match.round === 'Final';

  return (
    <div className="rounded-lg" style={{
      background: COLORS.surface,
      border: isFinal ? '2px solid ' + COLORS.gold : `1px solid ${COLORS.border}`,
      width: compact ? 140 : 170,
      flexShrink: 0,
    }}>
      {/* Round label */}
      <div className="px-2 py-1 text-center" style={{
        borderBottom: `1px solid ${isFinal ? COLORS.gold : COLORS.border}`,
        background: isFinal ? COLORS.goldSurface : undefined,
      }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isFinal ? COLORS.gold : COLORS.muted }}>
          {match.round === 'Final' ? '⚽ النهائي' : match.round + ' م' + (match.slot + 1)}
        </span>
      </div>

      {/* Team 1 (top) */}
      <TeamSlot
        team={match.team1}
        score={match.score1}
        winner={winner === match.team1?.id}
        predicted={pWinner === match.team1?.id}
        onClick={!isFinished && match.team1 && onPredict ? () => onPredict(match.team1!.id) : undefined}
        compact={compact}
      />

      {/* vs */}
      <div className="flex items-center justify-center" style={{ minHeight: 20 }}>
        <span className="text-[10px]" style={{ color: COLORS.muted }}>VS</span>
      </div>

      {/* Team 2 (bottom) */}
      <TeamSlot
        team={match.team2}
        score={match.score2}
        winner={winner === match.team2?.id}
        predicted={pWinner === match.team2?.id}
        onClick={!isFinished && match.team2 && onPredict ? () => onPredict(match.team2!.id) : undefined}
        compact={compact}
      />

      {/* Match info */}
      {match.venue && !compact && (
        <div className="px-2 py-1 text-center border-t" style={{ borderColor: COLORS.border }}>
          <span className="text-[9px]" style={{ color: COLORS.muted }}>{match.venue}</span>
        </div>
      )}
    </div>
  );
}

function ChampionNode({ team, compact }: { team: { id: string; name: string; flag: string } | null; compact: boolean }) {
  return (
    <div className="rounded-lg flex flex-col items-center justify-center gap-2" style={{
      background: `color-mix(in oklch, ${COLORS.gold} 10%, ${COLORS.surface})`,
      border: `2px solid ${COLORS.gold}`,
      width: compact ? 140 : 170,
      minHeight: 100,
      flexShrink: 0,
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5a2.5 2.5 0 0 0 0 5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
      <div className="text-[10px] font-bold uppercase text-center" style={{ color: COLORS.gold }}>البطل</div>
      {team ? (
        <div className="flex items-center gap-1.5">
          <FlagImg id={team.id} name={team.name} />
          <span className="text-xs font-bold" style={{ color: COLORS.gold }}>{team.name}</span>
        </div>
      ) : (
        <span className="text-xs animate-pulse" style={{ color: COLORS.muted }}>TBD</span>
      )}
    </div>
  );
}

function ConnectorLines({ containerRef, bracketData, compact }: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  bracketData: BracketData;
  compact: boolean;
}) {
  const [lines, setLines] = useState<string>('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const nodes = container.querySelectorAll('[data-bracket-node]');
      if (nodes.length === 0) return;

      const paths: string[] = [];
      const nodeMap = new Map<string, DOMRect>();

      nodes.forEach(n => {
        const key = n.getAttribute('data-bracket-node');
        if (key) {
          const r = n.getBoundingClientRect();
          nodeMap.set(key, new DOMRect(r.left - rect.left, r.top - rect.top, r.width, r.height));
        }
      });

      const rounds = ['R32', 'R16', 'QF', 'SF', 'Final'];

      for (let ri = 0; ri < rounds.length - 1; ri++) {
        const cur = rounds[ri];
        const next = rounds[ri + 1];
        const curMatches = bracketData.rounds.find(r => r.key === cur)?.matches || [];
        const nextMatches = bracketData.rounds.find(r => r.key === next)?.matches || [];

        const pairsPerNext = cur === 'R32' ? 2 : cur === 'R16' ? 2 : cur === 'QF' ? 2 : cur === 'SF' ? 2 : 0;

        for (let ni = 0; ni < nextMatches.length; ni++) {
          for (let pi = 0; pi < pairsPerNext; pi++) {
            const curIdx = ni * pairsPerNext + pi;
            const curMatch = curMatches[curIdx];
            if (!curMatch) continue;

            const winner = getWinner(curMatch);
            const fromKey = `${cur}_${curMatch.slot}`;
            const toKey = `${next}_${nextMatches[ni].slot}`;

            const fromRect = nodeMap.get(fromKey);
            const toRect = nodeMap.get(toKey);

            if (fromRect && toRect) {
              const fromX = fromRect.right;
              const fromY = fromRect.top + fromRect.height / 2;
              const toX = toRect.left;
              const toY = pi === 0 ? toRect.top + toRect.height * 0.25 : toRect.top + toRect.height * 0.75;

              const cpX = (fromX + toX) / 2;
              const isActive = !!winner;
              paths.push(
                `<path d="M${fromX},${fromY} C${cpX},${fromY} ${cpX},${toY} ${toX},${toY}" fill="none" stroke="${isActive ? COLORS.gold : COLORS.divider}" stroke-width="${isActive ? 2.5 : 1.5}" stroke-dasharray="${isActive ? 'none' : '4,3'}" />`
              );
            }
          }
        }
      }

      // R32 top/bottom connection within each pair
      for (let i = 0; i < 8; i++) {
        const topIdx = i * 2;
        const bottomIdx = i * 2 + 1;
        const r32Matches = bracketData.rounds.find(r => r.key === 'R32')?.matches || [];
        const topMatch = r32Matches[topIdx];
        const bottomMatch = r32Matches[bottomIdx];
        if (!topMatch || !bottomMatch) continue;

        const topKey = `R32_${topMatch.slot}`;
        const bottomKey = `R32_${bottomMatch.slot}`;
        const topRect = nodeMap.get(topKey);
        const bottomRect = nodeMap.get(bottomKey);

        if (topRect && bottomRect) {
          const cx = topRect.right + 12;
          const topY = topRect.bottom;
          const bottomY = bottomRect.top;
          paths.push(
            `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${bottomY}" stroke="${COLORS.divider}" stroke-width="1" stroke-dasharray="3,2" />`
          );
        }
      }

      setLines(paths.join('\n'));
    };

    update();
    const timer = setTimeout(update, 100);

    const obs = new ResizeObserver(() => { clearTimeout(timer); setTimeout(update, 150); });
    if (containerRef.current) obs.observe(containerRef.current);

    return () => obs.disconnect();
  }, [bracketData, compact, containerRef]);

  return (
    <svg ref={svgRef} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ width: '100%', height: '100%', zIndex: 1 }}
      dangerouslySetInnerHTML={{ __html: `<defs><linearGradient id="winnerGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${COLORS.gold}" stop-opacity="0.3" /><stop offset="100%" stop-color="${COLORS.gold}" stop-opacity="1" /></linearGradient></defs>${lines}` }}
    />
  );
}

function RoundNav({ rounds, activeRound, onSelect }: {
  rounds: BracketData['rounds'];
  activeRound: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav role="navigation" aria-label="Bracket rounds" className="flex gap-1.5 overflow-x-auto pb-2">
      {rounds.map(r => (
        <button key={r.key} onClick={() => onSelect(r.key)}
          className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: activeRound === r.key ? COLORS.goldSurface : COLORS.surface,
            color: activeRound === r.key ? COLORS.gold : COLORS.muted,
            border: `1px solid ${activeRound === r.key ? COLORS.gold : COLORS.border}`,
          }}>
          {r.label} {r.matches.length > 0 && `(${r.matches.length})`}
        </button>
      ))}
    </nav>
  );
}

function Minimap({ containerRef, bracketData }: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  bracketData: BracketData;
}) {
  const [vp, setVp] = useState({ left: 0, width: 100 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setVp({ left: el.scrollLeft, width: el.clientWidth });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => { el.removeEventListener('scroll', update); obs.disconnect(); };
  }, [containerRef]);

  const scrollWidth = containerRef.current?.scrollWidth || 1;
  const vpLeft = (vp.left / scrollWidth) * 100;
  const vpWidth = (vp.width / scrollWidth) * 100;

  const handleClick = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.scrollLeft = pct * scrollWidth - vp.width / 2;
  };

  return (
    <div className="rounded-lg overflow-hidden cursor-pointer" onClick={handleClick} style={{
      background: 'rgba(0,0,0,0.6)',
      border: `1px solid ${COLORS.border}`,
      width: 120,
      height: 16,
      position: 'relative',
    }}>
      {/* Mini columns */}
      <div className="flex gap-[2px] h-full items-center px-[2px]" style={{ opacity: 0.4 }}>
        {bracketData.rounds.map((r, i) => (
          <div key={r.key} className="flex-1 h-[6px] rounded-sm" style={{
            background: i === bracketData.rounds.length - 1 ? COLORS.gold : COLORS.sky,
            width: `${100 / bracketData.rounds.length}%`,
          }} />
        ))}
      </div>
      {/* Viewport indicator */}
      <div className="absolute top-0 h-full rounded-sm pointer-events-none" style={{
        left: `${vpLeft}%`,
        width: `${vpWidth}%`,
        background: 'rgba(255,215,0,0.25)',
        border: '1px solid ' + COLORS.gold,
      }} />
    </div>
  );
}

function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  return (
    <div className="flex items-center gap-1" style={{ color: COLORS.muted }}>
      <button onClick={() => onZoom(Math.max(0.5, zoom - 0.1))}
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:opacity-80"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        −
      </button>
      <span className="text-xs tabular-nums w-8 text-center">{Math.round(zoom * 100)}%</span>
      <button onClick={() => onZoom(Math.min(1.2, zoom + 0.1))}
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:opacity-80"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        +
      </button>
    </div>
  );
}

function PredictProgress({ total, predicted }: { total: number; predicted: number }) {
  const pct = total > 0 ? Math.round((predicted / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
      <span>{predicted}/{total}</span>
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
        }} />
      </div>
    </div>
  );
}

function getTeamName(teamId: string, teams: TeamInfo[]): string {
  const t = teams.find(t => t.id === teamId);
  return t ? (t.nameAr || t.name) : teamId;
}

export default function BracketView({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'groups' | 'bracket'>('groups');
  const [compact, setCompact] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeRound, setActiveRound] = useState('groups');
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [predictedCount, setPredictedCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/matches?userId=${userId}`).then(r => r.json()).then(data => {
      if (data.matches) {
        setMatches(data.matches);
        const teamMap = new Map<string, TeamInfo>();
        data.matches.forEach((m: MatchWithTeams) => {
          if (m.homeTeam) teamMap.set(m.homeTeam.id, m.homeTeam);
          if (m.awayTeam) teamMap.set(m.awayTeam.id, m.awayTeam);
        });
        setTeams(Array.from(teamMap.values()));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const bracketData = useMemo(() => buildBracketData(matches, teams), [matches, teams]);

  useEffect(() => {
    const check = () => setCompact(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let count = 0;
    for (const round of bracketData.rounds) {
      for (const m of round.matches) {
        if (m.predictedWinner) count++;
        else if (predictions[`${round.key}_${m.slot}`]) count++;
      }
    }
    setPredictedCount(count);
  }, [bracketData, predictions]);

  const totalBracketMatches = bracketData.rounds.reduce((s, r) => s + r.matches.length, 0);

  const scrollToRound = useCallback((key: string) => {
    const el = containerRef.current;
    if (!el) return;
    if (key === 'groups') { el.scrollLeft = 0; setActiveRound('groups'); return; }
    const roundEl = el.querySelector(`[data-round="${key}"]`);
    if (roundEl) {
      roundEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
    setActiveRound(key);
  }, []);

  const handlePredict = useCallback(async (roundKey: string, slot: number, teamId: string) => {
    const match = bracketData.rounds.find(r => r.key === roundKey)?.matches[slot];
    if (!match) return;

    setPredictions(prev => ({ ...prev, [`${roundKey}_${slot}`]: teamId }));

    const allRounds = bracketData.rounds;
    const roundIdx = allRounds.findIndex(r => r.key === roundKey);
    if (roundIdx < 0 || roundIdx >= allRounds.length - 1) return;

    // Propagate prediction: update downstream matches
    const nextRound = allRounds[roundIdx + 1];

    // Determine which next-round slot this feeds into
    let nextSlot: number | null = null;
    let nextPos: 'top' | 'bottom' = 'top';

    if (roundKey === 'R32') {
      nextSlot = Math.floor(slot / 2);
      nextPos = slot % 2 === 0 ? 'top' : 'bottom';
    } else if (roundKey === 'R16') {
      nextSlot = Math.floor(slot / 2);
      nextPos = slot % 2 === 0 ? 'top' : 'bottom';
    } else if (roundKey === 'QF') {
      nextSlot = Math.floor(slot / 2);
      nextPos = slot % 2 === 0 ? 'top' : 'bottom';
    } else if (roundKey === 'SF') {
      nextSlot = 0;
      nextPos = slot === 0 ? 'top' : 'bottom';
    }

    if (nextSlot !== null && nextRound.matches[nextSlot]) {
      const nm = nextRound.matches[nextSlot];
      // Reset downstream predictions from this slot forward
      const downstream = [`${nextRound.key}_${nextSlot}`];
      for (let r = roundIdx + 1; r < allRounds.length; r++) {
        for (const m of allRounds[r].matches) {
          const k = `${allRounds[r].key}_${m.slot}`;
          if (!downstream.includes(k)) continue;
          setPredictions(prev => {
            const next = { ...prev };
            delete next[k];
            return next;
          });
        }
        // Figure out next downstream for next round
        // Simplified: just clear all downstream from this point
      }
    }

    // Also clear all predictions downstream from this match
    const clearDownstream = (rKey: string, s: number) => {
      const rIdx = allRounds.findIndex(r => r.key === rKey);
      if (rIdx < 0 || rIdx >= allRounds.length - 1) return;
      const nextR = allRounds[rIdx + 1];
      let ns: number | null = null;
      if (rKey === 'R32') ns = Math.floor(s / 2);
      else if (rKey === 'R16') ns = Math.floor(s / 2);
      else if (rKey === 'QF') ns = Math.floor(s / 2);
      else if (rKey === 'SF') ns = 0;
      else return;

      for (let i = rIdx + 1; i < allRounds.length; i++) {
        for (const m of allRounds[i].matches) {
          setPredictions(prev => {
            const nxt = { ...prev };
            delete nxt[`${allRounds[i].key}_${m.slot}`];
            return nxt;
          });
        }
      }
    };
    clearDownstream(roundKey, slot);
  }, [bracketData]);

  const handleZoom = useCallback((z: number) => {
    setZoom(z);
    const el = containerRef.current;
    if (el) {
      el.style.transform = `scale(${z})`;
      el.style.transformOrigin = 'right center';
    }
  }, []);

  if (loading) return <div className="text-center py-20" style={{ color: COLORS.muted }}>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setViewMode('groups')}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: viewMode === 'groups' ? COLORS.goldSurface : 'transparent',
                color: viewMode === 'groups' ? COLORS.gold : COLORS.muted,
              }}>
              📊 المجموعات
            </button>
            <button onClick={() => setViewMode('bracket')}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: viewMode === 'bracket' ? COLORS.goldSurface : 'transparent',
                color: viewMode === 'bracket' ? COLORS.gold : COLORS.muted,
                borderRight: `1px solid ${COLORS.border}`,
                borderLeft: `1px solid ${COLORS.border}`,
              }}>
              🏆 السُلّم
            </button>
          </div>
          {viewMode === 'bracket' && <PredictProgress total={totalBracketMatches} predicted={predictedCount} />}
        </div>

        {viewMode === 'bracket' && (
          <div className="flex items-center gap-3">
            <ZoomControls zoom={zoom} onZoom={handleZoom} />
            <Minimap containerRef={containerRef} bracketData={bracketData} />
          </div>
        )}
      </div>

      {/* Groups View */}
      {viewMode === 'groups' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {bracketData.groups.map(g => (
            <GroupCard key={g.letter} group={g} compact={compact} />
          ))}
        </div>
      )}

      {/* Bracket View */}
      {viewMode === 'bracket' && (
        <div className="relative">
          {/* Round nav pills */}
          <RoundNav rounds={bracketData.rounds} activeRound={activeRound} onSelect={scrollToRound} />

          {/* Scrollable bracket canvas */}
          <div className="relative overflow-x-auto" style={{
            maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
          }}>
            <div ref={containerRef} className="flex gap-8 py-4" style={{ minHeight: compact ? 400 : 600 }}>
              {/* Groups column */}
              <div data-round="groups" className="flex flex-col gap-3" style={{ flexShrink: 0 }}>
                {bracketData.groups.map(g => (
                  <GroupCard key={g.letter} group={g} compact={compact} />
                ))}
              </div>

              {/* Rounds */}
              {bracketData.rounds.filter(r => r.key !== 'groups').map((round, ri) => {
                const isFinal = round.key === 'Final';
                const spacing = ri === 0 ? 0 : (ri === 1 ? 16 : ri === 2 ? 40 : ri === 3 ? 80 : ri === 4 ? 160 : 0);
                return (
                  <div key={round.key} data-round={round.key} className="flex flex-col justify-center" style={{ gap: spacing, flexShrink: 0 }}>
                    {/* Round header */}
                    <div className="text-center mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>
                        {round.label}
                      </span>
                    </div>
                    {round.matches.map((match, mi) => (
                      <div key={`${round.key}_${match.slot}`} data-bracket-node={`${round.key}_${match.slot}`}>
                        {isFinal ? (
                          <div className="flex flex-col items-center gap-3">
                            <MatchNode
                              match={match}
                              compact={compact}
                              onPredict={!isFinal ? (tid) => handlePredict(round.key, mi, tid) : undefined}
                              predictedWinner={predictions[`${round.key}_${match.slot}`] || match.predictedWinner}
                            />
                            <ChampionNode
                              team={(() => {
                                const w = predictions[`${round.key}_${match.slot}`] || match.predictedWinner || getWinner(match);
                                return w ? { id: w, name: getTeamName(w, teams), flag: teams.find(t => t.id === w)?.flag || '' } : null;
                              })()}
                              compact={compact}
                            />
                          </div>
                        ) : (
                          <MatchNode
                            match={match}
                            compact={compact}
                            onPredict={(tid) => handlePredict(round.key, mi, tid)}
                            predictedWinner={predictions[`${round.key}_${match.slot}`] || match.predictedWinner}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Connector lines overlay */}
            <ConnectorLines containerRef={containerRef} bracketData={bracketData} compact={compact} />
          </div>
        </div>
      )}
    </div>
  );
}
