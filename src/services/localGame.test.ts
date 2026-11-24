import { describe, expect, it } from 'vitest';
import { LocalGameService, LOCAL_GAME_KEY } from './localGame.ts';
import { applyPuzzleMove, createInitialBoard, findConnectedGroup } from '../game/puzzleLogic.ts';
import type { GameLevelConfig, PuzzleMove, PuzzleSessionSnapshot } from '../types/index.ts';
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

describe('saved rounds and daily challenges', () => {
  it('restores the exact board, score and remaining moves from a saved checkpoint', () => {
    const { call, service, storage } = setup();
    const round = call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    const moves = finishLevel(round).slice(0, 1);
    call('/api/game/session/checkpoint', { sessionId: round.sessionId, moves });
    const reloaded = new LocalGameService(storage);
    const restored = reloaded.getActiveSession()!;
    expect(restored.sessionId).toBe(round.sessionId);
    expect(restored.seed).toBe(round.seed);
    expect(restored.moves).toEqual(moves);
    const { state, rng, nextId } = createInitialBoard(round.seed, round.level);
    const expected = applyPuzzleMove(state, moves[0], round.level, rng, nextId).state;
    const replayed = createInitialBoard(restored.seed, restored.level);
    const actual = applyPuzzleMove(replayed.state, restored.moves![0], restored.level, replayed.rng, replayed.nextId).state;
    expect(actual).toEqual(expected);
    expect(service.getSavedUser()?.wallets.koinIlmu).toBe(500);
  });

  it('rejects stale or invalid checkpoints while retaining the newer save', () => {
    const { call, service } = setup();
    const round = call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    const moves = finishLevel(round).slice(0, 1);
    call('/api/game/session/checkpoint', { sessionId: round.sessionId, moves });
    expect(() => call('/api/game/session/checkpoint', { sessionId: round.sessionId, moves: [] })).toThrow(/lebih baru/);
    expect(() => call('/api/game/session/checkpoint', { sessionId: round.sessionId, moves: [{ type: 'tap', row: 999, col: 0 }] })).toThrow(/Posisi/);
    expect(service.getActiveSession()?.moves).toEqual(moves);
  });

  it('recovers an interrupted winning step and completes its rewards exactly once', () => {
    const { call, storage, initial } = setup();
    const round = call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    const moves = finishLevel(round);
    call('/api/game/session/checkpoint', { sessionId: round.sessionId, moves });
    const reloaded = new LocalGameService(storage);
    expect(reloaded.getActiveSession()?.moves).toEqual(moves);
    const body = { sessionId: round.sessionId, moves, idempotencyKey: 'restored-finish' };
    reloaded.request('/api/game/session/complete', { body: JSON.stringify(body) }, initial.token);
    const before = reloaded.getSavedUser();
    const dailyBefore = reloaded.getDailyChallenge();
    reloaded.request('/api/game/session/complete', { body: JSON.stringify(body) }, initial.token);
    expect(reloaded.getSavedUser()).toEqual(before);
    expect(reloaded.getDailyChallenge()).toEqual(dailyBefore);
    expect(reloaded.getActiveSession()).toBeNull();
  });

  it('restores a selected hammer and refunds only its unused reservation on cancellation', () => {
    const { call, service, storage } = setup();
    const round = call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    call('/api/game/use-booster', { itemId: 'boost_hammer', sessionId: round.sessionId });
    expect(new LocalGameService(storage).getActiveSession()?.activeTool).toBe('hammer');
    expect(service.getSavedUser()?.progress.inventory.boost_hammer).toBe(1);
    call('/api/game/cancel-hammer', { sessionId: round.sessionId });
    call('/api/game/cancel-hammer', { sessionId: round.sessionId });
    expect(service.getSavedUser()?.progress.inventory.boost_hammer).toBe(2);
    expect(service.getActiveSession()?.activeTool).toBe('tap');
  });

  it('migrates existing player saves and unfinished sessions without resetting progress', () => {
    const { call, service, data, storage } = setup();
    call('/api/hijaiyah/complete', { letterId: 1 });
    const round = call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    const legacy = JSON.parse(data.get(LOCAL_GAME_KEY)!);
    delete legacy.activeSessionId; delete legacy.daily;
    delete legacy.sessions[round.sessionId].moves;
    data.set(LOCAL_GAME_KEY, JSON.stringify(legacy));
    const upgraded = new LocalGameService(storage);
    expect(upgraded.getSavedUser()).toEqual(service.getSavedUser());
    expect(upgraded.getActiveSession()?.sessionId).toBe(round.sessionId);
    expect(upgraded.getActiveSession()?.moves).toEqual([]);
    expect(upgraded.getDailyChallenge()?.tasks.every(task => task.current === 0)).toBe(true);
  });

  it('earns a daily bonus through completed play and quiz activity, once per day', () => {
    let now = new Date(2026, 10, 25, 8);
    const { call, service, storage } = setup(() => now);
    expect(() => call('/api/daily-challenge/claim')).toThrow(/ketiga/);
    call('/api/quiz/submit', { totalQuestions: 8, correctCount: 8, idempotencyKey: 'daily-quiz' });
    for (let i = 0; i < 8 && !service.getDailyChallenge()!.ready; i++) {
      const round = call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
      call('/api/game/session/complete', { sessionId: round.sessionId, moves: finishLevel(round), idempotencyKey: `daily-puzzle-${i}` });
    }
    expect(service.getDailyChallenge()?.ready).toBe(true);
    const before = service.getSavedUser()!;
    const claimed = call('/api/daily-challenge/claim').user;
    expect(claimed.wallets.koinIlmu).toBe(before.wallets.koinIlmu + 150);
    expect(claimed.wallets.permataHikmah).toBe(before.wallets.permataHikmah + 3);
    expect(() => call('/api/daily-challenge/claim')).toThrow(/sudah/);
    expect(new LocalGameService(storage, () => now).getDailyChallenge()?.claimed).toBe(true);
    now = new Date(2026, 10, 26, 0, 1);
    const tomorrow = service.getDailyChallenge()!;
    expect(tomorrow.claimed).toBe(false);
    expect(tomorrow.ready).toBe(false);
    expect(tomorrow.tasks.every(task => task.current === 0)).toBe(true);
    expect(service.getSavedUser()).toEqual(claimed);
  });

  it('does not count repeated quiz receipts twice toward daily targets', () => {
    const { call, service } = setup();
    const body = { totalQuestions: 8, correctCount: 5, idempotencyKey: 'daily-receipt' };
    call('/api/quiz/submit', body);
    const before = service.getDailyChallenge();
    call('/api/quiz/submit', body);
    expect(service.getDailyChallenge()).toEqual(before);
    expect(before?.tasks.find(task => task.id === 'quiz')?.current).toBe(5);
  });

  it('persists player name, volume and tutorial completion while rejecting blank names', () => {
    const { call, service, storage } = setup();
    call('/api/me/profile', { name: '  Penjelajah Mimo  ' });
    call('/api/me/preferences', { soundVolume: 0.25, puzzleTutorialSeen: true });
    expect(() => call('/api/me/profile', { name: '   ' })).toThrow(/Nama/);
    const reloaded = new LocalGameService(storage).getSavedUser()!;
    expect(reloaded.profile.name).toBe('Penjelajah Mimo');
    expect(reloaded.preferences.soundVolume).toBe(0.25);
    expect(reloaded.preferences.puzzleTutorialSeen).toBe(true);
    expect(service.getSavedUser()).toEqual(reloaded);
  });
});
