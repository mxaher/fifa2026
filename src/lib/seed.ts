import { getClient, schema } from "./db/index";
import { hashPassword } from "./auth";

const TEAMS_DATA = [
  // Group A
  { name: "USA", nameAr: "الولايات المتحدة", flag: "🇺🇸", groupLetter: "A", fifaRank: 13, region: "CONCACAF" },
  { name: "Morocco", nameAr: "المغرب", flag: "🇲🇦", groupLetter: "A", fifaRank: 14, region: "CAF" },
  { name: "Peru", nameAr: "بيرو", flag: "🇵🇪", groupLetter: "A", fifaRank: 35, region: "CONMEBOL" },
  { name: "Chile", nameAr: "تشيلي", flag: "🇨🇱", groupLetter: "A", fifaRank: 40, region: "CONMEBOL" },
  // Group B
  { name: "Argentina", nameAr: "الأرجنتين", flag: "🇦🇷", groupLetter: "B", fifaRank: 1, region: "CONMEBOL" },
  { name: "Colombia", nameAr: "كولومبيا", flag: "🇨🇴", groupLetter: "B", fifaRank: 12, region: "CONMEBOL" },
  { name: "Ecuador", nameAr: "الإكوادور", flag: "🇪🇨", groupLetter: "B", fifaRank: 30, region: "CONMEBOL" },
  { name: "Venezuela", nameAr: "فنزويلا", flag: "🇻🇪", groupLetter: "B", fifaRank: 45, region: "CONMEBOL" },
  // Group C
  { name: "France", nameAr: "فرنسا", flag: "🇫🇷", groupLetter: "C", fifaRank: 2, region: "UEFA" },
  { name: "Germany", nameAr: "ألمانيا", flag: "🇩🇪", groupLetter: "C", fifaRank: 16, region: "UEFA" },
  { name: "Netherlands", nameAr: "هولندا", flag: "🇳🇱", groupLetter: "C", fifaRank: 7, region: "UEFA" },
  { name: "Belgium", nameAr: "بلجيكا", flag: "🇧🇪", groupLetter: "C", fifaRank: 5, region: "UEFA" },
  // Group D
  { name: "Brazil", nameAr: "البرازيل", flag: "🇧🇷", groupLetter: "D", fifaRank: 6, region: "CONMEBOL" },
  { name: "Portugal", nameAr: "البرتغال", flag: "🇵🇹", groupLetter: "D", fifaRank: 9, region: "UEFA" },
  { name: "Italy", nameAr: "إيطاليا", flag: "🇮🇹", groupLetter: "D", fifaRank: 8, region: "UEFA" },
  { name: "Spain", nameAr: "إسبانيا", flag: "🇪🇸", groupLetter: "D", fifaRank: 3, region: "UEFA" },
  // Group E
  { name: "England", nameAr: "إنجلترا", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", groupLetter: "E", fifaRank: 4, region: "UEFA" },
  { name: "Croatia", nameAr: "كرواتيا", flag: "🇭🇷", groupLetter: "E", fifaRank: 10, region: "UEFA" },
  { name: "Serbia", nameAr: "صربيا", flag: "🇷🇸", groupLetter: "E", fifaRank: 33, region: "UEFA" },
  { name: "Denmark", nameAr: "الدنمارك", flag: "🇩🇰", groupLetter: "E", fifaRank: 21, region: "UEFA" },
  // Group F
  { name: "Mexico", nameAr: "المكسيك", flag: "🇲🇽", groupLetter: "F", fifaRank: 15, region: "CONCACAF" },
  { name: "Uruguay", nameAr: "الأوروغواي", flag: "🇺🇾", groupLetter: "F", fifaRank: 11, region: "CONMEBOL" },
  { name: "Paraguay", nameAr: "باراغواي", flag: "🇵🇾", groupLetter: "F", fifaRank: 50, region: "CONMEBOL" },
  { name: "Japan", nameAr: "اليابان", flag: "🇯🇵", groupLetter: "F", fifaRank: 18, region: "AFC" },
  // Group G
  { name: "South Korea", nameAr: "كوريا الجنوبية", flag: "🇰🇷", groupLetter: "G", fifaRank: 23, region: "AFC" },
  { name: "Saudi Arabia", nameAr: "السعودية", flag: "🇸🇦", groupLetter: "G", fifaRank: 53, region: "AFC" },
  { name: "Australia", nameAr: "أستراليا", flag: "🇦🇺", groupLetter: "G", fifaRank: 25, region: "AFC" },
  { name: "Canada", nameAr: "كندا", flag: "🇨🇦", groupLetter: "G", fifaRank: 47, region: "CONCACAF" },
  // Group H
  { name: "Switzerland", nameAr: "سويسرا", flag: "🇨🇭", groupLetter: "H", fifaRank: 19, region: "UEFA" },
  { name: "Austria", nameAr: "النمسا", flag: "🇦🇹", groupLetter: "H", fifaRank: 22, region: "UEFA" },
  { name: "Poland", nameAr: "بولندا", flag: "🇵🇱", groupLetter: "H", fifaRank: 28, region: "UEFA" },
  { name: "Sweden", nameAr: "السويد", flag: "🇸🇪", groupLetter: "H", fifaRank: 26, region: "UEFA" },
  // Group I
  { name: "Nigeria", nameAr: "نيجيريا", flag: "🇳🇬", groupLetter: "I", fifaRank: 31, region: "CAF" },
  { name: "Cameroon", nameAr: "الكاميرون", flag: "🇨🇲", groupLetter: "I", fifaRank: 38, region: "CAF" },
  { name: "Senegal", nameAr: "السنغال", flag: "🇸🇳", groupLetter: "I", fifaRank: 17, region: "CAF" },
  { name: "Ghana", nameAr: "غانا", flag: "🇬🇭", groupLetter: "I", fifaRank: 52, region: "CAF" },
  // Group J
  { name: "Turkey", nameAr: "تركيا", flag: "🇹🇷", groupLetter: "J", fifaRank: 34, region: "UEFA" },
  { name: "Czech Republic", nameAr: "التشيك", flag: "🇨🇿", groupLetter: "J", fifaRank: 36, region: "UEFA" },
  { name: "Romania", nameAr: "رومانيا", flag: "🇷🇴", groupLetter: "J", fifaRank: 42, region: "UEFA" },
  { name: "Greece", nameAr: "اليونان", flag: "🇬🇷", groupLetter: "J", fifaRank: 48, region: "UEFA" },
  // Group K
  { name: "Tunisia", nameAr: "تونس", flag: "🇹🇳", groupLetter: "K", fifaRank: 29, region: "CAF" },
  { name: "Algeria", nameAr: "الجزائر", flag: "🇩🇿", groupLetter: "K", fifaRank: 37, region: "CAF" },
  { name: "Egypt", nameAr: "مصر", flag: "🇪🇬", groupLetter: "K", fifaRank: 32, region: "CAF" },
  { name: "South Africa", nameAr: "جنوب أفريقيا", flag: "🇿🇦", groupLetter: "K", fifaRank: 55, region: "CAF" },
  // Group L
  { name: "Iran", nameAr: "إيران", flag: "🇮🇷", groupLetter: "L", fifaRank: 20, region: "AFC" },
  { name: "Uzbekistan", nameAr: "أوزبكستان", flag: "🇺🇿", groupLetter: "L", fifaRank: 58, region: "AFC" },
  { name: "Iraq", nameAr: "العراق", flag: "🇮🇶", groupLetter: "L", fifaRank: 59, region: "AFC" },
  { name: "Jordan", nameAr: "الأردن", flag: "🇯🇴", groupLetter: "L", fifaRank: 66, region: "AFC" },
];

const VENUES = [
  "SoFi Stadium, Los Angeles",
  "MetLife Stadium, New York",
  "AT&T Stadium, Dallas",
  "Hard Rock Stadium, Miami",
  "Estadio Azteca, Mexico City",
  "BMO Field, Toronto",
  "Lumen Field, Seattle",
  "Gillette Stadium, Boston",
  "Mercedes-Benz Stadium, Atlanta",
  "NRG Stadium, Houston",
  "Levi's Stadium, San Francisco",
  "Lincoln Financial Field, Philadelphia",
];

async function seed() {
  const db = getClient();

  console.log("🌱 Seeding teams...");
  const insertedTeams = await db.insert(schema.teams).values(
    TEAMS_DATA.map(t => ({ ...t }))
  ).returning();

  console.log(`✅ Inserted ${insertedTeams.length} teams`);

  // Generate group stage matches: each group has 4 teams, each plays the other 3 (6 matches per group)
  console.log("⚽ Generating matches...");
  const groups = TEAMS_DATA.reduce((acc, t) => {
    if (!acc[t.groupLetter]) acc[t.groupLetter] = [];
    acc[t.groupLetter].push(t);
    return acc;
  }, {} as Record<string, typeof TEAMS_DATA>);

  const matchesData: any[] = [];
  let matchNumber = 1;
  const baseDate = new Date("2026-06-11T18:00:00Z");
  let dayOffset = 0;
  let matchesPerDay = 0;

  for (const [groupLetter, groupTeams] of Object.entries(groups)) {
    // Round-robin: 6 matches per group
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        const homeTeam = insertedTeams.find(t => t.name === groupTeams[i].name)!;
        const awayTeam = insertedTeams.find(t => t.name === groupTeams[j].name)!;

        const kickoff = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000 + matchesPerDay * 4 * 60 * 60 * 1000);

        matchesData.push({
          matchNumber,
          stage: "group",
          groupLetter,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoff,
          status: "upcoming",
          venue: VENUES[matchNumber % VENUES.length],
        });

        matchNumber++;
        matchesPerDay++;
        if (matchesPerDay >= 4) {
          matchesPerDay = 0;
          dayOffset++;
        }
      }
    }
    // Ensure each group starts on a new day
    if (matchesPerDay > 0) {
      matchesPerDay = 0;
      dayOffset++;
    }
  }

  const insertedMatches = await db.insert(schema.matches).values(matchesData).returning();
  console.log(`✅ Inserted ${insertedMatches.length} matches`);

  // Create a demo user
  console.log("👤 Creating demo user...");
  const { hash, salt } = await hashPassword("demo123");
  await db.insert(schema.users).values({
    email: "demo@almarshad.com",
    name: "أحمد",
    passwordHash: hash,
    salt,
    avatarEmoji: "🏆",
    totalPoints: 0,
  });

  console.log("✅ Seed complete!");
}

seed().catch(console.error);
