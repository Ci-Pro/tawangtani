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

export const PROMPT_TOOL_DIRECTIVE = `Anda memiliki akses tools berikut: get_weather, fertilizer_calculator, pesticide_calculator, product_search, farm_context, activity_log.
Bila perlu menggunakan sebuah tool, balas HANYA satu baris JSON tanpa teks lain:
{"tool": "nama_tool", "arguments": {...}}
Setelah menerima [TOOL_RESULT ...], lanjutkan menjawab pengguna dengan bahasa Indonesia.
JANGAN mengarang hasil tool. JANGAN mengarang dosis produk.`;
