/**
 * Playback of attributed human alphabet recordings bundled with the app.
 * These recordings teach letter names; they are not a certification of tajwid.
 */

export interface AudioPlaybackResult {
  status: 'played' | 'unavailable';
  message: string;
  audioPath: string;
}

let activeAudio: HTMLAudioElement | null = null;

export function stopHijaiyahAudio() {
  activeAudio?.pause();
  activeAudio = null;
}

export async function playHijaiyahAudio(audioPath: string, letterName: string, volume = 1, element?: HTMLAudioElement | null): Promise<AudioPlaybackResult> {
  if (typeof window === 'undefined') {
    return {
      status: 'unavailable',
      message: 'Pemutaran audio hanya tersedia di peramban.',
      audioPath,
    };
  }

  try {
    if (!/^\/assets\/audio\/hijaiyah\/\d{2}-[a-z0-9-]+\.mp3$/.test(audioPath)) throw new Error('Unknown audio asset');
    stopHijaiyahAudio();
    window.speechSynthesis?.cancel();
    const audio = element || new Audio(audioPath);
    audio.src = audioPath;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    activeAudio = audio;
    await audio.play();
    return {
      status: 'played',
      message: volume > 0 ? `Memutar rekaman nama huruf ${letterName}.` : 'Volume sedang nol. Naikkan volume di Profil untuk mendengarkan.',
      audioPath,
    };
  } catch {
    return {
      status: 'unavailable',
      message: `Rekaman ${letterName} belum dapat diputar. Ketuk kembali tombol dengarkan atau periksa volume perangkat.`,
      audioPath,
    };
  }
}
