import { ACHIEVEMENTS, DAILY_MISSIONS, VIRTUAL_SHOP_ITEMS } from '../data/economyAndMissions.ts';
import { INITIAL_QUIZ_QUESTIONS } from '../data/quizQuestions.ts';
import { DEFAULT_LEVELS } from '../data/worldsAndLevels.ts';
import { replayPuzzleSession } from '../game/puzzleLogic.ts';
import { createDailyActivity, describeDailyChallenge, localDateKey, type DailyActivity } from '../game/dailyChallenge.ts';
import type { AgeMode, DailyChallengeProgress, PuzzleMove, PuzzleSessionSnapshot, UserPreferences } from '../types/index.ts';
import type { HydratedUserState, PublicCatalogResponse } from './api.ts';

export const LOCAL_GAME_KEY = 'muslim-blast:game:v1';
type GameStorage = Pick<Storage, 'getItem' | 'setItem'>;
type GameResult = {
  ok: true;
  status: 'won' | 'lost';
  verifiedScore: number;
  stars: number;
  koinAwarded: number;
  permataAwarded: number;
};
interface LocalSession {
  seed: number;
  levelId: number;
  boosters: Record<string, number>;
  moves: PuzzleMove[];
  result?: GameResult;
}
interface SavedGame {
  version: 1;
  user: HydratedUserState;
  sessions: Record<string, LocalSession>;
  quizReceipts: Record<string, number>;
  activeSessionId: string | null;
  daily: DailyActivity;
}

const CATALOG: PublicCatalogResponse = {
  levels: DEFAULT_LEVELS,
  quizzes: INITIAL_QUIZ_QUESTIONS,
  redemptionCatalog: [],
  settings: {
    realRewardsEnabled: false, maintenanceMode: false, adsTestMode: false,
    minRedemptionPoints: 10000, dailyRedemptionLimitPoints: 0, monthlyBudgetCapPoints: 0,
    rewardsConfig: {
      registrationKoin: 500, levelCompleteKoin: 50, dailyCheckinKoin: 100,
      quizCompleteKoin: 100, missionCompleteKoin: 250, achievementKoin: 500,
    },
  },
};

/** A device-local game save. It is deliberately separate from server authentication. */
export class LocalGameService {
  private game: SavedGame | null = null;
  storageAvailable: boolean;

  constructor(private storage: GameStorage | null, private now = () => new Date()) {
    this.storageAvailable = storage !== null;
    try {
      const raw = storage?.getItem(LOCAL_GAME_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedGame;
        if (saved.version === 1 && saved.user?.profile?.id && saved.user.progress?.inventory && saved.user.wallets && saved.user.preferences) {
          const sessions = Object.fromEntries(Object.entries(saved.sessions || {}).map(([id, session]) => [id, { ...session, moves: session.moves || [] }]));
          this.game = {
            ...saved, sessions, quizReceipts: saved.quizReceipts || {},
            activeSessionId: saved.activeSessionId === undefined ? Object.entries(sessions).reverse().find(([, session]) => !session.result)?.[0] || null : saved.activeSessionId,
            daily: saved.daily || createDailyActivity(this.now()),
          };
        }
      }
    } catch {
      // A damaged save should never leave the app on a blank loading screen.
    }
  }

  getSavedUser(): HydratedUserState | null {
    return this.game ? structuredClone(this.game.user) : null;
  }

  getActiveSession(): PuzzleSessionSnapshot | null {
    const id = this.game?.activeSessionId;
    const session = id ? this.game?.sessions[id] : null;
    if (!id || !session || session.result) return null;
    const level = DEFAULT_LEVELS.find(level => level.id === session.levelId);
    if (!level) return null;
    const usedHammers = session.moves.filter(move => move.type === 'hammer').length;
    return structuredClone({ sessionId: id, seed: session.seed, level, moves: session.moves, activeTool: (session.boosters.hammer || 0) > usedHammers ? 'hammer' : 'tap' });
  }

  private currentActivity(): DailyActivity {
    if (this.game!.daily.date !== localDateKey(this.now())) this.game!.daily = createDailyActivity(this.now());
    return this.game!.daily;
  }

  getDailyChallenge(): DailyChallengeProgress | null {
    if (!this.game) return null;
    const previousDate = this.game.daily.date;
    const challenge = describeDailyChallenge(this.currentActivity());
    if (previousDate !== challenge.date) this.persist();
    return structuredClone(challenge);
  }

  private verifyMoves(session: LocalSession, input: unknown): ReturnType<typeof replayPuzzleSession> {
    if (!Array.isArray(input) || input.length > 1000) throw new Error('Langkah permainan tidak valid.');
    const used: Record<string, number> = {};
    for (const move of input as PuzzleMove[]) {
      if (!move || !['tap', 'hammer', 'shuffle', 'extra_moves'].includes(move.type)) throw new Error('Langkah permainan tidak valid.');
      if (move.type === 'tap' || move.type === 'hammer') {
        if (!Number.isInteger(move.row) || !Number.isInteger(move.col) || move.row! < 0 || move.row! > 7 || move.col! < 0 || move.col! > 7) throw new Error('Posisi blok tidak valid.');
      }
      if (move.type !== 'tap') used[move.type] = (used[move.type] || 0) + 1;
    }
    for (const key of Object.keys(used)) if (used[key] > (session.boosters[key] || 0)) throw new Error('Stok booster tidak sesuai dengan langkah permainan.');
    if (session.moves.length > input.length || session.moves.some((move, index) => move.type !== input[index]?.type || move.row !== input[index]?.row || move.col !== input[index]?.col)) throw new Error('Progres yang lebih baru sudah tersimpan. Muat ulang permainan.');
    const replay = replayPuzzleSession(session.seed, DEFAULT_LEVELS.find(level => level.id === session.levelId)!, input);
    if (!replay.verified) throw new Error('Langkah permainan tidak valid.');
    return replay;
  }

  private persist() {
    try {
      if (this.storage) this.storage.setItem(LOCAL_GAME_KEY, JSON.stringify(this.game));
    } catch {
      this.storageAvailable = false;
    }
  }

  private createPlayer(name: string, ageMode: AgeMode): SavedGame {
    const id = crypto.randomUUID();
    return {
      version: 1, sessions: {}, quizReceipts: {}, activeSessionId: null, daily: createDailyActivity(this.now()),
      user: {
        profile: {
          id, name: name.trim().slice(0, 50) || 'Sahabat Mimo', email: '', role: 'player', ageMode,
          ageConfirmed: true, level: 1, xp: 0, suspended: false, referralCode: '', createdAt: this.now().toISOString(),
        },
        wallets: { koinIlmu: 500, permataHikmah: 5, bintangPrestasi: 0, availableRewardPoints: 0, pendingRewardPoints: 0 },
        progress: {
          completedLevels: {}, highestUnlockedLevel: 1, quizzesCompleted: 0, quizCorrectTotal: 0,
          hijaiyahStudiedIds: [], completedMissionIds: [], claimedAchievementIds: [], checkinStreak: 0,
          lastCheckinDate: null, totalBlocksCleared: 0,
          inventory: { boost_hammer: 2, boost_shuffle: 2, boost_moves: 1, cap_emerald: 1, pack_explorer: 1, theme_garden: 1 },
          equippedCap: 'cap_emerald', equippedBackpack: 'pack_explorer', equippedTheme: 'theme_garden',
        },
        preferences: { soundEnabled: true, soundVolume: 0.6, hapticsEnabled: true, reducedMotion: false },
        parental: { pinSet: false, dailyLimitMinutes: 45, adsAllowed: false, childModeLocked: ageMode === 'child' },
        notifications: [], transactions: [], redemptions: [],
      },
    };
  }

  private metrics(user: HydratedUserState) {
    return {
      levels_won: Object.keys(user.progress.completedLevels).length,
      quizzes_completed: user.progress.quizzesCompleted,
      hijaiyah_studied: user.progress.hijaiyahStudiedIds.length,
      hijaiyah_mastered: user.progress.hijaiyahStudiedIds.length,
      blocks_cleared: user.progress.totalBlocksCleared,
      missions_completed: user.progress.completedMissionIds.length,
      checkin_streak: user.progress.checkinStreak,
    };
  }

  request(path: string, options: RequestInit = {}, token: string | null = null): unknown {
    const body = JSON.parse(typeof options.body === 'string' ? options.body : '{}') as Record<string, unknown>;
    if (path === '/api/public/catalog') return structuredClone(CATALOG);
    if (path === '/api/auth/guest') {
      if (!this.game) this.game = this.createPlayer(String(body.name || ''), body.ageMode === 'adult' ? 'adult' : 'child');
      this.persist();
      return { token: `local:${this.game.user.profile.id}`, user: this.getSavedUser() };
    }
    if (path.startsWith('/api/auth/')) throw new Error('Gunakan Mulai Bermain Langsung untuk menyimpan progres di perangkat ini.');
    if (path.startsWith('/api/admin/') || path.startsWith('/api/ads/') || path.includes('/redeem')) {
      throw new Error('Fitur ini belum tersedia dalam permainan lokal.');
    }
    if (!this.game || token !== `local:${this.game.user.profile.id}`) throw new Error('Mulai permainan terlebih dahulu.');
    const previous = structuredClone(this.game);
    try {
      const result = this.apply(path, body);
      this.game.user.profile.level = 1 + Math.floor(this.game.user.profile.xp / 200);
      this.persist();
      return structuredClone({ ...result, user: this.game.user });
    } catch (error) {
      this.game = previous;
      throw error;
    }
  }

  private apply(path: string, body: Record<string, unknown>): Record<string, unknown> {
    const game = this.game!;
    const user = game.user;
    const progress = user.progress;
    switch (path) {
      case '/api/me': return { user };
      case '/api/me/profile': {
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 30) throw new Error('Nama pemain harus berisi 1–30 karakter.');
        user.profile.name = body.name.trim();
        return { ok: true };
      }
      case '/api/me/preferences': {
        const prefs = user.preferences;
        for (const key of ['soundEnabled', 'hapticsEnabled', 'reducedMotion'] as const) {
          if (typeof body[key] === 'boolean') prefs[key] = body[key];
        }
        if (typeof body.soundVolume === 'number') prefs.soundVolume = Math.min(1, Math.max(0, body.soundVolume));
        if (typeof body.puzzleTutorialSeen === 'boolean') prefs.puzzleTutorialSeen = body.puzzleTutorialSeen;
        return { preferences: prefs satisfies UserPreferences };
      }
      case '/api/game/session/start': {
        const level = DEFAULT_LEVELS.find(item => item.id === body.levelId);
        if (!level) throw new Error('Level tidak ditemukan.');
        if (level.id > progress.highestUnlockedLevel) throw new Error('Selesaikan level sebelumnya terlebih dahulu.');
        const sessionId = crypto.randomUUID();
        const seed = crypto.getRandomValues(new Uint32Array(1))[0];
        // Retain only recent sessions; abandoned rounds cannot grow the save forever.
        game.sessions = Object.fromEntries(Object.entries(game.sessions).slice(-9));
        game.sessions[sessionId] = { seed, levelId: level.id, boosters: {}, moves: [] };
        game.activeSessionId = sessionId;
        return { sessionId, seed, level, moves: [], activeTool: 'tap' };
      }
      case '/api/game/session/checkpoint': {
        const session = game.sessions[String(body.sessionId)];
        if (!session || session.result) throw new Error('Sesi permainan tidak aktif.');
        this.verifyMoves(session, body.moves);
        session.moves = structuredClone(body.moves as PuzzleMove[]);
        return { ok: true };
      }
      case '/api/game/session/complete': {
        const session = game.sessions[String(body.sessionId)];
        if (!session) throw new Error('Sesi permainan tidak ditemukan.');
        if (session.result) return { ...session.result };
        if (!body.idempotencyKey) throw new Error('Langkah permainan tidak valid.');
        const replay = this.verifyMoves(session, body.moves);
        const moves = body.moves as PuzzleMove[];
        const level = DEFAULT_LEVELS.find(item => item.id === session.levelId)!;
        if (!replay.verified || replay.finalState.status === 'playing') throw new Error('Permainan belum selesai atau langkah tidak valid.');
        const firstClear = !progress.completedLevels[level.id];
        const won = replay.finalState.status === 'won';
        const koinAwarded = won ? (firstClear ? level.rewardKoin : Math.round(level.rewardKoin * 0.4)) : 0;
        const permataAwarded = won && firstClear ? level.rewardPermata : 0;
        progress.totalBlocksCleared += replay.finalState.totalBlocksCleared;
        const activity = this.currentActivity();
        activity.blocksCleared += replay.finalState.totalBlocksCleared;
        if (won) activity.puzzleWins += 1;
        if (won) {
          const old = progress.completedLevels[level.id];
          progress.completedLevels[level.id] = { stars: Math.max(old?.stars || 0, replay.stars), highScore: Math.max(old?.highScore || 0, replay.finalState.score) };
          progress.highestUnlockedLevel = Math.max(progress.highestUnlockedLevel, Math.min(DEFAULT_LEVELS.length, level.id + 1));
          user.wallets.koinIlmu += koinAwarded;
          user.wallets.permataHikmah += permataAwarded;
          user.profile.xp += 40 + replay.stars * 15;
          // Only improved stars count, so replaying cannot inflate the star balance.
          user.wallets.bintangPrestasi += Math.max(0, replay.stars - (old?.stars || 0));
        }
        session.result = { ok: true, status: won ? 'won' : 'lost', verifiedScore: replay.finalState.score, stars: replay.stars, koinAwarded, permataAwarded };
        session.moves = structuredClone(moves);
        if (game.activeSessionId === body.sessionId) game.activeSessionId = null;
        return { ...session.result };
      }
      case '/api/game/use-booster': {
        const item = VIRTUAL_SHOP_ITEMS.find(item => item.id === body.itemId && item.category === 'booster');
        const session = game.sessions[String(body.sessionId || game.activeSessionId)];
        if (!item?.boosterKey || !session || session.result) throw new Error('Mulai level terlebih dahulu.');
        const used = session.moves.filter(move => move.type === item.boosterKey).length;
        if ((session.boosters[item.boosterKey] || 0) > used) throw new Error('Gunakan booster yang sudah dipilih terlebih dahulu.');
        if (!(progress.inventory[item.id] > 0)) throw new Error('Stok booster habis.');
        progress.inventory[item.id] -= 1;
        session.boosters[item.boosterKey] = (session.boosters[item.boosterKey] || 0) + 1;
        return { ok: true };
      }
      case '/api/game/cancel-hammer': {
        const session = game.sessions[String(body.sessionId)];
        if (!session || session.result) throw new Error('Sesi permainan tidak aktif.');
        const used = session.moves.filter(move => move.type === 'hammer').length;
        if ((session.boosters.hammer || 0) > used) {
          session.boosters.hammer -= 1;
          progress.inventory.boost_hammer += 1;
        }
        return { ok: true };
      }
      case '/api/quiz/submit': {
        const total = Number(body.totalQuestions), correct = Number(body.correctCount);
        const key = String(body.idempotencyKey || '');
        if (!key || !Number.isInteger(total) || total < 1 || total > 30 || !Number.isInteger(correct) || correct < 0 || correct > total) throw new Error('Hasil kuis tidak valid.');
        if (Object.hasOwn(game.quizReceipts, key)) return { ok: true, koinAwarded: game.quizReceipts[key] };
        const reward = correct >= Math.ceil(total / 2) ? 100 : 30;
        progress.quizzesCompleted += 1;
        progress.quizCorrectTotal += correct;
        user.profile.xp += correct * 12 + 20;
        user.wallets.koinIlmu += reward;
        this.currentActivity().quizCorrect += correct;
        game.quizReceipts = Object.fromEntries(Object.entries(game.quizReceipts).slice(-99));
        game.quizReceipts[key] = reward;
        return { ok: true, koinAwarded: reward };
      }
      case '/api/hijaiyah/complete': {
        const id = Number(body.letterId);
        if (!Number.isInteger(id) || id < 1 || id > 28) throw new Error('Huruf tidak ditemukan.');
        const fresh = !progress.hijaiyahStudiedIds.includes(id);
        if (fresh) { progress.hijaiyahStudiedIds.push(id); user.wallets.koinIlmu += 25; user.profile.xp += 15; }
        return { ok: true, koinAwarded: fresh ? 25 : 0 };
      }
      case '/api/checkin': {
        // Use the player's local calendar date, including the intended midnight boundary.
        const now = this.now();
        const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const today = day(now);
        if (progress.lastCheckinDate === today) throw new Error('Hadiah hari ini sudah diklaim.');
        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
        progress.checkinStreak = progress.lastCheckinDate === day(yesterday) ? progress.checkinStreak + 1 : 1;
        progress.lastCheckinDate = today;
        const reward = 100 + Math.min(progress.checkinStreak - 1, 6) * 20;
        user.wallets.koinIlmu += reward;
        if (progress.checkinStreak % 7 === 0) user.wallets.permataHikmah += 10;
        return { ok: true, reward };
      }
      case '/api/daily-challenge/claim': {
        const activity = this.currentActivity();
        const challenge = describeDailyChallenge(activity);
        if (activity.claimed) throw new Error('Bonus tantangan hari ini sudah diklaim.');
        if (!challenge.ready) throw new Error('Selesaikan ketiga tantangan terlebih dahulu.');
        activity.claimed = true;
        user.wallets.koinIlmu += challenge.rewardKoin;
        user.wallets.permataHikmah += challenge.rewardPermata;
        return { ok: true };
      }
      case '/api/missions/claim': {
        const mission = DAILY_MISSIONS.find(item => item.id === body.missionId);
        if (!mission) throw new Error('Misi tidak ditemukan.');
        if (progress.completedMissionIds.includes(mission.id)) throw new Error('Hadiah misi sudah diklaim.');
        if (this.metrics(user)[mission.progressKey] < mission.targetCount) throw new Error('Target misi belum terpenuhi.');
        progress.completedMissionIds.push(mission.id);
        user.wallets.koinIlmu += mission.rewardKoin;
        return { ok: true, reward: mission.rewardKoin };
      }
      case '/api/achievements/claim': {
        const item = ACHIEVEMENTS.find(item => item.id === body.achievementId);
        if (!item) throw new Error('Prestasi tidak ditemukan.');
        if (progress.claimedAchievementIds.includes(item.id)) throw new Error('Hadiah prestasi sudah diklaim.');
        if (this.metrics(user)[item.metricKey] < item.targetValue) throw new Error('Syarat prestasi belum terpenuhi.');
        progress.claimedAchievementIds.push(item.id);
        user.wallets.koinIlmu += item.koinReward;
        user.wallets.bintangPrestasi += item.bintangReward;
        return { ok: true };
      }
      case '/api/shop/buy': {
        const item = VIRTUAL_SHOP_ITEMS.find(item => item.id === body.itemId);
        if (!item) throw new Error('Item tidak ditemukan.');
        if (item.category !== 'booster' && progress.inventory[item.id]) throw new Error('Item ini sudah dimiliki.');
        if ((item.priceKoin || 0) > user.wallets.koinIlmu || (item.pricePermata || 0) > user.wallets.permataHikmah) throw new Error('Koin atau permata belum cukup.');
        user.wallets.koinIlmu -= item.priceKoin || 0;
        user.wallets.permataHikmah -= item.pricePermata || 0;
        progress.inventory[item.id] = (progress.inventory[item.id] || 0) + 1;
        return { ok: true };
      }
      case '/api/mascot/equip': {
        const item = VIRTUAL_SHOP_ITEMS.find(item => item.id === body.itemId);
        if (!item || !progress.inventory[item.id] || item.category === 'booster') throw new Error('Item belum dimiliki.');
        if (item.category === 'mascot_cap') progress.equippedCap = item.id;
        if (item.category === 'mascot_backpack') progress.equippedBackpack = item.id;
        if (item.category === 'theme') progress.equippedTheme = item.id;
        return { ok: true };
      }
      case '/api/leaderboard': return { leaderboard: [{ rank: 1, userId: user.profile.id, name: user.profile.name, level: user.profile.level, bintangPrestasi: user.wallets.bintangPrestasi, levelsCleared: Object.keys(progress.completedLevels).length, isDemoData: false }] };
      default: throw new Error('Fitur ini belum tersedia.');
    }
  }
}

function browserStorage(): GameStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
export const localGame = new LocalGameService(browserStorage());
