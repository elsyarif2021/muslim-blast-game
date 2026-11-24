import type { BlockColor, GameLevelConfig, WorldConfig } from '../types/index.ts';
import { ALL_BLOCK_COLORS } from '../game/puzzleLogic.ts';

export const WORLDS: WorldConfig[] = [
  {
    id: 1,
    name: 'Taman Akhlak',
    tagline: 'Melatih kejujuran, kesabaran, dan sopan santun bersama Mimo.',
    themeColor: '#10B981',
    accentColor: '#F5C542',
    badgeName: 'Penjaga Taman Akhlak',
    unlockRequirementStars: 0,
  },
  {
    id: 2,
    name: 'Desa Hijaiyah',
    tagline: 'Mengenal huruf Hijaiyah dan dasar bacaan Arab dengan ceria.',
    themeColor: '#38BDF8',
    accentColor: '#F5C542',
    badgeName: 'Sahabat Hijaiyah',
    unlockRequirementStars: 12,
  },
  {
    id: 3,
    name: 'Kota Rukun Islam',
    tagline: 'Menjelajahi lima pilar utama keislaman dalam kehidupan sehari-hari.',
    themeColor: '#064E3B',
    accentColor: '#F5C542',
    badgeName: 'Pilar Kota Islam',
    unlockRequirementStars: 28,
  },
  {
    id: 4,
    name: 'Lembah Rukun Iman',
    tagline: 'Menguatkan keyakinan kepada Allah, malaikat, kitab, rasul, hari akhir, dan takdir.',
    themeColor: '#8B5CF6',
    accentColor: '#FDE047',
    badgeName: 'Penjelajah Iman',
    unlockRequirementStars: 48,
  },
  {
    id: 5,
    name: 'Oasis Ramadhan',
    tagline: 'Memahami keutamaan puasa, berbagi takjil, dan kedisiplinan ibadah.',
    themeColor: '#F59E0B',
    accentColor: '#10B981',
    badgeName: 'Bintang Ramadhan',
    unlockRequirementStars: 72,
  },
  {
    id: 6,
    name: 'Perpustakaan Hikmah',
    tagline: 'Menyelami sejarah peradaban Islam dan kisah teladan para Nabi.',
    themeColor: '#0284C7',
    accentColor: '#F5C542',
    badgeName: 'Pustakawan Hikmah',
    unlockRequirementStars: 96,
  },
  {
    id: 7,
    name: 'Taman Persaudaraan',
    tagline: 'Menumbuhkan ukhuwah, zakat, sedekah, dan kepedulian sosial.',
    themeColor: '#EC4899',
    accentColor: '#10B981',
    badgeName: 'Duta Persaudaraan',
    unlockRequirementStars: 120,
  },
  {
    id: 8,
    name: 'Istana Ilmu',
    tagline: 'Puncak petualangan ilmu pengetahuan Islam dan tantangan puzzle mahir.',
    themeColor: '#D97706',
    accentColor: '#064E3B',
    badgeName: 'Cendekia Istana Ilmu',
    unlockRequirementStars: 150,
  },
];

const QUIZ_CATEGORY_BY_WORLD: Record<number, string> = {
  1: 'Akhlak Terpuji',
  2: 'Adab Sehari-hari',
  3: 'Rukun Islam',
  4: 'Rukun Iman',
  5: 'Puasa',
  6: 'Sejarah Islam',
  7: 'Zakat',
  8: 'Haji',
};

const LEVEL_FLAVOR_TITLES = [
  'Langkah Awal',
  'Cahaya Pagi',
  'Jembatan Kebaikan',
  'Lentera Ilmu',
  'Kebun Berkah',
  'Semangat Jujur',
  'Embunan Hikmah',
  'Pelita Hati',
  'Gerbang Sabar',
  'Taman Syukur',
  'Menara Iman',
  'Bintang Amanah',
  'Jalan Persahabatan',
  'Mutiara Adab',
  'Kubah Harmoni',
  'Puncak Ikhtiar',
  'Cakrawala Damai',
  'Gerbang Taat',
  'Ujian Cendekia',
  'Mahkota Dunia',
];

export function generateDefaultLevels(): GameLevelConfig[] {
  const levels: GameLevelConfig[] = [];
  for (const world of WORLDS) {
    for (let lv = 1; lv <= 20; lv++) {
      const globalId = (world.id - 1) * 20 + lv;
      const colorsCount: 4 | 5 | 6 =
        globalId <= 15 ? 4 : globalId <= 60 ? 5 : 6;
      const targetScore = 900 + globalId * 135;
      const maxMoves = Math.max(14, 24 - Math.floor(lv / 5) + (world.id > 4 ? 2 : 0));
      const collectColor: BlockColor | undefined =
        lv % 2 === 0 ? ALL_BLOCK_COLORS[(globalId - 1) % colorsCount] : undefined;
      const collectCount = collectColor ? 10 + Math.min(24, Math.floor(globalId / 3)) : undefined;

      levels.push({
        id: globalId,
        worldId: world.id,
        levelNumber: lv,
        title: `${LEVEL_FLAVOR_TITLES[lv - 1]}`,
        subtitle: `${world.name} · Tahap ${lv}`,
        maxMoves,
        colorsCount,
        objective: {
          targetScore,
          collectColor,
          collectCount,
        },
        rewardKoin: 50 + (lv === 20 ? 50 : 0),
        rewardPermata: lv % 5 === 0 ? 5 : 2,
        quizCategoryHint: QUIZ_CATEGORY_BY_WORLD[world.id] ?? 'Rukun Islam',
      });
    }
  }
  return levels;
}

export const DEFAULT_LEVELS: GameLevelConfig[] = generateDefaultLevels();
