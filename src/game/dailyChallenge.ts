import type { DailyChallengeProgress } from '../types/index.ts';

export interface DailyActivity {
  date: string;
  puzzleWins: number;
  blocksCleared: number;
  quizCorrect: number;
  claimed: boolean;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createDailyActivity(now: Date): DailyActivity {
  return { date: localDateKey(now), puzzleWins: 0, blocksCleared: 0, quizCorrect: 0, claimed: false };
}

export function describeDailyChallenge(activity: DailyActivity): DailyChallengeProgress {
  const variation = Array.from(activity.date).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const tasks = [
    { id: 'puzzle', label: 'Menangkan 1 level puzzle', current: activity.puzzleWins, target: 1 },
    { id: 'blocks', label: `Ledakkan ${30 + variation * 10} blok`, current: activity.blocksCleared, target: 30 + variation * 10 },
    { id: 'quiz', label: `Jawab benar ${4 + variation} soal kuis`, current: activity.quizCorrect, target: 4 + variation },
  ];
  return { date: activity.date, tasks, ready: tasks.every(task => task.current >= task.target), claimed: activity.claimed, rewardKoin: 150, rewardPermata: 3 };
}
