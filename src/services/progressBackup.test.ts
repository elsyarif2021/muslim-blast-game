import { describe, expect, it } from 'vitest';
import { applyPuzzleMove, createInitialBoard, findConnectedGroup, replayPuzzleSession } from '../game/puzzleLogic.ts';
import { legacyLevel } from '../data/worldsAndLevels.ts';
import type { PuzzleMove, PuzzleSessionSnapshot } from '../types/index.ts';
import type { HydratedUserState } from './api.ts';
import { LocalGameService, LOCAL_GAME_KEY, RECOVERY_GAME_KEY } from './localGame.ts';
import { MAX_BACKUP_BYTES, parseProgressBackup } from './progressBackup.ts';

function setup(name = 'Sahabat Mimo') {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const service = new LocalGameService(storage, () => new Date('2026-11-25T01:00:00Z'));
  const initial = service.request('/api/auth/guest', { body: JSON.stringify({ name, ageMode: 'child' }) }) as { token: string; user: HydratedUserState };
  const call = <T = { user: HydratedUserState }>(path: string, body = {}) => service.request(path, { body: JSON.stringify(body) }, initial.token) as T;
  return { service, data, storage, initial, call };
}

function bestMove(state: ReturnType<typeof createInitialBoard>['state']): PuzzleMove {
  let best = { row: 0, col: 0, size: 0 };
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const cell = state.grid[row][col];
    if (!cell) continue;
    const size = cell.special === 'none' ? findConnectedGroup(state.grid, row, col).length : 100;
    if (size > best.size) best = { row, col, size };
  }
  return { type: 'tap', row: best.row, col: best.col };
}
function finish(round: PuzzleSessionSnapshot): PuzzleMove[] {
  const initial = createInitialBoard(round.seed, round.level), moves: PuzzleMove[] = [];
  let state = initial.state;
  while (state.status === 'playing') {
    const move = bestMove(state);
    const result = applyPuzzleMove(state, move, round.level, initial.rng, initial.nextId);
    expect(result.valid).toBe(true); moves.push(move); state = result.state;
  }
  expect(state.status).toBe('won');
  return moves;
}

describe('portable local progress backups', () => {
  it('round-trips the player, virtual wallet, study history, preferences, receipts and daily activity', () => {
    const source = setup('Penjelajah Ilmu'), target = setup('Perangkat Baru');
    source.call('/api/hijaiyah/complete', { letterId: 28 });
    source.call('/api/checkin');
    source.call('/api/quiz/submit', { totalQuestions: 8, correctCount: 7, idempotencyKey: 'quiz:portable' });
    source.call('/api/me/preferences', { soundVolume: 0.25, reducedMotion: true, puzzleTutorialSeen: true });
    const contents = source.service.exportProgress();
    expect(contents).not.toMatch(/password|token|secret/i);
    expect(parseProgressBackup(contents).exportedAt).toBe('2026-11-25T01:00:00.000Z');
    const restored = target.service.importProgress(contents);
    expect(restored).toEqual(source.service.getSavedUser());
    expect(new LocalGameService(target.storage).getSavedUser()).toEqual(restored);
    expect(target.service.getDailyChallenge()).toEqual(source.service.getDailyChallenge());
    const before = target.service.getSavedUser();
    target.service.request('/api/quiz/submit', { body: JSON.stringify({ totalQuestions: 8, correctCount: 7, idempotencyKey: 'quiz:portable' }) }, `local:${restored.profile.id}`);
    expect(target.service.getSavedUser()).toEqual(before);
  });

  it('restores an obstacle round, its rule snapshot and a reserved hammer without charging twice', () => {
    const source = setup();
    for (const levelId of [1, 2]) {
      const round = source.call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId });
      source.call('/api/game/session/complete', { sessionId: round.sessionId, moves: finish(round), idempotencyKey: `finish-${levelId}` });
    }
    const round = source.call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 3 });
    const initial = createInitialBoard(round.seed, round.level);
    const moves = [bestMove(initial.state)];
    source.call('/api/game/session/checkpoint', { sessionId: round.sessionId, moves });
    source.call('/api/game/use-booster', { sessionId: round.sessionId, itemId: 'boost_hammer' });
    const target = setup(), restored = target.service.importProgress(source.service.exportProgress());
    const resumed = target.service.getActiveSession()!;
    expect(resumed).toEqual(source.service.getActiveSession());
    expect(resumed.activeTool).toBe('hammer');
    expect(resumed.level.obstacles?.length).toBe(2);
    expect(replayPuzzleSession(resumed.seed, resumed.level, resumed.moves!).finalState).toEqual(replayPuzzleSession(round.seed, round.level, moves).finalState);
    expect(restored.progress.inventory.boost_hammer).toBe(1);
    target.service.request('/api/game/cancel-hammer', { body: JSON.stringify({ sessionId: resumed.sessionId }) }, `local:${restored.profile.id}`);
    expect(target.service.getSavedUser()?.progress.inventory.boost_hammer).toBe(2);
  });

  it('keeps a settled puzzle receipt so restoring cannot award its result again', () => {
    const source = setup(), target = setup();
    const round = source.call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    const body = { sessionId: round.sessionId, moves: finish(round), idempotencyKey: 'portable-win' };
    source.call('/api/game/session/complete', body);
    const restored = target.service.importProgress(source.service.exportProgress()), before = target.service.getSavedUser();
    target.service.request('/api/game/session/complete', { body: JSON.stringify(body) }, `local:${restored.profile.id}`);
    expect(target.service.getSavedUser()).toEqual(before);
    expect(target.service.getActiveSession()).toBeNull();
  });

  it('validates a preview without changing live state and can undo a successful restore', () => {
    const source = setup('Sumber'), target = setup('Progres Sebelumnya');
    target.call('/api/hijaiyah/complete', { letterId: 2 });
    const before = target.service.getSavedUser(), durableBefore = target.data.get(LOCAL_GAME_KEY);
    const contents = source.service.exportProgress();
    parseProgressBackup(contents);
    expect(target.data.get(LOCAL_GAME_KEY)).toBe(durableBefore);
    expect(target.service.hasRecoverySave()).toBe(false);
    target.service.importProgress(contents);
    expect(target.service.hasRecoverySave()).toBe(true);
    expect(parseProgressBackup(target.data.get(RECOVERY_GAME_KEY)!).game.user).toEqual(before);
    expect(target.service.undoProgressRestore()).toEqual(before);
    expect(new LocalGameService(target.storage).getSavedUser()).toEqual(before);
    expect(target.service.hasRecoverySave()).toBe(false);
    expect(() => target.service.undoProgressRestore()).toThrow(/tidak ditemukan/);
  });

  it('retains both in-memory and durable progress when storage rejects the new save', () => {
    const source = setup('Sumber'), target = setup('Tetap Tersimpan');
    const before = target.service.getSavedUser(), durableBefore = target.data.get(LOCAL_GAME_KEY);
    const rejecting = new LocalGameService({ getItem: target.storage.getItem, setItem: (key, value) => { if (key === LOCAL_GAME_KEY) throw new Error('quota'); target.storage.setItem(key, value); } });
    expect(() => rejecting.importProgress(source.service.exportProgress())).toThrow(/tetap dipertahankan/);
    expect(rejecting.getSavedUser()).toEqual(before);
    expect(target.data.get(LOCAL_GAME_KEY)).toBe(durableBefore);
    expect(() => new LocalGameService(null).importProgress(source.service.exportProgress())).toThrow(/tidak tersedia/);
  });

  const corruptions: Array<[string, (raw: any) => void]> = [
    ['unsupported version', raw => { raw.version = 99; }],
    ['admin role', raw => { raw.data.user.profile.role = 'admin'; }],
    ['negative wallet', raw => { raw.data.user.wallets.koinIlmu = -5; }],
    ['cash reward points', raw => { raw.data.user.wallets.availableRewardPoints = 100; }],
    ['excessive volume', raw => { raw.data.user.preferences.soundVolume = 100; }],
    ['duplicate studied IDs', raw => { raw.data.user.progress.hijaiyahStudiedIds = [1, 1]; }],
    ['impossible date', raw => { raw.data.daily.date = '2026-02-30'; }],
    ['locked active level', raw => { raw.data.user.progress.highestUnlockedLevel = 0; }],
    ['prototype key', raw => { raw.extra = JSON.parse('{"__proto__":{"polluted":true}}'); }],
    ['credential key', raw => { raw.data.accessToken = 'do-not-import'; }],
    ['unowned equipped item', raw => { raw.data.user.progress.equippedCap = 'cap_gold'; }],
    ['unknown shop item', raw => { raw.data.user.progress.inventory.imaginary = 1; }],
  ];
  it.each(corruptions)('rejects $0 without touching current progress', (_, corrupt) => {
    const source = setup(), before = source.data.get(LOCAL_GAME_KEY);
    const raw = JSON.parse(source.service.exportProgress()); corrupt(raw);
    expect(() => source.service.importProgress(JSON.stringify(raw))).toThrow(/tidak valid/);
    expect(source.data.get(LOCAL_GAME_KEY)).toBe(before);
    expect(source.service.hasRecoverySave()).toBe(false);
  });

  it('rejects oversized, truncated and deeply nested files', () => {
    expect(() => parseProgressBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow(/maksimal/);
    expect(() => parseProgressBackup('{"format":')).toThrow(/tidak valid/);
    const source = setup(), raw = JSON.parse(source.service.exportProgress());
    raw.deep = Array.from({ length: 20 }).reduce(value => ({ child: value }), {});
    expect(() => parseProgressBackup(JSON.stringify(raw))).toThrow(/tidak valid/);
  });

  it('rejects invalid coordinates, unreserved boosters and impossible obstacle layouts', () => {
    const source = setup();
    const round = source.call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    for (const change of [
      (session: any) => { session.moves = [{ type: 'tap', row: 8, col: 0 }]; },
      (session: any) => { session.moves = [{ type: 'hammer', row: 0, col: 0 }]; },
      (session: any) => { session.levelSnapshot.obstacles = [{ row: 9, col: 0, kind: 'ice' }]; },
      (session: any) => { session.levelSnapshot.obstacles = [{ row: 0, col: 0, kind: 'ice' }, { row: 0, col: 0, kind: 'lock' }]; },
    ]) {
      const raw = JSON.parse(source.service.exportProgress()); change(raw.data.sessions[round.sessionId]);
      expect(() => parseProgressBackup(JSON.stringify(raw))).toThrow(/tidak valid/);
    }
  });

  it('migrates pre-obstacle rules and exports old completed rounds without losing earned progress', () => {
    const source = setup(), target = setup();
    const round = source.call<PuzzleSessionSnapshot>('/api/game/session/start', { levelId: 1 });
    const old = JSON.parse(source.data.get(LOCAL_GAME_KEY)!);
    const previous = legacyLevel(7)!, initial = createInitialBoard(42, previous);
    old.user.progress.highestUnlockedLevel = 7;
    old.sessions[round.sessionId] = { seed: 42, levelId: 7, boosters: {}, moves: [bestMove(initial.state)] };
    old.sessions['00000000-0000-4000-8000-000000000001'] = { seed: 1, levelId: 1, boosters: {}, result: { ok: true, status: 'won', verifiedScore: 1500, stars: 2, koinAwarded: 50, permataAwarded: 2 } };
    source.data.set(LOCAL_GAME_KEY, JSON.stringify(old));
    const migrated = new LocalGameService(source.storage);
    expect(migrated.getActiveSession()?.level.obstacles).toBeUndefined();
    expect(migrated.getSavedUser()).toEqual(old.user);
    target.service.importProgress(migrated.exportProgress());
    expect(target.service.getSavedUser()).toEqual(old.user);
    expect(target.service.getActiveSession()).toEqual(migrated.getActiveSession());
  });
});
