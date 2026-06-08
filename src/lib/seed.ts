import { getClient, schema } from "./db/index";
import { hashPassword } from "./auth";

const TEAMS_DATA = [
  // Group A: Mexico, South Africa, South Korea, Czech Republic
  { id: "MEX", name: "Mexico", nameAr: "المكسيك", flag: "🇲🇽", groupLetter: "A", fifaRank: 14, region: "CONCACAF" },
  { id: "ZAF", name: "South Africa", nameAr: "جنوب أفريقيا", flag: "🇿🇦", groupLetter: "A", fifaRank: 47, region: "CAF" },
  { id: "KOR", name: "South Korea", nameAr: "كوريا الجنوبية", flag: "🇰🇷", groupLetter: "A", fifaRank: 23, region: "AFC" },
  { id: "CZE", name: "Czech Republic", nameAr: "التشيك", flag: "🇨🇿", groupLetter: "A", fifaRank: 38, region: "UEFA" },
  // Group B: Canada, Bosnia & Herzegovina, Qatar, Switzerland
  { id: "CAN", name: "Canada", nameAr: "كندا", flag: "🇨🇦", groupLetter: "B", fifaRank: 43, region: "CONCACAF" },
  { id: "BIH", name: "Bosnia & Herzegovina", nameAr: "البوسنة والهرسك", flag: "🇧🇦", groupLetter: "B", fifaRank: 63, region: "UEFA" },
  { id: "QAT", name: "Qatar", nameAr: "قطر", flag: "🇶🇦", groupLetter: "B", fifaRank: 37, region: "AFC" },
  { id: "CHE", name: "Switzerland", nameAr: "سويسرا", flag: "🇨🇭", groupLetter: "B", fifaRank: 19, region: "UEFA" },
  // Group C: Brazil, Morocco, Haiti, Scotland
  { id: "BRA", name: "Brazil", nameAr: "البرازيل", flag: "🇧🇷", groupLetter: "C", fifaRank: 5, region: "CONMEBOL" },
  { id: "MAR", name: "Morocco", nameAr: "المغرب", flag: "🇲🇦", groupLetter: "C", fifaRank: 12, region: "CAF" },
  { id: "HAI", name: "Haiti", nameAr: "هايتي", flag: "🇭🇹", groupLetter: "C", fifaRank: 83, region: "CONCACAF" },
  { id: "SCO", name: "Scotland", nameAr: "اسكتلندا", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", groupLetter: "C", fifaRank: 40, region: "UEFA" },
  // Group D: United States, Paraguay, Australia, Turkey
  { id: "USA", name: "United States", nameAr: "الولايات المتحدة", flag: "🇺🇸", groupLetter: "D", fifaRank: 2, region: "CONCACAF" },
  { id: "PAR", name: "Paraguay", nameAr: "باراغواي", flag: "🇵🇾", groupLetter: "D", fifaRank: 55, region: "CONMEBOL" },
  { id: "AUS", name: "Australia", nameAr: "أستراليا", flag: "🇦🇺", groupLetter: "D", fifaRank: 24, region: "AFC" },
  { id: "TUR", name: "Turkey", nameAr: "تركيا", flag: "🇹🇷", groupLetter: "D", fifaRank: 26, region: "UEFA" },
  // Group E: Germany, Curaçao, Ivory Coast, Ecuador
  { id: "GER", name: "Germany", nameAr: "ألمانيا", flag: "🇩🇪", groupLetter: "E", fifaRank: 11, region: "UEFA" },
  { id: "CUW", name: "Curaçao", nameAr: "كوراساو", flag: "🇨🇼", groupLetter: "E", fifaRank: 82, region: "CONCACAF" },
  { id: "CIV", name: "Ivory Coast", nameAr: "كوت ديفوار", flag: "🇨🇮", groupLetter: "E", fifaRank: 41, region: "CAF" },
  { id: "ECU", name: "Ecuador", nameAr: "الإكوادور", flag: "🇪🇨", groupLetter: "E", fifaRank: 32, region: "CONMEBOL" },
  // Group F: Netherlands, Japan, Sweden, Tunisia
  { id: "NED", name: "Netherlands", nameAr: "هولندا", flag: "🇳🇱", groupLetter: "F", fifaRank: 7, region: "UEFA" },
  { id: "JPN", name: "Japan", nameAr: "اليابان", flag: "🇯🇵", groupLetter: "F", fifaRank: 18, region: "AFC" },
  { id: "SWE", name: "Sweden", nameAr: "السويد", flag: "🇸🇪", groupLetter: "F", fifaRank: 33, region: "UEFA" },
  { id: "TUN", name: "Tunisia", nameAr: "تونس", flag: "🇹🇳", groupLetter: "F", fifaRank: 36, region: "CAF" },
  // Group G: Belgium, Egypt, Iran, New Zealand
  { id: "BEL", name: "Belgium", nameAr: "بلجيكا", flag: "🇧🇪", groupLetter: "G", fifaRank: 4, region: "UEFA" },
  { id: "EGY", name: "Egypt", nameAr: "مصر", flag: "🇪🇬", groupLetter: "G", fifaRank: 34, region: "CAF" },
  { id: "IRN", name: "Iran", nameAr: "إيران", flag: "🇮🇷", groupLetter: "G", fifaRank: 21, region: "AFC" },
  { id: "NZL", name: "New Zealand", nameAr: "نيوزيلندا", flag: "🇳🇿", groupLetter: "G", fifaRank: 93, region: "OFC" },
  // Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
  { id: "ESP", name: "Spain", nameAr: "إسبانيا", flag: "🇪🇸", groupLetter: "H", fifaRank: 8, region: "UEFA" },
  { id: "CPV", name: "Cape Verde", nameAr: "الرأس الأخضر", flag: "🇨🇻", groupLetter: "H", fifaRank: 71, region: "CAF" },
  { id: "KSA", name: "Saudi Arabia", nameAr: "السعودية", flag: "🇸🇦", groupLetter: "H", fifaRank: 53, region: "AFC" },
  { id: "URU", name: "Uruguay", nameAr: "أوروغواي", flag: "🇺🇾", groupLetter: "H", fifaRank: 15, region: "CONMEBOL" },
  // Group I: France, Senegal, Iraq, Norway
  { id: "FRA", name: "France", nameAr: "فرنسا", flag: "🇫🇷", groupLetter: "I", fifaRank: 3, region: "UEFA" },
  { id: "SEN", name: "Senegal", nameAr: "السنغال", flag: "🇸🇳", groupLetter: "I", fifaRank: 20, region: "CAF" },
  { id: "IRQ", name: "Iraq", nameAr: "العراق", flag: "🇮🇶", groupLetter: "I", fifaRank: 59, region: "AFC" },
  { id: "NOR", name: "Norway", nameAr: "النرويج", flag: "🇳🇴", groupLetter: "I", fifaRank: 42, region: "UEFA" },
  // Group J: Argentina, Algeria, Austria, Jordan
  { id: "ARG", name: "Argentina", nameAr: "الأرجنتين", flag: "🇦🇷", groupLetter: "J", fifaRank: 1, region: "CONMEBOL" },
  { id: "ALG", name: "Algeria", nameAr: "الجزائر", flag: "🇩🇿", groupLetter: "J", fifaRank: 44, region: "CAF" },
  { id: "AUT", name: "Austria", nameAr: "النمسا", flag: "🇦🇹", groupLetter: "J", fifaRank: 25, region: "UEFA" },
  { id: "JOR", name: "Jordan", nameAr: "الأردن", flag: "🇯🇴", groupLetter: "J", fifaRank: 70, region: "AFC" },
  // Group K: Portugal, DR Congo, Uzbekistan, Colombia
  { id: "POR", name: "Portugal", nameAr: "البرتغال", flag: "🇵🇹", groupLetter: "K", fifaRank: 6, region: "UEFA" },
  { id: "COD", name: "DR Congo", nameAr: "جمهورية الكونغو الديمقراطية", flag: "🇨🇩", groupLetter: "K", fifaRank: 46, region: "CAF" },
  { id: "UZB", name: "Uzbekistan", nameAr: "أوزبكستان", flag: "🇺🇿", groupLetter: "K", fifaRank: 57, region: "AFC" },
  { id: "COL", name: "Colombia", nameAr: "كولومبيا", flag: "🇨🇴", groupLetter: "K", fifaRank: 17, region: "CONMEBOL" },
  // Group L: England, Croatia, Ghana, Panama
  { id: "ENG", name: "England", nameAr: "إنجلترا", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", groupLetter: "L", fifaRank: 9, region: "UEFA" },
  { id: "CRO", name: "Croatia", nameAr: "كرواتيا", flag: "🇭🇷", groupLetter: "L", fifaRank: 10, region: "UEFA" },
  { id: "GHA", name: "Ghana", nameAr: "غانا", flag: "🇬🇭", groupLetter: "L", fifaRank: 60, region: "CAF" },
  { id: "PAN", name: "Panama", nameAr: "بنما", flag: "🇵🇦", groupLetter: "L", fifaRank: 61, region: "CONCACAF" },
];

const MATCHES_DATA = [
  // June 11 — Group A
  { matchNumber: 1, groupLetter: "A", homeTeamId: "MEX", awayTeamId: "ZAF", kickoff: new Date("2026-06-11T19:00:00Z"), venue: "Estadio Azteca" },
  { matchNumber: 2, groupLetter: "A", homeTeamId: "KOR", awayTeamId: "CZE", kickoff: new Date("2026-06-12T02:00:00Z"), venue: "Estadio Akron" },
  // June 12 — Group B + Group D
  { matchNumber: 3, groupLetter: "B", homeTeamId: "CAN", awayTeamId: "BIH", kickoff: new Date("2026-06-12T19:00:00Z"), venue: "BMO Field" },
  { matchNumber: 4, groupLetter: "D", homeTeamId: "USA", awayTeamId: "PAR", kickoff: new Date("2026-06-13T01:00:00Z"), venue: "SoFi Stadium" },
  // June 13 — Group C + Group D + Group B
  { matchNumber: 5, groupLetter: "C", homeTeamId: "BRA", awayTeamId: "MAR", kickoff: new Date("2026-06-13T22:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 6, groupLetter: "D", homeTeamId: "AUS", awayTeamId: "TUR", kickoff: new Date("2026-06-14T04:00:00Z"), venue: "BC Place" },
  { matchNumber: 7, groupLetter: "C", homeTeamId: "HAI", awayTeamId: "SCO", kickoff: new Date("2026-06-13T22:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 8, groupLetter: "B", homeTeamId: "QAT", awayTeamId: "CHE", kickoff: new Date("2026-06-13T19:00:00Z"), venue: "Levi's Stadium" },
  // June 14 — Group E + Group F
  { matchNumber: 9, groupLetter: "E", homeTeamId: "GER", awayTeamId: "CUW", kickoff: new Date("2026-06-14T17:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 10, groupLetter: "E", homeTeamId: "CIV", awayTeamId: "ECU", kickoff: new Date("2026-06-14T23:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 11, groupLetter: "F", homeTeamId: "NED", awayTeamId: "JPN", kickoff: new Date("2026-06-14T20:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 12, groupLetter: "F", homeTeamId: "SWE", awayTeamId: "TUN", kickoff: new Date("2026-06-15T02:00:00Z"), venue: "Estadio BBVA" },
  // June 15 — Group H + Group G
  { matchNumber: 13, groupLetter: "H", homeTeamId: "ESP", awayTeamId: "CPV", kickoff: new Date("2026-06-15T16:00:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 14, groupLetter: "H", homeTeamId: "KSA", awayTeamId: "URU", kickoff: new Date("2026-06-15T22:00:00Z"), venue: "Mercedes-Benz Stadium" },
  { matchNumber: 15, groupLetter: "G", homeTeamId: "BEL", awayTeamId: "EGY", kickoff: new Date("2026-06-15T19:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 16, groupLetter: "G", homeTeamId: "IRN", awayTeamId: "NZL", kickoff: new Date("2026-06-16T01:00:00Z"), venue: "Lumen Field" },
  // June 16 — Group I + Group J
  { matchNumber: 17, groupLetter: "I", homeTeamId: "FRA", awayTeamId: "SEN", kickoff: new Date("2026-06-16T19:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 18, groupLetter: "I", homeTeamId: "IRQ", awayTeamId: "NOR", kickoff: new Date("2026-06-16T22:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 19, groupLetter: "J", homeTeamId: "ARG", awayTeamId: "ALG", kickoff: new Date("2026-06-17T01:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 20, groupLetter: "J", homeTeamId: "AUT", awayTeamId: "JOR", kickoff: new Date("2026-06-17T04:00:00Z"), venue: "Levi's Stadium" },
  // June 17 — Group L + Group K
  { matchNumber: 21, groupLetter: "L", homeTeamId: "ENG", awayTeamId: "CRO", kickoff: new Date("2026-06-17T20:00:00Z"), venue: "BMO Field" },
  { matchNumber: 22, groupLetter: "L", homeTeamId: "GHA", awayTeamId: "PAN", kickoff: new Date("2026-06-17T23:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 23, groupLetter: "K", homeTeamId: "POR", awayTeamId: "COD", kickoff: new Date("2026-06-17T17:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 24, groupLetter: "K", homeTeamId: "UZB", awayTeamId: "COL", kickoff: new Date("2026-06-18T02:00:00Z"), venue: "Estadio Azteca" },
  // June 18 — Group A + Group B
  { matchNumber: 25, groupLetter: "A", homeTeamId: "CZE", awayTeamId: "ZAF", kickoff: new Date("2026-06-18T16:00:00Z"), venue: "Mercedes-Benz Stadium" },
  { matchNumber: 26, groupLetter: "B", homeTeamId: "CHE", awayTeamId: "BIH", kickoff: new Date("2026-06-18T19:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 27, groupLetter: "B", homeTeamId: "CAN", awayTeamId: "QAT", kickoff: new Date("2026-06-18T22:00:00Z"), venue: "BC Place" },
  { matchNumber: 28, groupLetter: "A", homeTeamId: "MEX", awayTeamId: "KOR", kickoff: new Date("2026-06-19T01:00:00Z"), venue: "Estadio Akron" },
  // June 19 — Group C + Group D
  { matchNumber: 29, groupLetter: "C", homeTeamId: "BRA", awayTeamId: "HAI", kickoff: new Date("2026-06-20T01:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 30, groupLetter: "C", homeTeamId: "SCO", awayTeamId: "MAR", kickoff: new Date("2026-06-19T22:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 31, groupLetter: "D", homeTeamId: "TUR", awayTeamId: "PAR", kickoff: new Date("2026-06-20T04:00:00Z"), venue: "Levi's Stadium" },
  { matchNumber: 32, groupLetter: "D", homeTeamId: "USA", awayTeamId: "AUS", kickoff: new Date("2026-06-19T19:00:00Z"), venue: "Lumen Field" },
  // June 20 — Group E + Group F
  { matchNumber: 33, groupLetter: "E", homeTeamId: "GER", awayTeamId: "CIV", kickoff: new Date("2026-06-20T20:00:00Z"), venue: "BMO Field" },
  { matchNumber: 34, groupLetter: "E", homeTeamId: "ECU", awayTeamId: "CUW", kickoff: new Date("2026-06-21T00:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 35, groupLetter: "F", homeTeamId: "NED", awayTeamId: "SWE", kickoff: new Date("2026-06-20T17:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 36, groupLetter: "F", homeTeamId: "TUN", awayTeamId: "JPN", kickoff: new Date("2026-06-21T04:00:00Z"), venue: "Estadio BBVA" },
  // June 21 — Group H + Group G
  { matchNumber: 37, groupLetter: "H", homeTeamId: "ESP", awayTeamId: "KSA", kickoff: new Date("2026-06-21T16:00:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 38, groupLetter: "H", homeTeamId: "URU", awayTeamId: "CPV", kickoff: new Date("2026-06-21T22:00:00Z"), venue: "Mercedes-Benz Stadium" },
  { matchNumber: 39, groupLetter: "G", homeTeamId: "BEL", awayTeamId: "IRN", kickoff: new Date("2026-06-21T19:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 40, groupLetter: "G", homeTeamId: "NZL", awayTeamId: "EGY", kickoff: new Date("2026-06-22T01:00:00Z"), venue: "BC Place" },
  // June 22 — Group I + Group J
  { matchNumber: 41, groupLetter: "I", homeTeamId: "FRA", awayTeamId: "IRQ", kickoff: new Date("2026-06-22T21:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 42, groupLetter: "I", homeTeamId: "NOR", awayTeamId: "SEN", kickoff: new Date("2026-06-23T00:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 43, groupLetter: "J", homeTeamId: "ARG", awayTeamId: "AUT", kickoff: new Date("2026-06-22T17:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 44, groupLetter: "J", homeTeamId: "JOR", awayTeamId: "ALG", kickoff: new Date("2026-06-23T03:00:00Z"), venue: "Levi's Stadium" },
  // June 23 — Group L + Group K
  { matchNumber: 45, groupLetter: "L", homeTeamId: "ENG", awayTeamId: "GHA", kickoff: new Date("2026-06-23T20:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 46, groupLetter: "L", homeTeamId: "PAN", awayTeamId: "CRO", kickoff: new Date("2026-06-23T23:00:00Z"), venue: "BMO Field" },
  { matchNumber: 47, groupLetter: "K", homeTeamId: "POR", awayTeamId: "UZB", kickoff: new Date("2026-06-23T17:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 48, groupLetter: "K", homeTeamId: "COL", awayTeamId: "COD", kickoff: new Date("2026-06-24T02:00:00Z"), venue: "Estadio Akron" },
  // June 24 — Group C + Group B + Group A
  { matchNumber: 49, groupLetter: "C", homeTeamId: "SCO", awayTeamId: "BRA", kickoff: new Date("2026-06-24T22:00:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 50, groupLetter: "C", homeTeamId: "MAR", awayTeamId: "HAI", kickoff: new Date("2026-06-24T22:00:00Z"), venue: "Mercedes-Benz Stadium" },
  { matchNumber: 51, groupLetter: "B", homeTeamId: "CHE", awayTeamId: "CAN", kickoff: new Date("2026-06-24T19:00:00Z"), venue: "BC Place" },
  { matchNumber: 52, groupLetter: "B", homeTeamId: "BIH", awayTeamId: "QAT", kickoff: new Date("2026-06-24T19:00:00Z"), venue: "Lumen Field" },
  { matchNumber: 53, groupLetter: "A", homeTeamId: "CZE", awayTeamId: "MEX", kickoff: new Date("2026-06-25T01:00:00Z"), venue: "Estadio Azteca" },
  { matchNumber: 54, groupLetter: "A", homeTeamId: "ZAF", awayTeamId: "KOR", kickoff: new Date("2026-06-25T01:00:00Z"), venue: "Estadio BBVA" },
  // June 25 — Group E + Group F + Group D
  { matchNumber: 55, groupLetter: "E", homeTeamId: "ECU", awayTeamId: "GER", kickoff: new Date("2026-06-26T00:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 56, groupLetter: "E", homeTeamId: "CUW", awayTeamId: "CIV", kickoff: new Date("2026-06-25T20:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 57, groupLetter: "F", homeTeamId: "TUN", awayTeamId: "NED", kickoff: new Date("2026-06-25T23:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 58, groupLetter: "F", homeTeamId: "JPN", awayTeamId: "SWE", kickoff: new Date("2026-06-25T23:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 59, groupLetter: "D", homeTeamId: "TUR", awayTeamId: "USA", kickoff: new Date("2026-06-26T02:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 60, groupLetter: "D", homeTeamId: "PAR", awayTeamId: "AUS", kickoff: new Date("2026-06-26T02:00:00Z"), venue: "Levi's Stadium" },
  // June 26 — Group I + Group G + Group H
  { matchNumber: 61, groupLetter: "I", homeTeamId: "NOR", awayTeamId: "FRA", kickoff: new Date("2026-06-26T19:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 62, groupLetter: "I", homeTeamId: "SEN", awayTeamId: "IRQ", kickoff: new Date("2026-06-26T19:00:00Z"), venue: "BMO Field" },
  { matchNumber: 63, groupLetter: "G", homeTeamId: "NZL", awayTeamId: "BEL", kickoff: new Date("2026-06-27T03:00:00Z"), venue: "Lumen Field" },
  { matchNumber: 64, groupLetter: "G", homeTeamId: "EGY", awayTeamId: "IRN", kickoff: new Date("2026-06-27T03:00:00Z"), venue: "BC Place" },
  { matchNumber: 65, groupLetter: "H", homeTeamId: "URU", awayTeamId: "ESP", kickoff: new Date("2026-06-27T00:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 66, groupLetter: "H", homeTeamId: "CPV", awayTeamId: "KSA", kickoff: new Date("2026-06-27T00:00:00Z"), venue: "Estadio Akron" },
  // June 27 — Group L + Group J + Group K
  { matchNumber: 67, groupLetter: "L", homeTeamId: "PAN", awayTeamId: "ENG", kickoff: new Date("2026-06-27T21:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 68, groupLetter: "L", homeTeamId: "CRO", awayTeamId: "GHA", kickoff: new Date("2026-06-27T21:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 69, groupLetter: "J", homeTeamId: "JOR", awayTeamId: "ARG", kickoff: new Date("2026-06-28T02:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 70, groupLetter: "J", homeTeamId: "ALG", awayTeamId: "AUT", kickoff: new Date("2026-06-28T02:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 71, groupLetter: "K", homeTeamId: "COL", awayTeamId: "POR", kickoff: new Date("2026-06-27T23:30:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 72, groupLetter: "K", homeTeamId: "COD", awayTeamId: "UZB", kickoff: new Date("2026-06-27T23:30:00Z"), venue: "Mercedes-Benz Stadium" },
];

async function seed() {
  const db = getClient();

  console.log("🌱 Seeding teams...");
  const insertedTeams = await db.insert(schema.teams).values(
    TEAMS_DATA.map(t => ({ ...t }))
  ).returning();

  console.log(`✅ Inserted ${insertedTeams.length} teams`);

  console.log("⚽ Inserting matches...");
  const insertedMatches = await db.insert(schema.matches).values(
    MATCHES_DATA.map(m => ({
      ...m,
      stage: "group",
      status: "upcoming",
    }))
  ).returning();

  console.log(`✅ Inserted ${insertedMatches.length} matches`);

  console.log("✅ Seed complete!");
}

seed().catch(console.error);
