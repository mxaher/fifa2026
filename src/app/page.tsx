'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu, LogOut, Trophy, Target, Swords, ChevronDown, ChevronUp, X, ScrollText, Shield, Users, BarChart3, UserPlus, Ban, Trash2, Edit, Save, Plus, GitFork } from 'lucide-react';
import BracketView from './bracket-view';

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

/* ─── Types ─── */
interface User {
  id: string;
  name: string;
  email: string;
  avatarEmoji: string | null;
  totalPoints: number;
  isAdmin?: boolean;
  department?: string | null;
}

interface Department {
  id: string;
  name: string;
  nameAr: string | null;
}

interface Team {
  id: string;
  name: string;
  nameAr: string | null;
  flag: string;
  groupLetter: string;
  fifaRank: number | null;
}

interface MatchWithTeams {
  id: string;
  matchNumber: number;
  stage: string;
  groupLetter: string | null;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  venue: string | null;
  homeTeam: Team;
  awayTeam: Team;
  prediction: { homeScore: number; awayScore: number; points: number | null; pointsType: string | null } | null;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatarEmoji: string | null;
  totalPoints: number;
  predictions: { total: number; exact: number; correct: number; wrong: number; pending: number };
}

/* ─── API helpers ─── */
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

/* ─── Countdown component ─── */
function Countdown({ kickoff }: { kickoff: string }) {
  const [diff, setDiff] = useState('');
  useEffect(() => {
    const update = () => {
      const ms = new Date(kickoff).getTime() - Date.now();
      if (ms <= 0) { setDiff('بدأت!'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setDiff(d > 0 ? `${d}ي ${h}س ${m}د` : `${h}س ${m}د`);
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [kickoff]);
  return <span className="text-xs" style={{ color: 'var(--wc-sky)' }}>⏱ {diff}</span>;
}

/* ─── Match Card ─── */
function MatchCard({ match, userId, onSaved }: { match: MatchWithTeams; userId: string; onSaved: (matchId: string, homeScore: number, awayScore: number) => void }) {
  const [homeScore, setHomeScore] = useState<string>(match.prediction?.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState<string>(match.prediction?.awayScore?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const isUpcoming = match.status === 'upcoming';
  const hasPrediction = match.prediction !== null;

  const handleSave = async () => {
    if (!homeScore || !awayScore) return;
    setSaving(true);
    const hs = parseInt(homeScore);
    const as = parseInt(awayScore);
    await apiFetch('/api/predictions', {
      method: 'POST',
      body: JSON.stringify({ userId, matchId: match.id, homeScore: hs, awayScore: as }),
    });
    setSaving(false);
    onSaved(match.id, hs, as);
  };

  const pointsColor = match.prediction?.pointsType === 'exact' ? 'var(--pts-exact)'
    : match.prediction?.pointsType === 'correct' ? 'var(--pts-correct)'
    : match.prediction?.pointsType === 'wrong' ? 'var(--pts-wrong)'
    : 'var(--pts-pending)';

  return (
    <div className="animate-fade-in rounded-xl p-4" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-color)' }}>
      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex flex-col items-center text-center flex-1 min-w-0">
          {match.homeTeam ? (
            <>
              <FlagImg id={match.homeTeam.id} name={match.homeTeam.name} className="text-2xl" />
              <span className="text-sm font-bold truncate mt-1">{match.homeTeam.nameAr || match.homeTeam.name}</span>
            </>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>TBD</span>
          )}
        </div>

        {/* Score / Prediction */}
        <div className="flex items-center gap-2 px-3">
          {match.status === 'finished' ? (
            <>
              <span className="font-bebas text-3xl" style={{ color: 'var(--wc-gold)' }}>{match.homeScore}</span>
              <span className="font-bebas text-xl" style={{ color: 'var(--text-muted)' }}>:</span>
              <span className="font-bebas text-3xl" style={{ color: 'var(--wc-gold)' }}>{match.awayScore}</span>
            </>
          ) : isUpcoming ? (
            <>
              <Input
                type="number" min="0" max="20" value={homeScore}
                onChange={e => setHomeScore(e.target.value)}
                className="w-12 h-10 text-center font-bebas text-xl p-0"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                disabled={!isUpcoming}
              />
              <span className="font-bebas text-xl" style={{ color: 'var(--text-muted)' }}>:</span>
              <Input
                type="number" min="0" max="20" value={awayScore}
                onChange={e => setAwayScore(e.target.value)}
                className="w-12 h-10 text-center font-bebas text-xl p-0"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                disabled={!isUpcoming}
              />
            </>
          ) : (
            <span className="text-sm px-2 py-1 rounded" style={{ background: 'var(--wc-red)', color: '#fff' }}>🔴 مباشر</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center text-center flex-1 min-w-0">
          {match.awayTeam ? (
            <>
              <FlagImg id={match.awayTeam.id} name={match.awayTeam.name} className="text-2xl" />
              <span className="text-sm font-bold truncate mt-1">{match.awayTeam.nameAr || match.awayTeam.name}</span>
            </>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>TBD</span>
          )}
        </div>
      </div>

      {/* Bottom row: countdown + save + points badge */}
      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          {isUpcoming && <Countdown kickoff={match.kickoff} />}
          {match.venue && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{match.venue}</span>}
        </div>

        <div className="flex items-center gap-2">
          {hasPrediction && match.prediction && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: pointsColor + '22', color: pointsColor }}>
              {match.prediction.pointsType === 'exact' ? 'دقيق +3' :
               match.prediction.pointsType === 'correct' ? 'صحيح +2' :
               match.prediction.pointsType === 'wrong' ? 'خاطئ 0' :
               'منتظر'}
            </span>
          )}
          {isUpcoming && homeScore !== '' && awayScore !== '' && (
            <Button size="sm" onClick={handleSave} disabled={saving}
              className="h-7 text-xs px-3"
              style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000', fontWeight: 700 }}>
              {saving ? '...' : hasPrediction ? 'تحديث' : 'حفظ'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Login View ─── */
function LoginView({ onLogin }: { onLogin: (user: User) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeams | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (isRegister) {
      fetch('/api/departments').then(r => r.json()).then(d => {
        if (d.departments) setDepartments(d.departments);
      }).catch(() => {});
    }
  }, [isRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { name, email, password, department } : { email, password };
      const data = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });

      if (data.error) {
        setError(data.error);
      } else if (data.user) {
        onLogin(data.user);
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    }
    setLoading(false);
  };

  const handleMatchClick = (match: MatchWithTeams) => {
    setSelectedMatch(match);
    setShowLoginPrompt(true);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      {/* Hero Section */}
      <div className="text-center py-8 px-4">
        <div className="text-6xl mb-3">🏆</div>
        <h1 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--wc-gold)' }}>ملك التوقعات</h1>
        <p className="font-bebas text-xl md:text-2xl tracking-wider mt-1" style={{ color: 'var(--wc-sky)' }}>FIFA WORLD CUP 2026™</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>مجموعة المرشد القابضة</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto px-4 pb-8">
        {/* Login Form - Right Side (RTL) */}
        <div className="w-full lg:w-96 lg:order-1 flex-shrink-0">
          <div className="rounded-2xl p-6 sticky top-4" style={{ background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-xl font-bold text-center mb-4" style={{ color: 'var(--wc-gold)' }}>
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(244,67,54,0.15)', color: '#F44336', border: '1px solid rgba(244,67,54,0.3)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegister && (
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>الاسم الكامل</label>
                  <Input value={name} onChange={e => setName(e.target.value)} required
                    className="h-10 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="أدخل اسمك" />
                </div>
              )}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="h-10 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="example@almarshad.com" dir="ltr" />
              </div>
              {isRegister && (
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>القسم</label>
                  <select value={department} onChange={e => setDepartment(e.target.value)} required
                    className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option value="">اختر القسم...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>كلمة المرور</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="h-10 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="••••••••" dir="ltr" />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 text-base font-bold"
                style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
                {loading ? '...' : isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-sm underline" style={{ color: 'var(--wc-sky)' }}>
                {isRegister ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ سجّل الآن'}
              </button>
            </div>
          </div>
        </div>

        {/* Tournament Schedule - Left Side */}
        <div className="flex-1 lg:order-2">
          <TournamentSchedule onMatchClick={handleMatchClick} />
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowLoginPrompt(false)}>
          <div className="rounded-2xl p-6 max-w-md w-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-5xl mb-3">⚽</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--wc-gold)' }}>تنبأ بهذه المباراة</h3>

              {/* Match Preview */}
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-1"><FlagImg id={selectedMatch.homeTeam?.id} name={selectedMatch.homeTeam?.name} className="text-3xl" /></div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{selectedMatch.homeTeam?.nameAr || selectedMatch.homeTeam?.name}</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>ضد</div>
                    <div className="font-bebas text-2xl" style={{ color: 'var(--wc-gold)' }}>VS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-1"><FlagImg id={selectedMatch.awayTeam?.id} name={selectedMatch.awayTeam?.name} className="text-3xl" /></div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{selectedMatch.awayTeam?.nameAr || selectedMatch.awayTeam?.name}</div>
                  </div>
                </div>
                <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  {new Date(selectedMatch.kickoff).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {' • '}
                  {new Date(selectedMatch.kickoff).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                سجّل الدخول أو أنشئ حساباً جديداً لتتمكن من التنبؤ بهذه المباراة
              </p>

              <div className="flex gap-3">
                <Button onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 h-10"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tournament Schedule ─── */
function TournamentSchedule({ onMatchClick }: { onMatchClick?: (match: MatchWithTeams) => void }) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(data => {
        if (data.matches) {
          setMatches(data.matches);
          // Auto-select today or first match date
          const today = new Date().toISOString().split('T')[0];
          const dates = [...new Set(data.matches.map((m: MatchWithTeams) => new Date(m.kickoff).toISOString().split('T')[0]))] as string[];
          if (dates.includes(today)) {
            setSelectedDate(today);
          } else if (dates.length > 0) {
            // Find the closest upcoming date
            const now = Date.now();
            const upcoming = dates.find(d => new Date(d).getTime() >= now) || dates[0];
            setSelectedDate(upcoming);
          }
          // Expand first 3 dates
          setExpandedDates(new Set(dates.slice(0, 3)));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Group matches by date
  const matchesByDate = new Map<string, MatchWithTeams[]>();
  for (const match of matches) {
    const date = new Date(match.kickoff).toISOString().split('T')[0];
    if (selectedGroup !== 'all' && match.groupLetter !== selectedGroup) continue;
    if (!matchesByDate.has(date)) matchesByDate.set(date, []);
    matchesByDate.get(date)!.push(match);
  }

  const sortedDates = [...matchesByDate.keys()].sort();

  const toggleDate = (date: string) => {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setExpandedDates(next);
  };

  const groups = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl animate-pulse mb-3">⚽</div>
        <p style={{ color: 'var(--text-muted)' }}>جاري تحميل جدول المباريات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(139,0,0,0.2)', border: '1px solid rgba(139,0,0,0.3)' }}>
        <h2 className="text-2xl font-black" style={{ color: 'var(--wc-gold)' }}>📅 جدول المباريات</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>اضغط على أي مباراة للتنبؤ</p>
      </div>

      {/* Group Filter */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {groups.map(g => (
          <button key={g} onClick={() => setSelectedGroup(g)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={{
              background: selectedGroup === g ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
              color: selectedGroup === g ? 'var(--wc-gold)' : 'var(--text-muted)',
              border: `1px solid ${selectedGroup === g ? 'var(--wc-gold)' : 'var(--border-color)'}`,
            }}>
            {g === 'all' ? 'الكل' : `المجموعة ${g}`}
          </button>
        ))}
      </div>

      {/* Dates */}
      <div className="space-y-3">
        {sortedDates.map(date => {
          const dateObj = new Date(date + 'T12:00:00');
          const dayName = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
          const dayNum = dateObj.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric' });
          const isExpanded = expandedDates.has(date);
          const dayMatches = matchesByDate.get(date) || [];
          const finishedCount = dayMatches.filter(m => m.status === 'finished').length;
          const upcomingCount = dayMatches.filter(m => m.status === 'upcoming').length;
          const isToday = date === new Date().toISOString().split('T')[0];
          const isPast = new Date(date).getTime() < Date.now() - 86400000;

          return (
            <div key={date} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${isToday ? 'var(--wc-gold)' : 'var(--border-color)'}` }}>
              {/* Date Header */}
              <button onClick={() => toggleDate(date)}
                className="w-full flex items-center justify-between p-3 transition-colors hover:opacity-90"
                style={{ background: isToday ? 'rgba(255,215,0,0.08)' : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{isToday ? '🔥' : isPast ? '✅' : '📅'}</div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: isToday ? 'var(--wc-gold)' : 'var(--text-primary)' }}>
                      {dayName} {isToday && '(اليوم)'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{dayNum}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-xs">
                    {finishedCount > 0 && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(46,125,50,0.2)', color: '#4CAF50' }}>{finishedCount} منتهية</span>}
                    {upcomingCount > 0 && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,195,247,0.2)', color: '#4FC3F7' }}>{upcomingCount} قادمة</span>}
                  </div>
                  <span className="text-lg transition-transform" style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                </div>
              </button>

              {/* Matches List */}
              {isExpanded && (
                <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  {dayMatches.map(match => (
                    <MatchScheduleCard key={match.id} match={match} onClick={() => onMatchClick?.(match)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedDates.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-3">📭</div>
          <p>لا توجد مباريات في هذا التصنيف</p>
        </div>
      )}
    </div>
  );
}

/* ─── Match Schedule Card ─── */
function MatchScheduleCard({ match, onClick }: { match: MatchWithTeams; onClick: () => void }) {
  const kickoff = new Date(match.kickoff);
  const time = kickoff.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 p-3 transition-all hover:opacity-90 text-right"
      style={{ borderBottom: '1px solid var(--border-color)' }}>
      {/* Time */}
      <div className="text-center flex-shrink-0 w-14">
        <div className="font-bebas text-lg" style={{ color: isLive ? '#F44336' : 'var(--wc-sky)' }}>{time}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>م {match.matchNumber}</div>
      </div>

      {/* Teams */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{match.homeTeam?.nameAr || match.homeTeam?.name}</span>
          <FlagImg id={match.homeTeam?.id} name={match.homeTeam?.name} className="text-lg flex-shrink-0" />
        </div>

        <div className="flex-shrink-0 text-center px-2">
          {isFinished ? (
            <div className="font-bebas text-lg px-2" style={{ color: 'var(--wc-gold)' }}>
              {match.homeScore} - {match.awayScore}
            </div>
          ) : isLive ? (
            <div className="px-2 py-0.5 rounded-full text-xs font-bold animate-pulse" style={{ background: 'rgba(244,67,54,0.2)', color: '#F44336' }}>
              مباشر
            </div>
          ) : (
            <div className="font-bebas text-lg" style={{ color: 'var(--text-muted)' }}>vs</div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-1">
          <FlagImg id={match.awayTeam?.id} name={match.awayTeam?.name} className="text-lg flex-shrink-0" />
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{match.awayTeam?.nameAr || match.awayTeam?.name}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 text-left">
        {match.prediction ? (
          <div className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(46,125,50,0.2)', color: '#4CAF50' }}>
            ✓ تم التنبؤ
          </div>
        ) : isFinished ? (
          <div className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(100,116,139,0.2)', color: 'var(--text-muted)' }}>
            منتهية
          </div>
        ) : (
          <div className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--wc-gold)' }}>
            تنبأ ⚽
          </div>
        )}
      </div>
    </button>
  );
}

/* ─── Header ─── */
function Header({ user, activeTab, onTabChange, onLogout }: { user: User; activeTab: string; onTabChange: (t: string) => void; onLogout: () => void }) {
  const isAdmin = user.email === 'admin@almarshad.com';
  const tabs = [
    { id: 'matches', label: '⚽ المباريات', icon: Swords },
    { id: 'predictions', label: '🎯 التوقعات', icon: Target },
    { id: 'leaderboard', label: '🏆 المتصدرين', icon: Trophy },
    { id: 'rules', label: '📜 القواعد', icon: ScrollText },
    { id: 'bracket', label: '🏆 السُلّم', icon: GitFork },
    ...(isAdmin ? [{ id: 'admin', label: '🛡️ الإدارة', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-50" style={{ background: 'var(--gradient-header)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="font-bold text-sm" style={{ color: 'var(--wc-gold)' }}>ملك التوقعات</span>
          <span className="font-bebas text-xs" style={{ color: 'var(--wc-sky)' }}>FIFA 26</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(255,215,0,0.15)' : 'transparent',
                color: activeTab === tab.id ? 'var(--wc-gold)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--wc-gold)' : '2px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User info + mobile menu */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm" style={{ color: 'var(--text-secondary)' }}>
            {user.avatarEmoji} {user.name}
          </span>
          {user.department && <span className="hidden lg:inline text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(79,195,247,0.15)', color: 'var(--wc-sky)' }}>{user.department}</span>}
          {!user.isAdmin && <span className="hidden sm:inline font-bebas text-sm" style={{ color: 'var(--wc-gold)' }}>{user.totalPoints} pts</span>}

          <Button variant="ghost" size="sm" onClick={onLogout} className="hidden md:inline-flex text-xs"
            style={{ color: 'var(--text-muted)' }}>
            <LogOut className="h-4 w-4 ml-1" /> خروج
          </Button>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" style={{ color: 'var(--text-primary)' }}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)' }}>
                <SheetTitle className="text-lg font-bold mb-6" style={{ color: 'var(--wc-gold)' }}>القائمة</SheetTitle>
                <nav className="space-y-2">
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => { onTabChange(tab.id); }}
                      className="w-full text-right px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: activeTab === tab.id ? 'rgba(255,215,0,0.15)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--wc-gold)' : 'var(--text-secondary)',
                      }}>
                      {tab.label}
                    </button>
                  ))}
                  <button onClick={onLogout}
                    className="w-full text-right px-4 py-3 rounded-lg text-sm font-medium"
                    style={{ color: 'var(--pts-wrong)' }}>
                    <LogOut className="h-4 w-4 inline ml-2" /> تسجيل الخروج
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function makeVirtualKnockout(matchNumber: number, venue: string, kickoff: string, homeId?: string, awayId?: string): MatchWithTeams {
  return {
    id: `ko-${matchNumber}`,
    matchNumber,
    stage: 'knockout',
    groupLetter: null,
    kickoff,
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    venue,
    homeTeam: homeId ? { id: homeId, name: '', nameAr: '', flag: '', groupLetter: '', fifaRank: null } as any : null,
    awayTeam: awayId ? { id: awayId, name: '', nameAr: '', flag: '', groupLetter: '', fifaRank: null } as any : null,
    prediction: null,
  };
}

const KNOCKOUT_MATCHES: MatchWithTeams[] = [
  makeVirtualKnockout(73, 'Estadio Azteca', '2026-06-28T16:00:00Z'),
  makeVirtualKnockout(74, 'SoFi Stadium', '2026-06-28T19:00:00Z'),
  makeVirtualKnockout(75, 'NRG Stadium', '2026-06-28T21:00:00Z'),
  makeVirtualKnockout(76, 'MetLife Stadium', '2026-06-29T16:00:00Z'),
  makeVirtualKnockout(77, 'AT&T Stadium', '2026-06-29T19:00:00Z'),
  makeVirtualKnockout(78, "Levi's Stadium", '2026-06-29T21:00:00Z'),
  makeVirtualKnockout(79, 'BMO Field', '2026-06-30T16:00:00Z'),
  makeVirtualKnockout(80, 'Lumen Field', '2026-06-30T19:00:00Z'),
  makeVirtualKnockout(81, 'Hard Rock Stadium', '2026-06-30T21:00:00Z'),
  makeVirtualKnockout(82, 'Mercedes-Benz Stadium', '2026-07-01T16:00:00Z'),
  makeVirtualKnockout(83, 'Arrowhead Stadium', '2026-07-01T19:00:00Z'),
  makeVirtualKnockout(84, 'Gillette Stadium', '2026-07-01T21:00:00Z'),
  makeVirtualKnockout(85, 'BC Place', '2026-07-02T16:00:00Z'),
  makeVirtualKnockout(86, 'Estadio Akron', '2026-07-02T19:00:00Z'),
  makeVirtualKnockout(87, 'Lincoln Financial Field', '2026-07-02T21:00:00Z'),
  makeVirtualKnockout(88, 'Estadio BBVA', '2026-07-03T16:00:00Z'),
  makeVirtualKnockout(89, 'Estadio Azteca', '2026-07-04T16:00:00Z'),
  makeVirtualKnockout(90, 'SoFi Stadium', '2026-07-04T19:00:00Z'),
  makeVirtualKnockout(91, 'NRG Stadium', '2026-07-05T16:00:00Z'),
  makeVirtualKnockout(92, 'MetLife Stadium', '2026-07-05T19:00:00Z'),
  makeVirtualKnockout(93, 'AT&T Stadium', '2026-07-06T16:00:00Z'),
  makeVirtualKnockout(94, "Levi's Stadium", '2026-07-06T19:00:00Z'),
  makeVirtualKnockout(95, 'BMO Field', '2026-07-07T16:00:00Z'),
  makeVirtualKnockout(96, 'Lumen Field', '2026-07-07T19:00:00Z'),
  makeVirtualKnockout(97, 'Estadio Azteca', '2026-07-09T16:00:00Z'),
  makeVirtualKnockout(98, 'SoFi Stadium', '2026-07-09T19:00:00Z'),
  makeVirtualKnockout(99, 'NRG Stadium', '2026-07-10T16:00:00Z'),
  makeVirtualKnockout(100, 'MetLife Stadium', '2026-07-10T19:00:00Z'),
  makeVirtualKnockout(101, 'AT&T Stadium', '2026-07-14T16:00:00Z'),
  makeVirtualKnockout(102, 'Mercedes-Benz Stadium', '2026-07-15T16:00:00Z'),
  makeVirtualKnockout(103, 'MetLife Stadium', '2026-07-19T18:00:00Z'),
];

/* ─── Matches View ─── */
function MatchesView({ user }: { user: User }) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['A']));

  const resultsKey = useMemo(() =>
    matches.map(m => `${m.id}:${m.homeScore}:${m.awayScore}:${m.status}`).join('|'),
  [matches]);

  const virtualMatches = useMemo(() => {
    function computeGroupStanding(teamId: string, groupLetter: string) {
      const groupMatches = matches.filter(m => m.groupLetter === groupLetter && m.status === 'finished' && m.homeScore != null && m.awayScore != null);
      let pts = 0, gf = 0, ga = 0, played = 0;
      for (const m of groupMatches) {
        const hs = m.homeScore!;
        const as = m.awayScore!;
        if (m.homeTeam?.id === teamId) { gf += hs; ga += as; played++; pts += hs > as ? 3 : hs === as ? 1 : 0; }
        if (m.awayTeam?.id === teamId) { gf += as; ga += hs; played++; pts += as > hs ? 3 : as === hs ? 1 : 0; }
      }
      return { teamId, pts, gd: gf - ga, gf, played };
    }

    function fillKnockoutTeams(): MatchWithTeams[] {
      const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
      const allStandings: { teamId: string; pts: number; gd: number; gf: number; played: number; group: string }[] = [];

      for (const gl of groupLetters) {
        const groupMatches = matches.filter(m => m.groupLetter === gl && m.status === 'finished' && m.homeScore != null && m.awayScore != null);
        if (groupMatches.length === 0) continue;
        const groupTeams = [...new Set(matches.filter(m => m.groupLetter === gl).flatMap(m => [m.homeTeam?.id, m.awayTeam?.id]).filter(Boolean))] as string[];
        const standings = groupTeams.map(id => ({ ...computeGroupStanding(id, gl), group: gl }))
          .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        standings.forEach((s, i) => {
          if (i < 2) allStandings.push(s);
        });
      }

      const advanced = new Map<string, string[]>();
      for (const gl of groupLetters) {
        const qualifiers = allStandings.filter(s => s.group === gl).map(s => s.teamId);
        advanced.set(gl, qualifiers);
      }

      const teamInfo = (id: string) => {
        const m = matches.find(m => m.homeTeam?.id === id || m.awayTeam?.id === id);
        const t = m?.homeTeam?.id === id ? m.homeTeam : m?.awayTeam;
        return t ? { id: t.id, name: t.nameAr || t.name, nameAr: t.nameAr, flag: t.flag || '', groupLetter: t.groupLetter, fifaRank: t.fifaRank } : null;
      };

      const R32_PAIRINGS: [number, string, string][] = [
        [0, 'A', 'B'], [0, 'C', 'D'], [0, 'B', 'C'], [0, 'D', 'E'],
        [0, 'E', 'F'], [0, 'F', 'G'], [0, 'G', 'H'], [0, 'I', 'J'],
        [1, 'A', 'C'], [1, 'B', 'D'], [1, 'D', 'F'], [1, 'E', 'G'],
        [1, 'F', 'H'], [1, 'G', 'I'], [1, 'H', 'J'], [1, 'K', 'L'],
      ];

      return KNOCKOUT_MATCHES.map((km, i) => {
        if (i >= 16) return km;
        const [pos, g1, g2] = R32_PAIRINGS[i] || [0, 'A', 'B'];
        const q1 = (advanced.get(g1) || [])[pos];
        const q2 = (advanced.get(g2) || [])[pos === 0 ? 1 : 0];
        return {
          ...km,
          homeTeam: q1 ? teamInfo(q1) : null,
          awayTeam: q2 ? teamInfo(q2) : null,
        } as MatchWithTeams;
      });
    }

    return fillKnockoutTeams();
  }, [resultsKey]);

  const allDisplayMatches = useMemo(() => {
    const realGroupMatches = matches.filter(m => m.groupLetter !== null);
    const mergedVirtual = virtualMatches.map(vm => {
      const dbMatch = matches.find(m => m.matchNumber === vm.matchNumber);
      if (dbMatch && dbMatch.status === 'finished' && dbMatch.homeScore != null) {
        return { ...vm, homeScore: dbMatch.homeScore, awayScore: dbMatch.awayScore, status: dbMatch.status };
      }
      return vm;
    });
    return [...realGroupMatches, ...mergedVirtual];
  }, [matches, virtualMatches]);

  const updatePrediction = useCallback((matchId: string, homeScore: number, awayScore: number) => {
    setMatches(prev => prev.map(m =>
      m.id === matchId
        ? { ...m, prediction: { homeScore, awayScore, points: null, pointsType: null } }
        : m
    ));
  }, []);

  const fetchMatches = useCallback(async () => {
    const data = await apiFetch(`/api/matches?userId=${user.id}`);
    if (data.matches) setMatches(data.matches);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    let active = true;
    const fetchData = () => apiFetch(`/api/matches?userId=${user.id}`).then(data => {
      if (active && data.matches) setMatches(data.matches);
      if (active) setLoading(false);
    });
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => { active = false; clearInterval(iv); };
  }, [user.id]);

  const filteredMatches = allDisplayMatches.filter(m => {
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'live') return m.status === 'live';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  const groups = filteredMatches.reduce<Record<string, MatchWithTeams[]>>((acc, m) => {
    const g = m.groupLetter || 'knockout';
    if (!acc[g]) acc[g] = [];
    acc[g].push(m);
    return acc;
  }, {});

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[{ id: 'all', label: 'الكل' }, { id: 'upcoming', label: 'قادمة' }, { id: 'live', label: 'مباشر' }, { id: 'finished', label: 'انتهت' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: filter === f.id ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
              color: filter === f.id ? 'var(--wc-gold)' : 'var(--text-muted)',
              border: `1px solid ${filter === f.id ? 'var(--wc-gold)' : 'var(--border-color)'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Groups */}
      {Object.entries(groups).sort(([a], [b]) => {
        if (a === 'knockout') return 1;
        if (b === 'knockout') return -1;
        return a.localeCompare(b);
      }).map(([group, groupMatches]) => (
        <div key={group} className="mb-4">
          <button onClick={() => toggleGroup(group)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--wc-gold)' }}>
              {group === 'knockout' ? '🏆 الأدوار الإقصائية' : `⚽ المجموعة ${group}`} ({groupMatches.length} مباراة)
            </span>
            {expandedGroups.has(group) ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
          </button>
          {expandedGroups.has(group) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupMatches.map(match => (
                <MatchCard key={match.id} match={match} userId={user.id} onSaved={updatePrediction} />
              ))}
            </div>
          )}
        </div>
      ))}

      {Object.keys(groups).length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>لا توجد مباريات</div>
      )}
    </div>
  );
}

/* ─── Predictions View ─── */
function PredictionsView({ user }: { user: User }) {
  const [allData, setAllData] = useState<{ predictions: any[]; matches: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMine, setShowMine] = useState(false);
  const [filterMatch, setFilterMatch] = useState('all');

  useEffect(() => {
    (async () => {
      const data = await apiFetch('/api/predictions');
      if (data.predictions) {
        const matches = [...new Map(data.predictions.filter((p: any) => p.match).map((p: any) => [p.match.matchNumber, p.match])).values()]
          .sort((a: any, b: any) => a.matchNumber - b.matchNumber);
        setAllData({ predictions: data.predictions, matches });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  if (!allData || allData.matches.length === 0) {
    return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>لا توجد توقعات بعد</div>;
  }

  const visiblePredictions = showMine
    ? allData.predictions.filter((p: any) => p.userId === user.id)
    : allData.predictions;

  const visibleMatches = showMine
    ? [...new Map(visiblePredictions.filter((p: any) => p.match).map((p: any) => [p.match.matchNumber, p.match])).values()]
        .sort((a: any, b: any) => a.matchNumber - b.matchNumber)
    : allData.matches;

  const filteredMatches = filterMatch === 'all'
    ? visibleMatches
    : visibleMatches.filter((m: any) => {
        const preds = visiblePredictions.filter((p: any) => p.matchId === m.id);
        if (filterMatch === 'exact') return preds.some((p: any) => p.pointsType === 'exact');
        if (filterMatch === 'correct') return preds.some((p: any) => p.pointsType === 'correct');
        if (filterMatch === 'wrong') return preds.some((p: any) => p.pointsType === 'wrong');
        if (filterMatch === 'pending') return preds.some((p: any) => !p.pointsType);
        return true;
      });

  return (
    <div>
      {/* View toggle: All / Mine */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowMine(false)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: !showMine ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
            color: !showMine ? 'var(--wc-gold)' : 'var(--text-muted)',
            border: `1px solid ${!showMine ? 'var(--wc-gold)' : 'var(--border-color)'}`,
          }}>
          👥 الجميع
        </button>
        <button onClick={() => setShowMine(true)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: showMine ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
            color: showMine ? 'var(--wc-gold)' : 'var(--text-muted)',
            border: `1px solid ${showMine ? 'var(--wc-gold)' : 'var(--border-color)'}`,
          }}>
          🎯 توقعاتي
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'exact', label: 'دقيق' },
          { id: 'correct', label: 'صحيح' },
          { id: 'wrong', label: 'خاطئ' },
          { id: 'pending', label: 'منتظر' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilterMatch(f.id)}
            className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: filterMatch === f.id ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
              color: filterMatch === f.id ? 'var(--wc-gold)' : 'var(--text-muted)',
              border: `1px solid ${filterMatch === f.id ? 'var(--wc-gold)' : 'var(--border-color)'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Matches with predictions */}
      <div className="space-y-6">
        {filteredMatches.map((match: any) => {
          const matchPredictions = visiblePredictions.filter((p: any) => p.matchId === match.id);
          const hasResult = match.homeScore != null && match.awayScore != null;

          // Group predictions by score key "homeScore:awayScore"
          const groups = new Map<string, any[]>();
          for (const p of matchPredictions) {
            const key = `${p.homeScore}:${p.awayScore}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(p);
          }
          const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
            const [ah, aa] = a.split(':').map(Number);
            const [bh, ba] = b.split(':').map(Number);
            return bh - ah || ba - aa;
          });

          return (
            <div key={match.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {/* Match header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(255,215,0,0.08)', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <FlagImg id={match.homeTeam?.id} name={match.homeTeam?.name} className="text-lg" />
                  <span className="font-bold text-sm">{match.homeTeam?.nameAr || match.homeTeam?.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>VS</span>
                  <FlagImg id={match.awayTeam?.id} name={match.awayTeam?.name} className="text-lg" />
                  <span className="font-bold text-sm">{match.awayTeam?.nameAr || match.awayTeam?.name}</span>
                </div>
                {hasResult && (
                  <div className="font-bebas text-xl" style={{ color: 'var(--wc-gold)' }}>
                    {match.homeScore} : {match.awayScore}
                  </div>
                )}
              </div>

              {/* Prediction groups */}
              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {sortedGroups.map(([scoreKey, preds]) => {
                  const [hs, as] = scoreKey.split(':').map(Number);
                  const isExact = hasResult && hs === match.homeScore && as === match.awayScore;
                  const isCorrect = hasResult && !isExact && ((hs > as && match.homeScore > match.awayScore) || (hs < as && match.homeScore < match.awayScore) || (hs === as && match.homeScore === match.awayScore));
                  const isWrong = hasResult && !isExact && !isCorrect;
                  const pointsColor = isExact ? 'var(--pts-exact)' : isCorrect ? 'var(--pts-correct)' : isWrong ? 'var(--pts-wrong)' : 'var(--pts-pending)';
                  const bgColor = isExact ? 'rgba(76,175,80,0.08)' : isCorrect ? 'rgba(33,150,243,0.08)' : 'transparent';

                  return (
                    <div key={scoreKey} className="px-4 py-3" style={{ background: bgColor }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bebas text-lg" style={{ color: pointsColor }}>{hs}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>:</span>
                          <span className="font-bebas text-lg" style={{ color: pointsColor }}>{as}</span>
                          {hasResult && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: pointsColor + '22', color: pointsColor }}>
                              {isExact ? '+3' : isCorrect ? '+2' : isWrong ? '0' : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {preds.length} {preds.length === 1 ? 'مستخدم' : 'مستخدمين'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {preds.map((p: any) => (
                          <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background: p.userId === user.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
                              color: p.userId === user.id ? 'var(--wc-gold)' : 'var(--text-primary)',
                              border: p.userId === user.id ? '1px solid var(--wc-gold)' : '1px solid transparent',
                            }}>
                            {p.user?.avatarEmoji || ''} {p.user?.name || '???'}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {matchPredictions.length === 0 && (
                  <div className="px-4 py-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    لا توجد توقعات لهذه المباراة
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>لا توجد نتائج للفلتر المحدد</div>
      )}
    </div>
  );
}

/* ─── Leaderboard View ─── */
function LeaderboardView({ user }: { user: User }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await apiFetch('/api/leaderboard');
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  const hasAnyPoints = leaderboard.some(e => e.totalPoints > 0);
  const top3 = leaderboard.slice(0, 3);
  const myEntry = leaderboard.find(e => e.id === user.id);

  if (!hasAnyPoints) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🏆</div>
        <p className="text-lg font-bold" style={{ color: 'var(--wc-gold)' }}>لا يوجد ترتيب بعد</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          سيتم ترتيب المتسابقين فور بدء المباريات وحساب النقاط
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {top3[1] && (
            <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minWidth: 100 }}>
              <div className="text-3xl mb-1">{top3[1].avatarEmoji}</div>
              <div className="text-xl">🥈</div>
              <p className="font-bold text-sm mt-1">{top3[1].name}</p>
              <p className="font-bebas text-2xl" style={{ color: 'var(--wc-gold)' }}>{top3[1].totalPoints}</p>
            </div>
          )}
          {top3[0] && (
            <div className="text-center p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '2px solid var(--wc-gold)', minWidth: 120 }}>
              <div className="text-4xl mb-1">{top3[0].avatarEmoji}</div>
              <div className="text-2xl">🥇</div>
              <p className="font-bold text-sm mt-1 gold-shimmer">{top3[0].name}</p>
              <p className="font-bebas text-3xl" style={{ color: 'var(--wc-gold)' }}>{top3[0].totalPoints}</p>
            </div>
          )}
          {top3[2] && (
            <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minWidth: 100 }}>
              <div className="text-3xl mb-1">{top3[2].avatarEmoji}</div>
              <div className="text-xl">🥉</div>
              <p className="font-bold text-sm mt-1">{top3[2].name}</p>
              <p className="font-bebas text-2xl" style={{ color: 'var(--wc-gold)' }}>{top3[2].totalPoints}</p>
            </div>
          )}
        </div>
      )}

      {/* My rank */}
      {myEntry && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.3)' }}>
          <p className="font-bold" style={{ color: 'var(--wc-sky)' }}>ترتيبك: #{myEntry.rank}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {myEntry.predictions.total} توقع • {myEntry.predictions.exact} دقيق • {myEntry.predictions.correct} صحيح
          </p>
          <p className="font-bebas text-2xl mt-1" style={{ color: 'var(--wc-gold)' }}>{myEntry.totalPoints}</p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,215,0,0.1)' }}>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>#</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>الاسم</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>النقاط</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>التوقعات</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(entry => (
              <tr key={entry.id} className="transition-colors"
                style={{
                  background: entry.id === user.id ? 'rgba(79,195,247,0.08)' : 'transparent',
                  borderInlineStart: entry.id === user.id ? '3px solid var(--wc-sky)' : 'none',
                }}>
                <td className="px-3 py-2 font-bebas" style={{ color: entry.rank <= 3 ? 'var(--wc-gold)' : 'var(--text-muted)' }}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: entry.id === user.id ? 'var(--wc-sky)' : 'var(--text-primary)' }}>
                  {entry.avatarEmoji} {entry.name}
                </td>
                <td className="px-3 py-2 font-bebas text-lg" style={{ color: 'var(--wc-gold)' }}>{entry.totalPoints}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {entry.predictions.total} توقع
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Sync Panel (in Rules page) ─── */
function SyncPanel({ adminToken }: { adminToken: string }) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken } });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          success: true,
          message: data.message || 'تمت المزامنة بنجاح',
          details: `المصدر: ${data.summary?.source === 'primary' ? 'worldcup26.ir' : data.summary?.source === 'backup' ? 'worldcupjson.net' : 'لا يوجد'} | المباريات: ${data.summary?.fetchedMatches} | الجديدة: ${data.summary?.newlyFinalized} | أخطاء: ${data.summary?.errorCount}`,
        });
      } else {
        setSyncResult({ success: false, message: 'فشلت المزامنة: ' + (data.error || 'خطأ غير معروف') });
      }
    } catch (err) {
      setSyncResult({ success: false, message: 'خطأ في الاتصال' });
    }
    setSyncing(false);
  };

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--wc-gold)' }}>
            <span>🔄</span> مزامنة النتائج
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            يتم التحديث تلقائياً كل ٥ دقائق — اضغط للتحديث الفوري
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--wc-blue), var(--wc-sky))' }}>
          {syncing ? '⏳ جاري المزامنة...' : '🔄 مزامنة الآن'}
        </Button>
      </div>

      {syncResult && (
        <div className="mt-4 p-3 rounded-xl text-sm font-medium border"
          style={{
            background: syncResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            borderColor: syncResult.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
            color: syncResult.success ? '#22c55e' : '#ef4444',
          }}>
          <p>{syncResult.message}</p>
          {syncResult.details && <p className="text-xs mt-1 opacity-80">{syncResult.details}</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Rules View ─── */
function RulesView() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.3), rgba(10,22,40,0.8), rgba(79,195,247,0.2))', border: '1px solid var(--border-color)' }}>
        <div className="text-4xl mb-2">📜</div>
        <h2 className="text-2xl font-black" style={{ color: 'var(--wc-gold)' }}>قواعد اللعبة</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>كيف تُحسب النقاط في ملك التوقعات - فيفا٢٦</p>
      </div>

      {/* Scoring System */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--wc-gold)' }}>
          <span>🎯</span> نظام النقاط
        </h3>
        <div className="space-y-3">
          {/* Exact score */}
          <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)' }}>
            <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bebas text-2xl" style={{ background: 'var(--pts-exact)', color: '#fff' }}>+3</div>
            <div>
              <p className="font-bold" style={{ color: 'var(--pts-exact)' }}>توقع دقيق</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>تطابق تام في النتيجة — مثال: توقعت ٢-١ وانتهت ٢-١</p>
            </div>
          </div>
          {/* Correct outcome */}
          <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)' }}>
            <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bebas text-2xl" style={{ background: 'var(--pts-correct)', color: '#000' }}>+2</div>
            <div>
              <p className="font-bold" style={{ color: 'var(--pts-correct)' }}>نتيجة صحيحة</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>النتيجة لم تتطابق لكن الفائز/التعادل صح — مثال: توقعت ٣-١ وانتهت ٢-٠</p>
            </div>
          </div>
          {/* Wrong */}
          <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)' }}>
            <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bebas text-2xl" style={{ background: 'var(--pts-wrong)', color: '#fff' }}>0</div>
            <div>
              <p className="font-bold" style={{ color: 'var(--pts-wrong)' }}>توقع خاطئ</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>لا نقاط — توقعت فوز وانتهت خسارة أو تعادل</p>
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--wc-gold)' }}>
          <span>💡</span> أمثلة توضيحية
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,215,0,0.1)' }}>
                <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>توقعك</th>
                <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>النتيجة</th>
                <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>النقاط</th>
                <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>السبب</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pred: '2-1', actual: '2-1', pts: '+3 دقيق', reason: 'تطابق تام', color: 'var(--pts-exact)' },
                { pred: '3-0', actual: '1-0', pts: '+2 صحيح', reason: 'فوز صحيح', color: 'var(--pts-correct)' },
                { pred: '1-1', actual: '2-2', pts: '+2 صحيح', reason: 'تعادل صحيح', color: 'var(--pts-correct)' },
                { pred: '2-0', actual: '0-1', pts: '0 خاطئ', reason: 'فوز بدل خسارة', color: 'var(--pts-wrong)' },
                { pred: '1-0', actual: '0-1', pts: '0 خاطئ', reason: 'فوز بدل خسارة', color: 'var(--pts-wrong)' },
                { pred: '0-0', actual: '1-0', pts: '0 خاطئ', reason: 'تعادل بدل فوز', color: 'var(--pts-wrong)' },
              ].map((ex, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-3 py-2 font-bebas text-lg" style={{ color: 'var(--wc-sky)' }}>{ex.pred}</td>
                  <td className="px-3 py-2 font-bebas text-lg" style={{ color: 'var(--wc-gold)' }}>{ex.actual}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: ex.color }}>{ex.pts}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ex.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* General Rules */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--wc-gold)' }}>
          <span>📋</span> القواعد العامة
        </h3>
        <ul className="space-y-3">
          {[
            { icon: '⏰', text: 'يمكنك التوقع على أي مباراة قبل بدايتها فقط — بمجرد بدء المباراة يُغلق التوقع' },
            { icon: '✏️', text: 'يمكنك تعديل توقعك في أي وقت قبل بداية المباراة' },
            { icon: '🏆', text: 'يتصدر لوحة المتصدرين من يجمع أكبر عدد من النقاط' },
            { icon: '🔄', text: 'يتم تحديث النتائج تلقائياً كل ٥ دقائق أثناء البطولة' },
            { icon: '👥', text: 'المسابقة مخصصة لموظفي مجموعة المرشد القابضة فقط' },
            { icon: '⚽', text: 'كأس العالم فيفا ٢٠٢٦ — ٤٨ منتخب في ١٢ مجموعة' },
            { icon: '📊', text: 'الترتيب يحدد بناءً على: النقاط → عدد التوقعات الدقيقة → عدد التوقعات الصحيحة' },
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(79,195,247,0.05)', border: '1px solid rgba(79,195,247,0.1)' }}>
              <span className="text-lg flex-shrink-0">{rule.icon}</span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{rule.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tournament Format */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--wc-gold)' }}>
          <span>🌍</span> نظام البطولة
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { num: '48', label: 'منتخب مشارك' },
            { num: '12', label: 'مجموعة (A-L)' },
            { num: '72', label: 'مباراة دور المجموعات' },
            { num: '32', label: 'مباراة الأدوار الإقصائية' },
          ].map((item, i) => (
            <div key={i} className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
              <div className="font-bebas text-4xl" style={{ color: 'var(--wc-gold)' }}>{item.num}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Panel ─── */
function AdminPanel({ adminToken }: { adminToken: string }) {
  const [adminTab, setAdminTab] = useState<'users' | 'matches' | 'results' | 'departments' | 'email' | 'sync'>('users');

  const tabs = [
    { id: 'users' as const, label: '👥 المستخدمين', icon: Users },
    { id: 'matches' as const, label: '⚽ المباريات', icon: Swords },
    { id: 'results' as const, label: '📊 النتائج', icon: BarChart3 },
    { id: 'departments' as const, label: '🏢 الأقسام', icon: ScrollText },
    { id: 'email' as const, label: '📧 البريد', icon: ScrollText },
    { id: 'sync' as const, label: '🔄 المزامنة', icon: ScrollText },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.3), rgba(10,22,40,0.8), rgba(255,215,0,0.2))', border: '1px solid var(--border-color)' }}>
        <div className="text-4xl mb-2">🛡️</div>
        <h2 className="text-2xl font-black" style={{ color: 'var(--wc-gold)' }}>لوحة التحكم</h2>
      </div>

      {/* Admin sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setAdminTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: adminTab === tab.id ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
              color: adminTab === tab.id ? 'var(--wc-gold)' : 'var(--text-muted)',
              border: `1px solid ${adminTab === tab.id ? 'var(--wc-gold)' : 'var(--border-color)'}`,
            }}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {adminTab === 'users' && <AdminUsersTab adminToken={adminToken} />}
      {adminTab === 'matches' && <AdminMatchesTab adminToken={adminToken} />}
      {adminTab === 'results' && <AdminResultsTab adminToken={adminToken} />}
      {adminTab === 'departments' && <AdminDepartmentsTab adminToken={adminToken} />}
      {adminTab === 'email' && <AdminEmailTab adminToken={adminToken} />}
      {adminTab === 'sync' && <SyncPanel adminToken={adminToken} />}
    </div>
  );
}

/* ─── Admin Departments Tab ─── */
function AdminDepartmentsTab({ adminToken }: { adminToken: string }) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', nameAr: '' });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/admin/departments', { headers: { 'X-Admin-Token': adminToken } });
      const data = await res.json();
      if (data.departments) setDepartments(data.departments);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/departments', { headers: { 'X-Admin-Token': adminToken } });
        const data = await res.json();
        if (active && data.departments) setDepartments(data.departments);
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [adminToken]);

  const showResult = (success: boolean, message: string) => {
    setResult({ success, message });
    setTimeout(() => setResult(null), 3000);
  };

  const handleAddDept = async () => {
    if (!newDept.name) return;
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify(newDept),
      });
      const data = await res.json();
      if (data.department) {
        showResult(true, `تم إضافة ${newDept.name}`);
        setNewDept({ name: '', nameAr: '' });
        setShowAddForm(false);
        fetchDepartments();
      } else {
        showResult(false, data.error || 'خطأ');
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  const handleUpdateDept = async () => {
    if (!editingDept) return;
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify(editingDept),
      });
      const data = await res.json();
      if (data.success) {
        showResult(true, 'تم التحديث');
        setEditingDept(null);
        fetchDepartments();
      } else {
        showResult(false, data.error || 'خطأ');
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  const handleDeleteDept = async (dept: any) => {
    if (!confirm(`هل أنت متأكد من حذف "${dept.nameAr || dept.name}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/departments?id=${dept.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken },
      });
      const data = await res.json();
      if (data.success) {
        showResult(true, 'تم الحذف');
        fetchDepartments();
      } else {
        showResult(false, data.error || 'خطأ');
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {result && (
        <div className="p-3 rounded-xl text-sm font-medium"
          style={{ background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, color: result.success ? '#22c55e' : '#ef4444' }}>
          {result.message}
        </div>
      )}

      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--wc-gold)' }}>الأقسام ({departments.length})</h3>
          <Button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
            <Plus className="h-4 w-4" /> إضافة قسم
          </Button>
        </div>

        {showAddForm && (
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div className="grid grid-cols-2 gap-3">
              <Input value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                placeholder="English name" dir="ltr" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <Input value={newDept.nameAr} onChange={e => setNewDept({ ...newDept, nameAr: e.target.value })}
                placeholder="الاسم بالعربي" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddDept}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
                <Save className="h-4 w-4 inline ml-1" /> حفظ
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="ghost"
                className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,215,0,0.1)' }}>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>المعرّف</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>الاسم (EN)</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>الاسم (AR)</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(d => (
              <tr key={d.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{d.id}</td>
                <td className="px-3 py-2">
                  {editingDept?.id === d.id ? (
                    <Input value={editingDept.name} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
                      className="h-8 text-xs" dir="ltr" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  ) : d.name}
                </td>
                <td className="px-3 py-2">
                  {editingDept?.id === d.id ? (
                    <Input value={editingDept.nameAr || ''} onChange={e => setEditingDept({ ...editingDept, nameAr: e.target.value })}
                      className="h-8 text-xs" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  ) : d.nameAr || '-'}
                </td>
                <td className="px-3 py-2">
                  {editingDept?.id === d.id ? (
                    <div className="flex gap-1">
                      <button onClick={handleUpdateDept} className="p-1 rounded" style={{ color: '#22c55e' }}><Save className="h-4 w-4" /></button>
                      <button onClick={() => setEditingDept(null)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingDept(d)} className="p-1 rounded" style={{ color: 'var(--wc-sky)' }}><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteDept(d)} className="p-1 rounded" style={{ color: '#ef4444' }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Admin Users Tab ─── */
function AdminUsersTab({ adminToken }: { adminToken: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', avatarEmoji: '⚽', department: '' });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const [usersRes, deptRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'X-Admin-Token': adminToken } }),
        fetch('/api/admin/departments', { headers: { 'X-Admin-Token': adminToken } }),
      ]);
      const data = await usersRes.json();
      const deptData = await deptRes.json();
      if (data.users) setUsers(data.users);
      if (deptData.departments) setDepartments(deptData.departments);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [usersRes, deptRes] = await Promise.all([
          fetch('/api/admin/users', { headers: { 'X-Admin-Token': adminToken } }),
          fetch('/api/admin/departments', { headers: { 'X-Admin-Token': adminToken } }),
        ]);
        const data = await usersRes.json();
        const deptData = await deptRes.json();
        if (active) {
          if (data.users) setUsers(data.users);
          if (deptData.departments) setDepartments(deptData.departments);
        }
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [adminToken]);

  const showResult = (success: boolean, message: string) => {
    setResult({ success, message });
    setTimeout(() => setResult(null), 3000);
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.department) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.user) {
        showResult(true, `تم إضافة ${newUser.name}`);
        setNewUser({ name: '', email: '', password: '', avatarEmoji: '⚽', department: '' });
        setShowAddForm(false);
        fetchUsers();
      } else {
        showResult(false, data.error || 'خطأ');
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (data.success) {
        showResult(true, 'تم التحديث');
        setEditingUser(null);
        fetchUsers();
      } else {
        showResult(false, data.error || 'خطأ');
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  const handleToggleBan = async (user: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ id: user.id, banned: !user.banned }),
      });
      const data = await res.json();
      if (data.success) {
        showResult(true, user.banned ? `تم فتح حظر ${user.name}` : `تم حظر ${user.name}`);
        fetchUsers();
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`هل أنت متأكد من حذف ${user.name}؟`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken },
      });
      const data = await res.json();
      if (data.success) {
        showResult(true, `تم حذف ${user.name}`);
        fetchUsers();
      } else {
        showResult(false, data.error || 'خطأ');
      }
    } catch { showResult(false, 'خطأ في الاتصال'); }
  };

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {result && (
        <div className="p-3 rounded-xl text-sm font-medium"
          style={{ background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, color: result.success ? '#22c55e' : '#ef4444' }}>
          {result.message}
        </div>
      )}

      {/* Add user button + form */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--wc-gold)' }}>المستخدمين ({users.length})</h3>
          <Button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
            <UserPlus className="h-4 w-4" /> إضافة مستخدم
          </Button>
        </div>

        {showAddForm && (
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div className="grid grid-cols-2 gap-3">
              <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="الاسم" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="البريد" dir="ltr" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="كلمة المرور" dir="ltr" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <select value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">اختر القسم...</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddUser}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
                <Save className="h-4 w-4 inline ml-1" /> حفظ
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="ghost"
                className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,215,0,0.1)' }}>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>المستخدم</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>البريد</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>القسم</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>النقاط</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>توقعات</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>الحالة</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--wc-gold)' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border-color)', opacity: u.banned ? 0.5 : 1 }}>
                <td className="px-3 py-2">
                  {editingUser?.id === u.id ? (
                    <Input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="h-8 text-xs" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  ) : (
                    <span>{u.avatarEmoji} {u.name} {u.isAdmin && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,215,0,0.2)', color: 'var(--wc-gold)' }}>admin</span>}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {editingUser?.id === u.id ? (
                    <Input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="h-8 text-xs" dir="ltr" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  ) : u.email}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {editingUser?.id === u.id ? (
                    <select value={editingUser.department || ''} onChange={e => setEditingUser({ ...editingUser, department: e.target.value || null })}
                      className="h-8 px-2 rounded text-xs" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="">بدون قسم</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
                    </select>
                  ) : (
                    departments.find((d: any) => d.id === u.department)?.nameAr || u.department || '-'
                  )}
                </td>
                <td className="px-3 py-2 font-bebas" style={{ color: 'var(--wc-gold)' }}>{u.totalPoints}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{u.predictionCount}</td>
                <td className="px-3 py-2">
                  {u.banned ? (
                    <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>محظور</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>نشط</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {editingUser?.id === u.id ? (
                    <div className="flex gap-1">
                      <button onClick={handleUpdateUser} className="p-1 rounded" style={{ color: '#22c55e' }}><Save className="h-4 w-4" /></button>
                      <button onClick={() => setEditingUser(null)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingUser(u)} className="p-1 rounded" style={{ color: 'var(--wc-sky)' }}><Edit className="h-4 w-4" /></button>
                      {!u.isAdmin && <button onClick={() => handleToggleBan(u)} className="p-1 rounded" style={{ color: u.banned ? '#22c55e' : '#f59e0b' }}><Ban className="h-4 w-4" /></button>}
                      {!u.isAdmin && <button onClick={() => handleDeleteUser(u)} className="p-1 rounded" style={{ color: '#ef4444' }}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Matches Tab ─── */
function AdminMatchesTab({ adminToken }: { adminToken: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMatch, setNewMatch] = useState({ matchNumber: 0, stage: 'group', groupLetter: '', homeTeamId: '', awayTeamId: '', kickoff: '', venue: '' });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [filter, setFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        fetch('/api/admin/matches', { headers: { 'X-Admin-Token': adminToken } }),
        fetch('/api/matches'),
      ]);
      const matchesData = await matchesRes.json();
      const teamsData = await teamsRes.json();
      if (matchesData.matches) setMatches(matchesData.matches);
      if (teamsData.matches) {
        const allTeams = new Map();
        teamsData.matches.forEach((m: any) => {
          if (m.homeTeam) allTeams.set(m.homeTeam.id, m.homeTeam);
          if (m.awayTeam) allTeams.set(m.awayTeam.id, m.awayTeam);
        });
        setTeams(Array.from(allTeams.values()));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [matchesRes, teamsRes] = await Promise.all([
          fetch('/api/admin/matches', { headers: { 'X-Admin-Token': adminToken } }),
          fetch('/api/matches'),
        ]);
        const matchesData = await matchesRes.json();
        const teamsData = await teamsRes.json();
        if (active) {
          if (matchesData.matches) setMatches(matchesData.matches);
          if (teamsData.matches) {
            const allTeams = new Map();
            teamsData.matches.forEach((m: any) => {
              if (m.homeTeam) allTeams.set(m.homeTeam.id, m.homeTeam);
              if (m.awayTeam) allTeams.set(m.awayTeam.id, m.awayTeam);
            });
            setTeams(Array.from(allTeams.values()));
          }
        }
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [adminToken]);

  const showResultMsg = (success: boolean, message: string) => {
    setResult({ success, message });
    setTimeout(() => setResult(null), 3000);
  };

  const filtered = matches.filter(m => {
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  const handleAddMatch = async () => {
    if (!newMatch.homeTeamId || !newMatch.awayTeamId || !newMatch.kickoff) return;
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ ...newMatch, matchNumber: newMatch.matchNumber || undefined }),
      });
      const data = await res.json();
      if (data.match) {
        showResultMsg(true, 'تمت إضافة المباراة');
        setShowAddForm(false);
        setNewMatch({ matchNumber: 0, stage: 'group', groupLetter: '', homeTeamId: '', awayTeamId: '', kickoff: '', venue: '' });
        fetchData();
      } else {
        showResultMsg(false, data.error || 'خطأ');
      }
    } catch { showResultMsg(false, 'خطأ في الاتصال'); }
  };

  const handleUpdateMatch = async () => {
    if (!editingMatch) return;
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify(editingMatch),
      });
      const data = await res.json();
      if (data.success) {
        showResultMsg(true, 'تم التحديث');
        setEditingMatch(null);
        fetchData();
      } else {
        showResultMsg(false, data.error || 'خطأ');
      }
    } catch { showResultMsg(false, 'خطأ في الاتصال'); }
  };

  const handleDeleteMatch = async (match: any) => {
    if (!confirm(`هل أنت متأكد من حذف المباراة #${match.matchNumber}؟`)) return;
    try {
      const res = await fetch(`/api/admin/matches?id=${match.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken },
      });
      const data = await res.json();
      if (data.success) {
        showResultMsg(true, 'تم الحذف');
        fetchData();
      } else {
        showResultMsg(false, data.error || 'خطأ');
      }
    } catch { showResultMsg(false, 'خطأ في الاتصال'); }
  };

  const handleSeedKnockout = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/seed-knockout', {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
      });
      const data = await res.json();
      if (data.success) {
        showResultMsg(true, data.message || `تم إنشاء ${data.created} مباراة`);
        fetchData();
      } else {
        showResultMsg(false, data.error || 'خطأ');
      }
    } catch { showResultMsg(false, 'خطأ في الاتصال'); }
    setSeeding(false);
  };

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {result && (
        <div className="p-3 rounded-xl text-sm font-medium"
          style={{ background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, color: result.success ? '#22c55e' : '#ef4444' }}>
          {result.message}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--wc-gold)' }}>المباريات ({matches.length})</h3>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {['all', 'upcoming', 'finished'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: filter === f ? 'rgba(255,215,0,0.15)' : 'var(--bg-primary)', color: filter === f ? 'var(--wc-gold)' : 'var(--text-muted)', border: `1px solid ${filter === f ? 'var(--wc-gold)' : 'var(--border-color)'}` }}>
                  {f === 'all' ? 'الكل' : f === 'upcoming' ? 'قادمة' : 'منتهية'}
                </button>
              ))}
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
              <Plus className="h-4 w-4" /> مباراة جديدة
            </Button>
            <Button onClick={handleSeedKnockout} disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, var(--wc-sky), #1E88E5)', color: '#fff' }}>
              {seeding ? '⏳' : '🏆'} إنشاء الإقصائيات
            </Button>
          </div>
        </div>

        {/* Add match form */}
        {showAddForm && (
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>رقم المباراة</label>
                <Input type="number" value={newMatch.matchNumber || ''} onChange={e => setNewMatch({ ...newMatch, matchNumber: parseInt(e.target.value) || 0 })}
                  placeholder="تلقائي" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>المجموعة</label>
                <select value={newMatch.groupLetter} onChange={e => setNewMatch({ ...newMatch, groupLetter: e.target.value, stage: e.target.value ? 'group' : 'knockout' })}
                  className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <option value="">إقصائي</option>
                  {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => <option key={g} value={g}>المجموعة {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الملعب</label>
                <Input value={newMatch.venue} onChange={e => setNewMatch({ ...newMatch, venue: e.target.value })}
                  placeholder="الملعب" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الفريق المضيف</label>
                <select value={newMatch.homeTeamId} onChange={e => setNewMatch({ ...newMatch, homeTeamId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <option value="">اختر...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الفريق الضيف</label>
                <select value={newMatch.awayTeamId} onChange={e => setNewMatch({ ...newMatch, awayTeamId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <option value="">اختر...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الموعد</label>
                <Input type="datetime-local" value={newMatch.kickoff} onChange={e => setNewMatch({ ...newMatch, kickoff: e.target.value })}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddMatch} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
                <Save className="h-4 w-4 inline ml-1" /> حفظ
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="ghost" className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>

      {/* Matches list */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        <div className="max-h-[500px] overflow-y-auto">
          {filtered.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              {editingMatch?.id === m.id ? (
                <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                  <Input type="number" value={editingMatch.homeScore ?? ''} onChange={e => setEditingMatch({ ...editingMatch, homeScore: e.target.value === '' ? null : parseInt(e.target.value) })}
                    placeholder="-" className="h-8 text-center font-bebas" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  <span className="text-center font-bebas text-lg" style={{ color: 'var(--text-muted)' }}>-</span>
                  <Input type="number" value={editingMatch.awayScore ?? ''} onChange={e => setEditingMatch({ ...editingMatch, awayScore: e.target.value === '' ? null : parseInt(e.target.value) })}
                    placeholder="-" className="h-8 text-center font-bebas" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  <div className="flex gap-1 justify-end">
                    <button onClick={handleUpdateMatch} className="p-1 rounded" style={{ color: '#22c55e' }}><Save className="h-4 w-4" /></button>
                    <button onClick={() => setEditingMatch(null)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-bebas text-sm" style={{ color: 'var(--text-muted)' }}>#{m.matchNumber}</span>
                    <span className="text-sm">{m.homeTeamName} vs {m.awayTeamName}</span>
                    {m.groupLetter && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,195,247,0.15)', color: 'var(--wc-sky)' }}>{m.groupLetter}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === 'finished' ? (
                      <span className="font-bebas text-lg" style={{ color: 'var(--wc-gold)' }}>{m.homeScore} - {m.awayScore}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>قادمة</span>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => setEditingMatch(m)} className="p-1 rounded" style={{ color: 'var(--wc-sky)' }}><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteMatch(m)} className="p-1 rounded" style={{ color: '#ef4444' }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Results Tab ─── */
function AdminResultsTab({ adminToken }: { adminToken: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/result', { headers: { 'X-Admin-Token': adminToken } });
        const data = await res.json();
        if (data.matches) setMatches(data.matches);
      } catch {}
      setLoading(false);
    })();
  }, [adminToken]);

  const filtered = matches.filter(m => {
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  const handleSubmit = async () => {
    if (!selectedMatch || homeScore === '' || awayScore === '') return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ matchId: selectedMatch, homeScore: parseInt(homeScore), awayScore: parseInt(awayScore) }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: `تم تسجيل النتيجة: ${homeScore} - ${awayScore} | تم احتساب ${data.predictionsScored} توقعات` });
        setSelectedMatch('');
        setHomeScore('');
        setAwayScore('');
        const refresh = await fetch('/api/admin/result', { headers: { 'X-Admin-Token': adminToken } });
        const refreshData = await refresh.json();
        if (refreshData.matches) setMatches(refreshData.matches);
      } else {
        setResult({ success: false, message: data.error || 'خطأ' });
      }
    } catch {
      setResult({ success: false, message: 'خطأ في الاتصال' });
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {result && (
        <div className="p-3 rounded-xl text-sm font-medium"
          style={{ background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, color: result.success ? '#22c55e' : '#ef4444' }}>
          {result.message}
        </div>
      )}

      {/* Result form */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--wc-gold)' }}>تسجيل نتيجة مباراة</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>المباراة</label>
            <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <option value="">اختر مباراة...</option>
              {filtered.map(m => (
                <option key={m.id} value={m.id}>#{m.matchNumber} {m.homeTeam} vs {m.awayTeam} {m.status === 'finished' ? '(منتهية)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>النتيجة</label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" max="20" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                  className="h-11 text-center font-bebas text-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} placeholder="0" />
                <span className="font-bebas text-2xl" style={{ color: 'var(--text-muted)' }}>-</span>
                <Input type="number" min="0" max="20" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                  className="h-11 text-center font-bebas text-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} placeholder="0" />
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !selectedMatch || homeScore === '' || awayScore === ''}
            className="w-full h-12 text-lg font-bold" style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
            {submitting ? '...' : 'تسجيل النتيجة'}
          </Button>
        </div>
      </div>

      {/* Quick filter */}
      <div className="flex gap-2">
        {['all', 'upcoming', 'finished'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: filter === f ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)', color: filter === f ? 'var(--wc-gold)' : 'var(--text-muted)', border: `1px solid ${filter === f ? 'var(--wc-gold)' : 'var(--border-color)'}` }}>
            {f === 'all' ? 'الكل' : f === 'upcoming' ? 'قادمة' : 'منتهية'}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Admin Email Tab ─── */
function AdminEmailTab({ adminToken }: { adminToken: string }) {
  const [tab, setTab] = useState<'config' | 'send' | 'logs'>('config');
  const [config, setConfig] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configForm, setConfigForm] = useState({ apiKey: '', fromEmail: '', fromName: 'ملك التوقعات', recipients: '', autoSendDaily: false });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    const h = async () => {
      setLoading(true);
      try {
        const [cfgRes, logRes] = await Promise.all([
          apiFetch('/api/admin/email-config', { headers: { 'X-Admin-Token': adminToken } }),
          apiFetch('/api/admin/email-log', { headers: { 'X-Admin-Token': adminToken } }),
        ]);
        if (cfgRes.config) {
          setConfig(cfgRes.config);
          setConfigForm({
            apiKey: cfgRes.config.apiKey || '',
            fromEmail: cfgRes.config.fromEmail || '',
            fromName: cfgRes.config.fromName || 'ملك التوقعات',
            recipients: (cfgRes.config.recipients || []).join(', '),
            autoSendDaily: cfgRes.config.autoSendDaily || false,
          });
        }
        if (logRes.logs) setLogs(logRes.logs);
      } catch {}
      setLoading(false);
    };
    h();
  }, [adminToken]);

  const loadSummary = async () => {
    try {
      const data = await apiFetch('/api/admin/email', { headers: { 'X-Admin-Token': adminToken } });
      setSummary(data);
    } catch {}
  };

  const handlePreview = async () => {
    await loadSummary();
    if (summary?.html) setPreviewHtml(summary.html);
  };

  const handleSend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const data = await apiFetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({}),
      });
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        const logRes = await apiFetch('/api/admin/email-log', { headers: { 'X-Admin-Token': adminToken } });
        if (logRes.logs) setLogs(logRes.logs);
      } else {
        setMessage({ type: 'error', text: data.error || data.message || 'فشل الإرسال' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'خطأ في الاتصال' });
    }
    setSending(false);
  };

  const handleSaveConfig = async () => {
    setMessage(null);
    try {
      const data = await apiFetch('/api/admin/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          apiKey: configForm.apiKey,
          fromEmail: configForm.fromEmail,
          fromName: configForm.fromName,
          recipients: configForm.recipients.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean),
          autoSendDaily: configForm.autoSendDaily,
        }),
      });
      if (data.success) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات' });
        setConfig({ ...config, hasApiKey: !!configForm.apiKey });
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل الحفظ' });
      }
    } catch {
      setMessage({ type: 'error', text: 'خطأ في الاتصال' });
    }
  };

  if (loading) return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'config' as const, label: '⚙️ الإعدادات' },
          { id: 'send' as const, label: '📧 إرسال' },
          { id: 'logs' as const, label: '📋 السجل' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'send' && !summary) loadSummary(); }}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
            style={{
              background: tab === t.id ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
              color: tab === t.id ? 'var(--wc-gold)' : 'var(--text-muted)',
              border: `1px solid ${tab === t.id ? 'var(--wc-gold)' : 'var(--border-color)'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className="rounded-lg p-3 text-sm"
          style={{
            background: message.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(139,0,0,0.15)',
            color: message.type === 'success' ? '#4CAF50' : '#f44336',
            border: `1px solid ${message.type === 'success' ? 'rgba(46,125,50,0.3)' : 'rgba(139,0,0,0.3)'}`,
          }}>
          {message.text}
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--wc-gold)' }}>إعدادات البريد الإلكتروني</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            استخدم <a href="https://resend.com" target="_blank" rel="noopener" className="underline" style={{ color: 'var(--wc-sky)' }}>Resend.com</a> للحصول على مفتاح API مجاني (50,000 إيميل/شهر)
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Resend API Key</label>
              <Input type="password" value={configForm.apiKey} onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                placeholder="re_xxxxxxxxxx" dir="ltr"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>بريد المرسل (From Email)</label>
              <Input type="email" value={configForm.fromEmail} onChange={e => setConfigForm({ ...configForm, fromEmail: e.target.value })}
                placeholder="noreply@yourdomain.com" dir="ltr"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>اسم المرسل</label>
              <Input value={configForm.fromName} onChange={e => setConfigForm({ ...configForm, fromName: e.target.value })}
                placeholder="ملك التوقعات"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>المستلمون (بريد واحد أو أكثر — بريد لكل سطر أو مفصولة بفاصلة)</label>
              <textarea value={configForm.recipients} onChange={e => setConfigForm({ ...configForm, recipients: e.target.value })}
                placeholder={"user1@company.com\nuser2@company.com"}
                dir="ltr" rows={4}
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.5rem', resize: 'vertical' }} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={configForm.autoSendDaily}
                onChange={e => setConfigForm({ ...configForm, autoSendDaily: e.target.checked })}
                className="rounded" />
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>إرسال تلقائي يومي</label>
            </div>
          </div>
          <Button onClick={handleSaveConfig}
            className="h-10 font-bold"
            style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
            💾 حفظ الإعدادات
          </Button>
          {config?.lastSentAt && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              آخر إرسال: {new Date(config.lastSentAt).toLocaleString('ar-SA')}
            </p>
          )}
        </div>
      )}

      {/* Send Tab */}
      {tab === 'send' && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--wc-gold)' }}>ملخص اليوم</h3>
            {summary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'المستخدمين', value: summary.stats.totalUsers, sub: `+${summary.stats.newUsersToday} جديد` },
                  { label: 'التوقعات', value: summary.stats.totalPredictions, sub: `+${summary.stats.predictionsToday} جديدة` },
                  { label: 'مباريات منتهية', value: summary.stats.finishedMatchesToday, sub: `من ${summary.stats.matchesToday}` },
                  { label: 'التصنيف', value: summary.leaderboard?.[0]?.name || '-', sub: `${summary.leaderboard?.[0]?.points || 0} نقطة` },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
                    <div className="text-xl font-bold" style={{ color: 'var(--wc-gold)' }}>{s.value}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--wc-sky)' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Button onClick={loadSummary} className="h-10" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                📊 تحميل الملخص
              </Button>
            )}
          </div>

          {/* Send Actions */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--wc-sky)' }}>إرسال التقرير</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePreview} disabled={!summary}
                className="h-10"
                style={{ background: 'rgba(79,195,247,0.15)', color: 'var(--wc-sky)', border: '1px solid rgba(79,195,247,0.3)' }}>
                👁️ معاينة
              </Button>
              <Button onClick={handleSend} disabled={sending || !config?.hasApiKey}
                className="h-10 font-bold"
                style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
                {sending ? '⏳ جاري الإرسال...' : '📧 إرسال التقرير'}
              </Button>
            </div>
            {!config?.hasApiKey && (
              <p className="text-xs" style={{ color: '#f44336' }}>⚠️ يجب إعداد Resend API Key أولاً في تبويب الإعدادات</p>
            )}
          </div>

          {/* Preview */}
          {previewHtml && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between p-3" style={{ background: 'var(--bg-card)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--wc-gold)' }}>معاينة البريد</span>
                <button onClick={() => setPreviewHtml(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>إغلاق ✕</button>
              </div>
              <iframe srcDoc={previewHtml} className="w-full" style={{ height: '800px', border: 'none', background: '#0A1628' }} />
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--wc-gold)' }}>سجل الإرسالات</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>لا توجد سجلات إرسال</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="px-3 py-2 text-right" style={{ color: 'var(--text-muted)' }}>التاريخ</th>
                    <th className="px-3 py-2 text-right" style={{ color: 'var(--text-muted)' }}>الموضوع</th>
                    <th className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>المستقبلون</th>
                    <th className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                    <th className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('ar-SA') : '-'}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{log.subject}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-primary)' }}>{log.recipientCount}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${log.status === 'sent' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {log.status === 'sent' ? '✅ تم' : '❌ فشل'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                        {log.sentBy === 'cron' ? '🔄 تلقائي' : '👤 يدوي'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main App ─── */
export default function Home() {
  // Initialize user from localStorage on mount
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [loading, setLoading] = useState(true);
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('fifa26_user');
    const savedToken = localStorage.getItem('fifa26_admin_token') || '';
    // Use a micro-task to avoid synchronous setState in effect
    queueMicrotask(() => {
      try {
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch {}
      setAdminToken(savedToken);
      setLoading(false);
    });
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('fifa26_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fifa26_user');
    setActiveTab('matches');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-4xl animate-pulse">🏆</div>
      </div>
    );
  }

  if (!user) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 container mx-auto px-4 py-6">
        {activeTab === 'matches' && <MatchesView user={user} />}
        {activeTab === 'predictions' && <PredictionsView user={user} />}
        {activeTab === 'leaderboard' && <LeaderboardView user={user} />}
        {activeTab === 'rules' && <RulesView />}
        {activeTab === 'bracket' && <BracketView userId={user.id} />}
        {activeTab === 'admin' && user.email === 'admin@almarshad.com' && (
          adminToken ? (
            <AdminPanel adminToken={adminToken} />
          ) : (
            <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--wc-gold)' }}>لوحة التحكم</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>أدخل رمز الإدارة للوصول</p>
              <Input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)}
                className="h-11 mb-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="أدخل رمز الإدارة" dir="ltr"
                onKeyDown={e => { if (e.key === 'Enter' && adminToken) localStorage.setItem('fifa26_admin_token', adminToken); }} />
              <Button onClick={() => { localStorage.setItem('fifa26_admin_token', adminToken); }}
                disabled={!adminToken}
                className="w-full h-11 font-bold"
                style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
                دخول
              </Button>
            </div>
          )
        )}
      </main>
      <footer className="mt-auto py-4 text-center text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
        ملك التوقعات - فيفا٢٦ © ٢٠٢٦ | مجموعة المرشد القابضة
      </footer>
    </div>
  );
}
