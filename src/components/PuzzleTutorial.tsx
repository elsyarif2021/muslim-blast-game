import React, { useEffect, useRef, useState } from 'react';
import { Hammer, PlusCircle, Shuffle, Sparkles, Star } from 'lucide-react';

const TRAINING_BLOCKS = ['green', 'green', 'blue', 'gold', 'purple', 'blue', 'purple', 'gold', 'gold'];
const STYLES: Record<string, string> = {
  green: 'bg-emerald-500 border-emerald-700', blue: 'bg-sky-400 border-sky-600',
  gold: 'bg-amber-400 border-amber-600', purple: 'bg-violet-400 border-violet-600',
};

export function PuzzleTutorial({ onDone, modal = false }: { onDone: () => void; modal?: boolean }) {
  const [step, setStep] = useState(0);
  const [matched, setMatched] = useState(false);
  const [tool, setTool] = useState('');
  const [hint, setHint] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!modal || event.key !== 'Tab') return;
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const chooseBlock = (index: number) => {
    if (step !== 0 || matched) return;
    if (index < 2) { setMatched(true); setHint('Hebat! Dua blok yang menempel memberi 50 poin.'); }
    else setHint('Coba ketuk salah satu dari dua blok hijau di baris atas.');
  };
  const tools = [
    { id: 'hammer', title: 'Palu', icon: Hammer, detail: 'Palu menghapus satu blok pilihanmu. Stok baru dipakai setelah kamu mengaktifkan alat.' },
    { id: 'shuffle', title: 'Acak papan', icon: Shuffle, detail: 'Acak papan mengubah posisi blok tanpa mengurangi langkah biasa.' },
    { id: 'moves', title: '+5 langkah', icon: PlusCircle, detail: 'Lima langkah ekstra memberi kesempatan untuk mencapai target.' },
  ];
  return <div ref={root} onKeyDown={trapFocus} className="w-full max-w-md mx-auto rounded-3xl border-2 border-[#F5C542] bg-[#FFF8DC] text-[#022C22] p-5 sm:p-7 space-y-5 shadow-xl">
    <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-sm font-semibold text-[#064E3B]"><Sparkles className="w-4 h-4" />Belajar bersama Mimo</span><button type="button" onClick={onDone} className="min-h-11 px-2 text-sm font-semibold underline cursor-pointer">Lewati panduan</button></div>
    <div className="flex gap-2" aria-label={`Langkah panduan ${step + 1} dari 3`}>{[0, 1, 2].map(index => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-emerald-600' : 'bg-emerald-100'}`} />)}</div>
    <h2 className="font-display text-2xl font-bold text-[#064E3B]">{['Ketuk blok yang sewarna', 'Raih target sebelum langkah habis', 'Kenali tiga booster'][step]}</h2>
    {step === 0 && <><p className="text-sm leading-relaxed">Cari minimal dua blok sewarna yang menempel di atas, bawah, kiri, atau kanan. Ketuk salah satunya. Coba pasangan hijau di bawah.</p><div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto p-3 rounded-2xl bg-[#064E3B]">{TRAINING_BLOCKS.map((color, index) => <button key={index} type="button" aria-label={`Blok ${index < 2 ? 'hijau' : color} latihan ${index + 1}`} disabled={matched} onClick={() => chooseBlock(index)} className={`aspect-square min-h-12 rounded-xl border-b-4 text-white flex items-center justify-center cursor-pointer ${matched && index < 2 ? 'opacity-15 bg-emerald-100 border-transparent' : STYLES[color]} ${index < 2 && !matched ? 'ring-2 ring-white' : ''}`}><Star className="w-5 h-5" /></button>)}</div><p role="status" className="text-sm min-h-10 font-semibold text-[#064E3B]">{hint || 'Dua blok hijau diberi garis putih sebagai petunjuk.'}</p><button type="button" disabled={!matched} onClick={() => setStep(1)} className="w-full min-h-12 rounded-xl bg-[#064E3B] text-white font-bold disabled:opacity-40 cursor-pointer">Lanjutkan latihan</button></>}
    {step === 1 && <><div className="rounded-2xl bg-emerald-100 p-5 text-center space-y-2"><p className="font-display text-3xl text-[#064E3B]">50 / 50</p><p className="font-semibold">Target tercapai · 4 langkah tersisa</p></div><p className="text-sm leading-relaxed">Kamu menang saat skor mencapai target. Pada level tertentu, kumpulkan juga warna yang diminta. Satu kelompok blok memakai satu langkah.</p><p className="text-sm">Kelompok besar bisa menciptakan roket, bom, atau pelangi yang membantu menghapus lebih banyak blok.</p><button type="button" onClick={() => setStep(2)} className="w-full min-h-12 rounded-xl bg-[#064E3B] text-white font-bold cursor-pointer">Coba kenali booster</button></>}
    {step === 2 && <><p className="text-sm">Ketuk salah satu alat untuk melihat kegunaannya. Latihan ini tidak memakai stok booster milikmu.</p><div className="grid grid-cols-3 gap-2">{tools.map(({ id, title, icon: Icon }) => <button key={id} type="button" onClick={() => setTool(id)} aria-pressed={tool === id} className={`min-h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-xs font-bold cursor-pointer ${tool === id ? 'border-emerald-700 bg-emerald-100' : 'border-emerald-100 bg-white'}`}><Icon className="w-6 h-6" />{title}</button>)}</div><p role="status" className="min-h-16 text-sm leading-relaxed">{tools.find(item => item.id === tool)?.detail || 'Pilih Palu, Acak papan, atau +5 langkah.'}</p><button type="button" disabled={!tool} onClick={onDone} className="w-full min-h-12 rounded-xl bg-[#F5C542] text-[#022C22] font-bold disabled:opacity-40 cursor-pointer">Selesai, siap bermain!</button></>}
  </div>;
}
