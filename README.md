# Muslim Blast

Game puzzle edukasi Islami dengan 8 dunia, 160 level, kuis, 28 huruf Hijaiyah, misi kebaikan, hadiah harian, serta toko item virtual. Tampilan asli tersambung melalui `src/App.tsx`.

## Jalankan dan deploy

Gunakan Node.js 24 dan npm:

```sh
npm ci
npm run dev
```

Buka `http://localhost:3000`. Mode bawaan berjalan di browser tanpa backend dan tanpa environment variable. Pilih Mulai Bermain, lewati atau ikuti pengenalan, lalu Mulai Bermain Langsung. Saat kembali, pilih Lanjutkan Petualangan untuk memuat progres yang tersimpan.

Pada Vercel, gunakan repository ini dengan framework Vite. `vercel.json` mengatur instalasi `npm ci`, build `npm run build`, dan output `dist`. Env boleh kosong. Papan puzzle dimuat terpisah agar halaman awal lebih ringan. Gambar diimpor melalui Vite sehingga URL produksi dan cache PWA mengikuti hasil build.

```sh
npm run lint
npm test
npm run build
npm run preview
```

Pengujian mencakup katalog tanpa server, pemulihan progres setelah reload, penyimpanan yang tidak tersedia, validasi level terkunci, penyelesaian puzzle melalui replay, booster, hadiah kuis, huruf Hijaiyah, misi, prestasi, toko, dan pergantian tanggal hadiah harian.

## Penyimpanan dan fitur

- Progres berada di browser perangkat ini, pada key `muslim-blast:game:v1`. Menghapus data situs akan menghapus progres. Data tidak disinkronkan antarperangkat.
- Mode lokal tidak meminta email atau password. Identitas lokal bukan autentikasi server; koin, permata, dan prestasi lokal hanya untuk permainan.
- Puzzle, kuis, Hijaiyah, misi, hadiah harian, prestasi, pembelian booster, serta pengaturan suara dan animasi dapat digunakan dalam mode lokal.
- Hasil puzzle dihitung ulang dari seed dan riwayat langkah. Pengiriman ulang hasil sesi tidak menggandakan hadiah.
- Materi kuis mempertahankan status pratinjau pada data sumber. Rekaman pelafalan Hijaiyah belum disertakan; tombol audio memberi informasi jika rekaman belum tersedia.
- Admin, iklan, dan pencairan uang tetap nonaktif pada demo. Peringkat antarperangkat, autentikasi produksi, dan APK Android belum disediakan oleh perbaikan ini.

## Server pengembangan opsional

Source Express dan skema Supabase tetap tersedia. Untuk menguji API Express, set `VITE_API_MODE=server` saat menjalankan `npm run dev:server`. Express menyimpan data di `data/muslim_blast_store.json`, yang dikecualikan dari Git. Autentikasi server menggunakan token di memori dan perlu login ulang setelah refresh.

`VITE_API_BASE_URL` dapat menunjuk backend terpisah yang sudah dikonfigurasi untuk menerima origin frontend. Mode server membutuhkan host Node dengan penyimpanan persisten; deploy statis Vercel memakai mode lokal bawaan. Jangan memasukkan secret server ke variabel dengan awalan `VITE_`.
