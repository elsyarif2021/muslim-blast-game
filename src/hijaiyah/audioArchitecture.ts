/**
 * Verified Hijaiyah Pronunciation Audio Architecture
 *
 * Strictly checks for verified studio-recorded audio files (.mp3) under /assets/audio/hijaiyah/.
 * Never fabricates or approximates Arabic Tajwid pronunciation using synthetic speech.
 */

export interface AudioPlaybackResult {
  status: 'played' | 'missing_verified_asset';
  message: string;
  audioPath: string;
}

let activeAudio: HTMLAudioElement | null = null;

export async function playVerifiedHijaiyahAudio(audioPath: string, letterName: string): Promise<AudioPlaybackResult> {
  if (typeof window === 'undefined') {
    return {
      status: 'missing_verified_asset',
      message: 'Pemutaran audio hanya tersedia di peramban.',
      audioPath,
    };
  }

  try {
    const check = await fetch(audioPath, { method: 'HEAD' });
    const contentType = check.headers.get('content-type') || '';
    const isAudio = check.ok && (contentType.includes('audio') || contentType.includes('octet-stream'));
    if (!isAudio) {
      return {
        status: 'missing_verified_asset',
        message: `Rekaman pelafalan terverifikasi untuk huruf ${letterName} belum tersedia di ${audioPath}. Unggah berkas audio qari resmi sebelum publikasi.`,
        audioPath,
      };
    }

    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    const audio = new Audio(audioPath);
    activeAudio = audio;
    await audio.play();
    return {
      status: 'played',
      message: `Memutar pelafalan terverifikasi huruf ${letterName}.`,
      audioPath,
    };
  } catch {
    return {
      status: 'missing_verified_asset',
      message: `Berkas audio terverifikasi untuk huruf ${letterName} belum dipasang (${audioPath}). Pelajari makhraj tertulis di bawah ini.`,
      audioPath,
    };
  }
}
