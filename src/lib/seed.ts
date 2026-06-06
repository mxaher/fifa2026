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
  // Group H: Portugal, Croatia, Uzbekistan, Algeria
  { id: "POR", name: "Portugal", nameAr: "البرتغال", flag: "🇵🇹", groupLetter: "H", fifaRank: 6, region: "UEFA" },
  { id: "CRO", name: "Croatia", nameAr: "كرواتيا", flag: "🇭🇷", groupLetter: "H", fifaRank: 10, region: "UEFA" },
  { id: "UZB", name: "Uzbekistan", nameAr: "أوزبكستان", flag: "🇺🇿", groupLetter: "H", fifaRank: 57, region: "AFC" },
  { id: "ALG", name: "Algeria", nameAr: "الجزائر", flag: "🇩🇿", groupLetter: "H", fifaRank: 44, region: "CAF" },
  // Group I: France, Uruguay, Panama, Iraq
  { id: "FRA", name: "France", nameAr: "فرنسا", flag: "🇫🇷", groupLetter: "I", fifaRank: 3, region: "UEFA" },
  { id: "URU", name: "Uruguay", nameAr: "أوروغواي", flag: "🇺🇾", groupLetter: "I", fifaRank: 15, region: "CONMEBOL" },
  { id: "PAN", name: "Panama", nameAr: "بنما", flag: "🇵🇦", groupLetter: "I", fifaRank: 61, region: "CONCACAF" },
  { id: "IRQ", name: "Iraq", nameAr: "العراق", flag: "🇮🇶", groupLetter: "I", fifaRank: 59, region: "AFC" },
  // Group J: Argentina, Colombia, Ghana, Jordan
  { id: "ARG", name: "Argentina", nameAr: "الأرجنتين", flag: "🇦🇷", groupLetter: "J", fifaRank: 1, region: "CONMEBOL" },
  { id: "COL", name: "Colombia", nameAr: "كولومبيا", flag: "🇨🇴", groupLetter: "J", fifaRank: 17, region: "CONMEBOL" },
  { id: "GHA", name: "Ghana", nameAr: "غانا", flag: "🇬🇭", groupLetter: "J", fifaRank: 60, region: "CAF" },
  { id: "JOR", name: "Jordan", nameAr: "الأردن", flag: "🇯🇴", groupLetter: "J", fifaRank: 70, region: "AFC" },
  // Group K: Spain, DR Congo, Senegal, Norway
  { id: "ESP", name: "Spain", nameAr: "إسبانيا", flag: "🇪🇸", groupLetter: "K", fifaRank: 8, region: "UEFA" },
  { id: "COD", name: "DR Congo", nameAr: "جمهورية الكونغو الديمقراطية", flag: "🇨🇩", groupLetter: "K", fifaRank: 46, region: "CAF" },
  { id: "SEN", name: "Senegal", nameAr: "السنغال", flag: "🇸🇳", groupLetter: "K", fifaRank: 20, region: "CAF" },
  { id: "NOR", name: "Norway", nameAr: "النرويج", flag: "🇳🇴", groupLetter: "K", fifaRank: 42, region: "UEFA" },
  // Group L: England, Saudi Arabia, Cape Verde, Burkina Faso
  { id: "ENG", name: "England", nameAr: "إنجلترا", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", groupLetter: "L", fifaRank: 9, region: "UEFA" },
  { id: "KSA", name: "Saudi Arabia", nameAr: "السعودية", flag: "🇸🇦", groupLetter: "L", fifaRank: 53, region: "AFC" },
  { id: "CPV", name: "Cape Verde", nameAr: "الرأس الأخضر", flag: "🇨🇻", groupLetter: "L", fifaRank: 71, region: "CAF" },
  { id: "BFA", name: "Burkina Faso", nameAr: "بوركينافاسو", flag: "🇧🇫", groupLetter: "L", fifaRank: 67, region: "CAF" },
];

const MATCHES_DATA = [
  // Group A
  { matchNumber: 1, groupLetter: "A", homeTeamId: "MEX", awayTeamId: "ZAF", kickoff: new Date("2026-06-11T15:00:00Z"), venue: "Estadio Azteca" },
  { matchNumber: 2, groupLetter: "A", homeTeamId: "KOR", awayTeamId: "CZE", kickoff: new Date("2026-06-11T21:00:00Z"), venue: "Estadio Akron" },
  { matchNumber: 25, groupLetter: "A", homeTeamId: "CZE", awayTeamId: "ZAF", kickoff: new Date("2026-06-18T15:00:00Z"), venue: "Mercedes-Benz Stadium" },
  { matchNumber: 28, groupLetter: "A", homeTeamId: "MEX", awayTeamId: "KOR", kickoff: new Date("2026-06-18T21:00:00Z"), venue: "Estadio Akron" },
  { matchNumber: 53, groupLetter: "A", homeTeamId: "CZE", awayTeamId: "MEX", kickoff: new Date("2026-06-24T18:00:00Z"), venue: "Estadio Azteca" },
  { matchNumber: 54, groupLetter: "A", homeTeamId: "ZAF", awayTeamId: "KOR", kickoff: new Date("2026-06-24T18:00:00Z"), venue: "Estadio BBVA" },
  // Group B
  { matchNumber: 3, groupLetter: "B", homeTeamId: "CAN", awayTeamId: "BIH", kickoff: new Date("2026-06-12T16:00:00Z"), venue: "BMO Field" },
  { matchNumber: 8, groupLetter: "B", homeTeamId: "QAT", awayTeamId: "CHE", kickoff: new Date("2026-06-12T19:00:00Z"), venue: "Levi's Stadium" },
  { matchNumber: 26, groupLetter: "B", homeTeamId: "CHE", awayTeamId: "BIH", kickoff: new Date("2026-06-18T16:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 27, groupLetter: "B", homeTeamId: "CAN", awayTeamId: "QAT", kickoff: new Date("2026-06-18T19:00:00Z"), venue: "BC Place" },
  { matchNumber: 51, groupLetter: "B", homeTeamId: "CHE", awayTeamId: "CAN", kickoff: new Date("2026-06-24T13:00:00Z"), venue: "BC Place" },
  { matchNumber: 52, groupLetter: "B", homeTeamId: "BIH", awayTeamId: "QAT", kickoff: new Date("2026-06-24T13:00:00Z"), venue: "Lumen Field" },
  // Group C
  { matchNumber: 5, groupLetter: "C", homeTeamId: "HAI", awayTeamId: "SCO", kickoff: new Date("2026-06-13T16:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 7, groupLetter: "C", homeTeamId: "BRA", awayTeamId: "MAR", kickoff: new Date("2026-06-13T21:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 29, groupLetter: "C", homeTeamId: "BRA", awayTeamId: "HAI", kickoff: new Date("2026-06-19T13:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 30, groupLetter: "C", homeTeamId: "SCO", awayTeamId: "MAR", kickoff: new Date("2026-06-19T16:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 49, groupLetter: "C", homeTeamId: "SCO", awayTeamId: "BRA", kickoff: new Date("2026-06-24T20:00:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 50, groupLetter: "C", homeTeamId: "MAR", awayTeamId: "HAI", kickoff: new Date("2026-06-24T20:00:00Z"), venue: "Mercedes-Benz Stadium" },
  // Group D
  { matchNumber: 4, groupLetter: "D", homeTeamId: "USA", awayTeamId: "PAR", kickoff: new Date("2026-06-12T22:30:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 6, groupLetter: "D", homeTeamId: "AUS", awayTeamId: "TUR", kickoff: new Date("2026-06-12T19:00:00Z"), venue: "BC Place" },
  { matchNumber: 31, groupLetter: "D", homeTeamId: "TUR", awayTeamId: "PAR", kickoff: new Date("2026-06-19T21:00:00Z"), venue: "Levi's Stadium" },
  { matchNumber: 32, groupLetter: "D", homeTeamId: "USA", awayTeamId: "AUS", kickoff: new Date("2026-06-19T22:30:00Z"), venue: "Lumen Field" },
  { matchNumber: 59, groupLetter: "D", homeTeamId: "TUR", awayTeamId: "USA", kickoff: new Date("2026-06-25T20:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 60, groupLetter: "D", homeTeamId: "PAR", awayTeamId: "AUS", kickoff: new Date("2026-06-25T20:00:00Z"), venue: "Levi's Stadium" },
  // Group E
  { matchNumber: 9, groupLetter: "E", homeTeamId: "CIV", awayTeamId: "ECU", kickoff: new Date("2026-06-14T16:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 10, groupLetter: "E", homeTeamId: "GER", awayTeamId: "CUW", kickoff: new Date("2026-06-14T19:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 33, groupLetter: "E", homeTeamId: "GER", awayTeamId: "CIV", kickoff: new Date("2026-06-20T13:00:00Z"), venue: "BMO Field" },
  { matchNumber: 34, groupLetter: "E", homeTeamId: "ECU", awayTeamId: "CUW", kickoff: new Date("2026-06-20T16:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 55, groupLetter: "E", homeTeamId: "CUW", awayTeamId: "CIV", kickoff: new Date("2026-06-25T15:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 56, groupLetter: "E", homeTeamId: "ECU", awayTeamId: "GER", kickoff: new Date("2026-06-25T15:00:00Z"), venue: "MetLife Stadium" },
  // Group F
  { matchNumber: 11, groupLetter: "F", homeTeamId: "NED", awayTeamId: "JPN", kickoff: new Date("2026-06-14T21:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 12, groupLetter: "F", homeTeamId: "SWE", awayTeamId: "TUN", kickoff: new Date("2026-06-14T18:00:00Z"), venue: "Estadio BBVA" },
  { matchNumber: 35, groupLetter: "F", homeTeamId: "NED", awayTeamId: "SWE", kickoff: new Date("2026-06-20T19:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 36, groupLetter: "F", homeTeamId: "TUN", awayTeamId: "JPN", kickoff: new Date("2026-06-20T18:00:00Z"), venue: "Estadio BBVA" },
  { matchNumber: 57, groupLetter: "F", homeTeamId: "JPN", awayTeamId: "SWE", kickoff: new Date("2026-06-25T18:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 58, groupLetter: "F", homeTeamId: "TUN", awayTeamId: "NED", kickoff: new Date("2026-06-25T18:00:00Z"), venue: "Arrowhead Stadium" },
  // Group G
  { matchNumber: 15, groupLetter: "G", homeTeamId: "IRN", awayTeamId: "NZL", kickoff: new Date("2026-06-15T13:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 16, groupLetter: "G", homeTeamId: "BEL", awayTeamId: "EGY", kickoff: new Date("2026-06-15T16:00:00Z"), venue: "Lumen Field" },
  { matchNumber: 37, groupLetter: "G", homeTeamId: "BEL", awayTeamId: "IRN", kickoff: new Date("2026-06-21T13:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 38, groupLetter: "G", homeTeamId: "NZL", awayTeamId: "EGY", kickoff: new Date("2026-06-21T16:00:00Z"), venue: "BMO Field" },
  { matchNumber: 61, groupLetter: "G", homeTeamId: "IRN", awayTeamId: "BEL", kickoff: new Date("2026-06-26T13:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 62, groupLetter: "G", homeTeamId: "EGY", awayTeamId: "NZL", kickoff: new Date("2026-06-26T13:00:00Z"), venue: "Arrowhead Stadium" },
  // Group H
  { matchNumber: 13, groupLetter: "H", homeTeamId: "UZB", awayTeamId: "ALG", kickoff: new Date("2026-06-15T16:00:00Z"), venue: "Lincoln Financial Field" },
  { matchNumber: 14, groupLetter: "H", homeTeamId: "POR", awayTeamId: "CRO", kickoff: new Date("2026-06-15T19:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 39, groupLetter: "H", homeTeamId: "POR", awayTeamId: "UZB", kickoff: new Date("2026-06-21T18:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 40, groupLetter: "H", homeTeamId: "CRO", awayTeamId: "ALG", kickoff: new Date("2026-06-21T21:00:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 63, groupLetter: "H", homeTeamId: "UZB", awayTeamId: "POR", kickoff: new Date("2026-06-26T16:00:00Z"), venue: "BMO Field" },
  { matchNumber: 64, groupLetter: "H", homeTeamId: "ALG", awayTeamId: "CRO", kickoff: new Date("2026-06-26T16:00:00Z"), venue: "NRG Stadium" },
  // Group I
  { matchNumber: 17, groupLetter: "I", homeTeamId: "PAN", awayTeamId: "IRQ", kickoff: new Date("2026-06-16T14:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 18, groupLetter: "I", homeTeamId: "FRA", awayTeamId: "URU", kickoff: new Date("2026-06-16T17:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 41, groupLetter: "I", homeTeamId: "FRA", awayTeamId: "PAN", kickoff: new Date("2026-06-22T14:00:00Z"), venue: "Estadio Azteca" },
  { matchNumber: 42, groupLetter: "I", homeTeamId: "IRQ", awayTeamId: "URU", kickoff: new Date("2026-06-22T17:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 65, groupLetter: "I", homeTeamId: "IRQ", awayTeamId: "FRA", kickoff: new Date("2026-06-26T19:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 66, groupLetter: "I", homeTeamId: "URU", awayTeamId: "PAN", kickoff: new Date("2026-06-26T19:00:00Z"), venue: "Gillette Stadium" },
  // Group J
  { matchNumber: 19, groupLetter: "J", homeTeamId: "GHA", awayTeamId: "JOR", kickoff: new Date("2026-06-16T14:00:00Z"), venue: "Estadio Akron" },
  { matchNumber: 20, groupLetter: "J", homeTeamId: "ARG", awayTeamId: "COL", kickoff: new Date("2026-06-16T20:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 43, groupLetter: "J", homeTeamId: "ARG", awayTeamId: "GHA", kickoff: new Date("2026-06-22T19:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 44, groupLetter: "J", homeTeamId: "JOR", awayTeamId: "COL", kickoff: new Date("2026-06-22T13:00:00Z"), venue: "Estadio BBVA" },
  { matchNumber: 67, groupLetter: "J", homeTeamId: "JOR", awayTeamId: "ARG", kickoff: new Date("2026-06-27T18:00:00Z"), venue: "Hard Rock Stadium" },
  { matchNumber: 68, groupLetter: "J", homeTeamId: "COL", awayTeamId: "GHA", kickoff: new Date("2026-06-27T18:00:00Z"), venue: "BC Place" },
  // Group K
  { matchNumber: 21, groupLetter: "K", homeTeamId: "SEN", awayTeamId: "NOR", kickoff: new Date("2026-06-17T15:00:00Z"), venue: "Lumen Field" },
  { matchNumber: 22, groupLetter: "K", homeTeamId: "ESP", awayTeamId: "COD", kickoff: new Date("2026-06-17T18:00:00Z"), venue: "AT&T Stadium" },
  { matchNumber: 45, groupLetter: "K", homeTeamId: "ESP", awayTeamId: "SEN", kickoff: new Date("2026-06-23T15:00:00Z"), venue: "Estadio Azteca" },
  { matchNumber: 46, groupLetter: "K", homeTeamId: "NOR", awayTeamId: "COD", kickoff: new Date("2026-06-23T18:00:00Z"), venue: "Gillette Stadium" },
  { matchNumber: 69, groupLetter: "K", homeTeamId: "NOR", awayTeamId: "ESP", kickoff: new Date("2026-06-27T15:00:00Z"), venue: "BC Place" },
  { matchNumber: 70, groupLetter: "K", homeTeamId: "COD", awayTeamId: "SEN", kickoff: new Date("2026-06-27T15:00:00Z"), venue: "Estadio Akron" },
  // Group L
  { matchNumber: 23, groupLetter: "L", homeTeamId: "CPV", awayTeamId: "BFA", kickoff: new Date("2026-06-17T13:00:00Z"), venue: "Estadio BBVA" },
  { matchNumber: 24, groupLetter: "L", homeTeamId: "ENG", awayTeamId: "KSA", kickoff: new Date("2026-06-17T20:00:00Z"), venue: "NRG Stadium" },
  { matchNumber: 47, groupLetter: "L", homeTeamId: "ENG", awayTeamId: "CPV", kickoff: new Date("2026-06-23T13:00:00Z"), venue: "Arrowhead Stadium" },
  { matchNumber: 48, groupLetter: "L", homeTeamId: "BFA", awayTeamId: "KSA", kickoff: new Date("2026-06-23T20:00:00Z"), venue: "SoFi Stadium" },
  { matchNumber: 71, groupLetter: "L", homeTeamId: "BFA", awayTeamId: "ENG", kickoff: new Date("2026-06-27T20:00:00Z"), venue: "MetLife Stadium" },
  { matchNumber: 72, groupLetter: "L", homeTeamId: "KSA", awayTeamId: "CPV", kickoff: new Date("2026-06-27T20:00:00Z"), venue: "Hard Rock Stadium" },
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
