export type ScreenId =
  | 'splash'
  | 'onboarding'
  | 'mode_select'
  | 'login'
  | 'register'
  | 'home'
  | 'adventure_map'
  | 'level_select'
  | 'puzzle_play'
  | 'victory'
  | 'defeat'
  | 'quiz'
  | 'hijaiyah'
  | 'missions'
  | 'checkin'
  | 'achievements'
  | 'shop'
  | 'mascot'
  | 'reward_center'
  | 'wallet'
  | 'redemption_catalog'
  | 'transactions'
  | 'leaderboard'
  | 'referrals'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'help'
  | 'tutorial'
  | 'daily_challenge'
  | 'privacy'
  | 'terms'
  | 'parental_controls'
  | 'admin';

export type AgeMode = 'child' | 'adult';
export type UserRole = 'player' | 'reviewer' | 'admin';

export type BlockColor =
  | 'emerald_geo'
  | 'blue_crescent'
  | 'gold_star'
  | 'purple_lantern'
  | 'orange_ornament'
  | 'pink_flower';

export type SpecialType = 'none' | 'rocket_h' | 'rocket_v' | 'bomb' | 'rainbow';
export type ObstacleKind = 'ice' | 'crate' | 'lock';
export interface LevelObstacle { row: number; col: number; kind: ObstacleKind }

export interface PuzzleCell {
  id: string;
  color: BlockColor;
  special: SpecialType;
  row: number;
  col: number;
}

export interface PuzzleMove {
  type: 'tap' | 'hammer' | 'shuffle' | 'extra_moves';
  row?: number;
  col?: number;
}

export interface LevelObjective {
  targetScore: number;
  collectColor?: BlockColor;
  collectCount?: number;
  clearObstacles?: boolean;
}

export interface GameLevelConfig {
  id: number;
  worldId: number;
  levelNumber: number;
  title: string;
  subtitle: string;
  maxMoves: number;
  colorsCount: 4 | 5 | 6;
  objective: LevelObjective;
  rewardKoin: number;
  rewardPermata: number;
  quizCategoryHint: string;
  isConfiguredByAdmin?: boolean;
  obstacles?: LevelObstacle[];
}

export interface WorldConfig {
  id: number;
  name: string;
  tagline: string;
  themeColor: string;
  accentColor: string;
  badgeName: string;
  unlockRequirementStars: number;
}

export type QuizDifficulty = 'Mudah' | 'Sedang' | 'Sulit';
export type ReviewStatus = 'draft_needs_expert_review' | 'pending_review' | 'approved' | 'rejected';

export interface QuizQuestion {
  id: string;
  category: string;
  difficulty: QuizDifficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  referenceNote: string;
  reviewStatus: ReviewStatus;
}

export interface HijaiyahLetter {
  id: number;
  arabic: string;
  name: string;
  transliteration: string;
  makhrajNote: string;
  exampleWordArabic: string;
  exampleWordLatin: string;
  exampleMeaning: string;
  audioPath: string;
}

export interface WalletBalances {
  koinIlmu: number;
  permataHikmah: number;
  bintangPrestasi: number;
  availableRewardPoints: number;
  pendingRewardPoints: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  currency: 'koin_ilmu' | 'permata_hikmah' | 'bintang_prestasi' | 'reward_point';
  amount: number;
  type: 'credit' | 'debit';
  source: string;
  description: string;
  createdAt: string;
  idempotencyKey?: string;
}

export type RedemptionStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Processing'
  | 'Completed'
  | 'Rejected'
  | 'Failed';

export interface RedemptionCatalogItem {
  id: string;
  method: 'DANA' | 'OVO' | 'GoPay' | 'ShopeePay' | 'Transfer Bank' | 'Pulsa' | 'Voucher Belanja';
  title: string;
  pointsRequired: number;
  nominalLabel: string;
  minAge: number;
  enabled: boolean;
}

export interface RedemptionRequest {
  id: string;
  userId: string;
  userName: string;
  catalogId: string;
  method: string;
  points: number;
  destinationHint: string;
  status: RedemptionStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  category: string;
  targetCount: number;
  progressKey: 'levels_won' | 'quizzes_completed' | 'hijaiyah_studied' | 'blocks_cleared';
  rewardKoin: number;
  badgeLabel: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  bintangReward: number;
  koinReward: number;
  metricKey: 'levels_won' | 'quizzes_completed' | 'hijaiyah_mastered' | 'missions_completed' | 'checkin_streak';
  targetValue: number;
}

export interface VirtualItem {
  id: string;
  name: string;
  category: 'booster' | 'mascot_cap' | 'mascot_backpack' | 'theme';
  description: string;
  priceKoin?: number;
  pricePermata?: number;
  previewColor: string;
  boosterKey?: 'hammer' | 'shuffle' | 'extra_moves';
}

export interface PlayerProgress {
  completedLevels: Record<number, { stars: number; highScore: number }>;
  highestUnlockedLevel: number;
  quizzesCompleted: number;
  quizCorrectTotal: number;
  hijaiyahStudiedIds: number[];
  completedMissionIds: string[];
  claimedAchievementIds: string[];
  checkinStreak: number;
  lastCheckinDate: string | null;
  totalBlocksCleared: number;
  inventory: Record<string, number>;
  equippedCap: string;
  equippedBackpack: string;
  equippedTheme: string;
}

export interface UserPreferences {
  soundEnabled: boolean;
  soundVolume: number;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  puzzleTutorialSeen?: boolean;
}

export interface PuzzleSessionSnapshot {
  sessionId: string;
  seed: number;
  level: GameLevelConfig;
  moves?: PuzzleMove[];
  activeTool?: 'tap' | 'hammer';
}

export interface DailyChallengeProgress {
  date: string;
  tasks: Array<{ id: string; label: string; current: number; target: number }>;
  claimed: boolean;
  ready: boolean;
  rewardKoin: number;
  rewardPermata: number;
}

export interface ParentalControlsState {
  pinSet: boolean;
  dailyLimitMinutes: number;
  adsAllowed: boolean;
  childModeLocked: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ageMode: AgeMode;
  ageConfirmed: boolean;
  level: number;
  xp: number;
  suspended: boolean;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'reward' | 'education' | 'system' | 'admin';
  read: boolean;
  createdAt: string;
}

export interface FraudFlag {
  id: string;
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface AppSettingsConfig {
  realRewardsEnabled: boolean;
  maintenanceMode: boolean;
  adsTestMode: boolean;
  minRedemptionPoints: number;
  dailyRedemptionLimitPoints: number;
  monthlyBudgetCapPoints: number;
  rewardsConfig: {
    registrationKoin: number;
    levelCompleteKoin: number;
    dailyCheckinKoin: number;
    quizCompleteKoin: number;
    missionCompleteKoin: number;
    achievementKoin: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  level: number;
  bintangPrestasi: number;
  levelsCleared: number;
  isDemoData?: boolean;
}
