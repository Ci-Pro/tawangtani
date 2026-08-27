/**
 * Lapisan "bahasa awam": menerjemahkan istilah teknis pertanian
 * ke kalimat sehari-hari agar dipahami semua kalangan.
 */

/** Nama tampilan panjang untuk tiap tingkat harga pasar. */
export const LEVEL_PLAIN: Record<number, { title: string; sub: string; jelasan: string }> = {
  1: {
    title: 'Di Petani',
    sub: 'harga saat petani menjual',
    jelasan:
      'Ini harga yang diterima PETANI saat menjual hasil panennya ke tengkulak/kios — paling murah karena belum lewat perantara.',
  },
  2: {
    title: 'Kios Grosir',
    sub: 'antar pedagang besar',
    jelasan:
      'Harga jual-beli antar pedagang besar (kios/penggrosok) dalam jumlah banyak, misal per ton. Petani jarang dapat harga ini.',
  },
  3: {
    title: 'Di Pasar',
    sub: 'harga pembeli akhir',
    jelasan:
      'Harga yang dibayar konsumen di pasar/warung. Selisihnya dengan "di petani" itulah yang diambil perantara.',
  },
};

/** Nama ramah untuk komoditas (pengganti singkatan rahasia seperti GKP). */
export const COMMODITY_FRIENDLY: Record<string, string> = {
  gabah_kering_panen: 'Gabah Kering Panen (GKP)',
  gabah_kering_giling: 'Gabah Kering Giling (GKG)',
  beras_medium: 'Beras Medium',
  beras_premium: 'Beras Premium',
  jagung_pipilan: 'Jagung Pipilan',
  kedelai_kering: 'Kedelai Kering',
  cabai_rawit_merah: 'Cabai Rawit Merah',
  cabai_rawit_hijau: 'Cabai Rawit Hijau',
  cabai_merah_besar: 'Cabai Merah Besar',
  cabai_merah_keriting: 'Cabai Merah Keriting',
  cabai_hijau_besar: 'Cabai Hijau Besar',
  bawang_merah: 'Bawang Merah',
  bawang_putih: 'Bawang Putih',
  bawang_bombay: 'Bawang Bombay',
  bawang_daun: 'Bawang Daun',
  tomat: 'Tomat',
  kentang: 'Kentang',
  wortel: 'Wortel',
  kol: 'Kol / Kubis',
  kacang_tanah: 'Kacang Tanah',
  kacang_hijau: 'Kacang Hijau',
  gula_pasir: 'Gula Pasir',
  minyak_goreng_curah: 'Minyak Goreng Curah',
  minyak_goreng_kemasan: 'Minyak Goreng Kemasan',
  tepung_terigu: 'Tepung Terigu',
  telur_ayam: 'Telur Ayam',
  ayam_broiler: 'Ayam Broiler',
  sapi_murni: 'Daging Sapi Murni',
  ikan_kembung: 'Ikan Kembung',
  ikan_bandeng: 'Ikan Bandeng',
  ikan_tongkol: 'Ikan Tongkol',
  ikan_lele: 'Ikan Lele',
  ikan_nila: 'Ikan Nila',
  ikan_teri: 'Ikan Teri',
  udang_windu: 'Udang Windu',
  pupuk_urea: 'Pupuk Urea (Za Pertanian)',
  pupuk_npk: 'Pupuk NPK 15-15-15',
  pupuk_sp36: 'Pupuk SP-36 (Super Phosphate)',
  pupuk_za: 'Pupuk ZA (Zwavelzure Ammoniak)',
  lpg_3kg: 'Elpiji 3 Kg (Subsidi)',
  lpg_12kg: 'Elpiji 12 Kg',
  semen_portland: 'Semen Portland / PCC',
  mie_instan: 'Mie Instan',
  garam_halus: 'Garam Dapur Halus',
  beras_sphp: 'Beras SPHP (Stabilisasi Pasokan)',
  kacang_panjang: 'Kacang Panjang',
  kangkung: 'Kangkung',
  sawi_hijau: 'Sawi Hijau',
  jeruk_lokal: 'Jeruk Lokal',
  pisang_lokal: 'Pisang Lokal',
  susu_bubuk: 'Susu Bubuk (Setara Dancow)',
  susu_kemanis: 'Susu Kental Manis',
};

/** Kamus istilah untuk layar Panduan. */
export const GLOSARIUM: { istilah: string; arti: string }[] = [
  {
    istilah: 'Petak',
    arti: 'Bagian lahan Anda. Contoh: sawah 1.000 m² dibagi 4 petak = tiap petak 250 m². Berguna supaya pupuk/obat tak salah takaran.',
  },
  {
    istilah: 'HST (Hari Setelah Tanam)',
    arti: 'Umur tanaman dihitung dari hari tanam. Padi umur 30 HST = sudah 30 hari sejak ditanam.',
  },
  {
    istilah: 'Dosis kg/ha',
    arti: 'Berat pupuk untuk setiap hektare (10.000 m²). Contoh: 200 kg/ha = lahan 5.000 m² cukup 100 kg.',
  },
  {
    istilah: 'Are',
    arti: 'Satuan luas = 100 m². Sepuluh are = satu hektare. Sawah orang sering disebut "3 are" ≈ 300 m².',
  },
  {
    istilah: 'Bahan Aktif',
    arti: 'Zat penting di dalam obat hama yang benar-benar bekerja. Merek boleh berbeda, asal bahan aktifnya sama fungsinya sama.',
  },
  {
    istilah: 'Formulasi (EC, WP, SC)',
    arti: 'Bentuk produk: EC = cair diteteskan, WP = bubuk dilarutkan, SC = cair pekat. Ikuti angka di label, mis. EC 18 g/L.',
  },
  {
    istilah: 'Produsen / Grosir / Konsumen',
    arti: 'Tiga tingkat harga: produsen = di petani, grosir = antar pedagang besar, konsumen = di pasar. Petani membandingkan dengan harga produsen.',
  },
  {
    istilah: 'Interval Pra-Panen',
    arti: 'Jeda minimal hari antara semprot obat dan panen agar sisa racun aman. Contoh: interval 14 hari = panen minimal 2 minggu setelah semprot.',
  },
];

/** Kalimat penjelas singkat "dari mana data harga". */
export const SUMBER_HARGA_JELASAN =
  'Data diambil dari Panel Harga resmi pemerintah (Kementerian Pertanian & Badan Pangan Nasional), diperbarui setiap hari. Angka ini acuan nasional/provinsi — harga di pasar desa Anda bisa sedikit beda.';
