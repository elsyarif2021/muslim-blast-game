import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LEVELS, legacyLevel } from '../data/worldsAndLevels.ts';
import type { GameLevelConfig, LevelObstacle, PuzzleMove } from '../types/index.ts';
import { ALL_BLOCK_COLORS, applyPuzzleMove, createInitialBoard, replayPuzzleSession, type PuzzleBoardState } from './puzzleLogic.ts';

function board(obstacles: LevelObstacle[], objective: GameLevelConfig['objective'] = { targetScore: 1000000, clearObstacles: true }) {
  const level: GameLevelConfig = { ...DEFAULT_LEVELS[0], maxMoves: 30, objective, obstacles };
  const initial = createInitialBoard(42, level);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    if (initial.state.grid[row][col]) initial.state.grid[row][col]!.color = ALL_BLOCK_COLORS[(row + col) % 4];
  }
  return { ...initial, level };
}
function checkGrid(state: PuzzleBoardState) {
  const ids = new Set<string>();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const cell = state.grid[row][col];
    if (state.obstacles[`${row},${col}`]?.kind === 'crate') expect(cell).toBeNull();
    else {
      expect(cell).not.toBeNull();
      expect([cell!.row, cell!.col]).toEqual([row, col]);
      expect(ids.has(cell!.id)).toBe(false); ids.add(cell!.id);
    }
  }
}

describe('puzzle obstacles', () => {
  it('introduces ice, crates and locks gradually while keeping the first two levels open', () => {
    expect(DEFAULT_LEVELS.slice(0, 2).every(level => !level.obstacles)).toBe(true);
    expect(DEFAULT_LEVELS[2].obstacles?.map(item => item.kind)).toEqual(['ice', 'ice']);
    expect(DEFAULT_LEVELS[4].obstacles?.some(item => item.kind === 'crate')).toBe(true);
    expect(DEFAULT_LEVELS[6].obstacles?.some(item => item.kind === 'lock')).toBe(true);
    for (const level of DEFAULT_LEVELS) {
      expect(new Set(level.obstacles?.map(item => `${item.row},${item.col}`)).size).toBe(level.obstacles?.length || 0);
    }
  });

  it('breaks ice with a color group, keeps its tile and leaves the input board unchanged', () => {
    const { state, rng, nextId, level } = board([{ row: 2, col: 2, kind: 'ice' }]);
    state.grid[2][3]!.color = state.grid[2][2]!.color;
    const before = structuredClone(state), id = state.grid[2][2]!.id;
    const result = applyPuzzleMove(state, { type: 'tap', row: 2, col: 2 }, level, rng, nextId);
    expect(result.valid).toBe(true);
    expect(result.state.obstacles).toEqual({});
    expect(result.state.obstaclesCleared).toBe(1);
    expect(result.state.grid.flat().some(cell => cell?.id === id)).toBe(true);
    expect(result.removedCells.some(cell => cell.id === id)).toBe(false);
    expect(result.state.movesLeft).toBe(29);
    expect(state).toEqual(before);
    checkGrid(result.state);
  });

  it('damages an adjacent crate only once when several surrounding blocks explode', () => {
    const { state, rng, nextId, level } = board([{ row: 3, col: 3, kind: 'crate' }]);
    for (const [r, c] of [[3, 4], [3, 5], [2, 3], [2, 4]]) state.grid[r][c]!.color = 'emerald_geo';
    const result = applyPuzzleMove(state, { type: 'tap', row: 3, col: 4 }, level, rng, nextId);
    expect(result.valid).toBe(true);
    expect(result.state.obstacles['3,3']).toEqual({ kind: 'crate', hp: 1 });
    expect(result.state.grid[3][3]).toBeNull();
    const final = applyPuzzleMove(result.state, { type: 'hammer', row: 3, col: 3 }, level, rng, nextId);
    expect(final.valid).toBe(true);
    expect(final.state.obstaclesCleared).toBe(1);
    expect(final.pointsGained).toBe(40);
    expect(final.removedCells).toEqual([]);
    expect(final.state.movesLeft).toBe(result.state.movesLeft);
    checkGrid(final.state);
  });

  it('requires two hits on locks before a score-qualified level can be won', () => {
    const { state, rng, nextId, level } = board([{ row: 2, col: 2, kind: 'lock' }], { targetScore: 1, clearObstacles: true });
    state.score = 500;
    const id = state.grid[2][2]!.id;
    const hit = applyPuzzleMove(state, { type: 'hammer', row: 2, col: 2 }, level, rng, nextId);
    expect(hit.state.status).toBe('playing');
    expect(hit.state.obstacles['2,2'].hp).toBe(1);
    expect(hit.state.grid[2][2]?.id).toBe(id);
    const final = applyPuzzleMove(hit.state, { type: 'hammer', row: 2, col: 2 }, level, rng, nextId);
    expect(final.state.status).toBe('won');
    expect(final.state.grid.flat().some(cell => cell?.id === id)).toBe(true);
    expect(final.state.movesLeft).toBe(30);
    expect(applyPuzzleMove(final.state, { type: 'shuffle' }, level, rng, nextId).valid).toBe(false);
  });

  it('keeps all obstacles anchored during shuffles and gravity', () => {
    const { state, rng, nextId, level } = board([{ row: 2, col: 2, kind: 'ice' }, { row: 3, col: 3, kind: 'crate' }, { row: 4, col: 4, kind: 'lock' }]);
    const iceId = state.grid[2][2]!.id, lockId = state.grid[4][4]!.id;
    const shuffled = applyPuzzleMove(state, { type: 'shuffle' }, level, rng, nextId).state;
    expect(shuffled.obstacles).toEqual(state.obstacles);
    expect(shuffled.grid[2][2]!.id).toBe(iceId);
    expect(shuffled.grid[4][4]!.id).toBe(lockId);
    const moved = applyPuzzleMove(shuffled, { type: 'hammer', row: 7, col: 2 }, level, rng, nextId).state;
    expect(moved.grid[2][2]!.id).toBe(iceId);
    expect(moved.grid[4][4]!.id).toBe(lockId);
    checkGrid(moved);
  });

  it('lets rockets hit empty crate slots and rejects normal taps on crates', () => {
    const { state, rng, nextId, level } = board([{ row: 3, col: 3, kind: 'crate' }]);
    expect(applyPuzzleMove(state, { type: 'tap', row: 3, col: 3 }, level, rng, nextId).valid).toBe(false);
    state.grid[3][0]!.special = 'rocket_h';
    const hit = applyPuzzleMove(state, { type: 'tap', row: 3, col: 0 }, level, rng, nextId);
    expect(hit.state.obstacles['3,3'].hp).toBe(1);
    expect(hit.state.totalBlocksCleared).toBe(7);
    checkGrid(hit.state);
  });

  it('loses at zero moves even when the score target is met but a lock remains', () => {
    const { state, rng, nextId, level } = board([{ row: 2, col: 2, kind: 'lock' }], { targetScore: 1, clearObstacles: true });
    state.score = 500; state.movesLeft = 1;
    state.grid[2][3]!.color = state.grid[2][2]!.color;
    const hit = applyPuzzleMove(state, { type: 'tap', row: 2, col: 2 }, level, rng, nextId);
    expect(hit.state.status).toBe('lost');
    expect(hit.state.obstacles['2,2'].hp).toBe(1);
  });

  it('replays mixed obstacle and booster moves deterministically and rejects trailing moves', () => {
    const level = { ...DEFAULT_LEVELS[6], maxMoves: 1, objective: { targetScore: 1000000, clearObstacles: true } };
    const initial = createInitialBoard(32, level);
    const moves: PuzzleMove[] = [{ type: 'shuffle' }, { type: 'hammer', row: 3, col: 3 }, { type: 'hammer', row: 3, col: 3 }];
    let state = initial.state;
    for (const move of moves) state = applyPuzzleMove(state, move, level, initial.rng, initial.nextId).state;
    expect(replayPuzzleSession(32, level, moves).finalState).toEqual(state);
    expect(replayPuzzleSession(32, level, [{ type: 'tap', row: 99, col: 0 }]).verified).toBe(false);
    const winning = { ...legacyLevel(1)!, objective: { targetScore: 1 } };
    const wonMoves: PuzzleMove[] = [{ type: 'hammer', row: 0, col: 0 }];
    expect(replayPuzzleSession(1, winning, wonMoves).finalState.status).toBe('won');
    expect(replayPuzzleSession(1, winning, [...wonMoves, { type: 'shuffle' }]).verified).toBe(false);
  });
});

// Generated with the shipped 0.2 engine, including its RNG sequence, gravity and special blocks.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/legacy-puzzles.json', import.meta.url), 'utf8')) as Array<{ seed: number; levelId: number; moves: PuzzleMove[]; digest: string }>;
describe('saved puzzles from version 0.2', () => {
  it.each(fixtures)('preserves the board and score for seed $seed, level $levelId', fixture => {
    const replay = replayPuzzleSession(fixture.seed, legacyLevel(fixture.levelId)!, fixture.moves);
    expect(replay.verified).toBe(true);
    const { obstacles, obstaclesCleared, ...legacyState } = replay.finalState;
    expect(obstacles).toEqual({}); expect(obstaclesCleared).toBe(0);
    expect(createHash('sha256').update(JSON.stringify(legacyState)).digest('hex')).toBe(fixture.digest);
  });
});
