import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HIJAIYAH_LETTERS } from './hijaiyahData.ts';
import { HIJAIYAH_AUDIO_CREDITS } from './audioSources.ts';
import { playHijaiyahAudio, stopHijaiyahAudio } from './audioArchitecture.ts';

describe('bundled Hijaiyah recordings', () => {
  it('has one attributed, intact MP3 for every letter, including both Ha letters', () => {
    const directory = new URL('../../public/assets/audio/hijaiyah/', import.meta.url);
    expect(readdirSync(directory).filter(file => file.endsWith('.mp3'))).toHaveLength(28);
    expect(HIJAIYAH_AUDIO_CREDITS.entries).toHaveLength(28);
    for (const letter of HIJAIYAH_LETTERS) {
      const recording = HIJAIYAH_AUDIO_CREDITS.entries.find(item => item.letterId === letter.id)!;
      expect(recording.path).toBe(letter.audioPath);
      expect(recording.author).toBe('Ruaa GHAREEB');
      expect(recording.license).toBe('CC BY-SA 4.0');
      expect(recording.sourceUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      const bytes = readFileSync(new URL(letter.audioPath.slice('/assets/audio/hijaiyah/'.length), directory));
      expect(bytes.length).toBeGreaterThan(5000);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(recording.sha256);
    }
    const manifest = JSON.parse(readFileSync(new URL('credits.json', directory), 'utf8'));
    expect(manifest).toEqual(HIJAIYAH_AUDIO_CREDITS);
  });
});

describe('letter audio playback', () => {
  afterEach(() => { stopHijaiyahAudio(); vi.unstubAllGlobals(); });

  it('reports unsupported playback without crashing outside a browser', async () => {
    vi.stubGlobal('window', undefined);
    expect((await playHijaiyahAudio(HIJAIYAH_LETTERS[0].audioPath, 'Alif')).status).toBe('unavailable');
  });

  it('starts from a user gesture, applies volume and stops the previous recording', async () => {
    const cancel = vi.fn();
    vi.stubGlobal('window', { speechSynthesis: { cancel } });
    const first = { pause: vi.fn(), play: vi.fn().mockResolvedValue(undefined), src: '', currentTime: 5, volume: 1 };
    const second = { pause: vi.fn(), play: vi.fn().mockResolvedValue(undefined), src: '', currentTime: 5, volume: 1 };
    const result = await playHijaiyahAudio(HIJAIYAH_LETTERS[0].audioPath, 'Alif', 0.25, first as unknown as HTMLAudioElement);
    expect(result.status).toBe('played');
    expect(first.play).toHaveBeenCalledOnce();
    expect(first.volume).toBe(0.25); expect(first.currentTime).toBe(0);
    await playHijaiyahAudio(HIJAIYAH_LETTERS[1].audioPath, 'Ba', 0, second as unknown as HTMLAudioElement);
    expect(first.pause).toHaveBeenCalledOnce(); expect(second.volume).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(2);
    stopHijaiyahAudio(); expect(second.pause).toHaveBeenCalledOnce();
  });

  it('returns a readable failure for blocked playback and never opens arbitrary URLs', async () => {
    vi.stubGlobal('window', {});
    const audio = { pause: vi.fn(), play: vi.fn().mockRejectedValue(new Error('NotAllowedError')), src: '', currentTime: 0, volume: 1 };
    expect((await playHijaiyahAudio('https://example.com/untrusted.mp3', 'Alif', 1, audio as unknown as HTMLAudioElement)).status).toBe('unavailable');
    expect(audio.play).not.toHaveBeenCalled();
    const failed = await playHijaiyahAudio(HIJAIYAH_LETTERS[0].audioPath, 'Alif', 1, audio as unknown as HTMLAudioElement);
    expect(failed.status).toBe('unavailable'); expect(failed.message).toContain('belum dapat diputar');
  });
});
