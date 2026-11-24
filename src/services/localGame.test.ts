import { describe, expect, it } from 'vitest';
import { LocalGameService, LOCAL_GAME_KEY } from './localGame.ts';
import { applyPuzzleMove, createInitialBoard, findConnectedGroup } from '../game/puzzleLogic.ts';
import type { GameLevelConfig, PuzzleMove } from '../types/index.ts';
import type { HydratedUserState, PublicCatalogResponse } from './api.ts';

function setup(now?: () => Date) {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const service = new LocalGameService(storage, now);
  const initial = service.request('/api/auth/guest', { body: JSON.stringify({ name: 'Sahabat', ageMode: 'child' }) }) as { token: string; user: HydratedUserState };
  const call = <T = { ok: boolean; user: HydratedUserState }>(path: string, body = {}) => service.request(path, { body: JSON.stringify(body) }, initial.token) as T;
  return { service, storage, data, call, initial };
}

function finishLevel(round: { seed: number; level: GameLevelConfig }): PuzzleMove[] {
  const { state: initial, rng, nextId } = createInitialBoard(round.seed, round.level);
  let state = initial;
  const moves: PuzzleMove[] = [];
  while (state.status === 'playing') {
    let best = { row: 0, col: 0, size: 0 };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const cell = state.grid[r][c]!;
      const size = cell.special !== 'none' ? 100 : findConnectedGroup(state.grid, r, c).length;
      if (size > best.size) best = { row: r, col: c, size };
    }
    const move: PuzzleMove = { type: 'tap', row: best.row, col: best.col };
    const result = applyPuzzleMove(state, move, round.level, rng, nextId);
    expect(result.valid).toBe(true);
    state = result.state; moves.push(move);
  }
  expect(state.status).toBe('won');
  return moves;
}

describe('device-local Muslim Blast game', () => {
  it('boots the full catalog without a server and keeps cash rewards disabled', () => {
    const game = new LocalGameService(null);
    const catalog = game.request('/api/public/catalog') as PublicCatalogResponse;
    expect(catalog.levels).toHaveLength(160);
    expect(catalog.quizzes.length).toBeGreaterThan(100);
    expect(catalog.settings.realRewardsEnabled).toBe(false);
    expect(catalog.settings.adsTestMode).toBe(false);
    expect(catalog.redemptionCatalog).toEqual([]);
  });

  it('resumes the same player after reload without repeating the welcome bonus', () => {
    const { service, storage, call, initial, data } = setup();
    call('/api/me/preferences', { soundEnabled: false });
    const reloaded = new LocalGameService(storage);
    expect(reloaded.getSavedUser()?.profile.id).toBe(initial.user.profile.id);
    expect(reloaded.getSavedUser()?.preferences.soundEnabled).toBe(false);
    const resumed = service.request('/api/auth/guest', { body: '{}' }) as { user: HydratedUserState };
    expect(resumed.user.wallets.koinIlmu).toBe(500);
    expect(data.get(LOCAL_GAME_KEY)).not.toMatch(/password|token/i);
  });

  it('starts from a damaged save and keeps working when storage is unavailable', () => {
    const broken = new LocalGameService({ getItem: () => '{broken', setItem: () => { throw new Error('quota'); } });
    expect(broken.getSavedUser()).toBeNull();
    const player = broken.request('/api/auth/guest', { body: '{}' }) as { user: HydratedUserState };
    expect(player.user.wallets.koinIlmu).toBe(500);
    expect(broken.storageAvailable).toBe(false);
  });

  it('rejects locked levels and unfinished rounds without changing progress', () => {
    const { call, service } = setup();
    expect(() => call('/api/game/session/start', { levelId: 2 })).toThrow(/sebelumnya/);
    const round = call<{ sessionId: string }>('/api/game/session/start', { levelId: 1 });
    expect(() => call('/api/game/session/complete', { sessionId: round.sessionId, moves: [], idempotencyKey: 'incomplete' })).toThrow(/belum selesai/);
    expect(service.getSavedUser()?.progress.completedLevels).toEqual({});
  });

  it('replays a won puzzle, unlocks the next level and awards its result once', () => {
    const { call, service } = setup();
    const round = call<{ sessionId: string; seed: number; level: GameLevelConfig }>('/api/game/session/start', { levelId: 1 });
    const body = { sessionId: round.sessionId, moves: finishLevel(round), idempotencyKey: 'round-1' };
    const result = call<{ status: string; stars: number; user: HydratedUserState }>('/api/game/session/complete', body);
    expect(result.status).toBe('won');
    expect(result.user.progress.highestUnlockedLevel).toBe(2);
    expect(result.user.wallets.bintangPrestasi).toBe(result.stars);
    const before = service.getSavedUser();
    call('/api/game/session/complete', body);
    expect(service.getSavedUser()).toEqual(before);
    call('/api/achievements/claim', { achievementId: 'ach_first_level' });
    expect(() => call('/api/achievements/claim', { achievementId: 'ach_first_level' })).toThrow(/sudah/);
  });

  it('requires owned boosters and rejects extra moves that were never consumed', () => {
    const { call } = setup();
    expect(() => call('/api/game/use-booster', { itemId: 'boost_shuffle' })).toThrow(/level/);
    const round = call<{ sessionId: string }>('/api/game/session/start', { levelId: 1 });
    expect(() => call('/api/game/session/complete', { sessionId: round.sessionId, moves: [{ type: 'extra_moves' }], idempotencyKey: 'bad' })).toThrow(/booster/);
    expect(call('/api/game/use-booster', { itemId: 'boost_shuffle' }).user.progress.inventory.boost_shuffle).toBe(1);
  });

  it('records a quiz exactly once and validates counts', () => {
    const { call, service } = setup();
    const result = { category: 'Semua', totalQuestions: 8, correctCount: 6, idempotencyKey: 'quiz-1' };
    call('/api/quiz/submit', result);
    const saved = service.getSavedUser();
    call('/api/quiz/submit', result);
    expect(service.getSavedUser()).toEqual(saved);
    expect(saved?.progress.quizzesCompleted).toBe(1);
    expect(saved?.wallets.koinIlmu).toBe(600);
    expect(() => call('/api/quiz/submit', { ...result, correctCount: 9 })).toThrow(/tidak valid/);
  });

  it('counts unique Hijaiyah letters and lets completed missions be claimed once', () => {
    const { call, service } = setup();
    expect(() => call('/api/missions/claim', { missionId: 'm_hijaiyah' })).toThrow(/belum/);
    for (const id of [1, 1, 2, 3]) call('/api/hijaiyah/complete', { letterId: id });
    expect(service.getSavedUser()?.wallets.koinIlmu).toBe(575);
    call('/api/missions/claim', { missionId: 'm_hijaiyah' });
    expect(service.getSavedUser()?.wallets.koinIlmu).toBe(825);
    expect(() => call('/api/missions/claim', { missionId: 'm_hijaiyah' })).toThrow(/sudah/);
    expect(() => call('/api/hijaiyah/complete', { letterId: 29 })).toThrow();
  });

  it('charges virtual purchases once and keeps balances intact on rejected purchases', () => {
    const { call, service } = setup();
    const user = call('/api/shop/buy', { itemId: 'boost_shuffle' }).user;
    expect(user.wallets.koinIlmu).toBe(380);
    expect(user.progress.inventory.boost_shuffle).toBe(3);
    expect(() => call('/api/shop/buy', { itemId: 'cap_gold' })).toThrow(/belum cukup/);
    expect(service.getSavedUser()).toEqual(user);
  });

  it('uses local calendar days, rejects double check-ins and resets broken streaks', () => {
    let now = new Date(2026, 10, 25, 1, 0);
    const { call } = setup(() => now);
    expect(call('/api/checkin').user.progress.checkinStreak).toBe(1);
    expect(() => call('/api/checkin')).toThrow(/sudah/);
    now = new Date(2026, 10, 26, 0, 5);
    expect(call('/api/checkin').user.progress.checkinStreak).toBe(2);
    now = new Date(2026, 10, 28, 1, 0);
    expect(call('/api/checkin').user.progress.checkinStreak).toBe(1);
  });

  it('does not expose admin operations, ad rewards or real-money redemptions', () => {
    const { call } = setup();
    for (const path of ['/api/admin/overview', '/api/ads/rewarded-test', '/api/wallet/redeem']) expect(() => call(path)).toThrow(/belum tersedia/);
  });
});
