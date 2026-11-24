import type { QuizDifficulty, QuizQuestion } from '../types/index.ts';

export const QUIZ_CATEGORIES = [
  'Rukun Islam',
  'Rukun Iman',
  'Akhlak Terpuji',
  'Adab Sehari-hari',
  'Sejarah Islam',
  'Kisah Nabi',
  'Pengetahuan Masjid',
  'Wudhu',
  'Shalat',
  'Puasa',
  'Zakat',
  'Haji',
] as const;

type RawQuestion = [
  category: string,
  difficulty: QuizDifficulty,
  question: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string,
  referenceNote: string
];

const RAW_QUESTIONS: RawQuestion[] = [
  // 1. Rukun Islam (9)
  ['Rukun Islam', 'Mudah', 'Berapa jumlah rukun Islam?', ['Tiga', 'Empat', 'Lima', 'Enam'], 2, 'Rukun Islam berjumlah lima perkara utama.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Mudah', 'Apakah rukun Islam yang pertama?', ['Shalat', 'Mengucap dua kalimat syahadat', 'Puasa', 'Zakat'], 1, 'Dua kalimat syahadat adalah pintu masuk dan rukun Islam pertama.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Mudah', 'Apakah rukun Islam yang kedua?', ['Puasa Ramadhan', 'Zakat', 'Mendirikan shalat', 'Haji'], 2, 'Mendirikan shalat lima waktu merupakan rukun Islam kedua.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Mudah', 'Rukun Islam yang ketiga adalah...', ['Menunaikan zakat', 'Membaca buku', 'Shalat sunnah', 'Safar'], 0, 'Menunaikan zakat adalah rukun Islam ketiga bagi yang memenuhi syarat.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Mudah', 'Pada bulan apakah umat Islam melaksanakan puasa wajib (rukun Islam keempat)?', ['Syawal', 'Ramadhan', 'Muharram', 'Dzulhijjah'], 1, 'Puasa wajib dilaksanakan pada bulan Ramadhan.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Sedang', 'Rukun Islam kelima diwajibkan bagi Muslim yang...', ['Sudah bersekolah', 'Mampu secara fisik, bekal, dan perjalanan', 'Tinggal di kota besar', 'Berusia di bawah 10 tahun'], 1, 'Ibadah haji diwajibkan satu kali seumur hidup bagi yang mampu (istitha’ah).', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Sedang', 'Kalimat syahadat terdiri atas persaksian kepada Allah dan pengakuan kerasulan...', ['Nabi Musa', 'Nabi Isa', 'Nabi Muhammad SAW', 'Nabi Ibrahim'], 2, 'Syahadat bersaksi tiada tuhan selain Allah dan Nabi Muhammad SAW adalah utusan Allah.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Sedang', 'Di antara hikmah menunaikan rukun Islam secara seimbang adalah...', ['Menumbuhkan ketaatan dan kepedulian sosial', 'Menghindari belajar ilmu umum', 'Mengurangi waktu istirahat', 'Menyendiri selamanya'], 0, 'Rukun Islam memadukan hubungan kepada Allah dan kepedulian sesama manusia.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Islam', 'Sulit', 'Ibadah dalam rukun Islam yang memiliki dimensi penyucian harta sekaligus membantu mustahik adalah...', ['Syahadat', 'Zakat', 'Iktikaf', 'Takbiratul ihram'], 1, 'Zakat membersihkan harta dan disalurkan kepada delapan golongan penerima yang berhak.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],

  // 2. Rukun Iman (9)
  ['Rukun Iman', 'Mudah', 'Berapa jumlah rukun Iman dalam ajaran Islam?', ['Empat', 'Lima', 'Enam', 'Tujuh'], 2, 'Rukun Iman berjumlah enam perkara keyakinan.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Mudah', 'Rukun Iman yang pertama adalah beriman kepada...', ['Malaikat', 'Allah SWT', 'Kitab-kitab', 'Hari Kiamat'], 1, 'Iman kepada Allah SWT adalah dasar dari seluruh rukun iman.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Mudah', 'Malaikat diciptakan Allah SWT dari...', ['Tanah', 'Api', 'Cahaya (Nur)', 'Air'], 2, 'Dalam riwayat yang dikenal luas, malaikat diciptakan dari cahaya dan selalu taat.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Mudah', 'Malaikat yang bertugas menyampaikan wahyu kepada para nabi adalah...', ['Mikail', 'Israfil', 'Jibril', 'Izrail'], 2, 'Malaikat Jibril bertugas menyampaikan wahyu dari Allah SWT kepada para nabi dan rasul.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Sedang', 'Kitab suci yang diturunkan kepada Nabi Muhammad SAW sebagai penyempurna kitab sebelumnya adalah...', ['Taurat', 'Zabur', 'Injil', 'Al-Quran'], 3, 'Al-Quran merupakan kitab suci umat Islam yang diturunkan kepada Nabi Muhammad SAW.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Sedang', 'Rukun Iman kelima adalah beriman kepada...', ['Hari Akhir (Kiamat)', 'Para Rasul', 'Malaikat', 'Qadha dan Qadar'], 0, 'Iman kepada Hari Akhir mengingatkan manusia agar beramal saleh dan bertanggung jawab.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Sedang', 'Rukun Iman keenam adalah beriman kepada Qadha dan Qadar, yaitu...', ['Jadwal perjalanan', 'Ketetapan dan takdir Allah disertai ikhtiar', 'Aturan lalu lintas', 'Nama bulan Hijriah'], 1, 'Beriman kepada takdir selalu disertai usaha sungguh-sungguh (ikhtiar) dan doa.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Sulit', 'Malaikat yang dikenal bertugas mencatat amal baik dan amal buruk manusia adalah...', ['Munkar dan Nakir', 'Raqib dan Atid', 'Malik dan Ridwan', 'Jibril dan Mikail'], 1, 'Malaikat Raqib dan Atid mencatat setiap amal kebaikan dan keburukan manusia.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],
  ['Rukun Iman', 'Sulit', 'Dalam rukun iman kepada kitab-kitab Allah, kitab Zabur diturunkan kepada Nabi...', ['Musa AS', 'Daud AS', 'Isa AS', 'Sulaiman AS'], 1, 'Kitab Zabur diturunkan Allah SWT kepada Nabi Daud AS.', 'Draft Kurikulum Dasar Islam — Perlu tinjauan ahli'],

  // 3. Akhlak Terpuji (9)
  ['Akhlak Terpuji', 'Mudah', 'Sifat berkata benar dan tidak berbohong disebut...', ['Shiddiq (Jujur)', 'Takabur', 'Ghibah', 'Hasad'], 0, 'Shiddiq berarti jujur dalam perkataan maupun perbuatan.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Mudah', 'Menjaga titipan dan menepati janji merupakan ciri akhlak...', ['Amanah', 'Pemarah', 'Pelit', 'Iri hati'], 0, 'Amanah artinya dapat dipercaya dalam menjaga tanggung jawab atau titipan.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Mudah', 'Sikap rendah hati dan tidak sombong kepada orang lain disebut...', ['Riya', 'Tawadhu', 'Ujub', 'Bakhil'], 1, 'Tawadhu adalah sikap rendah hati dan menghargai sesama.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Mudah', 'Ketika teman mengalami kesulitan, akhlak terpuji yang dianjurkan adalah...', ['Menertawakannya', 'Membantunya dengan ikhlas', 'Membiarkannya', 'Mengeluh'], 1, 'Tolong-menolong dalam kebaikan adalah akhlak mulia yang mempererat persaudaraan.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Sedang', 'Menahan emosi dan tetap tenang saat menghadapi ujian disebut...', ['Sabar', 'Putus asa', 'Terburu-buru', 'Dendaman'], 0, 'Sabar membantu seseorang mengambil keputusan bijak saat menghadapi cobaan.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Sedang', 'Menerima pemberian rezeki Allah dengan hati lapang dan tidak serakah disebut...', ['Qanaah', 'Serakah', 'Israf', 'Boros'], 0, 'Qanaah membuat hati merasa cukup dan bersyukur atas karunia Allah setelah berusaha.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Sedang', 'Ketika berbuat salah kepada teman, sikap terpuji yang harus dilakukan adalah...', ['Menyalahkan orang lain', 'Segera meminta maaf dan memperbaiki diri', 'Bersembunyi', 'Berpura-pura lupa'], 1, 'Mengakui kesalahan dan meminta maaf mencerminkan keberanian dan kedewasaan akhlak.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Sulit', 'Berbuat baik semata-mata mengharap ridha Allah SWT tanpa ingin dipuji manusia disebut...', ['Sumah', 'Ikhlas', 'Riya', 'Taklid'], 1, 'Ikhlas menjaga kemurnian niat dalam beribadah dan berbuat kebaikan.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],
  ['Akhlak Terpuji', 'Sulit', 'Menghindari membicarakan keburukan orang lain di belakangnya artinya menjauhi...', ['Musyawarah', 'Ghibah', 'Silaturahmi', 'Tasamuh'], 1, 'Ghibah adalah membicarakan aib orang lain yang tidak disukainya saat ia tidak hadir.', 'Draft Kurikulum Akhlak — Perlu tinjauan ahli'],

  // 4. Adab Sehari-hari (9)
  ['Adab Sehari-hari', 'Mudah', 'Sebelum makan dan minum, kita dianjurkan untuk...', ['Berlari-lari', 'Mencuci tangan dan membaca basmalah', 'Langsung berbicara keras', 'Berdiri di jalan'], 1, 'Mencuci tangan menjaga kebersihan dan membaca basmalah mengawali makan dengan syukur.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Mudah', 'Saat makan dan minum, kita dianjurkan menggunakan tangan...', ['Kiri', 'Kanan', 'Kedua kaki', 'Siku'], 1, 'Menggunakan tangan kanan saat makan dan minum adalah adab yang diajarkan dalam Islam.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Mudah', 'Ucapan salam yang penuh doa ketika bertemu sesama Muslim adalah...', ['Halo saja', 'Assalamualaikum warahmatullahi wabarakatuh', 'Permisi', 'Selamat tidur'], 1, 'Salam adalah doa keselamatan, rahmat, dan keberkahan bagi sesama.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Mudah', 'Bagaimana adab berbicara kepada kedua orang tua?', ['Dengan suara keras', 'Dengan sopan, lembut, dan penuh hormat', 'Sambil membelakangi', 'Membantah terus-menerus'], 1, 'Menghormati dan bertutur kata lembut kepada orang tua adalah bagian dari Birrul Walidain.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Sedang', 'Setelah selesai makan, kalimat pujian yang dianjurkan untuk diucapkan adalah...', ['Alhamdulillah', 'Astaghfirullah', 'Innalillahi', 'Subhanallah'], 0, 'Alhamdulillah diucapkan sebagai ungkapan syukur kepada Allah atas rezeki makanan.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Sedang', 'Ketika hendak masuk ke rumah orang lain, adab yang tepat adalah...', ['Langsung membuka pintu', 'Mengucap salam dan meminta izin dengan sopan', 'Mengintip jendela', 'Berteriak di halaman'], 1, 'Meminta izin dan memberi salam menjaga privasi serta kehormatan tuan rumah.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Sedang', 'Ketika bersin, seorang Muslim dianjurkan membaca...', ['Alhamdulillah', 'Allahu Akbar', 'Masya Allah', 'Bismillah'], 0, 'Membaca Alhamdulillah saat bersin adalah bentuk syukur atas nikmat kesehatan.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Sulit', 'Ketika menuntut ilmu di kelas, adab murid kepada guru antara lain adalah...', ['Menyela pembicaraan guru', 'Menyimak dengan tenang dan bertanya dengan sopan', 'Bermain saat pelajaran', 'Meninggalkan kelas tanpa izin'], 1, 'Menghormati guru dan menjaga ketenangan kelas membantu keberkahan dan pemahaman ilmu.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],
  ['Adab Sehari-hari', 'Sulit', 'Saat meminjam barang milik teman, adab yang benar adalah...', ['Mengambil tanpa bilang', 'Meminta izin, menjaga dengan baik, dan mengembalikan tepat waktu', 'Menyimpannya selamanya', 'Meminjamkan ke orang lain tanpa izin'], 1, 'Menjaga barang pinjaman adalah bagian dari amanah dan menghormati hak orang lain.', 'Draft Kurikulum Adab — Perlu tinjauan ahli'],

  // 5. Sejarah Islam (9)
  ['Sejarah Islam', 'Mudah', 'Di kota manakah Nabi Muhammad SAW dilahirkan?', ['Madinah', 'Mekkah', 'Damaskus', 'Kairo'], 1, 'Nabi Muhammad SAW lahir di Kota Mekkah.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Mudah', 'Peristiwa perpindahan Nabi Muhammad SAW dan kaum Muslimin dari Mekkah ke Madinah disebut...', ['Isra Miraj', 'Hijrah', 'Fathu Mekkah', 'Hudaybiyah'], 1, 'Peristiwa Hijrah menjadi tonggak penting persatuan masyarakat Muslim di Madinah.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Mudah', 'Bulan pertama dalam kalender Hijriah adalah...', ['Rajab', 'Syaban', 'Muharram', 'Safar'], 2, 'Tahun baru Islam dimulai pada bulan Muharram.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Sedang', 'Sahabat Nabi yang menjadi khalifah pertama setelah wafatnya Rasulullah SAW adalah...', ['Umar bin Khattab', 'Abu Bakar Ash-Shiddiq', 'Utsman bin Affan', 'Ali bin Abi Thalib'], 1, 'Abu Bakar Ash-Shiddiq RA adalah khalifah pertama dalam Khulafaur Rasyidin.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Sedang', 'Siapakah sahabat yang mengumandangkan adzan pertama kali dalam sejarah Islam?', ['Bilal bin Rabah', 'Salman Al-Farisi', 'Zaid bin Haritsah', 'Abu Hurairah'], 0, 'Bilal bin Rabah RA dikenal sebagai muadzin pertama dalam Islam.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Sedang', 'Masjid yang pertama kali dibangun setelah Nabi Muhammad SAW tiba di wilayah Madinah (Quba) adalah...', ['Masjidil Aqsa', 'Masjid Quba', 'Masjid Cordoba', 'Masjid Al-Azhar'], 1, 'Masjid Quba dikenal sebagai masjid pertama yang dibangun dalam sejarah hijrah ke Madinah.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Sulit', 'Khalifah ketiga dari Khulafaur Rasyidin yang dikenal sangat dermawan dan memimpin pembukuan mushaf adalah...', ['Umar bin Khattab', 'Utsman bin Affan', 'Ali bin Abi Thalib', 'Abu Bakar Ash-Shiddiq'], 1, 'Utsman bin Affan RA berperan besar dalam penyeragaman penulisan mushaf Al-Quran.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Sulit', 'Salah satu tokoh ilmuwan Muslim klasik yang menulis karya besar di bidang kedokteran (Al-Qanun fi al-Tibb) adalah...', ['Ibnu Sina', 'Al-Khawarizmi', 'Al-Idrisi', 'Ibnu Battuta'], 0, 'Ibnu Sina memberi sumbangan besar dalam sejarah ilmu kedokteran dunia.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],
  ['Sejarah Islam', 'Sulit', 'Ilmuwan Muslim yang dikenal luas sebagai pelopor ilmu aljabar (Al-Jabr) adalah...', ['Al-Khawarizmi', 'Al-Biruni', 'Jabir bin Hayyan', 'Ibnu Khaldun'], 0, 'Muhammad bin Musa Al-Khawarizmi memperkenalkan dasar-dasar sistematik ilmu aljabar.', 'Draft Kurikulum Sejarah Islam — Perlu tinjauan ahli'],

  // 6. Kisah Nabi (9)
  ['Kisah Nabi', 'Mudah', 'Nabi yang membangun kapal besar atas perintah Allah SWT untuk menyelamatkan kaum beriman dari banjir besar adalah...', ['Nabi Nuh AS', 'Nabi Yunus AS', 'Nabi Musa AS', 'Nabi Harun AS'], 0, 'Nabi Nuh AS berdakwah dengan penuh kesabaran dan membangun bahtera sesuai perintah Allah.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Mudah', 'Nabi yang dikenal memiliki kesabaran luar biasa saat diuji dengan penyakit dan kehilangan harta adalah...', ['Nabi Ayyub AS', 'Nabi Yusuf AS', 'Nabi Daud AS', 'Nabi Zakaria AS'], 0, 'Keteguhan dan doa Nabi Ayyub AS menjadi teladan kesabaran.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Mudah', 'Nabi yang bersama putranya Nabi Ismail AS membangun kembali Ka’bah di Mekkah adalah...', ['Nabi Ibrahim AS', 'Nabi Luth AS', 'Nabi Hud AS', 'Nabi Shaleh AS'], 0, 'Nabi Ibrahim AS dan Nabi Ismail AS meninggikan fondasi Baitullah (Ka’bah).', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Sedang', 'Nabi yang diberi mukjizat oleh Allah SWT dapat memahami bahasa hewan dan memimpin kerajaan besar dengan adil adalah...', ['Nabi Sulaiman AS', 'Nabi Isa AS', 'Nabi Idris AS', 'Nabi Syuaib AS'], 0, 'Nabi Sulaiman AS tetap bersyukur dan rendah hati meski diberi kerajaan yang megah.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Sedang', 'Nabi yang memaafkan saudara-saudaranya dengan lapang dada ketika berkuasa di Mesir adalah...', ['Nabi Yusuf AS', 'Nabi Ilyas AS', 'Nabi Zulkifli AS', 'Nabi Yahya AS'], 0, 'Kisah Nabi Yusuf AS mengajarkan keteguhan iman, amanah, dan kemuliaan memaafkan.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Sedang', 'Nabi yang berdoa kepada Allah ketika berada di dalam perut ikan besar adalah...', ['Nabi Yunus AS', 'Nabi Nuh AS', 'Nabi Musa AS', 'Nabi Ilyasa AS'], 0, 'Nabi Yunus AS memohon ampun dengan tulus hingga Allah SWT menyelamatkannya.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Sulit', 'Gelar Nabi Muhammad SAW sebelum diangkat menjadi rasul karena kejujuran dan keterpercayaannya adalah...', ['Al-Amin', 'Al-Faruq', 'Asadullah', 'Dzun Nurain'], 0, 'Masyarakat Mekkah menjuluki Nabi Muhammad SAW dengan Al-Amin (yang dapat dipercaya).', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Sulit', 'Kelompok rasul yang memiliki keteguhan hati luar biasa (Ulul Azmi) terdiri dari Nuh, Ibrahim, Musa, Isa, dan...', ['Nabi Yusuf AS', 'Nabi Muhammad SAW', 'Nabi Daud AS', 'Nabi Sulaiman AS'], 1, 'Lima rasul Ulul Azmi adalah Nabi Nuh, Ibrahim, Musa, Isa, dan Muhammad SAW.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],
  ['Kisah Nabi', 'Sulit', 'Pelajaran utama dari keteladanan Nabi Musa AS saat menghadapi Firaun adalah...', ['Menyampaikan kebenaran dengan berani dan bertawakal kepada Allah', 'Membalas dengan kesombongan', 'Meninggalkan kaumnya', 'Mengandalkan kekuatan fisik semata'], 0, 'Nabi Musa AS mengandalkan pertolongan Allah dan tetap teguh berdakwah.', 'Draft Kurikulum Kisah Nabi — Perlu tinjauan ahli'],

  // 7. Pengetahuan Masjid (9)
  ['Pengetahuan Masjid', 'Mudah', 'Tempat ibadah utama umat Islam untuk shalat berjamaah dan menuntut ilmu adalah...', ['Masjid', 'Stadion', 'Pasar', 'Stasiun'], 0, 'Masjid merupakan pusat ibadah, pendidikan, dan kebersamaan umat Islam.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Mudah', 'Arah kiblat yang dituju umat Islam saat shalat mengarah ke...', ['Ka’bah di Masjidil Haram', 'Menara Eiffel', 'Gunung Uhud', 'Laut Merah'], 0, 'Ka’bah di Mekkah menjadi arah kiblat pemersatu umat Islam sedunia.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Mudah', 'Saat masuk ke dalam masjid, kita dianjurkan melangkahkan kaki...', ['Kiri terlebih dahulu', 'Kanan terlebih dahulu sambil berdoa', 'Melompat', 'Berlari cepat'], 1, 'Masuk masjid dengan kaki kanan sambil membaca doa masuk masjid dan menjaga ketenangan.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Sedang', 'Bagian menjulang tinggi di masjid yang secara tradisional digunakan untuk mengumandangkan adzan disebut...', ['Mihrab', 'Menara (Minaret)', 'Mimbar', 'Serambi'], 1, 'Menara masjid menjadi penanda lokasi masjid dan tempat mengumandangkan adzan.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Sedang', 'Ceruk atau tempat di bagian depan masjid yang menandai arah kiblat dan tempat imam berdiri disebut...', ['Mihrab', 'Kubah', 'Pelataran', 'Rak sandal'], 0, 'Mihrab menandai posisi imam memimpin shalat berjamaah.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Sedang', 'Shalat sunnah dua rakaat yang dianjurkan saat memasuki masjid sebelum duduk disebut...', ['Shalat Tahiyatul Masjid', 'Shalat Istisqa', 'Shalat Gerhana', 'Shalat Dhuha'], 0, 'Tahiyatul Masjid dilakukan sebagai bentuk penghormatan terhadap rumah ibadah.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Sulit', 'Tiga masjid paling mulia yang dianjurkan dikunjungi dalam Islam adalah Masjidil Haram, Masjid Nabawi, dan...', ['Masjidil Aqsa', 'Masjid Istiqlal', 'Masjid Biru', 'Masjid Demak'], 0, 'Ketiga masjid tersebut memiliki keutamaan khusus dalam tradisi Islam.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Sulit', 'Tempat berdirinya khatib untuk menyampaikan khutbah pada hari Jumat disebut...', ['Mimbar', 'Kubah', 'Bedug', 'Mihrab'], 0, 'Mimbar digunakan khatib untuk menyampaikan nasihat dan khutbah.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],
  ['Pengetahuan Masjid', 'Sulit', 'Salah satu adab penting selama berada di dalam masjid adalah...', ['Menjaga kebersihan, ketenangan, dan tidak mengganggu orang shalat', 'Berbicara keras dengan ponsel', 'Membuang sampah di karpet', 'Berlari di tengah shaf'], 0, 'Menjaga kesucian dan ketenangan masjid adalah tanggung jawab seluruh jamaah.', 'Draft Kurikulum Pengetahuan Masjid — Perlu tinjauan ahli'],

  // 8. Wudhu (9)
  ['Wudhu', 'Mudah', 'Wudhu dilakukan menggunakan air yang...', ['Suci dan menyucikan (mutlak)', 'Bercampur sabun banyak', 'Berwarna tinta', 'Kotor dan berbau'], 0, 'Air yang sah untuk wudhu adalah air suci lagi menyucikan seperti air bersih mengalir.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Mudah', 'Sebelum memulai wudhu, kita membaca niat dan...', ['Basmalah', 'Bertepuk tangan', 'Berlari', 'Tidur'], 0, 'Membaca basmalah sebelum wudhu termasuk sunnah yang sangat dianjurkan.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Mudah', 'Anggota tubuh yang wajib dibasuh pertama kali dalam urutan rukun wudhu setelah niat adalah...', ['Kaki', 'Wajah (muka)', 'Telinga', 'Punggung'], 1, 'Membasuh seluruh wajah merupakan bagian dari rukun wudhu.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Sedang', 'Setelah membasuh wajah, rukun wudhu berikutnya adalah membasuh kedua tangan hingga...', ['Pergelangan saja', 'Siku', 'Bahu', 'Jari saja'], 1, 'Kedua tangan wajib dibasuh dari ujung jari hingga melewati siku.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Sedang', 'Dalam rukun wudhu, bagian kepala dilakukan dengan cara...', ['Mengusap sebagian atau seluruh kepala dengan air', 'Menyiram seluruh badan', 'Mencuci wajah saja', 'Membasuh leher belakang'], 0, 'Mengusap kepala merupakan rukun wudhu (detail kadar usapan memiliki variasi antar mazhab fikih).', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Sedang', 'Anggota tubuh yang dibasuh terakhir dalam urutan rukun wudhu adalah...', ['Kedua kaki hingga mata kaki', 'Kedua telinga', 'Leher', 'Dahi'], 0, 'Membasuh kedua kaki hingga mata kaki menutup rangkaian basuhan rukun wudhu.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Sulit', 'Menjalankan basuhan wudhu secara berurutan mulai dari wajah, tangan, mengusap kepala, hingga kaki disebut...', ['Tartib (tertib)', 'Israf', 'Tayamum', 'Istinja'], 0, 'Tertib menjaga urutan rukun wudhu sesuai tuntunan.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Sulit', 'Saat berwudhu, kita dianjurkan untuk tidak boros air karena Islam melarang sikap...', ['Israf (berlebihan)', 'Hemat', 'Bersih', 'Sabar'], 0, 'Menghemat air saat berwudhu adalah bagian dari kepedulian lingkungan dan sunnah.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],
  ['Wudhu', 'Sulit', 'Salah satu hal yang membatalkan wudhu secara umum disepakati ulama adalah...', ['Keluarnya sesuatu dari dua jalan (buang angin/kecil/besar)', 'Tersenyum ramah', 'Membaca buku', 'Berjalan kaki'], 0, 'Buang angin, buang air kecil, atau buang air besar membatalkan wudhu.', 'Draft Kurikulum Fiqih Wudhu — Perlu tinjauan ahli'],

  // 9. Shalat (9)
  ['Shalat', 'Mudah', 'Berapa jumlah shalat wajib sehari semalam bagi umat Islam?', ['Tiga waktu', 'Empat waktu', 'Lima waktu', 'Tujuh waktu'], 2, 'Shalat fardhu sehari semalam terdiri atas Subuh, Dzuhur, Ashar, Maghrib, dan Isya.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Mudah', 'Shalat wajib pada waktu pagi sebelum matahari terbit yang terdiri atas 2 rakaat adalah...', ['Subuh', 'Dzuhur', 'Maghrib', 'Isya'], 0, 'Shalat Subuh terdiri atas 2 rakaat.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Mudah', 'Shalat wajib yang berjumlah 3 rakaat pada waktu matahari terbenam adalah...', ['Ashar', 'Maghrib', 'Subuh', 'Dzuhur'], 1, 'Shalat Maghrib berjumlah 3 rakaat.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Sedang', 'Takbir pembuka yang mengawali ibadah shalat disebut...', ['Takbiratul Ihram', 'Tasyahud Akhir', 'Salam', 'Qunut'], 0, 'Shalat dimulai dengan Takbiratul Ihram sambil mengucapkan Allahu Akbar.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Sedang', 'Surat Al-Quran yang wajib dibaca pada setiap rakaat shalat menurut mayoritas ulama adalah...', ['Al-Fatihah', 'An-Nas', 'Al-Kautsar', 'Al-Asr'], 0, 'Membaca Al-Fatihah merupakan rukun penting dalam shalat.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Sedang', 'Gerakan membungkukkan badan dengan punggung lurus dan tangan di lutut disebut...', ['Rukuk', 'Sujud', 'Iktidal', 'Duduk di antara dua sujud'], 0, 'Rukuk dilakukan dengan tenang (thumaninah) sebelum bangkit untuk iktidal.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Sulit', 'Ketenangan sejenak pada setiap gerakan rukun shalat agar tidak tergesa-gesa disebut...', ['Thumaninah', 'Istiqamah', 'Musafir', 'Jamaah'], 0, 'Thumaninah membuat shalat lebih khusyuk dan tertib.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Sulit', 'Ibadah shalat ditutup dengan gerakan menoleh ke kanan dan ke kiri sambil mengucapkan...', ['Salam', 'Takbir', 'Istighfar', 'Tahmid'], 0, 'Salam menutup rangkaian gerakan shalat dengan doa keselamatan.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],
  ['Shalat', 'Sulit', 'Shalat berjamaah di masjid sangat dianjurkan karena menumbuhkan...', ['Kebersamaan, kedisiplinan, dan persaudaraan', 'Sikap terburu-buru', 'Persaingan tidak sehat', 'Kemalasan'], 0, 'Shalat berjamaah melatih disiplin waktu dan merapatkan silaturahmi.', 'Draft Kurikulum Fiqih Shalat — Perlu tinjauan ahli'],

  // 10. Puasa (9)
  ['Puasa', 'Mudah', 'Puasa berarti menahan diri dari makan, minum, dan hal yang membatalkan sejak...', ['Terbit fajar hingga terbenam matahari', 'Pagi hingga siang jam 12', 'Malam hingga pagi', 'Sore hingga malam'], 0, 'Puasa berlangsung dari terbit fajar (Subuh) sampai matahari terbenam (Maghrib).', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Mudah', 'Makan pada waktu sebelum Subuh sebelum memulai puasa disebut...', ['Sahur', 'Berbuka', 'Sedekah', 'Tarawih'], 0, 'Makan sahur sangat dianjurkan karena membawa keberkahan dan energi berpuasa.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Mudah', 'Waktu berbuka puasa tiba ketika masuk waktu shalat...', ['Dzuhur', 'Ashar', 'Maghrib', 'Isya'], 2, 'Matahari terbenam pada waktu Maghrib menandai saat berbuka puasa.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Sedang', 'Shalat sunnah malam khusus yang biasa dikerjakan berjamaah di bulan Ramadhan adalah...', ['Shalat Tarawih', 'Shalat Id', 'Shalat Istikharah', 'Shalat Tahiyatul Masjid'], 0, 'Shalat Tarawih dilaksanakan pada malam-malam bulan Ramadhan.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Sedang', 'Malam penuh kemuliaan di sepuluh malam terakhir bulan Ramadhan disebut...', ['Lailatul Qadar', 'Nisfu Syaban', 'Asyura', 'Tahun Baru Hijriah'], 0, 'Umat Islam memperbanyak ibadah di sepuluh malam terakhir untuk meraih keberkahan Lailatul Qadar.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Sedang', 'Selain menahan lapar dan dahaga, orang yang berpuasa juga harus menjaga...', ['Lisan, pandangan, dan akhlak dari perbuatan buruk', 'Tidur sepanjang hari', 'Berbelanja berlebihan', 'Berhenti belajar'], 0, 'Puasa melatih pengendalian diri lahir dan batin.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Sulit', 'Berdiam diri di masjid dengan niat ibadah terutama di akhir Ramadhan disebut...', ['Iktikaf', 'Tawaf', 'Sai', 'Wukuf'], 0, 'Iktikaf membantu memfokuskan hati dalam dzikir, doa, dan membaca Al-Quran.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Sulit', 'Hari raya kemenangan setelah menyelesaikan ibadah puasa Ramadhan jatuh pada tanggal...', ['1 Syawal', '10 Dzulhijjah', '1 Muharram', '12 Rabiul Awal'], 0, 'Idul Fitri dirayakan pada tanggal 1 Syawal.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],
  ['Puasa', 'Sulit', 'Bagi orang sakit atau musafir yang tidak mampu berpuasa di bulan Ramadhan, syariat memberi keringanan berupa...', ['Mengganti puasa di hari lain (qadha) atau ketentuan fidyah sesuai kondisi', 'Tidak perlu shalat', 'Dilarang berdoa', 'Memaksa diri hingga sakit berat'], 0, 'Islam memberi kemudahan (rukhsah) sesuai kemampuan hamba; detail fikihnya mengikuti panduan ulama.', 'Draft Kurikulum Fiqih Puasa — Perlu tinjauan ahli'],

  // 11. Zakat (9)
  ['Zakat', 'Mudah', 'Zakat fitrah ditunaikan pada bulan Ramadhan menjelang...', ['Idul Fitri', 'Idul Adha', 'Awal Muharram', 'Bulan Rajab'], 0, 'Zakat fitrah bertujuan menyucikan jiwa dan membantu fakir miskin menyambut Idul Fitri.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Mudah', 'Zakat atas harta kekayaan yang telah memenuhi batas minimal (nishab) dan masa kepemilikan (haul) disebut...', ['Zakat Mal', 'Zakat Fitrah', 'Hibah', 'Hadiah'], 0, 'Zakat Mal membersihkan harta yang telah mencapai syarat nishab dan haul.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Mudah', 'Orang yang menerima zakat disebut...', ['Muzakki', 'Mustahik', 'Amil', 'Qari'], 1, 'Mustahik adalah golongan yang berhak menerima zakat, sedangkan muzakki adalah pembayar zakat.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Sedang', 'Berapa jumlah golongan (asnaf) penerima zakat yang ditetapkan dalam Islam?', ['Empat', 'Enam', 'Delapan', 'Sepuluh'], 2, 'Terdapat delapan golongan penerima zakat termasuk fakir, miskin, amil, mualaf, dan lainnya.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Sedang', 'Petugas yang dipercaya mengelola dan menyalurkan zakat disebut...', ['Amil', 'Muadzin', 'Khatib', 'Musafir'], 0, 'Amil bertugas mengumpulkan, mencatat, dan mendistribusikan zakat secara amanah.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Sedang', 'Selain zakat wajib, pemberian sukarela kepada siapa saja yang membutuhkan tanpa batas waktu disebut...', ['Sedekah / Infak', 'Utang', 'Pinjaman berbunga', 'Pajak kendaraan'], 0, 'Sedekah dan infak dapat dilakukan kapan saja sesuai kelapangan rezeki.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Sulit', 'Batas minimal jumlah harta yang wajib dikenakan zakat disebut...', ['Nishab', 'Haul', 'Rukun', 'Sunnah'], 0, 'Nishab menjadi ukuran kecukupan harta sebelum kewajiban zakat mal berlaku.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Sulit', 'Masa kepemilikan harta selama satu tahun Hijriah dalam ketentuan zakat mal disebut...', ['Haul', 'Nishab', 'Kifarat', 'Fidyah'], 0, 'Sebagian besar jenis zakat mal mensyaratkan kepemilikan selama satu haul (satu tahun).', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],
  ['Zakat', 'Sulit', 'Dampak sosial utama dari pengelolaan zakat yang amanah dan produktif adalah...', ['Mengurangi kesenjangan dan memberdayakan kaum dhuafa', 'Menumpuk harta di satu tempat', 'Mengurangi solidaritas', 'Membatasi pendidikan'], 0, 'Zakat berperan menggerakkan keadilan sosial dan kesejahteraan masyarakat.', 'Draft Kurikulum Fiqih Zakat — Perlu tinjauan ahli'],

  // 12. Haji (9)
  ['Haji', 'Mudah', 'Ibadah haji dilaksanakan di tanah suci...', ['Mekkah dan sekitarnya', 'Baghdad', 'Istanbul', 'Kairo'], 0, 'Rangkaian ibadah haji dilaksanakan di Mekkah, Mina, Arafah, dan Muzdalifah.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Mudah', 'Pakaian putih sederhana tanpa jahitan (bagi laki-laki) saat berhaji atau umrah disebut...', ['Ihram', 'Jubah', 'Sorban', 'Baju koko'], 0, 'Pakaian ihram melambangkan kesetaraan manusia di hadapan Allah SWT.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Mudah', 'Mengelilingi Ka’bah sebanyak tujuh kali dalam ibadah haji atau umrah disebut...', ['Tawaf', 'Sai', 'Wukuf', 'Tahallul'], 0, 'Tawaf dilakukan tujuh putaran berlawanan arah jarum jam mengelilingi Ka’bah.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Sedang', 'Berjalan atau berlari-lari kecil antara Bukit Shafa dan Marwah sebanyak tujuh kali disebut...', ['Sai', 'Wukuf', 'Mabit', 'Lempar jumrah'], 0, 'Sai mengenang ketabahan dan ikhtiar Siti Hajar dalam mencari air untuk putranya, Ismail AS.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Sedang', 'Puncak rukun ibadah haji pada tanggal 9 Dzulhijjah adalah berdiam diri berdoa di Padang...', ['Arafah (Wukuf)', 'Mina', 'Badar', 'Uhud'], 0, 'Wukuf di Arafah merupakan rukun paling utama dalam ibadah haji.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Sedang', 'Memotong atau mencukur sebagian rambut sebagai tanda selesainya rangkaian ihram disebut...', ['Tahallul', 'Tawaf', 'Miqat', 'Dam'], 0, 'Tahallul menandai berakhirnya larangan-larangan ihram.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Sulit', 'Batas tempat atau waktu dimulainya niat ihram bagi jamaah haji dan umrah disebut...', ['Miqat', 'Mihrab', 'Mimbar', 'Mabit'], 0, 'Jamaah wajib memulai ihram sebelum melewati batas miqat.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Sulit', 'Hari raya kurban yang bertepatan dengan rangkaian ibadah haji pada tanggal 10 Dzulhijjah adalah...', ['Idul Adha', 'Idul Fitri', 'Nuzulul Quran', 'Isra Miraj'], 0, 'Idul Adha jatuh pada tanggal 10 Dzulhijjah.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
  ['Haji', 'Sulit', 'Ibadah berkunjung ke Baitullah di Mekkah yang dapat dilakukan kapan saja di luar musim haji disebut...', ['Umrah', 'Iktikaf', 'Qurban', 'Aqiqah'], 0, 'Umrah mencakup ihram, tawaf, sai, dan tahallul, dan dapat dilaksanakan sepanjang tahun.', 'Draft Kurikulum Fiqih Haji — Perlu tinjauan ahli'],
];

export const INITIAL_QUIZ_QUESTIONS: QuizQuestion[] = RAW_QUESTIONS.map(
  ([category, difficulty, question, options, correctIndex, explanation, referenceNote], index) => ({
    id: `q_${String(index + 1).padStart(3, '0')}`,
    category,
    difficulty,
    question,
    options,
    correctIndex,
    explanation,
    referenceNote,
    reviewStatus: 'draft_needs_expert_review',
  })
);
