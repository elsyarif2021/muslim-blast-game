import { describe, it, expect } from 'vitest';
import { mimoEvolution } from './playerEvolution.ts';
describe('Mimo evolution', () => {
  it('handles stage boundaries', () => {
    expect(mimoEvolution(499).stage.name).toBe('Sahabat Mimo');
    expect(mimoEvolution(500).stage.name).toBe('Penjelajah Ilmu');
    expect(mimoEvolution(1500).stage.name).toBe('Bintang Kebaikan');
    expect(mimoEvolution(3500).remaining).toBe(0);
  });
  it('handles invalid XP', () => {
    expect(mimoEvolution(NaN).remaining).toBe(500);
    expect(mimoEvolution(-1).remaining).toBe(500);
  });
});
