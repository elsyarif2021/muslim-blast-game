import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'full' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'compact'
            ? 'inline-flex items-center gap-1.5 rounded-xl bg-[#F5C542] px-3 py-2 text-xs font-bold text-[#022C22] shadow-sm hover:brightness-105 transition whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F5C542] px-5 py-3 text-sm font-bold text-[#022C22] shadow-[0_4px_0_#B45309] active:translate-y-0.5 transition whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-4 h-4" />
        Pasang Aplikasi (PWA)
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#F5C542]/50 bg-[#064E3B] px-3.5 py-2 text-xs font-semibold text-[#FFF8DC] hover:bg-[#08634B] transition whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-[#F5C542]" />
          Pasang di iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-3xl border-2 border-[#F5C542] bg-[#FFF8DC] p-6 text-[#022C22] shadow-2xl">
              <h3 className="font-display text-xl font-bold text-[#064E3B]">Pasang di iPhone / iPad</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#064E3B]/85">
                1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah Safari.
                <br />
                2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#064E3B] py-2.5 text-sm font-bold text-[#FFF8DC] hover:bg-[#08634B] cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl border border-[#F5C542] bg-[#022C22] px-4 py-2 text-xs font-semibold text-[#FFF8DC] shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-[#F5C542]" />
      <span>Mode Offline — Kuis, Hijaiyah &amp; puzzle tersimpan tetap aktif.</span>
    </div>
  );
};
