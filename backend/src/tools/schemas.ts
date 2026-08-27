import { ORToolSchema } from '../services/openrouter';

export const TOOL_SCHEMAS: ORToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description:
        'Ambil cuaca terkini lokasi pengguna beserta rekomendasi kondisi penyemprotan. Gunakan saat pengguna bertanya soal cuaca, hujan, suhu, angin, atau kelayakan semprot.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fertilizer_calculator',
      description: 'Hitung total kebutuhan pupuk dari luas lahan dan dosis.',
      parameters: {
        type: 'object',
        required: ['areaValue', 'dose'],
        properties: {
          areaValue: { type: 'number', description: 'Nilai luas lahan' },
          areaUnit: { type: 'string', enum: ['m2', 'are', 'ha'], description: 'Satuan luas, default ha' },
          dose: { type: 'number', description: 'Dosis pupuk' },
          doseUnit: {
            type: 'string',
            enum: ['kg/ha', 'g/m2', 'kg/m2', 'g/ha', 'ton/ha'],
            description: 'Satuan dosis, default kg/ha',
          },
          gridCount: { type: 'number', description: 'Jumlah petak pembagian (opsional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pesticide_calculator',
      description:
        'Hitung kebutuhan pestisida per tangki dan total dari dosis, volume tangki, luas lahan, dan volume air.',
      parameters: {
        type: 'object',
        required: ['dose', 'doseUnit', 'tankVolumeL', 'areaValue', 'waterRateLPerHa'],
        properties: {
          dose: { type: 'number', description: 'Dosis produk' },
          doseUnit: {
            type: 'string',
            enum: ['mL/L', 'g/L', 'mL/ha', 'g/ha', 'L/ha', 'kg/ha'],
          },
          tankVolumeL: { type: 'number', description: 'Volume tangki sprayer dalam liter' },
          areaValue: { type: 'number', description: 'Luas lahan' },
          areaUnit: { type: 'string', enum: ['m2', 'are', 'ha'] },
          waterRateLPerHa: { type: 'number', description: 'Volume air liter per hektare' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_search',
      description: 'Cari produk pupuk/pestisida di katalog berdasarkan merek, bahan aktif, komoditas, atau target hama.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Kata kunci pencarian' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'farm_context',
      description: 'Ambil konteks lahan dan tanaman aktif pengguna (nama, luas, jenis, umur, fase).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        'Cari di basis pengetahuan budidaya (teknik tanam, pemupukan menurut umur, hama/penyakit per komoditas, PHT, keselamatan pestisida). WAJIB dipakai untuk pertanyaan cara budidaya, gejala penyakit/hama, dan jadwal pemupukan.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Kata kunci pencarian dalam bahasa Indonesia' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'market_price',
      description:
        'Cek harga pasar komoditas hortikultura/pangan (bawang merah, cabai, tomat, dll) beserta tren dan rekomendasi jual. WAJIB dipakai saat pengguna bertanya harga, kapan jual, atau untung-rugi panen.',
      parameters: {
        type: 'object',
        properties: {
          commodity: {
            type: 'string',
            description: "Kunci komoditas, mis. bawang_merah, cabai_rawit_merah. Kosong = semua.",
          },
          province: { type: 'string', description: "Nama provinsi, default 'nasional'" },
          range: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            description:
              'Bila diisi, kembalikan statistik historis per periode (avg/min/max/close) untuk analisis tren, bukan harga saat ini.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'activity_log',
      description: 'Catat aktivitas budidaya pengguna (tanam, pemupukan, penyemprotan, panen, dll).',
      parameters: {
        type: 'object',
        required: ['activity'],
        properties: {
          activity: {
            type: 'string',
            enum: ['tanam', 'pemupukan', 'penyemprotan', 'penyiraman', 'penyiangan', 'panen', 'lainnya'],
          },
          productName: { type: 'string' },
          doseText: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },
  },
];

export const PROMPT_TOOL_DIRECTIVE = `Anda memiliki akses tools berikut: get_weather, fertilizer_calculator, pesticide_calculator, product_search, farm_context, search_knowledge, market_price, activity_log.
Bila perlu menggunakan sebuah tool, balas HANYA satu baris JSON tanpa teks lain:
{"tool": "nama_tool", "arguments": {...}}
Setelah menerima [TOOL_RESULT ...], lanjutkan menjawab pengguna dengan bahasa Indonesia.
JANGAN mengarang hasil tool. JANGAN mengarang dosis produk.`;

interface ArgDef {
  type?: 'string' | 'number' | 'boolean' | 'null';
  enum?: unknown[];
  description?: string;
}

interface ParamSchema {
  type?: 'object';
  required?: string[];
  properties?: Record<string, ArgDef>;
}

function schemaFor(toolName: string): ParamSchema | null {
  const t = TOOL_SCHEMAS.find((s) => s.function.name === toolName);
  return (t?.function.parameters as unknown as ParamSchema | undefined) ?? null;
}

/**
 * Validasi argumen tool terhadap skema JSON. Mengembalikan pesan galat berbahasa
 * Indonesia bila tidak valid (untuk diumpankan kembali ke model), atau null bila valid.
 */
export function validateToolArgs(
  toolName: string,
  args: Record<string, unknown>
): string | null {
  const schema = schemaFor(toolName);
  if (!schema) return null;

  for (const req of schema.required ?? []) {
    const v = args[req];
    if (v === undefined || v === null || v === '') {
      return `Argumen wajib "${req}" hilang untuk tool ${toolName}.`;
    }
  }

  for (const [key, def] of Object.entries(schema.properties ?? {})) {
    const v = args[key];
    if (v === undefined || v === null) continue;
    if (def.type === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n)) {
        return `Argumen "${key}" harus angka (menerima "${String(v)}").`;
      }
      args[key] = n;
    } else if (def.type === 'string' && typeof v !== 'string') {
      args[key] = String(v);
    }
    if (def.enum && !def.enum.includes(args[key])) {
      return `Argumen "${key}" harus salah satu dari: ${def.enum.join(', ')} (menerima "${String(args[key])}").`;
    }
  }
  return null;
}
