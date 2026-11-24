import React, { useEffect, useRef, useState } from 'react';
import {
  Hammer,
  Pause,
  Play,
  PlusCircle,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GAME_IMAGES, MimoShowcase, ResilientImage } from '../components/GameAssets.tsx';
import { PhaserPuzzleCanvas } from '../game/PhaserPuzzleCanvas.tsx';
import { PuzzleTutorial } from '../components/PuzzleTutorial.tsx';
import { BLOCK_META, type PuzzleBoardState } from '../game/puzzleLogic.ts';
import { soundEngine } from '../game/soundEngine.ts';
import { api, isLocalGame, type HydratedUserState } from '../services/api.ts';
import type { GameLevelConfig, PuzzleMove, ScreenId } from '../types/index.ts';

interface GameplayProps {
  user: HydratedUserState;
  level: GameLevelConfig;
  sessionId: string;
  seed: number;
  initialMoves?: PuzzleMove[];
  initialTool?: 'tap' | 'hammer';
  onUserUpdate: (u: HydratedUserState) => void;
  onFinishSession: (result: {
    outcome: 'won' | 'lost';
    score: number;
    stars: number;
    koinAwarded: number;
    permataAwarded: number;
  }) => void;
  onExit: () => void;
}

export const PuzzleGameplayScreen: React.FC<GameplayProps> = ({
  user,
  level,
  sessionId,
  seed,
  initialMoves = [],
  initialTool = 'tap',
  onUserUpdate,
  onFinishSession,
  onExit,
}) => {
  const [boardState, setBoardState] = useState<PuzzleBoardState | null>(null);
  const [activeTool, setActiveTool] = useState<'tap' | 'hammer'>(initialTool);
  const [tutorialOpen, setTutorialOpen] = useState(isLocalGame && !user.preferences.puzzleTutorialSeen && Object.keys(user.progress.completedLevels).length === 0 && initialMoves.length === 0);
  const [animating, setAnimating] = useState(false);
  const [boosterBusy, setBoosterBusy] = useState(false);
  const boosterBusyRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(!user.preferences.soundEnabled);
  const [externalMove, setExternalMove] = useState<{ id: number; move: PuzzleMove } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    soundEngine.enabled = !muted;
  }, [muted]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !tutorialOpen) {
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tutorialOpen]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const finishTutorial = async () => {
    setTutorialOpen(false);
    try {
      const response = await api.updatePreferences({ puzzleTutorialSeen: true });
      onUserUpdate({ ...user, preferences: response.preferences });
    } catch (error) { setErrorMsg((error as Error).message); }
  };

  const saveCheckpoint = (moves: PuzzleMove[]) => {
    setAnimating(true);
    // The local API writes synchronously before this promise resolves.
    void api.saveGameCheckpoint(sessionId, moves).catch(error => setErrorMsg((error as Error).message));
  };

  const handleStateChange = async (nextState: PuzzleBoardState, movesHistory: PuzzleMove[]) => {
    setBoardState(nextState);
    setAnimating(false);

    if (
      (nextState.status === 'won' || nextState.status === 'lost') &&
      submittedSessionRef.current !== sessionId &&
      !submitting
    ) {
      submittedSessionRef.current = sessionId;
      setSubmitting(true);
      try {
        const res = await api.completeGameSession(
          sessionId,
          movesHistory,
          `complete:${sessionId}`
        );
        onUserUpdate(res.user);
        if (res.status === 'won') soundEngine.playVictory();
        else soundEngine.playDefeat();

        onFinishSession({
          outcome: res.status === 'won' ? 'won' : 'lost',
          score: res.verifiedScore,
          stars: res.stars,
          koinAwarded: res.koinAwarded,
          permataAwarded: res.permataAwarded,
        });
      } catch (err) {
        setErrorMsg((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTriggerBooster = async (type: 'hammer' | 'shuffle' | 'extra_moves') => {
    if (boosterBusyRef.current || animating || paused || tutorialOpen || submitting || boardState?.status !== 'playing') return;
    if (type === 'hammer' && activeTool === 'hammer') {
      if (isLocalGame) {
        try { onUserUpdate((await api.cancelHammer(sessionId)).user); }
        catch (error) { setErrorMsg((error as Error).message); return; }
      }
      setActiveTool('tap');
      return;
    }
    const itemId =
      type === 'hammer' ? 'boost_hammer' : type === 'shuffle' ? 'boost_shuffle' : 'boost_moves';
    const qty = user.progress.inventory[itemId] || 0;
    if (qty <= 0) {
      setErrorMsg('Stok booster habis. Dapatkan di Toko Item Virtual dengan Koin Ilmu.');
      return;
    }
    setErrorMsg(null);
    boosterBusyRef.current = true;
    setBoosterBusy(true);
    try {
      const res = await api.useBooster(itemId, sessionId);
      onUserUpdate(res.user);
      if (type === 'hammer') setActiveTool('hammer');
      else setExternalMove({ id: Date.now(), move: { type } });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      boosterBusyRef.current = false;
      setBoosterBusy(false);
    }
  };

  const scorePct = boardState
    ? Math.min(100, Math.round((boardState.score / level.objective.targetScore) * 100))
    : 0;
  const targetMeta = level.objective.collectColor ? BLOCK_META[level.objective.collectColor] : null;

  return (
    <div className="min-h-screen bg-[#022C22] text-[#FFF8DC] flex flex-col justify-between p-3 sm:p-5">
      {/* Compact Perimeter HUD (keeps >= 85% viewport unobstructed) */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Jeda permainan"
          onClick={() => setPaused(true)}
          className="w-11 h-11 rounded-xl bg-[#064E3B] border border-[#F5C542]/50 flex items-center justify-center hover:bg-[#08634B] cursor-pointer"
        >
          <Pause className="w-5 h-5 text-[#F5C542]" />
        </button>

        <div className="flex-1 rounded-2xl bg-[#064E3B] border border-[#F5C542]/45 px-3 py-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-[#FFF8DC]/75">
              Level {level.id} · {level.title}
            </div>
            <div className="font-display text-sm font-bold text-[#F5C542] tabular-nums">
              Skor {boardState?.score.toLocaleString('id-ID') ?? 0} / {level.objective.targetScore.toLocaleString('id-ID')}
            </div>
            <div className="mt-1 h-1.5 w-28 rounded-full bg-[#022C22] overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-all"
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-[#FFF8DC]/75">Langkah</div>
            <div className="font-display text-xl font-bold text-white tabular-nums">
              {boardState?.movesLeft ?? level.maxMoves}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label={muted ? 'Aktifkan suara' : 'Bisukan suara'}
          onClick={() => {
            const enabled = muted;
            setMuted(!muted);
            void api.updatePreferences({ soundEnabled: enabled }).then(response => onUserUpdate({ ...user, preferences: response.preferences })).catch(error => setErrorMsg(error.message));
          }}
          className="w-11 h-11 rounded-xl bg-[#064E3B] border border-[#F5C542]/50 flex items-center justify-center hover:bg-[#08634B] cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5 text-red-300" /> : <Volume2 className="w-5 h-5 text-[#10B981]" />}
        </button>
      </div>

      {/* Objective line */}
      <div className="w-full max-w-md mx-auto mt-2 flex items-center justify-between px-2 text-xs text-[#FFF8DC]/85">
        <div className="flex items-center gap-2">
          <span>Target:</span>
          {targetMeta && level.objective.collectCount ? (
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
              <span
                className="w-3 h-3 rounded-sm inline-block border border-white/60"
                style={{ backgroundColor: targetMeta.primary }}
              />
              {targetMeta.label} ({Math.min(boardState?.collectedTarget ?? 0, level.objective.collectCount)}/{level.objective.collectCount})
            </span>
          ) : (
            <span className="font-semibold">Capai Skor Target</span>
          )}
        </div>
        {boardState && boardState.combo > 1 && (
          <span className="font-display font-bold text-[#F5C542] tabular-nums">
            Kombo x{boardState.combo}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="w-full max-w-md mx-auto mt-2 rounded-xl bg-amber-900/80 border border-[#F5C542] px-3 py-1.5 text-xs text-[#FFF8DC] text-center">
          {errorMsg}
        </div>
      )}

      {/* Phaser 3 8x8 Playfield */}
      <div className="my-auto py-2">
        <PhaserPuzzleCanvas
          level={level}
          seed={seed}
          initialMoves={initialMoves}
          interactionEnabled={!paused && !tutorialOpen && !submitting && !boosterBusy}
          activeTool={activeTool}
          reducedMotion={user.preferences.reducedMotion}
          hapticsEnabled={user.preferences.hapticsEnabled}
          externalMoveTrigger={externalMove}
          onStateChange={(s, h) => void handleStateChange(s, h)}
          onToolUsed={() => setActiveTool('tap')}
          onMoveCommitted={saveCheckpoint}
        />
      </div>

      {/* Booster Bar */}
      <div className="w-full max-w-md mx-auto grid grid-cols-3 gap-2.5 pb-1">
        <button
          type="button"
          onClick={() => void handleTriggerBooster('hammer')}
          disabled={animating || boosterBusy || submitting || paused || tutorialOpen}
          className={`min-h-[52px] rounded-2xl border-2 px-3 py-2 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
            activeTool === 'hammer'
              ? 'border-[#F5C542] bg-[#F5C542] text-[#022C22]'
              : 'border-[#F5C542]/45 bg-[#064E3B] text-[#FFF8DC] hover:bg-[#08634B]'
          }`}
        >
          <Hammer className="w-4 h-4" />
          <span>Palu ({user.progress.inventory.boost_hammer || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => void handleTriggerBooster('shuffle')}
          disabled={animating || boosterBusy || submitting || paused || tutorialOpen}
          className="min-h-[52px] rounded-2xl border-2 border-[#38BDF8]/45 bg-[#064E3B] px-3 py-2 flex items-center justify-center gap-2 text-xs font-bold text-[#FFF8DC] hover:bg-[#08634B] transition cursor-pointer"
        >
          <Shuffle className="w-4 h-4 text-[#38BDF8]" />
          <span>Acak ({user.progress.inventory.boost_shuffle || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => void handleTriggerBooster('extra_moves')}
          disabled={animating || boosterBusy || submitting || paused || tutorialOpen}
          className="min-h-[52px] rounded-2xl border-2 border-[#10B981]/55 bg-[#064E3B] px-3 py-2 flex items-center justify-center gap-2 text-xs font-bold text-[#FFF8DC] hover:bg-[#08634B] transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[#10B981]" />
          <span>+5 Lgk ({user.progress.inventory.boost_moves || 0})</span>
        </button>
      </div>

      {/* Pause Modal */}
      {paused && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl border-2 border-[#F5C542] bg-[#FFF8DC] p-6 text-center text-[#022C22] shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-[#064E3B]">Permainan Dijeda</h2>
            <p className="mt-1 text-xs text-[#064E3B]/75">
              Ketuk dua atau lebih blok yang berdekatan untuk meledakkan dan membuka booster!
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="w-full min-h-[46px] rounded-xl bg-[#F5C542] font-display font-bold text-[#022C22] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Lanjutkan
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 text-sm font-bold text-[#064E3B] cursor-pointer"
              >
                Simpan & kembali ke beranda
              </button>
            </div>
          </div>
        </div>
      )}
      {tutorialOpen && <div role="dialog" aria-modal="true" aria-label="Panduan puzzle pertama" className="fixed inset-0 z-50 bg-black/75 overflow-y-auto flex items-start sm:items-center justify-center p-4"><PuzzleTutorial modal onDone={() => void finishTutorial()} /></div>}
    </div>
  );
};

export const VictoryScreen: React.FC<{
  level: GameLevelConfig;
  score: number;
  stars: number;
  koinAwarded: number;
  permataAwarded: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onNavigate: (screen: ScreenId) => void;
}> = ({
  level,
  score,
  stars,
  koinAwarded,
  permataAwarded,
  onNextLevel,
  onReplay,
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-[#022C22] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti accents */}
      <div className="pointer-events-none absolute inset-0 islamic-pattern-bg opacity-60" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border-4 border-[#F5C542] bg-gradient-to-b from-[#064E3B] to-[#022C22] p-6 sm:p-7 text-center text-[#FFF8DC] shadow-2xl">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F5C542]">
          <Sparkles className="w-4 h-4" />
          <span>ALHAMDULILLAH · LEVEL {level.id} SELESAI</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Kemenangan Gemilang!</h1>

        {/* Star rating */}
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`w-10 h-10 ${
                s <= stars
                  ? 'text-[#F5C542] fill-[#F5C542] drop-shadow-[0_0_10px_rgba(245,197,66,0.65)]'
                  : 'text-white/20'
              }`}
            />
          ))}
        </div>

        {/* Glowing Treasure Chest */}
        <div className="mt-5 mx-auto w-36 h-36 rounded-3xl overflow-hidden border-2 border-[#F5C542] bg-[#FFF8DC] shadow-[0_0_32px_rgba(245,197,66,0.35)]">
          <ResilientImage
            src={GAME_IMAGES.treasureChest}
            alt="Peti harta karun Koin Ilmu dan Permata Hikmah"
            className="w-full h-full object-cover"
            fallbackLabel="Peti Hadiah"
          />
        </div>

        <div className="mt-5 rounded-2xl bg-[#022C22]/85 border border-[#F5C542]/40 p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[11px] text-[#FFF8DC]/70">Skor Terverifikasi</div>
            <div className="font-display text-lg font-bold text-white tabular-nums">
              {score.toLocaleString('id-ID')}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#FFF8DC]/70">Koin Ilmu</div>
            <div className="font-display text-lg font-bold text-[#F5C542] tabular-nums">
              +{koinAwarded}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#FFF8DC]/70">Permata</div>
            <div className="font-display text-lg font-bold text-[#38BDF8] tabular-nums">
              +{permataAwarded}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onNextLevel}
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-b from-[#FFE07D] via-[#F5C542] to-[#D99B16] font-display text-lg font-bold text-[#022C22] shadow-[0_4px_0_#92400E] hover:brightness-105 cursor-pointer"
          >
            KLAIM &amp; LANJUT LEVEL {Math.min(160, level.id + 1)}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onReplay}
              className="min-h-[44px] rounded-xl border border-[#F5C542]/50 text-xs font-bold text-[#FFF8DC] hover:bg-[#08634B] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Main Ulang
            </button>
            <button
              type="button"
              onClick={() => onNavigate('quiz')}
              className="min-h-[44px] rounded-xl bg-[#10B981] text-xs font-bold text-[#022C22] hover:brightness-105 cursor-pointer"
            >
              Uji Kuis {level.quizCategoryHint}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DefeatScreen: React.FC<{
  level: GameLevelConfig;
  score: number;
  onReplay: () => void;
  onNavigate: (screen: ScreenId) => void;
}> = ({ level, score, onReplay, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#022C22] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-[#F5C542]/70 bg-[#FFF8DC] p-6 sm:p-7 text-center text-[#022C22] shadow-2xl">
        <MimoShowcase size="md" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#064E3B]">
          Tetap Semangat! Langkah Habis
        </h1>
        <p className="mt-2 text-sm text-[#064E3B]/80">
          Skor akhir: <strong className="tabular-nums">{score.toLocaleString('id-ID')}</strong> dari target{' '}
          <strong className="tabular-nums">{level.objective.targetScore.toLocaleString('id-ID')}</strong>.
          Setiap usaha adalah proses belajar!
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onReplay}
            className="w-full min-h-[50px] rounded-2xl bg-[#F5C542] font-display text-base font-bold text-[#022C22] shadow-[0_4px_0_#B45309] hover:brightness-105 cursor-pointer"
          >
            Coba Lagi Level {level.id}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="w-full min-h-[44px] rounded-xl border-2 border-[#064E3B] text-xs font-bold text-[#064E3B] hover:bg-[#064E3B]/5 cursor-pointer"
          >
            Beli Booster di Toko Virtual
          </button>
          <button
            type="button"
            onClick={() => onNavigate('level_select')}
            className="w-full min-h-[40px] text-xs font-semibold text-[#064E3B]/75 hover:underline cursor-pointer"
          >
            Kembali ke Daftar Level
          </button>
        </div>
      </div>
    </div>
  );
};
