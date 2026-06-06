'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu, LogOut, Trophy, Target, Swords, ChevronDown, ChevronUp, X, ScrollText, Shield } from 'lucide-react';

/* ─── Types ─── */
interface User {
  id: string;
  name: string;
  email: string;
  avatarEmoji: string | null;
  totalPoints: number;
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
function MatchCard({ match, userId, onSaved }: { match: MatchWithTeams; userId: string; onSaved: () => void }) {
  const [homeScore, setHomeScore] = useState<string>(match.prediction?.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState<string>(match.prediction?.awayScore?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const isUpcoming = match.status === 'upcoming';
  const hasPrediction = match.prediction !== null;

  const handleSave = async () => {
    if (!homeScore || !awayScore) return;
    setSaving(true);
    await apiFetch('/api/predictions', {
      method: 'POST',
      body: JSON.stringify({ userId, matchId: match.id, homeScore: parseInt(homeScore), awayScore: parseInt(awayScore) }),
    });
    setSaving(false);
    onSaved();
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
          <span className="text-2xl">{match.homeTeam.flag}</span>
          <span className="text-sm font-bold truncate mt-1">{match.homeTeam.nameAr || match.homeTeam.name}</span>
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
          <span className="text-2xl">{match.awayTeam.flag}</span>
          <span className="text-sm font-bold truncate mt-1">{match.awayTeam.nameAr || match.awayTeam.name}</span>
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { name, email, password } : { email, password };
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)' }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--wc-gold)' }}>ملك التوقعات</h1>
          <p className="font-bebas text-xl tracking-wider mt-1" style={{ color: 'var(--wc-sky)' }}>FIFA WORLD CUP 2026™</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>مجموعة المرشد القابضة</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(244,67,54,0.15)', color: '#F44336', border: '1px solid rgba(244,67,54,0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>الاسم الكامل</label>
              <Input value={name} onChange={e => setName(e.target.value)} required
                className="h-11" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="أدخل اسمك" />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="h-11" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="example@almarshad.com" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>كلمة المرور</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="h-11" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="••••••••" dir="ltr" />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold"
            style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
            {loading ? '...' : isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-sm underline" style={{ color: 'var(--wc-sky)' }}>
            {isRegister ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ سجّل الآن'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Header ─── */
function Header({ user, activeTab, onTabChange, onLogout }: { user: User; activeTab: string; onTabChange: (t: string) => void; onLogout: () => void }) {
  const isAdmin = user.email === 'admin@almarshad.com';
  const tabs = [
    { id: 'matches', label: '⚽ المباريات', icon: Swords },
    { id: 'predictions', label: '🎯 توقعاتي', icon: Target },
    { id: 'leaderboard', label: '🏆 المتصدرين', icon: Trophy },
    { id: 'rules', label: '📜 القواعد', icon: ScrollText },
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
          <span className="hidden sm:inline font-bebas text-sm" style={{ color: 'var(--wc-gold)' }}>{user.totalPoints} pts</span>

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

/* ─── Matches View ─── */
function MatchesView({ user }: { user: User }) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['A']));

  const fetchMatches = useCallback(async () => {
    const data = await apiFetch(`/api/matches?userId=${user.id}`);
    if (data.matches) setMatches(data.matches);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/matches?userId=${user.id}`).then(data => {
      if (active && data.matches) setMatches(data.matches);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user.id]);

  const filteredMatches = matches.filter(m => {
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
      {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupMatches]) => (
        <div key={group} className="mb-4">
          <button onClick={() => toggleGroup(group)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--wc-gold)' }}>
              ⚽ المجموعة {group} ({groupMatches.length} مباراة)
            </span>
            {expandedGroups.has(group) ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
          </button>
          {expandedGroups.has(group) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupMatches.map(match => (
                <MatchCard key={match.id} match={match} userId={user.id} onSaved={fetchMatches} />
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
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const data = await apiFetch(`/api/predictions?userId=${user.id}`);
      if (data.predictions) setPredictions(data.predictions);
      setLoading(false);
    })();
  }, [user.id]);

  const filtered = predictions.filter(p => {
    if (filter === 'exact') return p.pointsType === 'exact';
    if (filter === 'correct') return p.pointsType === 'correct';
    if (filter === 'wrong') return p.pointsType === 'wrong';
    if (filter === 'pending') return !p.pointsType;
    return true;
  });

  const stats = {
    total: predictions.length,
    exact: predictions.filter(p => p.pointsType === 'exact').length,
    correct: predictions.filter(p => p.pointsType === 'correct').length,
    wrong: predictions.filter(p => p.pointsType === 'wrong').length,
    pending: predictions.filter(p => !p.pointsType).length,
  };

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'الكل', count: stats.total, color: 'var(--wc-sky)' },
          { label: 'دقيق', count: stats.exact, color: 'var(--pts-exact)' },
          { label: 'صحيح', count: stats.correct, color: 'var(--pts-correct)' },
          { label: 'خاطئ', count: stats.wrong, color: 'var(--pts-wrong)' },
        ].map(s => (
          <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="font-bebas text-3xl" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[{ id: 'all', label: `الكل ${stats.total}` }, { id: 'exact', label: `دقيق ${stats.exact}` }, { id: 'correct', label: `صحيح ${stats.correct}` }, { id: 'wrong', label: `خاطئ ${stats.wrong}` }, { id: 'pending', label: `منتظر ${stats.pending}` }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
            style={{
              background: filter === f.id ? 'rgba(255,215,0,0.15)' : 'var(--bg-card)',
              color: filter === f.id ? 'var(--wc-gold)' : 'var(--text-muted)',
              border: `1px solid ${filter === f.id ? 'var(--wc-gold)' : 'var(--border-color)'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Prediction cards */}
      <div className="grid gap-3">
        {filtered.map(p => {
          const pointsColor = p.pointsType === 'exact' ? 'var(--pts-exact)' : p.pointsType === 'correct' ? 'var(--pts-correct)' : p.pointsType === 'wrong' ? 'var(--pts-wrong)' : 'var(--pts-pending)';
          return (
            <div key={p.id} className="rounded-xl p-4 animate-fade-in" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.match?.homeTeam?.flag}</span>
                  <div className="text-center">
                    <div className="font-bebas text-xl">
                      <span style={{ color: 'var(--wc-sky)' }}>{p.homeScore}</span>
                      <span style={{ color: 'var(--text-muted)' }}> : </span>
                      <span style={{ color: 'var(--wc-sky)' }}>{p.awayScore}</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>توقعك</div>
                  </div>
                  <span className="text-xl">{p.match?.awayTeam?.flag}</span>
                </div>

                {p.match?.homeScore !== null && p.match?.awayScore !== null ? (
                  <div className="text-center">
                    <div className="font-bebas text-xl" style={{ color: 'var(--wc-gold)' }}>
                      {p.match.homeScore} : {p.match.awayScore}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>النتيجة</div>
                  </div>
                ) : null}

                <span className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{ background: pointsColor + '22', color: pointsColor }}>
                  {p.pointsType === 'exact' ? 'دقيق +3' : p.pointsType === 'correct' ? 'صحيح +2' : p.pointsType === 'wrong' ? 'خاطئ 0' : 'منتظر'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>لا توجد توقعات بعد</div>
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

  const top3 = leaderboard.slice(0, 3);
  const myEntry = leaderboard.find(e => e.id === user.id);

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
                  borderStart: entry.id === user.id ? '3px solid var(--wc-sky)' : 'none',
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
function SyncPanel() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
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

      {/* Sync Results Panel */}
      <SyncPanel />

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
        // Refresh matches list
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.3), rgba(10,22,40,0.8), rgba(255,215,0,0.2))', border: '1px solid var(--border-color)' }}>
        <div className="text-4xl mb-2">🛡️</div>
        <h2 className="text-2xl font-black" style={{ color: 'var(--wc-gold)' }}>لوحة التحكم</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>تسجيل النتائج يدوياً في حال فشل الاتصال بالـ API</p>
      </div>

      {/* Manual result form */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--wc-gold)' }}>تسجيل نتيجة مباراة</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>المباراة</label>
            <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
              className="w-full h-11 px-3 rounded-lg text-sm"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <option value="">اختر مباراة...</option>
              {filtered.map(m => (
                <option key={m.id} value={m.id}>
                  #{m.matchNumber} {m.homeTeam} vs {m.awayTeam} {m.status === 'finished' ? '(منتهية)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>نتيجة الفريق المضيف</label>
              <Input type="number" min="0" max="20" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                className="h-11 text-center font-bebas text-xl"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="0" />
            </div>
            <div className="flex items-end pb-1">
              <span className="font-bebas text-2xl" style={{ color: 'var(--text-muted)' }}>-</span>
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>نتيجة الفريق الضيف</label>
              <Input type="number" min="0" max="20" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                className="h-11 text-center font-bebas text-xl"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="0" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !selectedMatch || homeScore === '' || awayScore === ''}
            className="w-full h-12 text-lg font-bold"
            style={{ background: 'linear-gradient(135deg, var(--wc-gold), #FFA000)', color: '#000' }}>
            {submitting ? '...' : 'تسجيل النتيجة'}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-3 rounded-xl text-sm font-medium"
            style={{
              background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: result.success ? '#22c55e' : '#ef4444',
            }}>
            {result.message}
          </div>
        )}
      </div>

      {/* Matches list */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--wc-gold)' }}>جميع المباريات</h3>
          <div className="flex gap-2">
            {['all', 'upcoming', 'finished'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: filter === f ? 'rgba(255,215,0,0.15)' : 'var(--bg-primary)',
                  color: filter === f ? 'var(--wc-gold)' : 'var(--text-muted)',
                  border: `1px solid ${filter === f ? 'var(--wc-gold)' : 'var(--border-color)'}`,
                }}>
                {f === 'all' ? 'الكل' : f === 'upcoming' ? 'قادمة' : 'منتهية'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <span className="font-bebas text-sm" style={{ color: 'var(--text-muted)' }}>#{m.matchNumber}</span>
                <span className="text-sm font-medium">{m.homeTeam} vs {m.awayTeam}</span>
              </div>
              <div className="flex items-center gap-2">
                {m.status === 'finished' ? (
                  <span className="font-bebas text-lg" style={{ color: 'var(--wc-gold)' }}>{m.homeScore} - {m.awayScore}</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(79,195,247,0.15)', color: 'var(--wc-sky)' }}>
                    {m.groupLetter ? `المجموعة ${m.groupLetter}` : 'إقصائي'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
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
