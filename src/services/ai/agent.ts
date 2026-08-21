import { ChatMessage } from '@/types';
import { getBackendUrl, postJson } from '@/services/api/client';
import { executeTool, TOOLS, ToolContext, ToolResult } from './tools';

export interface AgentTurn {
  reply: string;
  toolsUsed: string[];
  actions?: { label: string; route: string }[];
}

interface BackendToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface BackendResponse {
  reply?: string;
  tool_calls?: BackendToolCall[];
}

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Anda adalah TAWANGTANI, asisten pertanian berbahasa Indonesia.
Aturan wajib:
1. Jangan pernah mengarang dosis produk. Gunakan tool fertilizer_calculator/pesticide_calculator/product_search.
2. Jika data tidak cukup untuk diagnosis, nyatakan ketidakpastian dan minta detail (foto, gejala, fase tanaman).
3. Selalu arahkan pengguna mengikuti label resmi produk, penyuluh, atau regulasi setempat.
4. Jangan memberi rekomendasi pencampur produk tanpa data kompatibilitas valid.`;

export async function runAgent(
  history: ChatMessage[],
  userText: string,
  ctx: ToolContext,
  backendUrl?: string
): Promise<AgentTurn> {
  const url = getBackendUrl(backendUrl);
  if (url) {
    try {
      return await runBackendAgent(url, history, userText, ctx);
    } catch {
      return runOfflineAgent(userText, ctx);
    }
  }
  return runOfflineAgent(userText, ctx);
}

export async function runVisionAgent(
  imageBase64: string,
  ctx: ToolContext,
  backendUrl?: string
): Promise<AgentTurn> {
  const url = getBackendUrl(backendUrl);
  if (!url) {
    return {
      reply:
        '📷 Diagnosis foto memerlukan server AI yang terhubung.\n\n' +
        'Sementara itu, Anda bisa menjelaskan gejala secara tertulis:\n' +
        '1. Komoditas & fase pertumbuhan\n2. Gejala yang terlihat\n3. Sebaran & kecepatan menyebar\n\n' +
        'Atur URL Backend di menu Profil bila Anda memiliki server AI sendiri.',
      toolsUsed: [],
    };
  }
  try {
    const res = await postJson<BackendResponse>(`${url}/ai/vision`, {
      imageBase64,
      context: ctx,
    });
    return {
      reply:
        (res.reply ?? '(AI tidak merespons)') +
        '\n\n⚠️ Diagnosis berbasis foto bersifat dugaan — konfirmasi ke penyuluh sebelum aplikasi pestisida.',
      toolsUsed: ['vision'],
    };
  } catch {
    return {
      reply: 'Gagal menghubungi server AI untuk analisis foto. Periksa koneksi atau URL backend.',
      toolsUsed: [],
    };
  }
}

async function runBackendAgent(
  url: string,
  history: ChatMessage[],
  userText: string,
  ctx: ToolContext
): Promise<AgentTurn> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ];
  const toolsUsed: string[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await postJson<BackendResponse>(`${url}/ai/chat`, {
      messages,
      tools: TOOLS,
      context: ctx,
    });

    if (res.tool_calls?.length) {
      for (const call of res.tool_calls) {
        const result: ToolResult = await executeTool(call.name, call.arguments ?? {}, ctx);
        toolsUsed.push(call.name);
        messages.push({ role: 'tool', content: JSON.stringify(result) });
      }
      continue;
    }

    return { reply: res.reply ?? '(AI tidak merespons)', toolsUsed };
  }

  return { reply: 'Maaf, saya belum menemukan jawaban yang pasti. Coba perjelas pertanyaan Anda.', toolsUsed };
}

function has(text: string, ...words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map((m) => Number.parseFloat(m.replace(',', '.'))).filter((n) => Number.isFinite(n));
}

export async function runOfflineAgent(userText: string, ctx: ToolContext): Promise<AgentTurn> {
  const text = userText.toLowerCase();
  const toolsUsed: string[] = [];

  if (has(text, 'halo', 'hai', 'hello', 'assalamu', 'selamat')) {
    return {
      reply:
        'Halo! Saya TAWANGTANI, asisten tani Anda. Saya bisa bantu:\n• Info cuaca & kondisi semprot\n• Hitung kebutuhan pupuk\n• Hitung dosis pestisida\n• Cari produk di katalog\n\nSilakan ajukan pertanyaan, atau gunakan menu Kalkulator untuk hitungan cepat.',
      toolsUsed,
    };
  }

  if (has(text, 'cuaca', 'hujan', 'suhu', 'angin', 'kelembapan', 'semprot')) {
    toolsUsed.push('get_weather');
    const r = await executeTool('get_weather', {}, ctx);
    let extra = '';
    if (has(text, 'semprot', 'spray')) {
      extra =
        '\n\nTips: penyemprotan ideal dilakukan pagi (07.00–09.00) atau sore (16.00–17.30) saat angin tenang.';
    }
    return { reply: r.summary + extra, toolsUsed };
  }

  if (has(text, 'pupuk') && extractNumbers(text).length >= 2) {
    const nums = extractNumbers(text);
    toolsUsed.push('fertilizer_calculator');
    const r = await executeTool(
      'fertilizer_calculator',
      { areaValue: nums[0], dose: nums[1], areaUnit: 'ha', doseUnit: 'kg/ha' },
      ctx
    );
    return {
      reply:
        `${r.summary}\n\nSaya mengasumsikan luas ${nums[0]} ha dan dosis ${nums[1]} kg/ha. ` +
        'Untuk hasil presisi (satuan lain, pembagian petak), buka Kalkulator → Pupuk.' +
        DISCLAIMER_TEXT,
      toolsUsed,
      actions: [{ label: '🧮 Buka Kalkulator Pupuk', route: 'FertilizerCalculator' }],
    };
  }

  if (has(text, 'ingatkan', 'reminder', 'pengingat', 'jadwal')) {
    toolsUsed.push('activity_log');
    const r = await executeTool('activity_log', { activity: 'lainnya' }, ctx);
    return {
      reply:
        'Saya bisa bantu jadwalkan kegiatan budidaya dengan pengingat notifikasi.\n\n' +
        `${r.summary}\nUntuk pengaturan lengkap (tanggal, jam, produk), buka menu Aktivitas.`,
      toolsUsed,
      actions: [{ label: '⏰ Buka Aktivitas & Reminder', route: 'Activities' }],
    };
  }

  if (has(text, 'catat', 'simpan aktivitas', 'tandai')) {
    toolsUsed.push('activity_log');
    const activity = has(text, 'semprot')
      ? 'penyemprotan'
      : has(text, 'pupuk')
        ? 'pemupukan'
        : has(text, 'tanam')
          ? 'tanam'
          : has(text, 'panen')
            ? 'panen'
            : has(text, 'siram')
              ? 'penyiraman'
              : 'lainnya';
    const r = await executeTool('activity_log', { activity }, ctx);
    return { reply: r.summary, toolsUsed };
  }

  if (has(text, 'pestisida', 'semprot', 'racun', 'obat')) {
    toolsUsed.push('product_search');
    const r = await executeTool('product_search', { query: '' }, ctx);
    return {
      reply:
        `${r.summary}\n\nUntuk takaran tepat, buka Kalkulator → Pestisida dan pilih produk — ` +
        'saya akan hitung kebutuhan per tangki otomatis.' +
        DISCLAIMER_TEXT,
      toolsUsed,
      actions: [{ label: '🧪 Buka Kalkulator Pestisida', route: 'PesticideCalculator' }],
    };
  }

  if (has(text, 'produk', 'merek', 'bahan aktif', 'katalog', 'beli')) {
    toolsUsed.push('product_search');
    const query = text.replace(/[^a-z0-9\s-]/g, '').split(/\s+/).slice(0, 3).join(' ');
    const r = await executeTool('product_search', { query }, ctx);
    return { reply: r.summary, toolsUsed };
  }

  if (has(text, 'lahan', 'tanaman', 'ladang', 'sawah', 'kebun')) {
    toolsUsed.push('farm_context');
    const r = await executeTool('farm_context', {}, ctx);
    return { reply: r.summary, toolsUsed };
  }

  if (has(text, 'hama', 'penyakit', 'daun kuning', 'layu', 'bercak')) {
    return {
      reply:
        'Untuk diagnosis hama/penyakit, saya perlu detail lebih:\n1. Komoditas & fase pertumbuhan\n2. Gejala (bercak, layu, lubang daun, dsb.)\n3. Sebaran (menyebar cepat/bertahap)\n\n' +
        'Saya belum bisa menerima foto di versi ini, jadi diagnosis saya bersifat dugaan — ' +
        'konfirmasi ke penyuluh (PPL) sebelum aplikasi pestisida.',
      toolsUsed,
    };
  }

  return {
    reply:
      'Maaf, saya belum yakin memahami pertanyaan itu. Saya bisa bantu soal:\n• Cuaca & waktu semprot\n• Kalkulasi pupuk/pestisida\n• Katalog produk\n• Konteks lahan Anda\n\nCoba ubah pertanyaan atau gunakan menu Kalkulator.',
    toolsUsed,
  };
}

const DISCLAIMER_TEXT =
  '\n\n⚠️ Ikuti label resmi produk dan rekomendasi penyuluh. Data katalog perlu diverifikasi.';
