import type { HijaiyahLetter } from '../types/index.ts';

export const HIJAIYAH_LETTERS: HijaiyahLetter[] = [
  { id: 1, arabic: 'ا', name: 'Alif', transliteration: 'a / —', makhrajNote: 'Keluar dari rongga mulut (Al-Jauf) saat menjadi huruf mad.', exampleWordArabic: 'أَسَدٌ', exampleWordLatin: 'Asadun', exampleMeaning: 'Singa', audioPath: '/assets/audio/hijaiyah/01-alif.mp3' },
  { id: 2, arabic: 'ب', name: 'Ba', transliteration: 'b', makhrajNote: 'Pertemuan kedua bibir bagian dalam secara ringan.', exampleWordArabic: 'بَيْتٌ', exampleWordLatin: 'Baytun', exampleMeaning: 'Rumah', audioPath: '/assets/audio/hijaiyah/02-ba.mp3' },
  { id: 3, arabic: 'ت', name: 'Ta', transliteration: 't', makhrajNote: 'Ujung lidah menyentuh pangkal gigi seri atas.', exampleWordArabic: 'تَمْرٌ', exampleWordLatin: 'Tamrun', exampleMeaning: 'Kurma', audioPath: '/assets/audio/hijaiyah/03-ta.mp3' },
  { id: 4, arabic: 'ث', name: 'Tsa', transliteration: 'ts', makhrajNote: 'Ujung lidah menyentuh ujung gigi seri atas (lembut).', exampleWordArabic: 'ثَوْبٌ', exampleWordLatin: 'Tsawbun', exampleMeaning: 'Pakaian', audioPath: '/assets/audio/hijaiyah/04-tsa.mp3' },
  { id: 5, arabic: 'ج', name: 'Jim', transliteration: 'j', makhrajNote: 'Tengah lidah menyentuh langit-langit atas.', exampleWordArabic: 'جَمَلٌ', exampleWordLatin: 'Jamalun', exampleMeaning: 'Unta', audioPath: '/assets/audio/hijaiyah/05-jim.mp3' },
  { id: 6, arabic: 'ح', name: 'Ha', transliteration: 'h (tenggorokan tengah)', makhrajNote: 'Tenggorokan bagian tengah, bersih tanpa suara serak.', exampleWordArabic: 'حَلِيبٌ', exampleWordLatin: 'Haliibun', exampleMeaning: 'Susu', audioPath: '/assets/audio/hijaiyah/06-ha.mp3' },
  { id: 7, arabic: 'خ', name: 'Kha', transliteration: 'kh', makhrajNote: 'Tenggorokan bagian atas dekat pangkal lidah.', exampleWordArabic: 'خُبْزٌ', exampleWordLatin: 'Khubzun', exampleMeaning: 'Roti', audioPath: '/assets/audio/hijaiyah/07-kha.mp3' },
  { id: 8, arabic: 'د', name: 'Dal', transliteration: 'd', makhrajNote: 'Ujung lidah menempel pada pangkal gigi seri atas.', exampleWordArabic: 'دِيكٌ', exampleWordLatin: 'Diikun', exampleMeaning: 'Ayam jantan', audioPath: '/assets/audio/hijaiyah/08-dal.mp3' },
  { id: 9, arabic: 'ذ', name: 'Dzal', transliteration: 'dz', makhrajNote: 'Ujung lidah menyentuh ujung gigi seri atas dengan getaran.', exampleWordArabic: 'ذَهَبٌ', exampleWordLatin: 'Dzahabun', exampleMeaning: 'Emas', audioPath: '/assets/audio/hijaiyah/09-dzal.mp3' },
  { id: 10, arabic: 'ر', name: 'Ra', transliteration: 'r', makhrajNote: 'Ujung punggung lidah menyentuh gusi atas.', exampleWordArabic: 'رُمَّانٌ', exampleWordLatin: 'Rummaanun', exampleMeaning: 'Buah delima', audioPath: '/assets/audio/hijaiyah/10-ra.mp3' },
  { id: 11, arabic: 'ز', name: 'Zay', transliteration: 'z', makhrajNote: 'Ujung lidah sejajar dengan gigi seri bawah.', exampleWordArabic: 'زَهْرَةٌ', exampleWordLatin: 'Zahratun', exampleMeaning: 'Bunga', audioPath: '/assets/audio/hijaiyah/11-zay.mp3' },
  { id: 12, arabic: 'س', name: 'Sin', transliteration: 's', makhrajNote: 'Ujung lidah dekat gigi seri bawah dengan desis lembut.', exampleWordArabic: 'سَمَاءٌ', exampleWordLatin: "Samaa'un", exampleMeaning: 'Langit', audioPath: '/assets/audio/hijaiyah/12-sin.mp3' },
  { id: 13, arabic: 'ش', name: 'Syin', transliteration: 'sy', makhrajNote: 'Tengah lidah terangkat ke langit-langit dengan aliran udara menyebar.', exampleWordArabic: 'شَمْسٌ', exampleWordLatin: 'Syamsun', exampleMeaning: 'Matahari', audioPath: '/assets/audio/hijaiyah/13-syin.mp3' },
  { id: 14, arabic: 'ص', name: 'Shad', transliteration: 'sh (tebal)', makhrajNote: 'Ujung lidah dekat gigi bawah dengan pangkal lidah terangkat (tafkhim).', exampleWordArabic: 'صَبَاحٌ', exampleWordLatin: 'Shabaahun', exampleMeaning: 'Pagi hari', audioPath: '/assets/audio/hijaiyah/14-shad.mp3' },
  { id: 15, arabic: 'ض', name: 'Dhad', transliteration: 'dh (tebal)', makhrajNote: 'Sisi lidah menempel pada gigi geraham atas.', exampleWordArabic: 'ضَوْءٌ', exampleWordLatin: "Dhaw'un", exampleMeaning: 'Cahaya', audioPath: '/assets/audio/hijaiyah/15-dhad.mp3' },
  { id: 16, arabic: 'ط', name: 'Tha', transliteration: 'th (tebal)', makhrajNote: 'Ujung lidah di pangkal gigi seri atas dengan pengangkatan pangkal lidah.', exampleWordArabic: 'طَائِرٌ', exampleWordLatin: "Thaa'irun", exampleMeaning: 'Burung', audioPath: '/assets/audio/hijaiyah/16-tha.mp3' },
  { id: 17, arabic: 'ظ', name: 'Zha', transliteration: 'zh (tebal)', makhrajNote: 'Ujung lidah di ujung gigi seri atas dengan suara tebal.', exampleWordArabic: 'ظِلٌّ', exampleWordLatin: 'Zhillun', exampleMeaning: 'Bayangan', audioPath: '/assets/audio/hijaiyah/17-zha.mp3' },
  { id: 18, arabic: 'ع', name: 'Ain', transliteration: "'a", makhrajNote: 'Tenggorokan bagian tengah secara jelas.', exampleWordArabic: 'عِلْمٌ', exampleWordLatin: "'Ilmun", exampleMeaning: 'Ilmu pengetahuan', audioPath: '/assets/audio/hijaiyah/18-ain.mp3' },
  { id: 19, arabic: 'غ', name: 'Ghain', transliteration: 'gh', makhrajNote: 'Tenggorokan bagian atas, suara mengalir lembut.', exampleWordArabic: 'غَيْمٌ', exampleWordLatin: 'Ghaymun', exampleMeaning: 'Awan', audioPath: '/assets/audio/hijaiyah/19-ghain.mp3' },
  { id: 20, arabic: 'ف', name: 'Fa', transliteration: 'f', makhrajNote: 'Ujung gigi seri atas menyentuh bagian dalam bibir bawah.', exampleWordArabic: 'فَجْرٌ', exampleWordLatin: 'Fajrun', exampleMeaning: 'Fajar', audioPath: '/assets/audio/hijaiyah/20-fa.mp3' },
  { id: 21, arabic: 'ق', name: 'Qaf', transliteration: 'q (tebal)', makhrajNote: 'Pangkal lidah paling belakang menyentuh langit-langit lunak.', exampleWordArabic: 'قَلَمٌ', exampleWordLatin: 'Qalamun', exampleMeaning: 'Pena', audioPath: '/assets/audio/hijaiyah/21-qaf.mp3' },
  { id: 22, arabic: 'ك', name: 'Kaf', transliteration: 'k', makhrajNote: 'Pangkal lidah sedikit di depan makhraj Qaf.', exampleWordArabic: 'كِتَابٌ', exampleWordLatin: 'Kitaabun', exampleMeaning: 'Buku', audioPath: '/assets/audio/hijaiyah/22-kaf.mp3' },
  { id: 23, arabic: 'ل', name: 'Lam', transliteration: 'l', makhrajNote: 'Ujung sisi lidah menyentuh gusi gigi seri atas.', exampleWordArabic: 'لَيْلٌ', exampleWordLatin: 'Laylun', exampleMeaning: 'Malam', audioPath: '/assets/audio/hijaiyah/23-lam.mp3' },
  { id: 24, arabic: 'م', name: 'Mim', transliteration: 'm', makhrajNote: 'Pertemuan kedua bibir dengan dengung ringan di hidung.', exampleWordArabic: 'مَاءٌ', exampleWordLatin: "Maa'un", exampleMeaning: 'Air', audioPath: '/assets/audio/hijaiyah/24-mim.mp3' },
  { id: 25, arabic: 'ن', name: 'Nun', transliteration: 'n', makhrajNote: 'Ujung lidah pada gusi atas disertai suara hidung (ghunnah).', exampleWordArabic: 'نُورٌ', exampleWordLatin: 'Nuurun', exampleMeaning: 'Cahaya', audioPath: '/assets/audio/hijaiyah/25-nun.mp3' },
  { id: 26, arabic: 'ه', name: 'Ha', transliteration: 'h', makhrajNote: 'Tenggorokan paling bawah (dekat dada).', exampleWordArabic: 'هِلَالٌ', exampleWordLatin: 'Hilaalun', exampleMeaning: 'Bulan sabit', audioPath: '/assets/audio/hijaiyah/26-ha2.mp3' },
  { id: 27, arabic: 'و', name: 'Waw', transliteration: 'w', makhrajNote: 'Kedua bibir dimonyongkan membentuk lingkaran kecil.', exampleWordArabic: 'وَرْدَةٌ', exampleWordLatin: 'Wardatun', exampleMeaning: 'Mawar', audioPath: '/assets/audio/hijaiyah/27-waw.mp3' },
  { id: 28, arabic: 'ي', name: 'Ya', transliteration: 'y', makhrajNote: 'Tengah lidah diangkat mendekati langit-langit atas.', exampleWordArabic: 'يَدٌ', exampleWordLatin: 'Yadun', exampleMeaning: 'Tangan', audioPath: '/assets/audio/hijaiyah/28-ya.mp3' },
];

export interface HarakatLesson {
  id: string;
  name: string;
  symbolOnBa: string;
  soundSuffix: string;
  description: string;
  exampleArabic: string;
  exampleLatin: string;
}

export const HARAKAT_LESSONS: HarakatLesson[] = [
  {
    id: 'fathah',
    name: 'Fathah',
    symbolOnBa: 'بَ',
    soundSuffix: 'a',
    description: 'Garis miring kecil di atas huruf, dibaca berbunyi vokal "a" (contoh: Ba).',
    exampleArabic: 'كَتَبَ',
    exampleLatin: 'Ka-ta-ba (menulis)',
  },
  {
    id: 'kasrah',
    name: 'Kasrah',
    symbolOnBa: 'بِ',
    soundSuffix: 'i',
    description: 'Garis miring kecil di bawah huruf, dibaca berbunyi vokal "i" (contoh: Bi).',
    exampleArabic: 'عَلِمَ',
    exampleLatin: "'A-li-ma (mengetahui)",
  },
  {
    id: 'dhammah',
    name: 'Dhammah',
    symbolOnBa: 'بُ',
    soundSuffix: 'u',
    description: 'Tanda seperti huruf waw kecil di atas huruf, dibaca berbunyi vokal "u" (contoh: Bu).',
    exampleArabic: 'كُتُبٌ',
    exampleLatin: 'Ku-tu-bun (buku-buku)',
  },
  {
    id: 'sukun',
    name: 'Sukun',
    symbolOnBa: 'بْ',
    soundSuffix: 'mati',
    description: 'Tanda bulat kecil di atas huruf yang menandakan huruf dibaca mati/konsonan.',
    exampleArabic: 'أَبْ',
    exampleLatin: 'Ab (mati pada huruf Ba)',
  },
];
