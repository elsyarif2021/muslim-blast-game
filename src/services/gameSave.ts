import type { HydratedUserState } from './api.ts';
import type { GameLevelConfig, PuzzleMove } from '../types/index.ts';
import type { DailyActivity } from '../game/dailyChallenge.ts';

export interface GameResult {
  ok: true;
  status: 'won' | 'lost';
  verifiedScore: number;
  stars: number;
  koinAwarded: number;
  permataAwarded: number;
}
export interface LocalSession {
  seed: number;
  levelId: number;
  boosters: Record<string, number>;
  moves: PuzzleMove[];
  levelSnapshot?: GameLevelConfig;
  result?: GameResult;
}
export interface SavedGame {
  version: 1;
  user: HydratedUserState;
  sessions: Record<string, LocalSession>;
  quizReceipts: Record<string, number>;
  activeSessionId: string | null;
  daily: DailyActivity;
}
