import type { BlockColor, GameLevelConfig, ObstacleKind, PuzzleCell, PuzzleMove, SpecialType } from '../types/index.ts';

export const BOARD_SIZE = 8;

export const ALL_BLOCK_COLORS: BlockColor[] = [
  'emerald_geo',
  'blue_crescent',
  'gold_star',
  'purple_lantern',
  'orange_ornament',
  'pink_flower',
];

export const BLOCK_META: Record<
  BlockColor,
  { label: string; primary: string; highlight: string; shadow: string; glyph: string }
> = {
  emerald_geo: {
    label: 'Geometri Zamrud',
    primary: '#10B981',
    highlight: '#6EE7B7',
    shadow: '#047857',
    glyph: 'octagram',
  },
  blue_crescent: {
    label: 'Sabit Langit',
    primary: '#38BDF8',
    highlight: '#BAE6FD',
    shadow: '#0284C7',
    glyph: 'crescent',
  },
  gold_star: {
    label: 'Bintang Emas',
    primary: '#F5C542',
    highlight: '#FEF08A',
    shadow: '#B45309',
    glyph: 'star',
  },
  purple_lantern: {
    label: 'Lentera Ungu',
    primary: '#8B5CF6',
    highlight: '#DDD6FE',
    shadow: '#5B21B6',
    glyph: 'lantern',
  },
  orange_ornament: {
    label: 'Ornamen Jingga',
    primary: '#F97316',
    highlight: '#FED7AA',
    shadow: '#C2410C',
    glyph: 'ornament',
  },
  pink_flower: {
    label: 'Bunga Mawar',
    primary: '#EC4899',
    highlight: '#FBCFE8',
    shadow: '#9D174D',
    glyph: 'flower',
  },
};

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PuzzleBoardState {
  grid: (PuzzleCell | null)[][];
  score: number;
  movesLeft: number;
  combo: number;
  collectedTarget: number;
  totalBlocksCleared: number;
  status: 'playing' | 'won' | 'lost';
  reshuffles: number;
  obstacles: Record<string, { kind: ObstacleKind; hp: number }>;
  obstaclesCleared: number;
}

export function createInitialBoard(
  seed: number,
  level: GameLevelConfig
): { state: PuzzleBoardState; rng: () => number; nextId: () => string } {
  const rng = createSeededRng(seed);
  let seq = 1;
  const nextId = () => `tile_${seq++}`;
  const activeColors = ALL_BLOCK_COLORS.slice(0, level.colorsCount);

  const grid: (PuzzleCell | null)[][] = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      id: nextId(),
      color: activeColors[Math.floor(rng() * activeColors.length)],
      special: 'none',
      row,
      col,
    }))
  );
  const obstacles: PuzzleBoardState['obstacles'] = {};
  for (const obstacle of level.obstacles || []) {
    obstacles[`${obstacle.row},${obstacle.col}`] = { kind: obstacle.kind, hp: obstacle.kind === 'ice' ? 1 : 2 };
    if (obstacle.kind === 'crate') grid[obstacle.row][obstacle.col] = null;
  }

  // Ensure at least one valid playable match exists at start
  if (!hasValidMoves(grid)) {
    if (!Object.keys(obstacles).length) grid[3][3]!.color = grid[3][4]!.color;
    else if (grid[0][0] && grid[0][1]) grid[0][0]!.color = grid[0][1]!.color;
  }

  return {
    state: {
      grid,
      score: 0,
      movesLeft: level.maxMoves,
      combo: 0,
      collectedTarget: 0,
      totalBlocksCleared: 0,
      status: 'playing',
      reshuffles: 0,
      obstacles,
      obstaclesCleared: 0,
    },
    rng,
    nextId,
  };
}

export function findConnectedGroup(
  grid: (PuzzleCell | null)[][],
  startRow: number,
  startCol: number
): PuzzleCell[] {
  const start = grid[startRow]?.[startCol];
  if (!start) return [];
  if (start.special !== 'none') return [start];

  const visited = new Set<string>();
  const stack: [number, number][] = [[startRow, startCol]];
  const group: PuzzleCell[] = [];
  const targetColor = start.color;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = grid[r]?.[c];
    if (!cell || cell.color !== targetColor || cell.special !== 'none') continue;

    group.push(cell);

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        stack.push([nr, nc]);
      }
    }
  }

  return group;
}

export function hasValidMoves(grid: (PuzzleCell | null)[][]): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      if (cell.special !== 'none') return true;
      const right = grid[r]?.[c + 1];
      const down = grid[r + 1]?.[c];
      if (right && right.special === 'none' && right.color === cell.color) return true;
      if (down && down.special === 'none' && down.color === cell.color) return true;
    }
  }
  return false;
}

export function reshuffleGrid(
  grid: (PuzzleCell | null)[][],
  rng: () => number,
  obstacles: PuzzleBoardState['obstacles'] = {}
): (PuzzleCell | null)[][] {
  const cells: PuzzleCell[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] && !obstacles[`${r},${c}`]) cells.push({ ...grid[r][c]! });
    }
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cells[i];
    cells[i] = cells[j];
    cells[j] = tmp;
  }

  const nextGrid: (PuzzleCell | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
  let idx = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (obstacles[`${r},${c}`]) {
        nextGrid[r][c] = grid[r][c] ? { ...grid[r][c]! } : null;
      } else if (idx < cells.length) {
        nextGrid[r][c] = { ...cells[idx++], row: r, col: c };
      }
    }
  }

  if (!hasValidMoves(nextGrid)) {
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE - 1; c++) {
      if (nextGrid[r][c] && nextGrid[r][c + 1]) {
        nextGrid[r][c + 1] = { ...nextGrid[r][c + 1]!, color: nextGrid[r][c]!.color, special: 'none' };
        return nextGrid;
      }
    }
  }

  return nextGrid;
}

function collectSpecialBlast(
  grid: (PuzzleCell | null)[][],
  origin: PuzzleCell,
  toRemove: Set<string>,
  obstacles: PuzzleBoardState['obstacles']
) {
  const queue: PuzzleCell[] = [origin];
  const triggered = new Set<string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const key = `${curr.row},${curr.col}`;
    if (triggered.has(key)) continue;
    triggered.add(key);
    toRemove.add(key);

    if (curr.special === 'rocket_h') {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const target = grid[curr.row][c];
        if (target || obstacles[`${curr.row},${c}`]?.kind === 'crate') {
          toRemove.add(`${curr.row},${c}`);
          if (target && target.special !== 'none' && !triggered.has(`${curr.row},${c}`)) {
            queue.push(target);
          }
        }
      }
    } else if (curr.special === 'rocket_v') {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const target = grid[r][curr.col];
        if (target || obstacles[`${r},${curr.col}`]?.kind === 'crate') {
          toRemove.add(`${r},${curr.col}`);
          if (target && target.special !== 'none' && !triggered.has(`${r},${curr.col}`)) {
            queue.push(target);
          }
        }
      }
    } else if (curr.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = curr.row + dr;
          const nc = curr.col + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            const target = grid[nr][nc];
            if (target || obstacles[`${nr},${nc}`]?.kind === 'crate') {
              toRemove.add(`${nr},${nc}`);
              if (target && target.special !== 'none' && !triggered.has(`${nr},${nc}`)) {
                queue.push(target);
              }
            }
          }
        }
      }
    } else if (curr.special === 'rainbow') {
      // Clear all cells matching the rainbow's primary color
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const target = grid[r][c];
          if (target && target.color === curr.color) {
            toRemove.add(`${r},${c}`);
          }
        }
      }
    }
  }
}

export interface MoveResult {
  valid: boolean;
  removedCells: PuzzleCell[];
  createdSpecial: { row: number; col: number; special: SpecialType; color: BlockColor } | null;
  pointsGained: number;
  reshuffled: boolean;
  state: PuzzleBoardState;
}

export function applyPuzzleMove(
  prevState: PuzzleBoardState,
  move: PuzzleMove,
  level: GameLevelConfig,
  rng: () => number,
  nextId: () => string
): MoveResult {
  if (prevState.status !== 'playing') {
    return {
      valid: false,
      removedCells: [],
      createdSpecial: null,
      pointsGained: 0,
      reshuffled: false,
      state: prevState,
    };
  }

  const activeColors = ALL_BLOCK_COLORS.slice(0, level.colorsCount);
  const grid = prevState.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const obstacles = Object.fromEntries(Object.entries(prevState.obstacles).map(([key, value]) => [key, { ...value }]));

  if (move.type === 'extra_moves') {
    return {
      valid: true,
      removedCells: [],
      createdSpecial: null,
      pointsGained: 0,
      reshuffled: false,
      state: {
        ...prevState,
        movesLeft: prevState.movesLeft + 5,
      },
    };
  }

  if (move.type === 'shuffle') {
    const shuffled = reshuffleGrid(grid, rng, obstacles);
    return {
      valid: true,
      removedCells: [],
      createdSpecial: null,
      pointsGained: 0,
      reshuffled: true,
      state: {
        ...prevState,
        grid: shuffled,
        reshuffles: prevState.reshuffles + 1,
      },
    };
  }

  const row = move.row ?? -1;
  const col = move.col ?? -1;
  const tapped = grid[row]?.[col];
  if (!tapped && !(move.type === 'hammer' && obstacles[`${row},${col}`]?.kind === 'crate')) {
    return {
      valid: false,
      removedCells: [],
      createdSpecial: null,
      pointsGained: 0,
      reshuffled: false,
      state: prevState,
    };
  }

  const toRemove = new Set<string>();
  let createdSpecial: { row: number; col: number; special: SpecialType; color: BlockColor } | null = null;
  let consumeMove = true;

  if (move.type === 'hammer') {
    consumeMove = false;
    if (tapped?.special && tapped.special !== 'none') {
      collectSpecialBlast(grid, tapped, toRemove, obstacles);
    } else {
      toRemove.add(`${row},${col}`);
    }
  } else if (tapped) {
    // Standard tap
    if (tapped.special !== 'none') {
      collectSpecialBlast(grid, tapped, toRemove, obstacles);
    } else {
      const group = findConnectedGroup(grid, row, col);
      if (group.length < 2) {
        return {
          valid: false,
          removedCells: [],
          createdSpecial: null,
          pointsGained: 0,
          reshuffled: false,
          state: prevState,
        };
      }
      for (const cell of group) {
        toRemove.add(`${cell.row},${cell.col}`);
      }
      // Spawn special booster if large match!
      if (group.length >= 9) {
        createdSpecial = { row, col, special: 'rainbow', color: tapped.color };
      } else if (group.length >= 7) {
        createdSpecial = { row, col, special: 'bomb', color: tapped.color };
      } else if (group.length >= 5) {
        createdSpecial = {
          row,
          col,
          special: rng() > 0.5 ? 'rocket_h' : 'rocket_v',
          color: tapped.color,
        };
      }
    }
  }

  const removedCells: PuzzleCell[] = [];
  let targetColorCollected = 0;
  let clearedObstacles = 0;
  const damaged = new Set<string>();
  const damageObstacle = (key: string) => {
    if (!obstacles[key] || damaged.has(key)) return;
    damaged.add(key);
    obstacles[key].hp -= 1;
    if (obstacles[key].hp <= 0) { delete obstacles[key]; clearedObstacles++; }
  };

  for (const key of toRemove) {
    const [rStr, cStr] = key.split(',');
    const r = Number(rStr);
    const c = Number(cStr);
    const cell = grid[r][c];
    if (obstacles[key]) { damageObstacle(key); continue; }
    if (cell) {
      removedCells.push(cell);
      if (level.objective.collectColor && cell.color === level.objective.collectColor) {
        targetColorCollected++;
      }
      grid[r][c] = null;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const neighbor = `${nr},${nc}`;
        if (obstacles[neighbor]?.kind === 'crate') damageObstacle(neighbor);
      }
    }
  }

  if (createdSpecial && grid[createdSpecial.row][createdSpecial.col]) createdSpecial = null;
  if (createdSpecial) {
    grid[createdSpecial.row][createdSpecial.col] = {
      id: nextId(),
      color: createdSpecial.color,
      special: createdSpecial.special,
      row: createdSpecial.row,
      col: createdSpecial.col,
    };
  }

  // Gravity collapse
  for (let c = 0; c < BOARD_SIZE; c++) {
    let segmentBottom = BOARD_SIZE - 1;
    for (let anchor = BOARD_SIZE - 1; anchor >= -1; anchor--) {
      if (anchor !== -1 && !obstacles[`${anchor},${c}`]) continue;
      let writeRow = segmentBottom;
      for (let r = segmentBottom; r > anchor; r--) {
        if (grid[r][c]) {
          const cell = grid[r][c]!;
          grid[r][c] = null;
          grid[writeRow][c] = { ...cell, row: writeRow, col: c };
          writeRow--;
        }
      }
      for (let r = writeRow; r > anchor; r--) grid[r][c] = {
        id: nextId(), color: activeColors[Math.floor(rng() * activeColors.length)], special: 'none', row: r, col: c,
      };
      segmentBottom = anchor - 1;
    }
  }

  const combo = removedCells.length >= 5 ? prevState.combo + 1 : 1;
  const multiplier = Math.min(4, 1 + (combo - 1) * 0.5);
  const pointsGained = Math.round(removedCells.length * 25 * multiplier + (createdSpecial ? 120 : 0) + clearedObstacles * 40);

  const nextScore = prevState.score + pointsGained;
  const nextCollected = prevState.collectedTarget + targetColorCollected;
  const nextMoves = consumeMove ? Math.max(0, prevState.movesLeft - 1) : prevState.movesLeft;

  let reshuffled = false;
  let finalGrid = grid;
  if (!hasValidMoves(finalGrid)) {
    finalGrid = reshuffleGrid(finalGrid, rng, obstacles);
    reshuffled = true;
  }

  const scoreMet = nextScore >= level.objective.targetScore;
  const collectMet =
    !level.objective.collectColor ||
    !level.objective.collectCount ||
    nextCollected >= level.objective.collectCount;

  let nextStatus: 'playing' | 'won' | 'lost' = 'playing';
  const obstaclesMet = !level.objective.clearObstacles || Object.keys(obstacles).length === 0;
  if (scoreMet && collectMet && obstaclesMet) {
    nextStatus = 'won';
  } else if (nextMoves <= 0) {
    nextStatus = 'lost';
  }

  return {
    valid: true,
    removedCells,
    createdSpecial,
    pointsGained,
    reshuffled,
    state: {
      grid: finalGrid,
      score: nextScore,
      movesLeft: nextMoves,
      combo,
      collectedTarget: nextCollected,
      totalBlocksCleared: prevState.totalBlocksCleared + removedCells.length,
      status: nextStatus,
      reshuffles: prevState.reshuffles + (reshuffled ? 1 : 0),
      obstacles,
      obstaclesCleared: prevState.obstaclesCleared + clearedObstacles,
    },
  };
}

export function calculateStarRating(score: number, targetScore: number): 1 | 2 | 3 {
  if (score >= targetScore * 1.55) return 3;
  if (score >= targetScore * 1.2) return 2;
  return 1;
}

/**
 * Deterministic server-side replay verifier:
 * Replays moves from the server-issued seed to prevent client score tampering.
 */
export function replayPuzzleSession(
  seed: number,
  level: GameLevelConfig,
  moves: PuzzleMove[]
): { verified: boolean; finalState: PuzzleBoardState; stars: number } {
  const { state: initialState, rng, nextId } = createInitialBoard(seed, level);
  let current = initialState;

  for (const move of moves) {
    if (current.status !== 'playing') return { verified: false, finalState: current, stars: 0 };
    const res = applyPuzzleMove(current, move, level, rng, nextId);
    if (!res.valid) {
      return { verified: false, finalState: current, stars: 0 };
    }
    current = res.state;
  }

  const stars = current.status === 'won' ? calculateStarRating(current.score, level.objective.targetScore) : 0;
  return {
    verified: true,
    finalState: current,
    stars,
  };
}
