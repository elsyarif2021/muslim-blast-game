import React from 'react';
import {
  Award,
  BookOpen,
  CalendarCheck,
  Coins,
  Compass,
  Gem,
  HelpCircle,
  Lock,
  MapPin,
  Play,
  Puzzle,
  Settings,
  Star,
} from 'lucide-react';
import { GAME_IMAGES, MimoShowcase, MuslimBlastLogo, ResilientImage } from '../components/GameAssets.tsx';
import { WORLDS } from '../data/worldsAndLevels.ts';
import type { HydratedUserState } from '../services/api.ts';
import type { GameLevelConfig, ScreenId } from '../types/index.ts';

interface HomeScreenProps {
  user: HydratedUserState;
  levels: GameLevelConfig[];
  selectedWorldId: number;
  onSelectWorld: (worldId: number) => void;
  onPlayLevel: (levelId: number) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const HomeDashboardScreen: React.FC<HomeScreenProps> = ({
  user,
  onPlayLevel,
  onNavigate,
}) => {
  const nextLevel = user.progress.highestUnlockedLevel || 1;
  const menuCards: Array<{
    title: string;
    subtitle: string;
    screen: ScreenId;
    accent: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      title: 'Puzzle Islami',
      subtitle: `Lanjut Level ${nextLevel}`,
      screen: 'level_select',
      accent: 'from-[#10B981] to-[#047857]',
      icon: Puzzle,
    },
    {
      title: 'Kuis Islami',
      subtitle: '12 Kategori Ilmu',
      screen: 'quiz',
      accent: 'from-[#38BDF8] to-[#0284C7]',
      icon: HelpCircle,
    },
    {
      title: 'Belajar Hijaiyah',
      subtitle: '28 Huruf & Harakat',
      screen: 'hijaiyah',
      accent: 'from-[#F59E0B] to-[#B45309]',
      icon: BookOpen,
    },
    {
      title: 'Petualangan Ilmu',
      subtitle: '8 Dunia · 160 Level',
      screen: 'adventure_map',
      accent: 'from-[#8B5CF6] to-[#5B21B6]',
      icon: Compass,
    },
    {
      title: 'Misi Kebaikan',
      subtitle: 'Tantangan Harian',
      screen: 'missions',
      accent: 'from-[#EC4899] to-[#9D174D]',
      icon: Award,
    },
    {
      title: 'Hadiah Harian',
      subtitle: `Streak ${user.progress.checkinStreak} Hari`,
      screen: 'checkin',
      accent: 'from-[#064E3B] to-[#022C22]',
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Top Player Bar */}
      <div className="rounded-3xl border-2 border-[#F5C542]/70 bg-[#064E3B] px-4 py-3 text-[#FFF8DC] shadow-lg flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2.5 text-left cursor-pointer min-w-0"
        >
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-[#F5C542] bg-[#FFF8DC] shrink-0">
            <ResilientImage
              src={GAME_IMAGES.mimo}
              alt="Avatar pemain"
              className="w-full h-full object-cover"
              fallbackLabel="M"
            />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-bold truncate">{user.profile.name}</div>
            <div className="text-xs text-[#F5C542] tabular-nums">
              Level {user.profile.level} · {user.profile.ageMode === 'child' ? 'Mode Anak' : 'Mode Dewasa'}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 rounded-xl bg-[#022C22] border border-[#F5C542]/40 px-2.5 py-1.5 text-xs font-bold tabular-nums">
            <Coins className="w-4 h-4 text-[#F5C542]" />
            <span>{user.wallets.koinIlmu.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-[#022C22] border border-[#38BDF8]/40 px-2.5 py-1.5 text-xs font-bold tabular-nums">
            <Gem className="w-4 h-4 text-[#38BDF8]" />
            <span>{user.wallets.permataHikmah.toLocaleString('id-ID')}</span>
          </div>
          <button
            type="button"
            aria-label="Pengaturan"
            onClick={() => onNavigate('settings')}
            className="w-10 h-10 rounded-xl bg-[#022C22] border border-[#F5C542]/40 flex items-center justify-center text-[#FFF8DC] hover:bg-[#0A6C50] cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Village Section */}
      <div className="relative rounded-3xl border-2 border-[#F5C542] overflow-hidden shadow-xl min-h-[300px] flex flex-col items-center justify-between p-5 text-center">
        <ResilientImage
          src={GAME_IMAGES.villageBg}
          alt="Latar desa Islami Muslim Blast"
          className="absolute inset-0 w-full h-full object-cover"
          fallbackLabel="Desa Ilmu"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#022C22]/75 via-[#064E3B]/30 to-[#022C22]/90" />

        {/* Animated clouds & decorative lanterns */}
        <div className="relative z-10 w-full flex justify-between items-start pointer-events-none">
          <div className="animate-lantern-sway w-7 h-10 rounded-b-lg border border-[#F5C542] bg-[#F5C542]/35 flex items-center justify-center">
            <div className="w-2 h-3 rounded-full bg-[#FEF08A]" />
          </div>
          <MuslimBlastLogo size="sm" />
          <div className="animate-lantern-sway w-7 h-10 rounded-b-lg border border-[#F5C542] bg-[#F5C542]/35 flex items-center justify-center">
            <div className="w-2 h-3 rounded-full bg-[#FEF08A]" />
          </div>
        </div>

        <div className="relative z-10 my-3 animate-float-slow">
          <MimoShowcase
            equippedCap={user.progress.equippedCap}
            equippedBackpack={user.progress.equippedBackpack}
            size="md"
          />
        </div>

        <div className="relative z-10 w-full max-w-xs">
          <button
            type="button"
            onClick={() => onPlayLevel(nextLevel)}
            className="w-full min-h-[54px] rounded-2xl bg-gradient-to-b from-[#FFE07D] via-[#F5C542] to-[#D99B16] px-6 py-3 font-display text-lg font-bold text-[#022C22] shadow-[0_5px_0_#92400E] hover:brightness-105 active:translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-[#022C22]" />
            <span>MULAI BERMAIN</span>
          </button>
          <p className="mt-2 text-xs font-medium text-[#FFF8DC]/90">
            Bermain, Belajar, Raih Kebaikan · Tahap {nextLevel} siap dimainkan
          </p>
        </div>
      </div>

      {/* Main Menu 6 Cards */}
      <section aria-label="Menu Utama">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {menuCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={() => onNavigate(card.screen)}
                className="group rounded-2xl border border-[#064E3B]/15 bg-white p-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer flex flex-col justify-between min-h-[112px]"
              >
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.accent} text-white flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="mt-3">
                  <div className="font-display text-sm sm:text-base font-bold text-[#064E3B] leading-tight">
                    {card.title}
                  </div>
                  <div className="mt-0.5 text-xs text-[#064E3B]/70">{card.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export const AdventureMapScreen: React.FC<{
  user: HydratedUserState;
  onSelectWorld: (worldId: number) => void;
  onNavigate: (screen: ScreenId) => void;
}> = ({ user, onSelectWorld, onNavigate }) => {
  const totalStars = Object.values(user.progress.completedLevels).reduce(
    (sum, item) => sum + item.stars,
    0
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#064E3B]">Peta Petualangan Ilmu</h1>
          <p className="text-xs text-[#064E3B]/75">
            8 Dunia · 160 Level · Total Bintang Terkumpul: <strong className="tabular-nums">{totalStars}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('leaderboard')}
          className="rounded-xl bg-[#064E3B] px-3.5 py-2 text-xs font-bold text-[#F5C542] hover:bg-[#08634B] cursor-pointer whitespace-nowrap"
        >
          Papan Peringkat
        </button>
      </div>

      {/* Illustrated Winding Map Card */}
      <div className="relative rounded-3xl border-2 border-[#F5C542] overflow-hidden shadow-xl bg-[#022C22]">
        <ResilientImage
          src={GAME_IMAGES.adventureMap}
          alt="Peta Petualangan 3D Muslim Blast"
          className="w-full h-56 sm:h-64 object-cover opacity-90"
          fallbackLabel="Peta Dunia"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#022C22] via-transparent to-[#022C22]/40" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[#FFF8DC]">
          <div>
            <div className="text-xs font-semibold text-[#F5C542]">Jalur Rumah Belajar</div>
            <div className="font-display text-lg font-bold">Jelajahi Setiap Dunia Kebaikan</div>
          </div>
          <MapPin className="w-6 h-6 text-[#F5C542]" />
        </div>
      </div>

      {/* 8 Worlds Path */}
      <div className="grid gap-3">
        {WORLDS.map((world) => {
          const unlocked = totalStars >= world.unlockRequirementStars || world.id === 1;
          const worldStart = (world.id - 1) * 20 + 1;
          const worldEnd = world.id * 20;
          let worldStars = 0;
          let clearedInWorld = 0;
          for (let i = worldStart; i <= worldEnd; i++) {
            const rec = user.progress.completedLevels[i];
            if (rec) {
              clearedInWorld++;
              worldStars += rec.stars;
            }
          }

          return (
            <button
              key={world.id}
              type="button"
              onClick={() => {
                if (!unlocked) return;
                onSelectWorld(world.id);
                onNavigate('level_select');
              }}
              disabled={!unlocked}
              className={`w-full text-left rounded-2xl border-2 p-4 transition flex items-center justify-between gap-3 ${
                unlocked
                  ? 'border-[#F5C542]/70 bg-white hover:shadow-md cursor-pointer'
                  : 'border-[#064E3B]/15 bg-white/60 opacity-75 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg font-bold text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: world.themeColor }}
                >
                  {unlocked ? world.id : <Lock className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-base font-bold text-[#064E3B] truncate">
                    Dunia {world.id}: {world.name}
                  </div>
                  <p className="text-xs text-[#064E3B]/75 line-clamp-1">{world.tagline}</p>
                  <div className="mt-1 text-xs text-[#064E3B]/70 tabular-nums">
                    {clearedInWorld}/20 Level · {worldStars}/60 Bintang
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {unlocked ? (
                  <span className="inline-block rounded-xl bg-[#064E3B] px-3 py-1.5 text-xs font-bold text-[#F5C542]">
                    Buka
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#064E3B]/70 tabular-nums">
                    Butuh {world.unlockRequirementStars} Bintang
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const LevelSelectionScreen: React.FC<{
  user: HydratedUserState;
  levels: GameLevelConfig[];
  selectedWorldId: number;
  onSelectWorld: (worldId: number) => void;
  onPlayLevel: (levelId: number) => void;
  onNavigate: (screen: ScreenId) => void;
}> = ({ user, levels, selectedWorldId, onSelectWorld, onPlayLevel, onNavigate }) => {
  const world = WORLDS.find((w) => w.id === selectedWorldId) || WORLDS[0];
  const worldLevels = levels.filter((l) => l.worldId === world.id);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#064E3B]">
            Dunia {world.id}: {world.name}
          </h1>
          <p className="text-xs text-[#064E3B]/75">{world.tagline}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('adventure_map')}
          className="rounded-xl border border-[#064E3B]/25 bg-white px-3 py-2 text-xs font-bold text-[#064E3B] hover:bg-[#064E3B]/5 cursor-pointer whitespace-nowrap"
        >
          Semua Dunia
        </button>
      </div>

      {/* World quick switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {WORLDS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelectWorld(w.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              w.id === selectedWorldId
                ? 'bg-[#064E3B] text-[#F5C542]'
                : 'bg-white border border-[#064E3B]/15 text-[#064E3B]/80'
            }`}
          >
            D{w.id} · {w.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
        {worldLevels.map((lv) => {
          const record = user.progress.completedLevels[lv.id];
          const unlocked = lv.id <= (user.progress.highestUnlockedLevel || 1);
          const stars = record?.stars || 0;

          return (
            <button
              key={lv.id}
              type="button"
              disabled={!unlocked}
              onClick={() => onPlayLevel(lv.id)}
              className={`min-h-[78px] rounded-2xl border-2 p-2 flex flex-col items-center justify-center gap-1 transition ${
                unlocked
                  ? 'border-[#F5C542] bg-white hover:bg-[#FFF8DC] shadow-sm cursor-pointer'
                  : 'border-[#064E3B]/15 bg-white/50 opacity-55 cursor-not-allowed'
              }`}
            >
              <span className="font-display text-lg font-bold text-[#064E3B] tabular-nums">
                {unlocked ? lv.levelNumber : <Lock className="w-4 h-4" />}
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= stars ? 'text-[#F5C542] fill-[#F5C542]' : 'text-[#064E3B]/20'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-[#064E3B]/70 truncate max-w-full">
                {lv.maxMoves} Lgk
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
