import React from 'react';
import type { HydratedUserState } from '../services/api.ts';

export function AdvertisingSettings({ user, busy, onChange }: { user: HydratedUserState; busy: boolean; onChange: (allowed: boolean) => void }) {
  const adult = user.profile.ageMode === 'adult';
  return <section data-ap-blacklist="" aria-labelledby="advertising-heading" className="rounded-2xl border border-[#064E3B]/15 bg-white p-5 shadow-sm space-y-3">
    <h2 id="advertising-heading" className="font-display text-xl text-[#064E3B]">Iklan</h2>
    {adult ? <>
      <label className="flex justify-between items-center gap-3 min-h-11 text-sm font-semibold">
        <span>Iklan pada Mode Dewasa</span>
        <input type="checkbox" checked={user.parental.adsAllowed} disabled={busy || !user.profile.ageConfirmed || user.parental.childModeLocked} onChange={event => onChange(event.target.checked)} className="w-5 h-5 accent-emerald-600" />
      </label>
      <p className="text-sm leading-relaxed">Saat diaktifkan, aplikasi memuat iklan dari Yandex. Mematikan iklan memuat ulang halaman; progres tetap tersimpan.</p>
    </> : <p className="text-sm leading-relaxed">Mode Anak &amp; Keluarga tetap tanpa iklan komersial.</p>}
  </section>;
}
