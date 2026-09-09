/**
 * Mesin Rencana Budidaya (SOP ilmiah) — TAWANGTANI.
 *
 * Menghasilkan rencana fase-oleh-fase yang TERSTRUKTUR dan TER-GROUNDING:
 *  - Kerangka fase & rentang HST disusun sebagai parameter khas budi daya
 *    tropis Indonesia (mengikuti praktik umum Kementan/penyuluh) dan mudah
 *    direview/diubah di CROP_SCHEDULES.
 *  - Angka dosis & nasihat TIDAK PERNAH dikarang: hanya diambil dari chunk
 *    knowledge yang cocok (searchKnowledge/RAG). Tanpa hit KB -> doseText
 *    & advice di-set null dan UI menyarankan konsultasi penyuluh.
 *
 * Deterministik, tanpa LLM sehingga gampang dites & tidak memakai kuota AI.
 */

import { searchKnowledge, KnowledgeHit } from '../store/knowledge';

export type SopPlanStage = 'semai' | 'vegetatif' | 'generatif' | 'pematangan' | 'panen';

export type SopActivityType =
  | 'tanam'
  | 'pemupukan'
  | 'penyemprotan'
  | 'penyiraman'
  | 'penyiangan'
  | 'panen'
  | 'lainnya';

export interface SopStep {
  id: string;
  activity: SopActivityType;
  title: string;
  desc: string;
}

export interface SopPhase {
  id: string;
  stage: SopPlanStage;
  label: string;
  hstStart: number; // hari setelah tanam (inclusif)
  hstEnd: number; // inclusif; -1 berarti "sampai panen"
  active: boolean;
  steps: SopStep[];
  /** Nasihat grounded dari KB (2 kalimat pertama hit paling cocok), null bila tak ada. */
  advice: string | null;
  /** Baris dosis grounded dari KB (mis. "pupuk urea 100 kg/ha"), null bila tak ada. */
  doseText: string | null;
  source: string | null;
}

export interface SopCrop {
  cropType: string; // slug kanonik
  label: string;
  variety?: string;
  ageDays: number | null;
  growthStage: SopPlanStage;
  harvestDaysEstimate: number;
}

export interface SopPlanResult {
  ok: boolean;
  reason?: string; // bila ok=false
  crop?: SopCrop;
  phases?: SopPhase[];
  // Kerangka umum: jangan jadikan patokan kaku, sesuaikan varitas & setempat.
  disclaimer?: string;
  model: string;
  generatedAt: string;
}

export interface SopPlanInput {
  cropType: string;
  variety?: string;
  plantingDate?: string; // YYYY-MM-DD
  growthStage?: SopPlanStage;
  ageDays?: number;
}

// ---------------------------------------------------------------------------
// Navigasi komoditas
// ---------------------------------------------------------------------------

export const SUPPORTED_CROPS: { slug: string; label: string }[] = [
  { slug: 'padi', label: 'Padi' },
  { slug: 'jagung', label: 'Jagung' },
  { slug: 'cabai', label: 'Cabai' },
  { slug: 'bawang_merah', label: 'Bawang Merah' },
  { slug: 'tomat', label: 'Tomat' },
  { slug: 'kedelai', label: 'Kedelai' },
  { slug: 'kentang', label: 'Kentang' },
  { slug: 'terong', label: 'Terong' },
  { slug: 'kacang_tanah', label: 'Kacang Tanah' },
];

const CROP_ALIASES: Record<string, string> = {
  padi: 'padi',
  beras: 'padi',
  gabah: 'padi',
  jagung: 'jagung',
  janggel: 'jagung',
  cabai: 'cabai',
  cabe: 'cabai',
  cabai_merah: 'cabai',
  cabai_rawit: 'cabai',
  bawang: 'bawang_merah',
  bawangmerah: 'bawang_merah',
  tomat: 'tomat',
  kedelai: 'kedelai',
  kacang_kedelai: 'kedelai',
  kentang: 'kentang',
  terong: 'terong',
  terung: 'terong',
  kacang_tanah: 'kacang_tanah',
  kacang: 'kacang_tanah',
};

export function normalizeCrop(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_{2,}/g, '_');
  if (SUPPORTED_CROPS.some((c) => c.slug === key)) return key;
  return CROP_ALIASES[key] ?? null;
}

export function cropLabel(slug: string): string {
  return SUPPORTED_CROPS.find((c) => c.slug === slug)?.label ?? slug;
}

/** Pakailah juga oleh pencari knowledge supaya query senada dengan topik KB. */
const TOPIC_ALIAS: Record<SopPlanStage, string> = {
  semai: 'semai bibit tanam',
  vegetatif: 'budidaya vegetatif pemupukan',
  generatif: 'budidaya generatif pemupukan pengendalian',
  pematangan: 'pengendalian pematangan panen',
  panen: 'panen pascapanen kematangan',
};

// ---------------------------------------------------------------------------
// Kerangka SOP per komoditas (fase, rentang HST, langkah dasar).
// Dosis & angka spesifik TIDAK ditulis di sini — diambil dari KB.
// Sumber: praktik umum budi daya tropis Indonesia; verifikasi dengan PPL/BPP.
// ---------------------------------------------------------------------------

interface SchedulePhase {
  stage: SopPlanStage;
  label: string;
  hstStart: number;
  hstEnd: number;
  topic: SopPlanStage;
  steps: { activity: SopActivityType; title: string; desc: string }[];
}

export const CROP_SCHEDULES: Record<string, { label: string; phases: SchedulePhase[] }> = {
  padi: {
    label: 'Padi',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–45 HST)',
        hstStart: 0,
        hstEnd: 45,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Pengairan bergilir', desc: 'Atur air macak-macak (setinggi 2–3 cm) selang-seling, jangan terendam terus agar akar kuat.' },
          { activity: 'pemupukan', title: 'Pemupukan I & II', desc: 'Pupuk susulan tahap vegetatif sesuai rekomendasi setempat; hindari pemberian saat cuaca ekstrem.' },
          { activity: 'penyiangan', title: 'Penyiangan gulma', desc: 'Bersihkan gulma tiap 2–3 minggu agar tidak berebut hara.' },
          { activity: 'penyemprotan', title: 'Pantau OPT & semprot bila perlu', desc: 'Amati wereng, penggerek batang, dan blas; semprot hanya bila ambang kendali tercapai.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Generatif / Bunting & Berbunga (46–75 HST)',
        hstStart: 46,
        hstEnd: 75,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan penunjang generatif', desc: 'Dukung pembentukan malai; atur waktu agar tidak bersamaan dengan serangan OPT.' },
          { activity: 'penyiraman', title: 'Pengaturan air', desc: 'Pada fase bunting air dijaga tetap; kurangi menjelang panen.' },
          { activity: 'penyemprotan', title: 'Pengendalian OPT', desc: 'Intensifkan pengamatan hama penggerek batang dan penyakit blas.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan (76–110 HST)',
        hstStart: 76,
        hstEnd: 110,
        topic: 'pematangan',
        steps: [
          { activity: 'penyiraman', title: 'Pengeringan bertahap', desc: 'Kurangi genangan agar pematangan merata.' },
          { activity: 'penyemprotan', title: 'Amanah interval pra-panen', desc: 'Berhenti semprot pestisida sesuai interval pra-panen pada label.' },
          { activity: 'lainnya', title: 'Persiapan panen', desc: 'Siapkan tenaga, alat panen, dan rencana pengeringan.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen & Pascapanen (110–135 HST)',
        hstStart: 110,
        hstEnd: 135,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Panen pada kematangan optimal', desc: 'Panen saat gabah matang penuh; segera perontokan agar rendemen terjaga.' },
          { activity: 'lainnya', title: 'Pengeringan & penyimpanan', desc: 'Keringkan sampai kadar air aman sebelum disimpan atau dijual.' },
        ],
      },
    ],
  },

  jagung: {
    label: 'Jagung',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman rutin', desc: 'Jaga kelembapan tanah awal tanam, terutama musim kemarau.' },
          { activity: 'pemupukan', title: 'Pemupukan awal', desc: 'Pupuk dasar + susulan pertama sesuai rekomendasi setempat.' },
          { activity: 'penyiangan', title: 'Penyiangan gulma', desc: 'Lakukan awal pertumbuhan agar tanaman tidak bersaing.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Generatif / Berbunga & Pengisian (31–55 HST)',
        hstStart: 31,
        hstEnd: 55,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan susulan', desc: 'Penunjang pembentukan tongkol; sesuaikan kondisi tanaman.' },
          { activity: 'penyemprotan', title: 'Pantau OPT', desc: 'Amati ulat tongkol, penggerek, dan penyakit; kendalikan bila perlu.' },
          { activity: 'penyiraman', title: 'Pengairan kritis', desc: 'Pastikan air cukup saat silking dan pengisian biji.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan (56–80 HST)',
        hstStart: 56,
        hstEnd: 80,
        topic: 'pematangan',
        steps: [
          { activity: 'penyemprotan', title: 'Hentikan semprot sesuai label', desc: 'Patuhi interval pra-panen pestisida.' },
          { activity: 'lainnya', title: 'Pantau kematangan tongkol', desc: 'Periksa kadar air biji mendekati panen.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen (81–100 HST)',
        hstStart: 81,
        hstEnd: 100,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Panen saat kadar air tepat', desc: 'Petik saat daun kelobot kering; hindari terlambat panen agar tidak berkutu/berjamur.' },
          { activity: 'lainnya', title: 'Pengeringan & penyimpanan', desc: 'Keringkan sampai kadar air aman; simpan di tempat kering.' },
        ],
      },
    ],
  },

  cabai: {
    label: 'Cabai',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman teratur', desc: 'Jaga kelembapan tanah, hindari genangan agar tidak penyakit layu.' },
          { activity: 'pemupukan', title: 'Pemupukan dasar & susulan', desc: 'Pupuk sesuai rekomendasi; imbangi pupuk kandang dan anorganik.' },
          { activity: 'penyiangan', title: 'Penyiangan & mulsa', desc: 'Kontrol gulma; periksa mulsa platik agar rapat.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Generatif / Berbunga & Buah (31–60 HST)',
        hstStart: 31,
        hstEnd: 60,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan pemacu buah', desc: 'Penunjang pembentukan dan pembesaran buah.' },
          { activity: 'penyemprotan', title: 'Kendali lalat buah & ulat', desc: 'Pasang perangkap dan semprot bila ambang terlewati; jaga kebersihan lahan.' },
          { activity: 'penyiraman', title: 'Pengairan teratur', desc: 'Hindari stres air karena memicu bunga gugur.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan & Panen Bertahap (61–95 HST)',
        hstStart: 61,
        hstEnd: 95,
        topic: 'pematangan',
        steps: [
          { activity: 'panen', title: 'Panen bertahap', desc: 'Petik buah mengikuti kematangan, biasanya 2–4 hari sekali.' },
          { activity: 'penyemprotan', title: 'Perhatikan interval pra-panen', desc: 'Patuhi interval pra-panen pestisida dari label.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen Lanjut (96–135 HST)',
        hstStart: 96,
        hstEnd: 135,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Perawatan & panen lanjutan', desc: 'Lanjutkan panen bertahap; pangkas cabang tidak produktif.' },
          { activity: 'lainnya', title: 'Pascapanen', desc: 'Sortasi, grading, dan pengemasan agar nilai jual terjaga.' },
        ],
      },
    ],
  },

  bawang_merah: {
    label: 'Bawang Merah',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman rutin', desc: 'Jaga kelembapan tanah, kurangi menjelang panen.' },
          { activity: 'pemupukan', title: 'Pemupukan awal', desc: 'Pupuk dasar + susulan pertama sesuai rekomendasi setempat.' },
          { activity: 'penyiangan', title: 'Penyiangan gulma', desc: 'Kontrol gulma agar umbi tumbuh maksimal.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Pembentukan Umbi (31–45 HST)',
        hstStart: 31,
        hstEnd: 45,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan penunjang umbi', desc: 'Penunjang pembesaran umbi; kurangi nitrogen menjelang akhir.' },
          { activity: 'penyemprotan', title: 'Pantau OPT', desc: 'Amati trips, ulat, dan penyakit layu/busuk; kendalikan bila perlu.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan (46–55 HST)',
        hstStart: 46,
        hstEnd: 55,
        topic: 'pematangan',
        steps: [
          { activity: 'penyiraman', title: 'Hentikan pengairan', desc: 'Biarkan umbi mengering di tanah agar mudah panen.' },
          { activity: 'lainnya', title: 'Persiapan panen', desc: 'Siapkan tempat pengeringan untuk mempertahankan kualitas umbi.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen & Pascapanen (56–70 HST)',
        hstStart: 56,
        hstEnd: 70,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Cabut umbi yang matang', desc: 'Panen saat 60–80% daun mulai rebah.' },
          { activity: 'lainnya', title: 'Penjemuran & penyimpanan', desc: 'Jemur dengan hati-hati; ikat dan simpan di tempat kering berventilasi.' },
        ],
      },
    ],
  },

  tomat: {
    label: 'Tomat',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman teratur', desc: 'Jaga kelembapan; hindari percikan berlebih yang memicu penyakit daun.' },
          { activity: 'pemupukan', title: 'Pemupukan awal', desc: 'Pemupukan dasar + susulan sesuai rekomendasi setempat.' },
          { activity: 'lainnya', title: 'Ajir & pemangkasan', desc: 'Pasang ajir dan pangkas tunas ketiak agar pertumbuhan terarah.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Generatif / Berbunga & Buah (31–70 HST)',
        hstStart: 31,
        hstEnd: 70,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan penunjang buah', desc: 'Dukung pembungaan dan pembesaran buah.' },
          { activity: 'penyemprotan', title: 'Cegah & kendalikan penyakit', desc: 'Pantau layu, antraknosa, dan perhatikan sanitasi lahan.' },
          { activity: 'penyiraman', title: 'Pengairan teratur', desc: 'Hindari stres air agar buah tidak pecah.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan & Panen I (71–100 HST)',
        hstStart: 71,
        hstEnd: 100,
        topic: 'pematangan',
        steps: [
          { activity: 'panen', title: 'Panen bertahap', desc: 'Panen buah yang cukup masak, 2–4 hari sekali.' },
          { activity: 'penyemprotan', title: 'Interval pra-panen', desc: 'Patuhi interval pra-panen pestisida dari label.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen Lanjut (101–120 HST)',
        hstStart: 101,
        hstEnd: 120,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Perawatan & panen lanjut', desc: 'Lanjutkan panen; periksa percabangan dan kerusakan buah.' },
          { activity: 'lainnya', title: 'Pascapanen', desc: 'Sortasi, grading, dan penanganan ringkas agar kualitas terjaga.' },
        ],
      },
    ],
  },

  kedelai: {
    label: 'Kedelai',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Pengairan awal tanam', desc: 'Pastikan kelembapan tanah cukup untuk perkecambahan.' },
          { activity: 'pemupukan', title: 'Pemupukan dasar', desc: 'Pupuk dasar + penyemprotan Rhizobium sesuai rekomendasi setempat.' },
          { activity: 'penyiangan', title: 'Penyiangan gulma', desc: 'Kontrol gulma awal agar tidak merebut hara.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Generatif / Pembentukan Polong (31–55 HST)',
        hstStart: 31,
        hstEnd: 55,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan penunjang generatif', desc: 'Kurangi nitrogen; dukung pembentukan polong.' },
          { activity: 'penyemprotan', title: 'Pantau hama polong', desc: 'Amati penggerek polong dan pengisap polong; kendalikan bila ambang terlewati.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan (56–70 HST)',
        hstStart: 56,
        hstEnd: 70,
        topic: 'pematangan',
        steps: [
          { activity: 'penyemprotan', title: 'Hentikan semprot sesuai label', desc: 'Patuhi interval pra-panen pestisida.' },
          { activity: 'lainnya', title: 'Pantau pemasakan polong', desc: 'Polong mulai mengering; siapkan waktu panen.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen (71–85 HST)',
        hstStart: 71,
        hstEnd: 85,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Panen polong matang kering', desc: 'Panen saat ±80% polong kering; lakukan pagi hari.' },
          { activity: 'lainnya', title: 'Perontokan & pengeringan', desc: 'Rontokkan dan keringkan biji sebelum disimpan/dijual.' },
        ],
      },
    ],
  },

  kentang: {
    label: 'Kentang',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman teratur', desc: 'Jaga kelembapan tanah agar umbi awal terbentuk baik.' },
          { activity: 'pemupukan', title: 'Pemupukan dasar & susulan', desc: 'Pupuk sesuai rekomendasi; imbangi nitrogen dan kalium.' },
          { activity: 'lainnya', title: 'Pembumbunan awal', desc: 'Naikkan tanah di sekitar batang untuk ruang umbi.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Pembentukan Umbi (31–55 HST)',
        hstStart: 31,
        hstEnd: 55,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan penunjang umbi', desc: 'Tingkatkan kalium; kurangi nitrogen menjelang akhir.' },
          { activity: 'penyemprotan', title: 'Cegah & kendalikan penyakit', desc: 'Pantau Phytophthora/layu dan OPT lain; semprot bila perlu.' },
          { activity: 'penyiraman', title: 'Pengairan teratur', desc: 'Hindari stres air yang memicu umbi pecah.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan (56–75 HST)',
        hstStart: 56,
        hstEnd: 75,
        topic: 'pematangan',
        steps: [
          { activity: 'penyiraman', title: 'Kurangi pengairan', desc: 'Biarkan kulit umbi mengeras menjelang panen.' },
          { activity: 'lainnya', title: 'Persiapan panen', desc: 'Siapkan alat dan tempat pengumpulan umbi.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen (76–90 HST)',
        hstStart: 76,
        hstEnd: 90,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Panen umbi matang', desc: 'Gali saat daun mulai menguning; hindari melukai umbi.' },
          { activity: 'lainnya', title: 'Curing & penyimpanan', desc: 'Pelapisan kulit (curing) dan simpan di tempat gelap-berventilasi.' },
        ],
      },
    ],
  },

  terong: {
    label: 'Terong',
    phases: [
      {
        stage: 'semai',
        label: 'Persemaian & Pindah Tanam (0–30 HST)',
        hstStart: 0,
        hstEnd: 30,
        topic: 'semai',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman semaian', desc: 'Jaga media semai lembap, jangan becek.' },
          { activity: 'tanam', title: 'Pindah tanam', desc: 'Pindahkan bibit sehat ke lahan saat ±4 minggu semai.' },
          { activity: 'pemupukan', title: 'Pupuk dasar', desc: 'Pupuk dasar pada lubang tanam sesuai rekomendasi setempat.' },
        ],
      },
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (31–50 HST)',
        hstStart: 31,
        hstEnd: 50,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Penyiraman rutin', desc: 'Jaga kelembapan; hindari penampungan air berlebih.' },
          { activity: 'lainnya', title: 'Mulsa & ajir', desc: 'Pasang mulsa dan ajir agar buah tidak menyentuh tanah.' },
          { activity: 'pemupukan', title: 'Pemupukan susulan', desc: 'Dukung pertumbuhan cabang sesuai rekomendasi.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Generatif / Bunga & Buah (51–85 HST)',
        hstStart: 51,
        hstEnd: 85,
        topic: 'generatif',
        steps: [
          { activity: 'pemupukan', title: 'Pemupukan penunjang buah', desc: 'Pastikan kalium cukup untuk buah berkualitas.' },
          { activity: 'penyemprotan', title: 'Kendali hama buah & daun', desc: 'Amati keong, kutu, dan ulat buah; kendalikan bila perlu.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan & Panen I (86–100 HST)',
        hstStart: 86,
        hstEnd: 100,
        topic: 'pematangan',
        steps: [
          { activity: 'panen', title: 'Panen bertahap', desc: 'Petik buah pada kematangan optimal, biasanya 3–5 hari sekali.' },
          { activity: 'penyemprotan', title: 'Interval pra-panen', desc: 'Patuhi interval pra-panen pestisida dari label.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen Lanjut (101–120 HST)',
        hstStart: 101,
        hstEnd: 120,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Perawatan & panen lanjut', desc: 'Lanjutkan panen bertahap; pangkas cabang tidak produktif.' },
          { activity: 'lainnya', title: 'Pascapanen', desc: 'Sortasi, grading, dan pengemasan untuk nilai jual lebih baik.' },
        ],
      },
    ],
  },

  kacang_tanah: {
    label: 'Kacang Tanah',
    phases: [
      {
        stage: 'vegetatif',
        label: 'Pertumbuhan Vegetatif (0–40 HST)',
        hstStart: 0,
        hstEnd: 40,
        topic: 'vegetatif',
        steps: [
          { activity: 'penyiraman', title: 'Pengairan awal', desc: 'Jaga kelembapan tanah untuk perkecambahan seragam.' },
          { activity: 'pemupukan', title: 'Pemupukan dasar', desc: 'Pupuk dasar sesuai rekomendasi; hindari nitrogen berlebih.' },
          { activity: 'penyiangan', title: 'Penyiangan gulma', desc: 'Kontrol gulma awal agar tidak bersaing.' },
        ],
      },
      {
        stage: 'generatif',
        label: 'Pembentukan Polong (41–60 HST)',
        hstStart: 41,
        hstEnd: 60,
        topic: 'generatif',
        steps: [
          { activity: 'penyiraman', title: 'Pengairan membantu ginofor', desc: 'Jaga kelembapan agar cabang muda (ginofor) masuk tanah.' },
          { activity: 'penyemprotan', title: 'Kendali penggerek polong', desc: 'Amati serangan hama polong; kendalikan bila ambang terlewati.' },
        ],
      },
      {
        stage: 'pematangan',
        label: 'Pematangan (61–75 HST)',
        hstStart: 61,
        hstEnd: 75,
        topic: 'pematangan',
        steps: [
          { activity: 'penyiraman', title: 'Kurangi pengairan', desc: 'Biarkan polong matang seragam di tanah.' },
          { activity: 'lainnya', title: 'Pantau kematangan polong', desc: 'Periksa polong pada beberapa tanaman contoh.' },
        ],
      },
      {
        stage: 'panen',
        label: 'Panen (76–95 HST)',
        hstStart: 76,
        hstEnd: 95,
        topic: 'panen',
        steps: [
          { activity: 'panen', title: 'Cabut tanaman bertahap', desc: 'Cabut saat ±80% polong matang; tanah lembap agar mudah.' },
          { activity: 'lainnya', title: 'Penjemuran & pascapanen', desc: 'Jemur polong lalu banting/rontokkan; keringkan sebelum simpan.' },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Util murni (mudah dites tanpa jaringan)
// ---------------------------------------------------------------------------

export function stageForAge(schedule: typeof CROP_SCHEDULES[string], ageDays: number | null): SopPlanStage {
  if (ageDays === null) return 'vegetatif';
  for (const ph of schedule.phases) {
    if (ageDays >= ph.hstStart && ageDays <= ph.hstEnd) return ph.stage;
  }
  return ageDays < schedule.phases[0].hstStart ? schedule.phases[0].stage : 'panen';
}

/**
 * Ambil satu baris dosis/takaran dari konten KB secara HATI-HATI.
 * Hanya mengembalikan baris yang memuat angka satuan (kg/ha, mL/L, dll.)
 * DAN kata kunci dosis/pupuk/konsentrasi. Selain itu null -> jangan dikarang.
 */
export function extractDoseLine(content: string): string | null {
  if (!content) return null;
  const lines = content.split(/\n+/);
  for (const raw of lines) {
    for (const part of raw.split(/(?<=[.;])\s+/)) {
      const t = part.replace(/^[-•\s]+/, '').trim().slice(0, 240);
      if (
        /\b\d+(?:[.,]\d+)?\s*(kg|liter|litre|l|ml|g|cc|gram)\s*\/?\s*(ha|tangki|tank|l\b|m2|m²|petak|bibit)/i.test(t) &&
        /(dosis|pupuk|urea|npk|sp[- ]?36|kcl|takaran|konsentrasi|per tangki)/i.test(t)
      ) {
        return t;
      }
    }
  }
  return null;
}

/** 1–2 kalimat pertama konten sebagai nasihat singkat yang grounded. */
export function shortAdvice(content: string): string {
  const clean = (content ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
  return sentences.length <= 320 ? sentences : sentences.slice(0, 320) + '…';
}

// ---------------------------------------------------------------------------
// Pembuat rencana
// ---------------------------------------------------------------------------

export interface SopPlanDeps {
  search?: (query: string, k: number) => Promise<KnowledgeHit[]>;
  now?: () => Date;
}

export async function buildSopPlan(
  input: SopPlanInput,
  deps: SopPlanDeps = {}
): Promise<SopPlanResult> {
  const search = deps.search ?? (async (query: string, k: number) => searchKnowledge(query, k));
  const now = deps.now ?? (() => new Date());

  const slug = normalizeCrop(input.cropType);
  if (!slug) {
    return {
      ok: false,
      reason: `Komoditas "${input.cropType}" belum didukung untuk rencana SOP.`,
      model: 'sop-engine-1',
      generatedAt: now().toISOString(),
    };
  }

  const schedule = CROP_SCHEDULES[slug];
  const label = cropLabel(slug);

  // Umur tanaman hari ini (HST) dari tanggal tanam.
  let ageDays: number | null = null;
  if (input.ageDays !== undefined && Number.isFinite(Number(input.ageDays))) {
    ageDays = Math.max(0, Math.round(Number(input.ageDays)));
  } else if (input.plantingDate && /^\d{4}-\d{2}-\d{2}$/.test(input.plantingDate)) {
    const planted = new Date(`${input.plantingDate}T00:00:00`);
    if (!Number.isNaN(planted.getTime())) {
      ageDays = Math.max(0, Math.floor((now().getTime() - planted.getTime()) / 86_400_000));
    }
  }

  const stage = stageForAge(schedule, ageDays);
  const requestedStage: SopPlanStage | null =
    ageDays === null && input.growthStage && schedule.phases.some((p) => p.stage === input.growthStage)
      ? (input.growthStage as SopPlanStage)
      : null;

  const phases: SopPhase[] = [];
  for (const ph of schedule.phases) {
    // Grounding KB per fase: cari dokumen/artikel yang paling relevan.
    let hits: KnowledgeHit[] = [];
    try {
      hits = await search(`${label} ${TOPIC_ALIAS[ph.topic]}`, 3);
    } catch {
      hits = [];
    }
    const hit = hits.find((h) => {
      const c = (h.crop ?? '').toLowerCase();
      return h.topic === ph.topic && (c === slug || c === 'umum' || label.toLowerCase().includes(c));
    }) ?? hits[0] ?? null;

    phases.push({
      id: `${slug}-${ph.stage}`,
      stage: ph.stage,
      label: ph.label,
      hstStart: ph.hstStart,
      hstEnd: ph.hstEnd,
      active: requestedStage === ph.stage || (ageDays !== null && stage === ph.stage),
      steps: ph.steps.map((s, i) => ({ ...s, id: `${ph.stage}-${i}` })),
      advice: hit ? shortAdvice(hit.content) : null,
      doseText: hit ? extractDoseLine(hit.content) : null,
      source: hit?.source ?? null,
    });
  }

  const lastPhase = schedule.phases[schedule.phases.length - 1];

  return {
    ok: true,
    crop: {
      cropType: slug,
      label,
      variety: input.variety?.trim() ? input.variety.trim().slice(0, 40) : undefined,
      ageDays,
      growthStage: stage,
      harvestDaysEstimate: lastPhase.hstEnd,
    },
    phases,
    disclaimer:
      'Rentang HST adalah kerangka umum budi daya tropis Indonesia; sesuaikan dengan varitas, musim, dan kondisi setempat. Ikuti label resmi dan saran PPL/BPP.',
    model: 'sop-engine-1',
    generatedAt: now().toISOString(),
  };
}