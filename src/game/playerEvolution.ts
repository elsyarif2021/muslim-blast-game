export const MIMO_STAGES = [
  { name: 'Sahabat Mimo', xp: 0 },
  { name: 'Penjelajah Ilmu', xp: 500 },
  { name: 'Bintang Kebaikan', xp: 1500 },
  { name: 'Penjaga Hikmah', xp: 3500 },
] as const;
export function mimoEvolution(xp: number) {
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let index = 0;
  for (let i = 1; i < MIMO_STAGES.length; i++) if (safe >= MIMO_STAGES[i].xp) index = i;
  const stage = MIMO_STAGES[index];
  const next = MIMO_STAGES[index + 1];
  return { stage, next, remaining: next ? next.xp - safe : 0 };
}
