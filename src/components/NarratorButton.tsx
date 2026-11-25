import React, { useEffect, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { stopHijaiyahAudio } from '../hijaiyah/audioArchitecture.ts';

export function NarratorButton({ text, volume = 0.6 }: { text: string; volume?: number }) {
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const available = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  useEffect(() => {
    setSpeaking(false); setMessage('');
    return () => {
      if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; if (available) window.speechSynthesis.cancel(); }
      utterance.current = null;
    };
  }, [text, available]);
  const toggle = () => {
    if (!available) return;
    if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; utterance.current = null; }
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    stopHijaiyahAudio();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'id-ID'; speech.rate = 0.9; speech.volume = Math.max(0, Math.min(1, volume));
    const voice = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith('id'));
    if (voice) speech.voice = voice;
    speech.onend = () => { setSpeaking(false); setMessage('Panduan suara selesai.'); };
    speech.onerror = () => { setSpeaking(false); setMessage('Suara panduan belum tersedia pada perangkat ini. Petunjuk tertulis tetap dapat digunakan.'); };
    utterance.current = speech; setSpeaking(true); setMessage('');
    window.speechSynthesis.speak(speech);
  };
  return <div className="space-y-1"><button type="button" disabled={!available || volume <= 0} onClick={toggle} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-[#064E3B] cursor-pointer disabled:opacity-50">{speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}{speaking ? 'Hentikan panduan' : 'Dengarkan panduan'}</button><p role="status" className="text-xs text-[#064E3B]/75">{message || (!available ? 'Panduan suara belum didukung browser ini.' : volume <= 0 ? 'Naikkan volume di Profil untuk mendengarkan panduan.' : 'Panduan Bahasa Indonesia memakai suara perangkat.')}</p></div>;
}
