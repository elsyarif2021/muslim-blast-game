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

Pengujian mencakup katalog tanpa server, pemulihan progres setelah reload, penyimpanan yang tidak tersedia, validasi level terkunci, penyelesaian puzzle melalui replay, booster, hadiah kuis, huruf Hijaiyah, misi, prestasi, toko, dan pergantian tanggal hadiah harian. Pengembangan 0.2 juga menguji susunan papan setelah checkpoint, pemulihan langkah kemenangan, pembatalan palu, migrasi save lama, tantangan harian, dan profil pemain.

## Pengembangan 0.2

- **Lanjutkan puzzle:** langkah valid disimpan sebelum animasinya berjalan. Setelah reload, buka Lanjutkan Petualangan lalu Lanjutkan Puzzle. Seed dan riwayat langkah memulihkan susunan blok, skor, sisa langkah, dan palu yang sedang dipilih. Memilih level lain memulai ronde baru.
- **Tantangan harian:** menangkan puzzle, ledakkan sejumlah blok, dan jawab benar soal kuis. Setelah tiga target terpenuhi, klaim 150 koin dan 3 permata satu kali per tanggal perangkat. Penghitungan memakai ronde/kuis yang selesai; hadiah login tetap terpisah.
- **Latihan interaktif:** panduan tiga tahap memperkenalkan kelompok blok, target, dan booster. Panduan muncul pada permainan pertama dan dapat dibuka kembali dari Profil. Latihan tidak mengurangi langkah atau stok.
- **Pengaturan pemain:** ubah nama panggilan, simpan volume, atur efek suara/getaran, serta kurangi animasi. Pengaturan bertahan setelah reload.
- **Simpan lama:** key penyimpanan tetap sama dan saldo, level, koleksi, serta materi yang sudah dipelajari dipertahankan. Ronde dari versi lama belum memiliki riwayat langkah; pemulihan setiap langkah berlaku mulai versi 0.2.

Pengembangan ini tetap memakai mode browser bawaan tanpa env dan tidak menambahkan layanan berbayar. Resume puzzle, tantangan harian, dan perubahan nama tersedia dalam mode lokal.

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
