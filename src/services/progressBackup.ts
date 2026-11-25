import { ACHIEVEMENTS, DAILY_MISSIONS, VIRTUAL_SHOP_ITEMS } from '../data/economyAndMissions.ts';
import { DEFAULT_LEVELS, legacyLevel } from '../data/worldsAndLevels.ts';
import { ALL_BLOCK_COLORS, replayPuzzleSession } from '../game/puzzleLogic.ts';
import { createDailyActivity } from '../game/dailyChallenge.ts';
import type { GameLevelConfig, LevelObstacle, PuzzleMove } from '../types/index.ts';
import type { GameResult, LocalSession, SavedGame } from './gameSave.ts';

export const MAX_BACKUP_BYTES = 1024 * 1024;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
type JsonObject = Record<string, unknown>;
const fail = (): never => { throw new Error('Isi cadangan tidak valid atau berasal dari versi yang belum didukung.'); };
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as JsonObject;
}
function number(value: unknown, max = 10000000, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) return fail();
  return value;
}
function text(value: unknown, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) return fail();
  return value;
}
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') return fail(); return value; }
function uuid(value: unknown): string {
  const id = text(value, 36);
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return fail();
  return id;
}
function array(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return fail(); return value; }
function date(value: unknown): string {
  const result = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result + 'T12:00:00Z')) || new Date(result + 'T12:00:00Z').toISOString().slice(0, 10) !== result) return fail();
  return result;
}
function ids(value: unknown, allowed: string[]): string[] {
  const result = array(value, allowed.length).map(item => text(item));
  if (new Set(result).size !== result.length || result.some(id => !allowed.includes(id))) return fail();
  return result;
}
function safeStructure(value: unknown, depth = 0): void {
  if (depth > 16) return fail();
  if (!value || typeof value !== 'object') return;
  if (Object.keys(value).length > 2000) return fail();
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN.has(key) || /password|token|secret/i.test(key)) return fail();
    safeStructure(entry, depth + 1);
  }
}

function snapshot(value: unknown, id: number): GameLevelConfig {
  if (value === undefined) return legacyLevel(id)!;
  const raw = object(value), goal = object(raw.objective);
  const current = DEFAULT_LEVELS.find(level => level.id === id)!;
  if (raw.id !== id || raw.worldId !== current.worldId || raw.levelNumber !== current.levelNumber || ![4, 5, 6].includes(raw.colorsCount as number)) return fail();
  const color = goal.collectColor;
  if (color !== undefined && !ALL_BLOCK_COLORS.includes(color as typeof ALL_BLOCK_COLORS[number])) return fail();
  const obstacles: LevelObstacle[] = array(raw.obstacles || [], 24).map(value => {
    const item = object(value);
    if (!['ice', 'crate', 'lock'].includes(item.kind as string)) return fail();
    return { row: number(item.row, 7), col: number(item.col, 7), kind: item.kind as LevelObstacle['kind'] };
  });
  if (new Set(obstacles.map(item => `${item.row},${item.col}`)).size !== obstacles.length) return fail();
  return {
    id, worldId: current.worldId, levelNumber: current.levelNumber, title: current.title, subtitle: current.subtitle,
    maxMoves: number(raw.maxMoves, 100, 1), colorsCount: raw.colorsCount as 4 | 5 | 6,
    objective: {
      targetScore: number(goal.targetScore, 100000000, 1),
      ...(color !== undefined ? { collectColor: color as typeof ALL_BLOCK_COLORS[number], collectCount: number(goal.collectCount, 1000, 1) } : {}),
      ...(goal.clearObstacles === true ? { clearObstacles: true } : {}),
    },
    rewardKoin: number(raw.rewardKoin, 10000), rewardPermata: number(raw.rewardPermata, 1000), quizCategoryHint: current.quizCategoryHint,
    ...(obstacles.length ? { obstacles } : {}),
  };
}

/** Parse untrusted JSON into a fresh, bounded local game object. Never merge it into live state. */
export function parseProgressBackup(contents: string): { game: SavedGame; exportedAt: string } {
  if (new TextEncoder().encode(contents).length > MAX_BACKUP_BYTES) throw new Error('Ukuran cadangan maksimal 1 MB.');
  let envelope: JsonObject;
  try { const input = JSON.parse(contents); safeStructure(input); envelope = object(input); }
  catch { return fail(); }
  if (envelope.format !== 'muslim-blast-progress' || envelope.version !== 1) return fail();
  const exportedAt = text(envelope.exportedAt, 40);
  if (!Number.isFinite(Date.parse(exportedAt))) return fail();
  const raw = object(envelope.data), user = object(raw.user), profile = object(user.profile);
  const wallets = object(user.wallets), progress = object(user.progress), preferences = object(user.preferences);
  if (raw.version !== 1 || profile.role !== 'player' || !['child', 'adult'].includes(profile.ageMode as string)) return fail();
  if (wallets.availableRewardPoints !== 0 || wallets.pendingRewardPoints !== 0) return fail();
  const volume = preferences.soundVolume;
  if (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 1) return fail();
  const createdAt = text(profile.createdAt, 40);
  if (!Number.isFinite(Date.parse(createdAt))) return fail();
  const xp = number(profile.xp, 100000000);
  const completedLevels: SavedGame['user']['progress']['completedLevels'] = {};
  for (const [key, value] of Object.entries(object(progress.completedLevels))) {
    if (!/^\d{1,3}$/.test(key)) return fail();
    const id = number(Number(key), DEFAULT_LEVELS.length, 1), record = object(value);
    completedLevels[id] = { stars: number(record.stars, 3, 1), highScore: number(record.highScore, 1000000000) };
  }
  const highestUnlockedLevel = number(progress.highestUnlockedLevel, DEFAULT_LEVELS.length, 1);
  if (Object.keys(completedLevels).some(key => Number(key) > highestUnlockedLevel)) return fail();
  const inventory: Record<string, number> = {};
  for (const [key, value] of Object.entries(object(progress.inventory))) {
    const item = VIRTUAL_SHOP_ITEMS.find(item => item.id === key);
    if (!item) return fail();
    inventory[key] = number(value, item.category === 'booster' ? 9999 : 1);
  }
  const studied = array(progress.hijaiyahStudiedIds, 28).map(value => number(value, 28, 1));
  if (new Set(studied).size !== studied.length) return fail();
  const equipped = (key: string, category: string): string => {
    const id = text(progress[key]);
    if (!inventory[id] || !VIRTUAL_SHOP_ITEMS.some(item => item.id === id && item.category === category)) return fail();
    return id;
  };
  const game: SavedGame = {
    version: 1, sessions: {}, quizReceipts: {}, activeSessionId: null, daily: createDailyActivity(new Date()),
    user: {
      profile: { id: uuid(profile.id), name: text(profile.name, 50).trim(), email: '', role: 'player', ageMode: profile.ageMode as 'child' | 'adult', ageConfirmed: true, level: 1 + Math.floor(xp / 200), xp, suspended: false, referralCode: '', createdAt },
      wallets: { koinIlmu: number(wallets.koinIlmu), permataHikmah: number(wallets.permataHikmah), bintangPrestasi: number(wallets.bintangPrestasi), availableRewardPoints: 0, pendingRewardPoints: 0 },
      progress: {
        completedLevels, highestUnlockedLevel, quizzesCompleted: number(progress.quizzesCompleted), quizCorrectTotal: number(progress.quizCorrectTotal), hijaiyahStudiedIds: studied,
        completedMissionIds: ids(progress.completedMissionIds, DAILY_MISSIONS.map(item => item.id)), claimedAchievementIds: ids(progress.claimedAchievementIds, ACHIEVEMENTS.map(item => item.id)),
        checkinStreak: number(progress.checkinStreak, 100000), lastCheckinDate: progress.lastCheckinDate === null ? null : date(progress.lastCheckinDate), totalBlocksCleared: number(progress.totalBlocksCleared, 1000000000), inventory,
        equippedCap: equipped('equippedCap', 'mascot_cap'), equippedBackpack: equipped('equippedBackpack', 'mascot_backpack'), equippedTheme: equipped('equippedTheme', 'theme'),
      },
      preferences: { soundEnabled: boolean(preferences.soundEnabled), soundVolume: volume, hapticsEnabled: boolean(preferences.hapticsEnabled), reducedMotion: boolean(preferences.reducedMotion), puzzleTutorialSeen: preferences.puzzleTutorialSeen === true },
      parental: { pinSet: false, dailyLimitMinutes: 45, adsAllowed: false, childModeLocked: profile.ageMode === 'child' }, notifications: [], transactions: [], redemptions: [],
    },
  };
  const sessions = object(raw.sessions || {});
  if (Object.keys(sessions).length > 10) return fail();
  for (const [id, value] of Object.entries(sessions)) {
    uuid(id);
    const entry = object(value), levelId = number(entry.levelId, DEFAULT_LEVELS.length, 1);
    const level = snapshot(entry.levelSnapshot, levelId);
    const moves: PuzzleMove[] = array(entry.moves || [], 1000).map(value => {
      const move = object(value);
      if (!['tap', 'hammer', 'shuffle', 'extra_moves'].includes(move.type as string)) return fail();
      return { type: move.type as PuzzleMove['type'], ...(['tap', 'hammer'].includes(move.type as string) ? { row: number(move.row, 7), col: number(move.col, 7) } : {}) };
    });
    const boosters: Record<string, number> = {};
    for (const [key, value] of Object.entries(object(entry.boosters || {}))) {
      if (!['hammer', 'shuffle', 'extra_moves'].includes(key)) return fail();
      boosters[key] = number(value, 1000);
    }
    for (const tool of ['hammer', 'shuffle', 'extra_moves']) if (moves.filter(move => move.type === tool).length > (boosters[tool] || 0)) return fail();
    const session: LocalSession = { seed: number(entry.seed, 4294967295), levelId, boosters, moves, levelSnapshot: level };
    const replay = replayPuzzleSession(session.seed, level, moves);
    if (!replay.verified) return fail();
    if (entry.result !== undefined) {
      const result = object(entry.result);
      if (replay.finalState.status === 'playing' || result.status !== replay.finalState.status || result.verifiedScore !== replay.finalState.score || result.stars !== replay.stars) return fail();
      session.result = { ok: true, status: result.status as GameResult['status'], verifiedScore: replay.finalState.score, stars: replay.stars, koinAwarded: number(result.koinAwarded, 10000), permataAwarded: number(result.permataAwarded, 1000) };
    }
    game.sessions[id] = session;
  }
  if (raw.activeSessionId !== null && raw.activeSessionId !== undefined) {
    const id = uuid(raw.activeSessionId), session = game.sessions[id];
    if (!session || session.result || session.levelId > highestUnlockedLevel) return fail();
    game.activeSessionId = id;
  }
  const receipts = object(raw.quizReceipts || {});
  if (Object.keys(receipts).length > 100) return fail();
  for (const [key, value] of Object.entries(receipts)) {
    if (!/^[A-Za-z\d:._-]{1,160}$/.test(key)) return fail();
    game.quizReceipts[key] = number(value, 10000);
  }
  if (raw.daily !== undefined) {
    const daily = object(raw.daily);
    game.daily = { date: date(daily.date), puzzleWins: number(daily.puzzleWins), blocksCleared: number(daily.blocksCleared, 1000000000), quizCorrect: number(daily.quizCorrect), claimed: boolean(daily.claimed) };
  }
  return { game, exportedAt };
}

export function createProgressBackup(game: SavedGame, now = new Date()): string {
  return JSON.stringify({ format: 'muslim-blast-progress', version: 1, exportedAt: now.toISOString(), data: game }, null, 2);
}
