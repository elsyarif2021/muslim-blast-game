import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Eraser,
  RefreshCw,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { QUIZ_CATEGORIES } from '../data/quizQuestions.ts';
import { soundEngine } from '../game/soundEngine.ts';
import { playVerifiedHijaiyahAudio } from '../hijaiyah/audioArchitecture.ts';
import { HARAKAT_LESSONS, HIJAIYAH_LETTERS } from '../hijaiyah/hijaiyahData.ts';
import { api, type HydratedUserState } from '../services/api.ts';
import type { HijaiyahLetter, QuizDifficulty, QuizQuestion } from '../types/index.ts';

// =============================================================================
// 12. ISLAMIC EDUCATIONAL QUIZ (108 Draft Questions + Expert Review Status)
// =============================================================================
export const IslamicQuizScreen: React.FC<{
  user: HydratedUserState;
  questions: QuizQuestion[];
  onUserUpdate: (u: HydratedUserState) => void;
}> = ({ questions, onUserUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [difficulty, setDifficulty] = useState<'Semua' | QuizDifficulty>('Semua');
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ q: QuizQuestion; chosen: number; correct: boolean }>>([]);
  const [finished, setFinished] = useState(false);
  const [awardedKoin, setAwardedKoin] = useState<number | null>(null);

  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      const catOk = selectedCategory === 'Semua' || q.category === selectedCategory;
      const diffOk = difficulty === 'Semua' || q.difficulty === difficulty;
      return catOk && diffOk;
    });
  }, [questions, selectedCategory, difficulty]);

  const startQuiz = () => {
    const shuffled = [...filteredPool].sort(() => Math.random() - 0.5).slice(0, 8);
    setSessionQuestions(shuffled);
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswers([]);
    setFinished(false);
    setAwardedKoin(null);
  };

  const handleChoose = (optIdx: number) => {
    if (selectedOption !== null) return;
    const q = sessionQuestions[currentIdx];
    const correct = optIdx === q.correctIndex;
    setSelectedOption(optIdx);
    setAnswers((prev) => [...prev, { q, chosen: optIdx, correct }]);
    if (correct) soundEngine.playCorrect();
    else soundEngine.playWrong();
  };

  const handleNext = async () => {
    if (currentIdx + 1 < sessionQuestions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      return;
    }

    setFinished(true);
    const correctCount = answers.filter((a) => a.correct).length;
    try {
      const res = await api.submitQuiz(
        selectedCategory,
        sessionQuestions.length,
        correctCount,
        `quiz:${Date.now()}:${Math.random()}`
      );
      setAwardedKoin(res.koinAwarded);
      onUserUpdate(res.user);
      soundEngine.playCoin();
    } catch {
      setAwardedKoin(0);
    }
  };

  if (sessionQuestions.length === 0) {
    return (
      <div className="space-y-4 pb-6">
        <div className="rounded-3xl border-2 border-[#F5C542] bg-[#064E3B] p-5 text-[#FFF8DC] shadow-lg">
          <h1 className="font-display text-2xl font-bold text-[#F5C542]">Kuis Pengetahuan Islam</h1>
          <p className="mt-1 text-xs text-[#FFF8DC]/85">
            {questions.length} soal tersedia dalam 12 kategori. Soal berstatus draf ditandai untuk peninjauan ahli/ustadz di Panel Admin.
          </p>
        </div>

        <div className="rounded-2xl border border-[#064E3B]/15 bg-white p-4 space-y-4">
          <div>
            <div className="text-xs font-bold text-[#064E3B] mb-2">Pilih Kategori Ilmu</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('Semua')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  selectedCategory === 'Semua'
                    ? 'bg-[#064E3B] text-[#F5C542]'
                    : 'bg-[#FFF8DC] text-[#064E3B] border border-[#064E3B]/15'
                }`}
              >
                Semua ({questions.length})
              </button>
              {QUIZ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#064E3B] text-[#F5C542]'
                      : 'bg-[#FFF8DC] text-[#064E3B] border border-[#064E3B]/15'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-[#064E3B] mb-2">Tingkat Kesulitan</div>
            <div className="flex gap-2">
              {(['Semua', 'Mudah', 'Sedang', 'Sulit'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
                    difficulty === d
                      ? 'bg-[#F5C542] text-[#022C22]'
                      : 'bg-[#FFF8DC] text-[#064E3B] border border-[#064E3B]/15'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#064E3B]/10">
            <span className="text-xs text-[#064E3B]/75 tabular-nums">
              Soal cocok: <strong>{filteredPool.length}</strong> (diambil acak 8 soal per sesi)
            </span>
            <button
              type="button"
              disabled={filteredPool.length === 0}
              onClick={startQuiz}
              className="min-h-[46px] rounded-2xl bg-[#F5C542] px-6 py-2.5 font-display text-sm font-bold text-[#022C22] shadow-[0_4px_0_#B45309] hover:brightness-105 cursor-pointer disabled:opacity-50"
            >
              Mulai Kuis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const wrongList = answers.filter((a) => !a.correct);

    return (
      <div className="space-y-4 pb-6">
        <div className="rounded-3xl border-2 border-[#F5C542] bg-[#064E3B] p-6 text-center text-[#FFF8DC] shadow-xl">
          <Award className="w-12 h-12 text-[#F5C542] mx-auto" />
          <h2 className="mt-2 font-display text-2xl font-bold">Sesi Kuis Selesai!</h2>
          <p className="mt-1 text-sm text-[#FFF8DC]/90 tabular-nums">
            Jawaban Benar: <strong>{correctCount}</strong> / {sessionQuestions.length} · Hadiah:{' '}
            <strong className="text-[#F5C542]">+{awardedKoin ?? 100} Koin Ilmu</strong>
          </p>

          <div className="mt-5 flex gap-3 justify-center">
            <button
              type="button"
              onClick={startQuiz}
              className="min-h-[44px] rounded-xl bg-[#F5C542] px-5 text-sm font-bold text-[#022C22] cursor-pointer"
            >
              Main Kuis Lagi
            </button>
            <button
              type="button"
              onClick={() => setSessionQuestions([])}
              className="min-h-[44px] rounded-xl border border-[#F5C542]/50 px-4 text-sm font-bold text-[#FFF8DC] cursor-pointer"
            >
              Ganti Kategori
            </button>
          </div>
        </div>

        {/* Review Incorrect Answers */}
        <div className="rounded-2xl border border-[#064E3B]/15 bg-white p-4 space-y-3">
          <h3 className="font-display text-lg font-bold text-[#064E3B]">
            Ulasan Jawaban ({wrongList.length === 0 ? 'Semua Benar!' : `${wrongList.length} Perlu Dipelajari`})
          </h3>
          {wrongList.length === 0 ? (
            <p className="text-sm text-[#10B981] font-semibold">
              MasyaAllah, kamu menjawab semua pertanyaan dengan tepat!
            </p>
          ) : (
            wrongList.map((item) => (
              <div key={item.q.id} className="rounded-xl bg-[#FFF8DC] border border-[#F5C542]/50 p-3.5 space-y-1.5">
                <div className="text-sm font-bold text-[#022C22]">{item.q.question}</div>
                <div className="text-xs text-red-700">
                  Jawabanmu: {item.q.options[item.chosen]}
                </div>
                <div className="text-xs text-[#047857] font-bold">
                  Jawaban tepat: {item.q.options[item.q.correctIndex]}
                </div>
                <p className="text-xs text-[#064E3B]/85">{item.q.explanation}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const q = sessionQuestions[currentIdx];
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-4 pb-6">
      {/* Emerald & Wood-inspired Quiz Frame */}
      <div className="rounded-3xl border-2 border-[#F5C542] bg-[#064E3B] p-4 sm:p-5 text-[#FFF8DC] shadow-xl">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-bold text-[#F5C542] tabular-nums">
            Soal {currentIdx + 1} / {sessionQuestions.length} · {q.category} ({q.difficulty})
          </span>
          <button
            type="button"
            onClick={() => setSessionQuestions([])}
            className="text-[#FFF8DC]/80 hover:text-white underline cursor-pointer"
          >
            Keluar
          </button>
        </div>

        {/* Carved wood-parchment question plaque */}
        <div className="rounded-2xl border-2 border-[#D97706] bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] p-5 text-[#022C22] shadow-inner">
          <p className="font-display text-lg sm:text-xl font-bold leading-snug">{q.question}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#92400E]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Status:{' '}
              {q.reviewStatus === 'approved'
                ? 'Disetujui Peninjau'
                : 'Draf Edukasi — Menunggu Tinjauan Ahli'}
            </span>
          </div>
        </div>

        {/* 4 Interactive Answer Buttons */}
        <div className="mt-4 space-y-2.5">
          {q.options.map((opt, idx) => {
            const isChosen = selectedOption === idx;
            const isCorrect = idx === q.correctIndex;
            let btnStyle =
              'bg-gradient-to-b from-[#B45309] to-[#78350F] border-[#F5C542]/60 text-[#FFF8DC] hover:brightness-110';
            if (selectedOption !== null) {
              if (isCorrect) {
                btnStyle = 'bg-[#10B981] border-white text-[#022C22]';
              } else if (isChosen) {
                btnStyle = 'bg-red-600 border-red-200 text-white';
              } else {
                btnStyle = 'bg-[#022C22]/70 border-white/10 text-white/60';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={selectedOption !== null}
                onClick={() => handleChoose(idx)}
                className={`w-full min-h-[48px] rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-bold transition flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-black/25 flex items-center justify-center text-xs font-extrabold shrink-0">
                    {optionLetters[idx]}
                  </span>
                  <span>{opt}</span>
                </span>
                {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                {selectedOption !== null && isChosen && !isCorrect && <XCircle className="w-5 h-5 shrink-0" />}
              </button>
            );
          })}
        </div>

        {selectedOption !== null && (
          <div className="mt-4 rounded-2xl bg-[#022C22] border border-[#F5C542]/50 p-4 space-y-2">
            <div className="text-xs font-bold text-[#F5C542]">Penjelasan &amp; Rujukan</div>
            <p className="text-xs leading-relaxed text-[#FFF8DC]/90">{q.explanation}</p>
            <p className="text-[11px] text-[#FFF8DC]/60">{q.referenceNote}</p>
            <button
              type="button"
              onClick={() => void handleNext()}
              className="mt-2 w-full min-h-[46px] rounded-xl bg-[#F5C542] font-display text-sm font-bold text-[#022C22] cursor-pointer"
            >
              {currentIdx + 1 < sessionQuestions.length ? 'Soal Berikutnya' : 'Lihat Hasil Kuis'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// 13. HIJAIYAH ADVENTURE (28 Letters, Harakat, Vocab, Tracing, Match, Order)
// =============================================================================
export const HijaiyahAdventureScreen: React.FC<{
  user: HydratedUserState;
  onUserUpdate: (u: HydratedUserState) => void;
}> = ({ user, onUserUpdate }) => {
  const [tab, setTab] = useState<'letters' | 'harakat' | 'trace' | 'game'>('letters');
  const [activeLetter, setActiveLetter] = useState<HijaiyahLetter>(HIJAIYAH_LETTERS[0]);
  const [audioMsg, setAudioMsg] = useState<string | null>(null);

  // Tracing canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  // Matching / ordering mini-exercise state
  const [roundSeed, setRoundSeed] = useState(1);
  const targetSample = useMemo(() => {
    const start = (roundSeed * 3) % (HIJAIYAH_LETTERS.length - 4);
    return HIJAIYAH_LETTERS.slice(start, start + 4);
  }, [roundSeed]);
  const [quizTargetIdx, setQuizTargetIdx] = useState(0);
  const [matchMsg, setMatchMsg] = useState<string | null>(null);

  // Ordering challenge (4 letters shuffled)
  const [orderedPicks, setOrderedPicks] = useState<number[]>([]);
  const shuffledOrderChoices = useMemo(
    () => [...targetSample].sort((a, b) => ((a.id * 7 + roundSeed) % 11) - ((b.id * 7 + roundSeed) % 11)),
    [targetSample, roundSeed]
  );

  const handleSelectLetter = async (letter: HijaiyahLetter) => {
    setActiveLetter(letter);
    setAudioMsg(null);
    soundEngine.playTap();
    try {
      const res = await api.completeHijaiyah(letter.id);
      onUserUpdate(res.user);
    } catch {
      // Offline or unauthenticated fallback silently ignored
    }
  };

  const handlePlayAudio = async () => {
    const result = await playVerifiedHijaiyahAudio(activeLetter.audioPath, activeLetter.name);
    setAudioMsg(result.message);
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#F5C542';
    ctx.lineTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="rounded-3xl border-2 border-[#F5C542] bg-[#064E3B] p-5 text-[#FFF8DC] shadow-lg flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5C542]">Petualangan Hijaiyah</h1>
          <p className="text-xs text-[#FFF8DC]/85 tabular-nums">
            Huruf dipelajari: <strong>{user.progress.hijaiyahStudiedIds.length}</strong> / 28
          </p>
        </div>
        <BookOpen className="w-8 h-8 text-[#F5C542] shrink-0" />
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-white p-1.5 rounded-2xl border border-[#064E3B]/15">
        {(
          [
            ['letters', '28 Huruf'],
            ['harakat', 'Harakat'],
            ['trace', 'Menulis'],
            ['game', 'Latihan'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer transition ${
              tab === id ? 'bg-[#064E3B] text-[#F5C542]' : 'text-[#064E3B]/75 hover:bg-[#FFF8DC]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'letters' && (
        <>
          {/* Selected Letter Flashcard */}
          <div className="rounded-3xl border-2 border-[#F5C542] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="w-24 h-24 rounded-3xl bg-[#064E3B] border-4 border-[#F5C542] flex items-center justify-center shrink-0 shadow-md">
                <span className="font-arabic text-6xl text-[#F5C542] leading-none" dir="rtl" lang="ar">
                  {activeLetter.arabic}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-2xl font-bold text-[#064E3B]">
                  {activeLetter.name}
                </div>
                <div className="text-xs font-semibold text-[#047857]">
                  Transliterasi: {activeLetter.transliteration}
                </div>
                <p className="mt-1.5 text-xs text-[#064E3B]/80 leading-relaxed">
                  {activeLetter.makhrajNote}
                </p>
              </div>
            </div>

            {/* Vocabulary card */}
            <div className="mt-4 rounded-2xl bg-[#FFF8DC] border border-[#F5C542]/50 p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#92400E]">Kosakata Contoh</div>
                <div className="text-sm font-bold text-[#064E3B]">
                  {activeLetter.exampleWordLatin} — {activeLetter.exampleMeaning}
                </div>
              </div>
              <span className="font-arabic text-3xl text-[#064E3B]" dir="rtl" lang="ar">
                {activeLetter.exampleWordArabic}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void handlePlayAudio()}
                className="min-h-[44px] rounded-xl bg-[#064E3B] px-4 py-2 text-xs font-bold text-[#F5C542] flex items-center gap-2 hover:bg-[#08634B] cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                Putar Pelafalan Terverifikasi
              </button>
              <span className="text-[11px] text-[#064E3B]/65">
                Huruf ke-{activeLetter.id} dari 28
              </span>
            </div>

            {audioMsg && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-900">
                {audioMsg}
              </div>
            )}
          </div>

          {/* 28 Hijaiyah Medallion Grid (RTL order) */}
          <div className="rounded-3xl border border-[#064E3B]/15 bg-white p-4">
            <div className="text-xs font-bold text-[#064E3B] mb-3">
              Ketuk medali huruf (tersusun kanan ke kiri)
            </div>
            <div dir="rtl" className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
              {HIJAIYAH_LETTERS.map((letter) => {
                const studied = user.progress.hijaiyahStudiedIds.includes(letter.id);
                const selected = activeLetter.id === letter.id;
                return (
                  <button
                    key={letter.id}
                    type="button"
                    onClick={() => void handleSelectLetter(letter)}
                    className={`min-h-[64px] rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 transition cursor-pointer ${
                      selected
                        ? 'border-[#F5C542] bg-[#064E3B] text-[#F5C542] scale-105 shadow-md'
                        : studied
                          ? 'border-[#10B981] bg-[#10B981]/10 text-[#064E3B]'
                          : 'border-[#064E3B]/15 bg-[#FFF8DC] text-[#064E3B]'
                    }`}
                  >
                    <span className="font-arabic text-2xl leading-none" lang="ar">
                      {letter.arabic}
                    </span>
                    <span className="mt-1 text-[10px] font-bold">{letter.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === 'harakat' && (
        <div className="grid gap-3">
          {HARAKAT_LESSONS.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl border border-[#064E3B]/15 bg-white p-4 flex items-center justify-between gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#064E3B] border-2 border-[#F5C542] flex items-center justify-center shrink-0">
                <span className="font-arabic text-4xl text-[#F5C542]" dir="rtl" lang="ar">
                  {h.symbolOnBa}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-display text-lg font-bold text-[#064E3B]">
                  {h.name} (bunyi: {h.soundSuffix})
                </div>
                <p className="text-xs text-[#064E3B]/80 mt-0.5">{h.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs font-bold text-[#047857]">
                  <span className="font-arabic text-xl" dir="rtl" lang="ar">
                    {h.exampleArabic}
                  </span>
                  <span>· {h.exampleLatin}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'trace' && (
        <div className="rounded-3xl border-2 border-[#F5C542] bg-[#064E3B] p-5 text-[#FFF8DC] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5C542]">
                Papan Tulis Huruf: {activeLetter.name}
              </h2>
              <p className="text-xs text-[#FFF8DC]/80">Tebalkan bentuk huruf dengan jari atau mouse.</p>
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              className="min-h-[40px] rounded-xl bg-[#022C22] border border-[#F5C542]/40 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Eraser className="w-4 h-4 text-[#F5C542]" />
              Hapus
            </button>
          </div>

          <div className="relative rounded-2xl border-4 border-[#B45309] bg-[#043927] overflow-hidden touch-none">
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center font-arabic text-[180px] text-white/15 select-none"
              dir="rtl"
              lang="ar"
            >
              {activeLetter.arabic}
            </div>
            <canvas
              ref={canvasRef}
              width={480}
              height={280}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={() => {
                drawingRef.current = false;
              }}
              onPointerLeave={() => {
                drawingRef.current = false;
              }}
              className="w-full h-60 cursor-crosshair block"
            />
          </div>

          <div dir="rtl" className="flex gap-1.5 overflow-x-auto pb-1">
            {HIJAIYAH_LETTERS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setActiveLetter(l);
                  clearCanvas();
                }}
                className={`min-w-[44px] h-11 rounded-xl font-arabic text-xl border cursor-pointer ${
                  l.id === activeLetter.id
                    ? 'bg-[#F5C542] text-[#022C22] border-white font-bold'
                    : 'bg-[#022C22] text-[#FFF8DC] border-[#F5C542]/30'
                }`}
              >
                {l.arabic}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'game' && (
        <div className="space-y-4">
          {/* Letter Matching */}
          <div className="rounded-2xl border border-[#064E3B]/15 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#064E3B]">
                Tebak &amp; Cocokkan Huruf
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRoundSeed((s) => s + 1);
                  setQuizTargetIdx(0);
                  setOrderedPicks([]);
                  setMatchMsg(null);
                }}
                className="text-xs font-bold text-[#047857] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Acak Soal
              </button>
            </div>

            <p className="text-sm text-[#064E3B]">
              Ketuk huruf Hijaiyah untuk nama:{' '}
              <strong className="text-lg text-[#047857]">
                {targetSample[quizTargetIdx]?.name}
              </strong>
            </p>

            <div className="grid grid-cols-4 gap-2.5">
              {shuffledOrderChoices.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    if (l.id === targetSample[quizTargetIdx]?.id) {
                      soundEngine.playCorrect();
                      setMatchMsg(`Tepat! Itu adalah huruf ${l.name}.`);
                      setQuizTargetIdx((i) => (i + 1) % targetSample.length);
                    } else {
                      soundEngine.playWrong();
                      setMatchMsg(`Belum tepat — itu adalah huruf ${l.name}. Coba lagi!`);
                    }
                  }}
                  className="min-h-[68px] rounded-2xl border-2 border-[#F5C542] bg-[#064E3B] text-[#F5C542] font-arabic text-3xl flex items-center justify-center hover:brightness-110 cursor-pointer"
                  dir="rtl"
                  lang="ar"
                >
                  {l.arabic}
                </button>
              ))}
            </div>
            {matchMsg && <p className="text-xs font-semibold text-[#064E3B]">{matchMsg}</p>}
          </div>

          {/* Letter Ordering */}
          <div className="rounded-2xl border border-[#064E3B]/15 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#064E3B]">
                Urutkan Huruf Hijaiyah
              </h3>
              <button
                type="button"
                onClick={() => setOrderedPicks([])}
                className="text-xs font-bold text-[#064E3B]/70 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ulangi
              </button>
            </div>
            <p className="text-xs text-[#064E3B]/75">
              Ketuk huruf secara berurutan dari urutan awal ({targetSample.map((t) => t.name).join(' → ')}):
            </p>
            <div className="flex gap-2">
              {shuffledOrderChoices.map((l) => {
                const picked = orderedPicks.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={picked}
                    onClick={() => {
                      const expected = targetSample[orderedPicks.length];
                      if (expected && l.id === expected.id) {
                        soundEngine.playCorrect();
                        setOrderedPicks((p) => [...p, l.id]);
                      } else {
                        soundEngine.playWrong();
                      }
                    }}
                    className={`flex-1 min-h-[58px] rounded-xl border-2 font-arabic text-2xl cursor-pointer ${
                      picked
                        ? 'bg-[#10B981] border-[#047857] text-white'
                        : 'bg-[#FFF8DC] border-[#064E3B]/20 text-[#064E3B]'
                    }`}
                  >
                    {l.arabic}
                  </button>
                );
              })}
            </div>
            {orderedPicks.length === targetSample.length && (
              <div className="text-xs font-bold text-[#047857]">
                Hebat! Urutan huruf Hijaiyah sudah tepat!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
