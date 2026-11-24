class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public volume = 0.6;

  private getContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0 || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', delay = 0, gainMul = 0.22) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const vol = Math.max(0.001, this.volume * gainMul);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTap() {
    this.playTone(520, 0.09, 'triangle', 0, 0.16);
  }

  playBlast(count: number) {
    const base = 360 + Math.min(count, 10) * 35;
    this.playTone(base, 0.14, 'triangle', 0, 0.22);
    this.playTone(base * 1.25, 0.16, 'sine', 0.04, 0.2);
  }

  playSpecial() {
    this.playTone(440, 0.12, 'sine', 0, 0.24);
    this.playTone(660, 0.14, 'triangle', 0.06, 0.24);
    this.playTone(880, 0.2, 'sine', 0.12, 0.24);
  }

  playCoin() {
    this.playTone(987.77, 0.08, 'sine', 0, 0.18);
    this.playTone(1318.51, 0.16, 'sine', 0.07, 0.18);
  }

  playCorrect() {
    this.playTone(523.25, 0.12, 'triangle', 0, 0.2);
    this.playTone(659.25, 0.18, 'triangle', 0.09, 0.22);
  }

  playWrong() {
    this.playTone(260, 0.15, 'sawtooth', 0, 0.12);
    this.playTone(210, 0.2, 'sawtooth', 0.1, 0.12);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.playTone(n, 0.22, 'triangle', idx * 0.09, 0.24));
  }

  playDefeat() {
    const notes = [392.0, 349.23, 311.13];
    notes.forEach((n, idx) => this.playTone(n, 0.24, 'sine', idx * 0.13, 0.18));
  }
}

export const soundEngine = new SoundEngine();

export function triggerHaptic(enabled: boolean, pattern: number | number[] = 14) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported vibration errors
  }
}
