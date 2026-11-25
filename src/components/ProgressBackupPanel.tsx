import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { api, type HydratedUserState } from '../services/api.ts';
import { MAX_BACKUP_BYTES, parseProgressBackup } from '../services/progressBackup.ts';

const BUTTON = 'min-h-11 rounded-xl px-4 py-3 text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-default';

export function ProgressBackupPanel({ onRestored }: { onRestored: (user: HydratedUserState) => void }) {
  const [pending, setPending] = useState<{ contents: string; name: string; levels: number; coins: number; date: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const download = () => {
    setError(''); setMessage('');
    try {
      const blob = new Blob([api.exportProgress()], { type: 'application/json' });
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = `muslim-blast-progres-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Cadangan diunduh. Simpan berkas ini untuk memindahkan progres ke perangkat lain.');
    } catch (error) { setError((error as Error).message); }
  };
  const choose = async (file?: File) => {
    const request = ++revision.current;
    setError(''); setMessage(''); setPending(null);
    if (!file) { setBusy(false); return; }
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Ukuran cadangan maksimal 1 MB.');
      const contents = await file.text();
      if (request !== revision.current) return;
      const parsed = parseProgressBackup(contents), user = parsed.game.user;
      setPending({ contents, name: user.profile.name, levels: Object.keys(user.progress.completedLevels).length, coins: user.wallets.koinIlmu, date: parsed.exportedAt });
    } catch (error) { if (request === revision.current) setError((error as Error).message); }
    finally { if (request === revision.current) setBusy(false); }
  };
  const restore = () => {
    if (!pending) return;
    setError('');
    try { onRestored(api.importProgress(pending.contents)); setPending(null); setMessage('Progres berhasil dipulihkan. Salinan progres sebelumnya tersedia untuk dibatalkan.'); }
    catch (error) { setError((error as Error).message); }
  };
  const undo = () => {
    setError('');
    try { onRestored(api.undoProgressRestore()); setPending(null); setMessage('Progres sebelum pemulihan sudah dikembalikan.'); }
    catch (error) { setError((error as Error).message); }
  };
  return <section aria-labelledby="backup-heading" className="rounded-2xl border border-[#064E3B]/15 bg-white p-5 shadow-sm space-y-4">
    <h2 id="backup-heading" className="font-display text-xl text-[#064E3B]">Cadangkan & pulihkan progres</h2>
    <p className="text-sm leading-relaxed">Bawa saldo virtual, koleksi, materi belajar, dan puzzle tersimpan ke browser atau perangkat lain melalui berkas cadangan.</p>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={download} disabled={busy} className={`${BUTTON} bg-[#064E3B] text-white inline-flex items-center gap-2`}><Download className="w-4 h-4" />Unduh cadangan</button><label className={`${BUTTON} border border-emerald-300 text-[#064E3B] inline-flex items-center gap-2`}><Upload className="w-4 h-4" />Pilih berkas cadangan<input ref={input} type="file" accept=".json,application/json" aria-label="Pilih berkas cadangan" onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} disabled={busy} className="sr-only" /></label></div>
    {busy && <p role="status" className="text-sm">Memeriksa cadangan…</p>}
    {pending && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3"><h3 className="font-bold text-[#064E3B]">Pratinjau cadangan</h3><p className="text-sm">{pending.name} · {pending.levels} puzzle selesai · {pending.coins.toLocaleString('id-ID')} koin</p><p className="text-xs">Dibuat {new Date(pending.date).toLocaleString('id-ID')}</p><p className="text-sm">Pemulihan mengganti progres di perangkat ini. Progres saat ini disimpan sebagai salinan sebelum pemulihan.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={restore} className={`${BUTTON} bg-[#064E3B] text-white`}>Pulihkan cadangan ini</button><button type="button" onClick={() => setPending(null)} className={`${BUTTON} border border-emerald-300 text-[#064E3B]`}>Batal</button></div></div>}
    {api.hasRecoverySave() && <button type="button" onClick={undo} className={`${BUTTON} border border-emerald-300 text-[#064E3B] inline-flex gap-2 items-center`}><RotateCcw className="w-4 h-4" />Batalkan pemulihan terakhir</button>}
    {message && <p role="status" className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-xl">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-800 bg-red-50 p-3 rounded-xl">{error}</p>}
  </section>;
}
