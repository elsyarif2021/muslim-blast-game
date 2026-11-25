import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, Gift, Home, Map, UserRound } from 'lucide-react';
import { api, isLocalGame, type HydratedUserState, type PublicCatalogResponse } from './services/api.ts';
import { SplashScreen, OnboardingAndAuthScreens } from './pages/OnboardingAndAuthScreens.tsx';
import { HomeDashboardScreen, AdventureMapScreen, LevelSelectionScreen } from './pages/HomeAndMapScreens.tsx';
import { IslamicQuizScreen, HijaiyahAdventureScreen } from './pages/EducationScreens.tsx';
import { DAILY_MISSIONS, ACHIEVEMENTS, VIRTUAL_SHOP_ITEMS } from './data/economyAndMissions.ts';
import { OfflineIndicator } from './components/PWAInstallButton.tsx';
import { PuzzleTutorial } from './components/PuzzleTutorial.tsx';
import { DailyChallengeCard, DailyChallengeScreen, ProfileSettingsScreen } from './pages/PlayerDevelopmentScreens.tsx';
import { soundEngine } from './game/soundEngine.ts';
import type { ScreenId, AgeMode, PuzzleSessionSnapshot, UserPreferences } from './types/index.ts';

// Load the game engine only when the player enters a puzzle or its result screen.
const PuzzleGameplayScreen = lazy(() => import('./pages/GameplayAndResultScreens.tsx').then(m => ({ default: m.PuzzleGameplayScreen })));
const VictoryScreen = lazy(() => import('./pages/GameplayAndResultScreens.tsx').then(m => ({ default: m.VictoryScreen })));
const DefeatScreen = lazy(() => import('./pages/GameplayAndResultScreens.tsx').then(m => ({ default: m.DefeatScreen })));

type Result = { outcome: 'won' | 'lost'; score: number; stars: number; koinAwarded: number; permataAwarded: number };
const NAVIGATION = [
  { screen: 'home', label: 'Beranda', icon: Home },
  { screen: 'adventure_map', label: 'Bermain', icon: Map },
  { screen: 'quiz', label: 'Belajar', icon: BookOpen },
  { screen: 'reward_center', label: 'Hadiah', icon: Gift },
  { screen: 'profile', label: 'Profil', icon: UserRound },
] as const;

function Button({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="min-h-11 rounded-xl bg-[#064E3B] text-white px-4 py-3 text-sm font-semibold hover:bg-[#08634B] disabled:opacity-45 disabled:cursor-default cursor-pointer">{children}</button>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <article className="rounded-2xl border border-[#064E3B]/15 bg-white p-5 space-y-3 shadow-sm">{children}</article>;
}
function Loading() {
  return <div role="status" className="min-h-screen grid place-items-center bg-[#FFF8DC] text-[#064E3B] font-display text-xl">Memuat petualangan…</div>;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('splash');
  const [mode, setMode] = useState<AgeMode>('child');
  const [user, setUser] = useState<HydratedUserState | null>(null);
  const [catalog, setCatalog] = useState<PublicCatalogResponse | null>(null);
  const [world, setWorld] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<PuzzleSessionSnapshot | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [, refreshDate] = useState(0);

  const loadCatalog = () => api.fetchCatalog().then(setCatalog).catch(e => setError(e.message));
  useEffect(() => { void loadCatalog(); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => {
    const timer = window.setInterval(() => refreshDate(value => value + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    soundEngine.enabled = user?.preferences.soundEnabled ?? true;
    soundEngine.volume = user?.preferences.soundVolume ?? 0.6;
    document.documentElement.classList.toggle('reduced-motion', user?.preferences.reducedMotion ?? false);
  }, [user?.preferences.soundEnabled, user?.preferences.soundVolume, user?.preferences.reducedMotion]);

  const navigate = (target: ScreenId) => {
    setError(''); setNotice('');
    if (target === 'level_select' && user) {
      const next = catalog?.levels.find(level => level.id === user.progress.highestUnlockedLevel);
      if (next) setWorld(next.worldId);
    }
    setScreen(target);
  };
  const act = async (fn: () => Promise<{ user: HydratedUserState }>, success: string) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setUser((await fn()).user); setNotice(success); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const play = async (id: number) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setSession(await api.startGameSession(id)); setResult(null); setScreen('puzzle_play'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const selectWorld = (id: number) => { setWorld(id); setScreen('level_select'); };
  const resumePuzzle = () => {
    const saved = api.getActiveSession();
    if (saved) { setSession(saved); setResult(null); setError(''); setScreen('puzzle_play'); }
    else setError('Puzzle tersimpan tidak ditemukan. Pilih level untuk mulai bermain.');
  };
  const start = () => {
    const saved = api.resumeLocalGame();
    if (saved) { setUser(saved); setScreen('home'); }
    else setScreen('onboarding');
  };

  if (!catalog) return error ? <main className="p-8 text-center space-y-4"><h1 className="text-2xl">Muslim Blast</h1><p role="alert">{error}</p><Button onClick={() => { setError(''); void loadCatalog(); }}>Coba lagi</Button></main> : <Loading />;
  if (!user) {
    if (screen === 'splash') return <SplashScreen hasSession={Boolean(api.getSavedUser())} onStart={start} />;
    return <OnboardingAndAuthScreens screen={screen} selectedMode={mode} onSelectMode={setMode} onNavigate={navigate} onAuthSuccess={(token, player) => { api.setUserToken(token); setUser(player); setScreen('home'); }} />;
  }

  const busyMessage = busy ? <p role="status" className="fixed top-3 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-white px-5 py-3 text-[#064E3B] shadow-lg">Menyiapkan permainan…</p> : null;
  if (screen === 'puzzle_play' && session) return <Suspense fallback={<Loading />}><PuzzleGameplayScreen key={session.sessionId} user={user} level={session.level} seed={session.seed} sessionId={session.sessionId} initialMoves={session.moves} initialTool={session.activeTool} onUserUpdate={setUser} onExit={() => navigate('home')} onFinishSession={r => { setResult(r); setScreen(r.outcome === 'won' ? 'victory' : 'defeat'); }} /></Suspense>;
  if ((screen === 'victory' || screen === 'defeat') && session && result) return <Suspense fallback={<Loading />}>
    {busyMessage}
    {error && <p role="alert" className="p-3 bg-red-100 text-red-900">{error}</p>}
    {screen === 'victory' ? <VictoryScreen level={session.level} {...result} onNextLevel={() => void play(Math.min(session.level.id + 1, catalog.levels.length))} onReplay={() => void play(session.level.id)} onNavigate={navigate} /> : <DefeatScreen level={session.level} score={result.score} onReplay={() => void play(session.level.id)} onNavigate={navigate} />}
  </Suspense>;

  const metrics = {
    levels_won: Object.keys(user.progress.completedLevels).length,
    quizzes_completed: user.progress.quizzesCompleted,
    hijaiyah_studied: user.progress.hijaiyahStudiedIds.length,
    hijaiyah_mastered: user.progress.hijaiyahStudiedIds.length,
    blocks_cleared: user.progress.totalBlocksCleared,
    missions_completed: user.progress.completedMissionIds.length,
    checkin_streak: user.progress.checkinStreak,
  };
  const updatePrefs = (prefs: Partial<UserPreferences>) => void act(async () => {
    const response = await api.updatePreferences(prefs);
    return { user: { ...user, preferences: response.preferences } };
  }, 'Pengaturan disimpan.');
  const activeSession = api.getActiveSession();
  const dailyChallenge = api.getDailyChallenge();
  let content: React.ReactNode;
  switch (screen) {
    case 'home': content = <><HomeDashboardScreen user={user} levels={catalog.levels} selectedWorldId={world} onSelectWorld={selectWorld} onPlayLevel={play} onNavigate={navigate} resumeSession={activeSession} onResume={resumePuzzle} />{dailyChallenge && <DailyChallengeCard challenge={dailyChallenge} onOpen={() => navigate('daily_challenge')} />}</>; break;
    case 'adventure_map': content = <AdventureMapScreen user={user} onSelectWorld={selectWorld} onNavigate={navigate} />; break;
    case 'level_select': content = <LevelSelectionScreen user={user} levels={catalog.levels} selectedWorldId={world} onSelectWorld={selectWorld} onPlayLevel={play} onNavigate={navigate} />; break;
    case 'quiz': content = <IslamicQuizScreen user={user} questions={catalog.quizzes.filter(q => q.reviewStatus !== 'rejected')} onUserUpdate={setUser} />; break;
    case 'hijaiyah': content = <HijaiyahAdventureScreen user={user} onUserUpdate={setUser} />; break;
    case 'daily_challenge': content = dailyChallenge && <DailyChallengeScreen challenge={dailyChallenge} busy={busy} onClaim={() => void act(() => api.claimDailyChallenge(), 'Bonus tantangan harian berhasil ditambahkan!')} onPuzzle={() => activeSession ? resumePuzzle() : void play(user.progress.highestUnlockedLevel)} onQuiz={() => navigate('quiz')} />; break;
    case 'tutorial': content = <PuzzleTutorial volume={user.preferences.soundVolume} onDone={() => { if (isLocalGame) updatePrefs({ puzzleTutorialSeen: true }); navigate('home'); }} />; break;
    case 'missions': content = <><h1 className="font-display text-3xl">Misi Kebaikan</h1>{DAILY_MISSIONS.map(m => {
      const claimed = user.progress.completedMissionIds.includes(m.id);
      const count = Math.min(metrics[m.progressKey], m.targetCount);
      return <Card key={m.id}><h2 className="font-display text-lg">{m.title}</h2><p className="text-sm">{m.description}</p><p className="text-sm font-semibold">{count}/{m.targetCount} · +{m.rewardKoin} Koin Ilmu</p><Button disabled={busy || claimed || count < m.targetCount} onClick={() => void act(() => api.claimMission(m.id), 'Hadiah misi berhasil diklaim!')}>{claimed ? 'Sudah diklaim' : 'Klaim hadiah'}</Button></Card>;
    })}</>; break;
    case 'checkin': content = <><h1 className="font-display text-3xl">Hadiah Harian</h1><Card><h2 className="text-xl">Istiqamah {user.progress.checkinStreak} hari</h2><p>Kembali setiap hari untuk mengumpulkan Koin Ilmu. Hadiah bertambah saat kamu bermain pada hari yang berurutan.</p><Button disabled={busy} onClick={() => void act(() => api.dailyCheckin(), 'Hadiah harian berhasil ditambahkan!')}>Klaim hadiah hari ini</Button></Card></>; break;
    case 'achievements': content = <><h1 className="font-display text-3xl">Prestasi</h1>{ACHIEVEMENTS.map(a => {
      const claimed = user.progress.claimedAchievementIds.includes(a.id);
      return <Card key={a.id}><h2 className="font-display text-lg">{a.title}</h2><p className="text-sm">{a.description}</p><p className="text-sm">{Math.min(metrics[a.metricKey], a.targetValue)}/{a.targetValue} · +{a.koinReward} koin · +{a.bintangReward} bintang</p><Button disabled={busy || claimed || metrics[a.metricKey] < a.targetValue} onClick={() => void act(() => api.claimAchievement(a.id), 'Hadiah prestasi berhasil diklaim!')}>{claimed ? 'Sudah diklaim' : 'Klaim prestasi'}</Button></Card>;
    })}</>; break;
    case 'mascot':
    case 'shop': content = <><h1 className="font-display text-3xl">Toko Virtual</h1><p>{user.wallets.koinIlmu} Koin Ilmu · {user.wallets.permataHikmah} Permata Hikmah</p>{VIRTUAL_SHOP_ITEMS.map(item => {
      const owned = user.progress.inventory[item.id] || 0;
      const cosmetic = item.category !== 'booster';
      const equipped = [user.progress.equippedCap, user.progress.equippedBackpack, user.progress.equippedTheme].includes(item.id);
      return <Card key={item.id}><h2 className="font-display text-lg">{item.name}</h2><p className="text-sm">{item.description}</p><p className="text-sm">{item.priceKoin ? `${item.priceKoin} koin` : `${item.pricePermata || 0} permata`} · Dimiliki: {owned}</p><Button disabled={busy || (cosmetic && owned > 0 && equipped)} onClick={() => void act(() => cosmetic && owned > 0 ? api.equipMascotItem(item.id) : api.buyShopItem(item.id), cosmetic && owned > 0 ? 'Item dipakai oleh Mimo.' : 'Item ditambahkan ke koleksi.')}>{cosmetic && owned > 0 ? equipped ? 'Sedang dipakai' : 'Pakai item' : 'Beli item'}</Button></Card>;
    })}</>; break;
    case 'reward_center':
    case 'wallet': content = <><h1 className="font-display text-3xl">Hadiah Virtual</h1><Card><p className="text-2xl font-display">{user.wallets.koinIlmu} Koin Ilmu</p><p>{user.wallets.permataHikmah} permata · {user.wallets.bintangPrestasi} bintang</p><p className="text-sm">Gunakan koin untuk booster dan permata untuk koleksi Mimo.</p></Card><div className="grid grid-cols-2 gap-3">{([['checkin', 'Hadiah harian'], ['achievements', 'Prestasi'], ['shop', 'Toko virtual'], ['missions', 'Misi kebaikan']] as [ScreenId, string][]).map(([target, label]) => <Button key={target} onClick={() => navigate(target)}>{label}</Button>)}</div></>; break;
    case 'leaderboard': content = <><h1 className="font-display text-3xl">Prestasi Pemain</h1><Card><h2 className="text-xl">{user.profile.name}</h2><p>Level pemain {user.profile.level} · {metrics.levels_won} puzzle selesai</p><p>{user.wallets.bintangPrestasi} bintang · {user.profile.xp} XP</p><p className="text-sm">{isLocalGame ? 'Prestasi di perangkat ini. Peringkat antarperangkat belum tersedia.' : 'Statistik pemainmu saat ini.'}</p></Card></>; break;
    case 'profile':
    case 'settings': content = <ProfileSettingsScreen user={user} busy={busy} local={isLocalGame} onSaveName={name => void act(() => api.updateProfile(name), 'Nama pemain berhasil disimpan.')} onRestored={player => { setSession(null); setResult(null); setUser(player); setError(''); }} onPreferences={updatePrefs} onTutorial={() => navigate('tutorial')} onExit={() => { api.setUserToken(null); setUser(null); setScreen('splash'); }} />; break;
    default: content = <><h1 className="font-display text-3xl">Cara Bermain</h1><Card><p>Ketuk minimal dua blok dengan warna yang sama dan saling menempel. Raih target skor sebelum langkah habis.</p><p>Gunakan booster palu, acak papan, atau lima langkah ekstra saat diperlukan. Menang akan membuka level berikutnya.</p><p>Jelajahi menu Belajar untuk kuis dan Beranda untuk Hijaiyah. Selesaikan misi untuk menambah koleksi hadiah virtual.</p></Card></>;
  }
  const activeNav = screen === 'hijaiyah' ? 'quiz' : ['checkin', 'missions', 'achievements', 'shop', 'wallet', 'mascot'].includes(screen) ? 'reward_center' : screen === 'level_select' ? 'adventure_map' : screen === 'settings' ? 'profile' : screen;
  return <main className="max-w-2xl mx-auto min-h-screen p-3 sm:p-5 pb-28 sm:pb-28 space-y-4">
    {busyMessage}
    {isLocalGame && <p className="text-center text-xs text-[#064E3B]/75">{api.savesOnDevice ? 'Petualangan di perangkat ini · Hadiah virtual' : 'Penyimpanan browser tidak tersedia. Progres bertahan selama halaman ini terbuka.'}</p>}
    {screen !== 'home' && <button type="button" onClick={() => navigate('home')} className="min-h-11 text-sm font-bold text-[#064E3B] cursor-pointer">← Beranda</button>}
    {error && <p role="alert" className="bg-red-100 text-red-900 p-3 rounded-xl">{error}</p>}
    {notice && <p role="status" className="bg-emerald-100 text-emerald-900 p-3 rounded-xl">{notice}</p>}
    {content}
    {isLocalGame && <OfflineIndicator />}
    <nav aria-label="Navigasi utama" className="fixed bottom-0 left-0 right-0 bg-[#064E3B] text-white border-t border-[#F5C542]/40 z-40 pb-[env(safe-area-inset-bottom)]"><div className="max-w-2xl mx-auto grid grid-cols-5">{NAVIGATION.map(({ screen: target, label, icon: Icon }) => <button key={target} type="button" aria-current={activeNav === target ? 'page' : undefined} onClick={() => navigate(target)} className={`min-h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold cursor-pointer ${activeNav === target ? 'text-[#F5C542] bg-white/5' : 'text-white/90'}`}><Icon className="w-5 h-5" /><span>{label}</span></button>)}</div></nav>
  </main>;
}
