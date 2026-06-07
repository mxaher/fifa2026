import { NextResponse } from "next/server";
import { getClient, schema } from "@/lib/db/index";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { sendEmail, type EmailConfig } from "@/lib/email";

function verifyAdmin(request: Request): string | null {
  const token = request.headers.get("X-Admin-Token");
  const expectedToken = (globalThis as any).ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  if (!token || token !== expectedToken) return null;
  return token;
}

function generateDailySummaryHTML(data: {
  date: string;
  totalUsers: number;
  newUsersToday: number;
  totalPredictions: number;
  predictionsToday: number;
  matchesToday: number;
  finishedMatchesToday: number;
  matchResults: Array<{
    matchNumber: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    venue: string;
  }>;
  leaderboard: Array<{
    rank: number;
    name: string;
    points: number;
    exact: number;
    correct: number;
  }>;
  syncLogs: Array<{
    triggeredBy: string;
    sourceApi: string;
    fetchedMatches: number;
    newlyFinalized: number;
    createdAt: string;
  }>;
  recentPredictions: Array<{
    userName: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    pointsType: string | null;
  }>;
}): string {
  const matchRows = data.matchResults.length > 0
    ? data.matchResults.map(m => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">#${m.matchNumber}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${m.homeTeam}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${m.homeScore} - ${m.awayScore}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${m.awayTeam}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${m.venue}</td>
        </tr>`
      ).join("")
    : '<tr><td colspan="5" style="padding:16px;text-align:center;color:#888;">لا توجد مباريات منتهية اليوم</td></tr>';

  const leaderboardRows = data.leaderboard.length > 0
    ? data.leaderboard.slice(0, 10).map(e => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${e.rank}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${e.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:#FFD700;">${e.points}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${e.exact}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${e.correct}</td>
        </tr>`
      ).join("")
    : '<tr><td colspan="5" style="padding:16px;text-align:center;color:#888;">لا يوجد ترتيب بعد</td></tr>';

  const predictionRows = data.recentPredictions.length > 0
    ? data.recentPredictions.slice(0, 15).map(p => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.userName}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.homeTeam}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${p.homeScore} - ${p.awayScore}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.awayTeam}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${p.pointsType === 'exact' ? '✅ مباشر' : p.pointsType === 'correct' ? '🟢 صحيح' : p.pointsType === 'wrong' ? '🔴 خطأ' : '⏳'}</td>
        </tr>`
      ).join("")
    : '<tr><td colspan="5" style="padding:16px;text-align:center;color:#888;">لا توجد توقعات جديدة اليوم</td></tr>';

  const syncRows = data.syncLogs.length > 0
    ? data.syncLogs.map(s => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${s.createdAt}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${s.triggeredBy === 'cron' ? '🔄 تلقائي' : '👤 يدوي'}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${s.sourceApi}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${s.fetchedMatches}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${s.newlyFinalized}</td>
        </tr>`
      ).join("")
    : '<tr><td colspan="5" style="padding:16px;text-align:center;color:#888;">لا توجد سجلات مزامنة</td></tr>';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<div style="max-width:680px;margin:0 auto;background:#0F2137;border-radius:16px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

<!-- Header -->
<div style="background:linear-gradient(135deg,#8B0000,#0A1628);padding:32px 24px;text-align:center;">
  <div style="font-size:48px;margin-bottom:8px;">⚽🏆</div>
  <h1 style="color:#FFD700;font-size:28px;margin:0 0 4px 0;">ملك التوقعات - فيفا ٢٠٢٦</h1>
  <p style="color:#4FC3F7;font-size:14px;margin:0;">تقرير اليومي - ${data.date}</p>
</div>

<!-- Stats Cards -->
<div style="padding:24px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
  <div style="background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.3);border-radius:12px;padding:16px 20px;text-align:center;min-width:120px;">
    <div style="font-size:28px;font-weight:bold;color:#4FC3F7;">${data.totalUsers}</div>
    <div style="font-size:12px;color:#888;">المستخدمين</div>
    <div style="font-size:11px;color:#2E7D32;margin-top:4px;">+${data.newUsersToday} جديد</div>
  </div>
  <div style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:12px;padding:16px 20px;text-align:center;min-width:120px;">
    <div style="font-size:28px;font-weight:bold;color:#FFD700;">${data.totalPredictions}</div>
    <div style="font-size:12px;color:#888;">التوقعات</div>
    <div style="font-size:11px;color:#2E7D32;margin-top:4px;">+${data.predictionsToday} جديدة</div>
  </div>
  <div style="background:rgba(46,125,50,0.1);border:1px solid rgba(46,125,50,0.3);border-radius:12px;padding:16px 20px;text-align:center;min-width:120px;">
    <div style="font-size:28px;font-weight:bold;color:#2E7D32;">${data.finishedMatchesToday}</div>
    <div style="font-size:12px;color:#888;">مباريات منتهية</div>
    <div style="font-size:11px;color:#888;margin-top:4px;">من ${data.matchesToday} مباراة</div>
  </div>
</div>

<!-- Match Results -->
<div style="padding:0 24px 24px;">
  <h2 style="color:#FFD700;font-size:18px;margin:0 0 12px 0;border-bottom:2px solid rgba(255,215,0,0.3);padding-bottom:8px;">⚽ نتائج المباريات</h2>
  <table style="width:100%;border-collapse:collapse;background:#0A1628;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:rgba(139,0,0,0.3);">
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:center;">رقم</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:right;">المضيف</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:center;">النتيجة</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:right;">الضيف</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:right;">المكان</th>
      </tr>
    </thead>
    <tbody>${matchRows}</tbody>
  </table>
</div>

<!-- Recent Predictions -->
<div style="padding:0 24px 24px;">
  <h2 style="color:#4FC3F7;font-size:18px;margin:0 0 12px 0;border-bottom:2px solid rgba(79,195,247,0.3);padding-bottom:8px;">🎯 التوقعات الأخيرة</h2>
  <table style="width:100%;border-collapse:collapse;background:#0A1628;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:rgba(79,195,247,0.15);">
        <th style="padding:10px 12px;color:#4FC3F7;font-size:12px;text-align:right;">المستخدم</th>
        <th style="padding:10px 12px;color:#4FC3F7;font-size:12px;text-align:right;">المضيف</th>
        <th style="padding:10px 12px;color:#4FC3F7;font-size:12px;text-align:center;">التوقع</th>
        <th style="padding:10px 12px;color:#4FC3F7;font-size:12px;text-align:right;">الضيف</th>
        <th style="padding:10px 12px;color:#4FC3F7;font-size:12px;text-align:center;">النتيجة</th>
      </tr>
    </thead>
    <tbody>${predictionRows}</tbody>
  </table>
</div>

<!-- Leaderboard -->
<div style="padding:0 24px 24px;">
  <h2 style="color:#FFD700;font-size:18px;margin:0 0 12px 0;border-bottom:2px solid rgba(255,215,0,0.3);padding-bottom:8px;">🏆 لوحة الصدارة</h2>
  <table style="width:100%;border-collapse:collapse;background:#0A1628;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:rgba(255,215,0,0.15);">
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:center;">#</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:right;">الاسم</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:center;">النقاط</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:center;">مباشر</th>
        <th style="padding:10px 12px;color:#FFD700;font-size:12px;text-align:center;">صحيح</th>
      </tr>
    </thead>
    <tbody>${leaderboardRows}</tbody>
  </table>
</div>

<!-- Sync Logs -->
<div style="padding:0 24px 24px;">
  <h2 style="color:#2E7D32;font-size:18px;margin:0 0 12px 0;border-bottom:2px solid rgba(46,125,50,0.3);padding-bottom:8px;">🔄 سجلات المزامنة</h2>
  <table style="width:100%;border-collapse:collapse;background:#0A1628;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:rgba(46,125,50,0.15);">
        <th style="padding:10px 12px;color:#2E7D32;font-size:12px;text-align:right;">الوقت</th>
        <th style="padding:10px 12px;color:#2E7D32;font-size:12px;text-align:right;">النوع</th>
        <th style="padding:10px 12px;color:#2E7D32;font-size:12px;text-align:right;">المصدر</th>
        <th style="padding:10px 12px;color:#2E7D32;font-size:12px;text-align:center;">جلب</th>
        <th style="padding:10px 12px;color:#2E7D32;font-size:12px;text-align:center;">تم إغلاقها</th>
      </tr>
    </thead>
    <tbody>${syncRows}</tbody>
  </table>
</div>

<!-- Footer -->
<div style="background:rgba(139,0,0,0.2);padding:20px 24px;text-align:center;">
  <p style="color:#888;font-size:12px;margin:0;">ملك التوقعات - فيفا ٢٠٢٦ | مجموعة المرشد القابضة</p>
  <p style="color:#666;font-size:11px;margin:4px 0 0 0;">تم إرسال هذا التقرير تلقائياً</p>
</div>

</div>
</body>
</html>`;
}

// GET — Generate daily summary data
export async function GET(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

    // Total users
    const allUsers = await db.select().from(schema.users);
    const totalUsers = allUsers.length;
    const newUsersToday = allUsers.filter(u =>
      u.createdAt >= startOfDay && u.createdAt <= endOfDay
    ).length;

    // Total predictions
    const allPredictions = await db.select().from(schema.predictions);
    const totalPredictions = allPredictions.length;
    const predictionsToday = allPredictions.filter(p =>
      p.createdAt >= startOfDay && p.createdAt <= endOfDay
    ).length;

    // Matches today
    const allMatches = await db.select().from(schema.matches);
    const matchesToday = allMatches.filter(m => {
      const kickoff = new Date(m.kickoff);
      return kickoff >= startOfDay && kickoff <= endOfDay;
    }).length;
    const finishedMatchesToday = allMatches.filter(m => {
      const kickoff = new Date(m.kickoff);
      return kickoff >= startOfDay && kickoff <= endOfDay && m.status === "finished";
    }).length;

    // Match results today
    const teams = await db.select().from(schema.teams);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const matchResults = allMatches
      .filter(m => {
        const kickoff = new Date(m.kickoff);
        return kickoff >= startOfDay && kickoff <= endOfDay && m.status === "finished";
      })
      .map(m => ({
        matchNumber: m.matchNumber,
        homeTeam: teamMap.get(m.homeTeamId)?.name || m.homeTeamId,
        awayTeam: teamMap.get(m.awayTeamId)?.name || m.awayTeamId,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        venue: m.venue || "",
      }))
      .sort((a, b) => a.matchNumber - b.matchNumber);

    // Leaderboard (top 10) — only show if at least one user has points
    const sorted = allUsers
      .filter(u => !u.isAdmin)
      .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    const hasAnyPoints = sorted.some(u => (u.totalPoints ?? 0) > 0);
    const leaderboard = hasAnyPoints
      ? sorted.slice(0, 10).map((u, i) => {
          const preds = allPredictions.filter(p => p.userId === u.id && p.points !== null);
          return {
            rank: i + 1,
            name: u.name,
            points: u.totalPoints ?? 0,
            exact: preds.filter(p => p.pointsType === "exact").length,
            correct: preds.filter(p => p.pointsType === "correct").length,
          };
        })
      : [];

    // Recent predictions today
    const recentPredictions = allPredictions
      .filter(p => p.createdAt >= startOfDay && p.createdAt <= endOfDay)
      .slice(0, 15)
      .map(p => {
        const match = allMatches.find(m => m.id === p.matchId);
        const user = allUsers.find(u => u.id === p.userId);
        return {
          userName: user?.name || "غير معروف",
          homeTeam: match ? (teamMap.get(match.homeTeamId)?.name || "?") : "?",
          awayTeam: match ? (teamMap.get(match.awayTeamId)?.name || "?") : "?",
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          pointsType: p.pointsType,
        };
      });

    // Sync logs today
    const allSyncLogs = await db.select().from(schema.syncLog);
    const syncLogs = allSyncLogs
      .filter(l => l.createdAt >= startOfDay && l.createdAt <= endOfDay)
      .slice(0, 10)
      .map(l => ({
        triggeredBy: l.triggeredBy,
        sourceApi: l.sourceApi,
        fetchedMatches: l.fetchedMatches ?? 0,
        newlyFinalized: l.newlyFinalized ?? 0,
        createdAt: l.createdAt ? new Date(l.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "",
      }));

    const dateStr = now.toLocaleDateString("ar-SA", {
      calendar: "gregory",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Riyadh",
    });

    const html = generateDailySummaryHTML({
      date: dateStr,
      totalUsers,
      newUsersToday,
      totalPredictions,
      predictionsToday,
      matchesToday,
      finishedMatchesToday,
      matchResults,
      leaderboard,
      syncLogs,
      recentPredictions,
    });

    return NextResponse.json({
      date: dateStr,
      stats: {
        totalUsers,
        newUsersToday,
        totalPredictions,
        predictionsToday,
        matchesToday,
        finishedMatchesToday,
      },
      matchResults,
      leaderboard,
      recentPredictions,
      syncLogs,
      html,
    });
  } catch (error) {
    console.error("Email summary GET error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// POST — Send the daily summary email
export async function POST(request: Request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const db = getClient();
    const body = await request.json().catch(() => ({}));
    const customRecipients = body.recipients as string[] | undefined;

    // Get email config
    const configs = await db.select().from(schema.emailConfig).limit(1);
    const config = configs[0];

    if (!config || (!config.apiKey && (!config.mailjetApiKey || !config.mailjetSecretKey))) {
      return NextResponse.json({ error: "إعدادات البريد الإلكتروني غير مكوّنة" }, { status: 400 });
    }

    const recipients = customRecipients && customRecipients.length > 0
      ? customRecipients
      : JSON.parse(config.recipients || "[]");

    if (recipients.length === 0) {
      return NextResponse.json({ error: "لا يوجد مستقبلين للبريد الإلكتروني" }, { status: 400 });
    }

    // Generate summary data
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

    const allUsers = await db.select().from(schema.users);
    const allPredictions = await db.select().from(schema.predictions);
    const allMatches = await db.select().from(schema.matches);
    const teams = await db.select().from(schema.teams);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    const totalUsers = allUsers.length;
    const newUsersToday = allUsers.filter(u => u.createdAt >= startOfDay && u.createdAt <= endOfDay).length;
    const totalPredictions = allPredictions.length;
    const predictionsToday = allPredictions.filter(p => p.createdAt >= startOfDay && p.createdAt <= endOfDay).length;
    const matchesToday = allMatches.filter(m => {
      const kickoff = new Date(m.kickoff);
      return kickoff >= startOfDay && kickoff <= endOfDay;
    }).length;
    const finishedMatchesToday = allMatches.filter(m => {
      const kickoff = new Date(m.kickoff);
      return kickoff >= startOfDay && kickoff <= endOfDay && m.status === "finished";
    }).length;

    const matchResults = allMatches
      .filter(m => {
        const kickoff = new Date(m.kickoff);
        return kickoff >= startOfDay && kickoff <= endOfDay && m.status === "finished";
      })
      .map(m => ({
        matchNumber: m.matchNumber,
        homeTeam: teamMap.get(m.homeTeamId)?.name || m.homeTeamId,
        awayTeam: teamMap.get(m.awayTeamId)?.name || m.awayTeamId,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        venue: m.venue || "",
      }))
      .sort((a, b) => a.matchNumber - b.matchNumber);

    const sortedUsers = allUsers
      .filter(u => !u.isAdmin)
      .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    const hasPoints = sortedUsers.some(u => (u.totalPoints ?? 0) > 0);
    const leaderboard = hasPoints
      ? sortedUsers.slice(0, 10).map((u, i) => {
          const preds = allPredictions.filter(p => p.userId === u.id && p.points !== null);
          return {
            rank: i + 1,
            name: u.name,
            points: u.totalPoints ?? 0,
            exact: preds.filter(p => p.pointsType === "exact").length,
            correct: preds.filter(p => p.pointsType === "correct").length,
          };
        })
      : [];

    const recentPredictions = allPredictions
      .filter(p => p.createdAt >= startOfDay && p.createdAt <= endOfDay)
      .slice(0, 15)
      .map(p => {
        const match = allMatches.find(m => m.id === p.matchId);
        const user = allUsers.find(u => u.id === p.userId);
        return {
          userName: user?.name || "غير معروف",
          homeTeam: match ? (teamMap.get(match.homeTeamId)?.name || "?") : "?",
          awayTeam: match ? (teamMap.get(match.awayTeamId)?.name || "?") : "?",
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          pointsType: p.pointsType,
        };
      });

    const allSyncLogs = await db.select().from(schema.syncLog);
    const syncLogs = allSyncLogs
      .filter(l => l.createdAt >= startOfDay && l.createdAt <= endOfDay)
      .slice(0, 10)
      .map(l => ({
        triggeredBy: l.triggeredBy,
        sourceApi: l.sourceApi,
        fetchedMatches: l.fetchedMatches ?? 0,
        newlyFinalized: l.newlyFinalized ?? 0,
        createdAt: l.createdAt ? new Date(l.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "",
      }));

    const dateStr = now.toLocaleDateString("ar-SA", {
      calendar: "gregory",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Riyadh",
    });

    const html = generateDailySummaryHTML({
      date: dateStr,
      totalUsers,
      newUsersToday,
      totalPredictions,
      predictionsToday,
      matchesToday,
      finishedMatchesToday,
      matchResults,
      leaderboard,
      syncLogs,
      recentPredictions,
    });

    const subject = `تقرير يومي - ملك التوقعات فيفا ٢٠٢٦ - ${dateStr}`;

    // Send email
    const emailConfig: EmailConfig = {
      apiKey: config.apiKey,
      mailjetApiKey: config.mailjetApiKey || undefined,
      mailjetSecretKey: config.mailjetSecretKey || undefined,
      fromEmail: config.fromEmail,
      fromName: config.fromName || "ملك التوقعات",
      recipients,
    };

    const result = await sendEmail(emailConfig, subject, html);

    // Log the email
    const { sql: drizzleSql } = await import("drizzle-orm");
    await db.insert(schema.emailLog).values({
      recipientCount: recipients.length,
      subject,
      status: result.success ? "sent" : "failed",
      messageId: result.messageId || null,
      error: result.error || null,
      sentBy: "admin",
    });

    // Update last sent time
    await db.update(schema.emailConfig)
      .set({ lastSentAt: now, updatedAt: now })
      .where(eq(schema.emailConfig.id, "default"));

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      recipients: recipients.length,
      message: result.success
        ? `تم إرسال التقرير إلى ${recipients.length} مستقبل`
        : `فشل الإرسال: ${result.error}`,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
