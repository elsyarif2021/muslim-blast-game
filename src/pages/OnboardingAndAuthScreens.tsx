import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, ShieldCheck, Sparkles, UserCheck, Users } from 'lucide-react';
import { GAME_IMAGES, MimoShowcase, MuslimBlastLogo, ResilientImage } from '../components/GameAssets.tsx';
import { api, type HydratedUserState } from '../services/api.ts';
import type { AgeMode, ScreenId } from '../types/index.ts';

interface AuthFlowProps {
  screen: ScreenId;
  selectedMode: AgeMode;
  onSelectMode: (mode: AgeMode) => void;
  onNavigate: (screen: ScreenId) => void;
  onAuthSuccess: (token: string, user: HydratedUserState) => void;
}

export const SplashScreen: React.FC<{ onStart: () => void; hasSession: boolean }> = ({
  onStart,
  hasSession,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#022C22] flex flex-col items-center justify-between px-6 py-10">
      <div className="absolute inset-0">
        <ResilientImage
          src={GAME_IMAGES.villageBg}
          alt="Desa fantasi Islami Muslim Blast"
          className="w-full h-full object-cover opacity-80"
          fallbackLabel="Desa Taman Akhlak"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#022C22]/70 via-[#064E3B]/35 to-[#022C22]/90" />
      </div>

      {/* Animated drifting clouds & hanging lanterns */}
      <div className="relative z-10 w-full max-w-md flex justify-between items-start pointer-events-none">
        <div className="animate-lantern-sway w-9 h-14 rounded-b-xl border-2 border-[#F5C542] bg-[#F5C542]/30 flex items-center justify-center shadow-lg">
          <div className="w-3 h-5 rounded-full bg-[#FEF08A]" />
        </div>
        <div className="animate-cloud-drift text-[#FFF8DC]/85 text-xs font-semibold tracking-wide bg-[#022C22]/60 px-3 py-1.5 rounded-xl border border-[#F5C542]/30">
          Edukasi · Puzzle · Kebaikan
        </div>
        <div className="animate-lantern-sway w-9 h-14 rounded-b-xl border-2 border-[#F5C542] bg-[#F5C542]/30 flex items-center justify-center shadow-lg">
          <div className="w-3 h-5 rounded-full bg-[#FEF08A]" />
        </div>
      </div>

      {/* Centerpiece */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md my-auto py-4">
        <MuslimBlastLogo size="lg" />
        <p className="mt-2 text-base sm:text-lg font-semibold text-[#FFF8DC] drop-shadow">
          Bermain, Belajar, Raih Kebaikan
        </p>

        <div className="mt-6 animate-float-slow">
          <MimoShowcase size="lg" />
        </div>
      </div>

      {/* Primary Start CTA + single flat hint line */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full min-h-[56px] rounded-2xl bg-gradient-to-b from-[#FFE07D] via-[#F5C542] to-[#D99B16] px-6 py-3.5 font-display text-xl font-bold text-[#022C22] shadow-[0_6px_0_#92400E,0_12px_28px_rgba(2,44,34,0.65)] hover:brightness-105 active:translate-y-1 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>{hasSession ? 'LANJUTKAN PETUALANGAN' : 'MULAI BERMAIN'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-[#FFF8DC]/80 text-center">
          Tekan Enter atau ketuk tombol untuk memulai · Ramah anak &amp; keluarga
        </p>
      </div>
    </div>
  );
};

export const OnboardingAndAuthScreens: React.FC<AuthFlowProps> = ({
  screen,
  selectedMode,
  onSelectMode,
  onNavigate,
  onAuthSuccess,
}) => {
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slides = [
    {
      title: 'Ledakkan Blok Geometri Ceria',
      desc: 'Susun strategi di papan puzzle 8x8 bersama Mimo. Kumpulkan bintang, buka booster roket, bom, dan pelangi tanpa iklan mengganggu saat belajar.',
      icon: Sparkles,
    },
    {
      title: 'Jelajahi Kuis Islam & Hijaiyah',
      desc: 'Pelajari 28 huruf Hijaiyah, tanda baca harakat, kosakata Arab dasar, dan ratusan soal pengetahuan Islam dengan penjelasan edukatif.',
      icon: BookOpen,
    },
    {
      title: 'Aman untuk Anak & Terkontrol',
      desc: 'Mode Anak menonaktifkan iklan komersial dan penukaran tunai secara penuh. Orang tua dapat mengatur batas waktu bermain dan PIN pengaman.',
      icon: ShieldCheck,
    },
  ];

  const handleGuestPlay = async (mode: AgeMode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.guestStart({
        name: mode === 'child' ? 'Sahabat Mimo' : 'Penjelajah Ilmu',
        ageMode: mode,
      });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email, password });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        name,
        email,
        password,
        ageMode: selectedMode,
        referralCode: selectedMode === 'adult' ? referralCode : undefined,
      });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'onboarding') {
    const current = slides[slide];
    const Icon = current.icon;
    return (
      <div className="min-h-screen bg-[#064E3B] text-[#FFF8DC] flex flex-col items-center justify-between p-6">
        <div className="w-full max-w-md flex items-center justify-between">
          <MuslimBlastLogo size="sm" />
          <button
            type="button"
            onClick={() => onNavigate('mode_select')}
            className="text-sm font-semibold text-[#F5C542] hover:underline px-3 py-2 cursor-pointer"
          >
            Lewati
          </button>
        </div>

        <div className="w-full max-w-md rounded-3xl border-2 border-[#F5C542]/70 bg-[#FFF8DC] text-[#022C22] p-7 shadow-2xl text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-[#064E3B] text-[#F5C542] flex items-center justify-center mb-5 shadow-md">
            <Icon className="w-10 h-10" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#064E3B]">{current.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#064E3B]/85">{current.desc}</p>

          <div className="mt-6 flex justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setSlide(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  slide === idx ? 'w-8 bg-[#064E3B]' : 'w-2.5 bg-[#064E3B]/25'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="w-full max-w-md flex gap-3">
          {slide > 0 && (
            <button
              type="button"
              onClick={() => setSlide((s) => s - 1)}
              className="flex-1 min-h-[48px] rounded-2xl border border-[#F5C542]/50 text-[#FFF8DC] font-semibold hover:bg-[#08634B] cursor-pointer"
            >
              Sebelumnya
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (slide < slides.length - 1) setSlide((s) => s + 1);
              else onNavigate('mode_select');
            }}
            className="flex-1 min-h-[48px] rounded-2xl bg-[#F5C542] text-[#022C22] font-display font-bold text-base shadow-[0_4px_0_#B45309] hover:brightness-105 cursor-pointer"
          >
            {slide < slides.length - 1 ? 'Lanjut' : 'Pilih Mode Usia'}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'mode_select') {
    return (
      <div className="min-h-screen bg-[#064E3B] text-[#FFF8DC] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border-2 border-[#F5C542] bg-[#FFF8DC] text-[#022C22] p-6 sm:p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#064E3B]">
              Pilih Mode Usia Bermain
            </h1>
            <p className="mt-2 text-sm text-[#064E3B]/80">
              Muslim Blast menyesuaikan fitur keamanan dan tampilan berdasarkan usia pemain.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-100 border border-red-300 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-4">
            <button
              type="button"
              onClick={() => onSelectMode('child')}
              className={`text-left rounded-2xl border-2 p-4 transition cursor-pointer ${
                selectedMode === 'child'
                  ? 'border-[#10B981] bg-[#10B981]/10'
                  : 'border-[#064E3B]/15 bg-white hover:border-[#10B981]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#064E3B]">
                    Mode Anak &amp; Keluarga (Direkomendasikan)
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#064E3B]/80">
                    Fokus pada puzzle, kuis Islami, Hijaiyah, dan lencana virtual. Tanpa iklan komersial, tanpa fitur dompet tunai, dan mendukung PIN Kontrol Orang Tua.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('adult')}
              className={`text-left rounded-2xl border-2 p-4 transition cursor-pointer ${
                selectedMode === 'adult'
                  ? 'border-[#F5C542] bg-[#F5C542]/15'
                  : 'border-[#064E3B]/15 bg-white hover:border-[#F5C542]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#064E3B] text-[#F5C542] flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#064E3B]">
                    Mode Dewasa (18+ Tahun)
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#064E3B]/80">
                    Akses penuh seluruh permainan edukasi ditambah Pusat Dompet Dewasa (fitur penukaran nyata tetap nonaktif secara default sampai verifikasi hukum &amp; sponsor selesai).
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGuestPlay(selectedMode)}
              className="w-full min-h-[50px] rounded-2xl bg-[#F5C542] text-[#022C22] font-display text-lg font-bold shadow-[0_4px_0_#B45309] hover:brightness-105 cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Menyiapkan Petualangan...' : 'Mulai Bermain Langsung (+500 Koin Ilmu)'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="min-h-[44px] rounded-xl border-2 border-[#064E3B] text-[#064E3B] text-sm font-bold hover:bg-[#064E3B]/5 cursor-pointer"
              >
                Daftar Akun
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="min-h-[44px] rounded-xl bg-[#064E3B] text-[#FFF8DC] text-sm font-bold hover:bg-[#08634B] cursor-pointer"
              >
                Masuk Akun
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-[#064E3B] flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border-2 border-[#F5C542] bg-[#FFF8DC] p-6 sm:p-8 text-[#022C22] shadow-2xl"
        >
          <h1 className="font-display text-2xl font-bold text-[#064E3B]">Masuk ke Muslim Blast</h1>
          <p className="mt-1 text-sm text-[#064E3B]/75">Lanjutkan progres petualangan belajarmu.</p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-[#064E3B]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@contoh.id"
                className="mt-1 w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 bg-white px-3.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#064E3B]">Kata Sandi</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="mt-1 w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 bg-white px-3.5 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full min-h-[48px] rounded-2xl bg-[#F5C542] text-[#022C22] font-display text-base font-bold shadow-[0_4px_0_#B45309] hover:brightness-105 cursor-pointer"
          >
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>

          <div className="mt-4 flex justify-between text-xs font-semibold text-[#064E3B]">
            <button type="button" onClick={() => onNavigate('register')} className="hover:underline cursor-pointer">
              Belum punya akun? Daftar
            </button>
            <button type="button" onClick={() => onNavigate('mode_select')} className="hover:underline cursor-pointer">
              Kembali
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Register screen
  return (
    <div className="min-h-screen bg-[#064E3B] flex items-center justify-center p-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md rounded-3xl border-2 border-[#F5C542] bg-[#FFF8DC] p-6 sm:p-8 text-[#022C22] shadow-2xl"
      >
        <h1 className="font-display text-2xl font-bold text-[#064E3B]">Buat Akun Baru</h1>
        <p className="mt-1 text-sm text-[#064E3B]/75">
          Mode terpilih: <strong>{selectedMode === 'child' ? 'Anak & Keluarga' : 'Dewasa (18+)'}</strong> · Bonus 500 Koin Ilmu
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3.5">
          <label className="block">
            <span className="text-xs font-bold text-[#064E3B]">Nama Panggilan</span>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Ahmad"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 bg-white px-3.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[#064E3B]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@contoh.id"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 bg-white px-3.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[#064E3B]">Kata Sandi</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 bg-white px-3.5 text-sm"
            />
          </label>
          {selectedMode === 'adult' && (
            <label className="block">
              <span className="text-xs font-bold text-[#064E3B]">Kode Rujukan (Opsional)</span>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Contoh: MB12AB34"
                className="mt-1 w-full min-h-[44px] rounded-xl border border-[#064E3B]/25 bg-white px-3.5 text-sm"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full min-h-[48px] rounded-2xl bg-[#F5C542] text-[#022C22] font-display text-base font-bold shadow-[0_4px_0_#B45309] hover:brightness-105 cursor-pointer"
        >
          {loading ? 'Mendaftarkan...' : 'Daftar & Klaim 500 Koin Ilmu'}
        </button>

        <div className="mt-4 flex justify-between text-xs font-semibold text-[#064E3B]">
          <button type="button" onClick={() => onNavigate('login')} className="hover:underline cursor-pointer">
            Sudah punya akun? Masuk
          </button>
          <button type="button" onClick={() => onNavigate('mode_select')} className="hover:underline cursor-pointer">
            Ganti Mode Usia
          </button>
        </div>
      </form>
    </div>
  );
};
