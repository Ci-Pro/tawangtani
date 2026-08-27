import { ChatMessageIn, ToolCallOut, ToolContext } from '../types';
import { chatCompletion, ORMessage, CompletionResult } from './openrouter';
import { PROMPT_TOOL_DIRECTIVE, TOOL_SCHEMAS } from '../tools/schemas';
import { executeTool } from '../tools/executors';
import { budgetMessages, estimateTokens } from './tokenBudget';

const MAX_ITERATIONS = 7;

/** Maks karakter hasil tool yang dimasukkan ke konteks (perlindungan aliran token). */
const MAX_TOOL_RESULT_CHARS = 3000;
/** Anggaran input perkiraan token per putaran lengkap. */
const MAX_INPUT_TOKENS = 24000;

const SYSTEM_PROMPT = `Anda adalah Tani AI, agronomis digital berbahasa Indonesia di aplikasi TAWANGTANI yang membantu petani kecil memaksimalkan hasil panen.

## CARA BEKERJA
1. Selalu panggil tool yang relevan SEBELUM menjawab: search_knowledge untuk teknik budidaya/hama/penyakit/pemupukan, product_search untuk produk, get_weather untuk cuaca & kelayakan semprot, market_price untuk harga, farm_context untuk lahan pengguna.
2. Untuk pertanyaan "kapan panen/jual/tanam" atau analisis menguntungkan: GABUNGKAN minimal farm_context (fase tanaman) + market_price dengan range=weekly (tren) + get_weather bila terkait jadwal kerja. Berikan rekomendasi konkret dengan alasan dari data.
3. Jangan pernah mengarang dosis, merek, atau bahan aktif. Dosis hanya dari search_knowledge/product_search. Bila data tidak ada, katakan terus terang dan sarankan PPL/penyuluh.

## KERANGKA JAWABAN
- Diagnosis/masalah → jawab dengan struktur bernomor: (1) kemungkinan penyebab paling mungkin dulu, (2) langkah penanganan bertahap dengan dosis/waktu spesifik dari sumber, (3) pencegahan ke depan.
- Gejala hama/penyakit tanpa foto: beri 2-3 kemungkinan dengan ciri pembeda, lalu tanya 1 pertanyaan klarifikasi paling penting (mis. pola bercak, bagian tanaman, cuaca terakhir).
- Pertanyaan praktis singkat → jawab ringkas langsung, jangan bertele-tele.

## ATURAN MUTLAK
4. WAJIB akhiri SETIAP jawaban yang memakai search_knowledge/product_search dengan baris terakhir PERSIS berformat "Sumber: <isi kolom sumber dari artikel/produk yang dipakai>". Jawaban tanpa baris Sumber dianggap gagal. Untuk harga, sebut sumber & tanggal pembaruan dan ingatkan harga nasional bisa beda dari harga lokal.
5. Selalu ingatkan membaca label resmi sebelum aplikasi pestisida/pupuk, patuhi interval pra-panen.
6. Bahasa Indonesia sederhana yang dipahami petani; angka dosis jelas; hindari istilah asing tanpa penjelasan.
7. Prioritaskan pendekatan PHT (budaya teknis dulu, kimia terakhir bila perlu) dan keselamatan pengguna.`;

function tryParseLoose(text: string): { name?: string; parameters?: Record<string, unknown>; arguments?: Record<string, unknown> } | null {
  const cleaned = text.replace(/\[\s*\[/g, '[').replace(/\]\s*\]/g, ']');
  const start = cleaned.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const KNOWN_TOOLS = TOOL_SCHEMAS.map((t) => t.function.name);

const TOOL_ALIASES: Record<string, string> = {
  weather: 'get_weather',
  cuaca: 'get_weather',
  get_cuaca: 'get_weather',
  harga: 'market_price',
  price: 'market_price',
  market_prices: 'market_price',
  products: 'product_search',
  produk: 'product_search',
  knowledge: 'search_knowledge',
  kb: 'search_knowledge',
};

/** Koreksi nama tool yang sedikit salah dari model lemah (alias / jarak edit ≤ 2 / prefiks). */
export function resolveToolName(name?: string): string {
  if (!name) return '';
  const norm = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (KNOWN_TOOLS.includes(norm)) return norm;
  if (TOOL_ALIASES[norm] && KNOWN_TOOLS.includes(TOOL_ALIASES[norm])) return TOOL_ALIASES[norm];
  let best = ''; let bestD = Infinity;
  for (const k of KNOWN_TOOLS) {
    const d = levenshtein(norm, k);
    if (d < bestD) { bestD = d; best = k; }
  }
  return bestD <= 2 ? best : name;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/**
 * Parse argumen tool dengan toleransi kesalahan umum model kecil:
 * kutip tunggal, koma menggantung, True/False/None gaya Python.
 */
export function parseToolArgs(raw?: string): Record<string, unknown> {
  const s = (raw ?? '').trim() || '{}';
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    /* lanjut perbaikan */
  }
  const repaired = s
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .replace(/:\s*True\b/g, ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/:\s*None\b/g, ': null');
  try {
    return JSON.parse(repaired) as Record<string, unknown>;
  } catch {
    /* coba pemindai kurung kurawal */
  }
  const loose = tryParseLoose(repaired);
  if (loose && typeof loose.arguments === 'object' && loose.arguments !== null) {
    return loose.arguments as Record<string, unknown>;
  }
  if (loose && typeof loose.parameters === 'object' && loose.parameters !== null) {
    return loose.parameters as Record<string, unknown>;
  }
  return {};
}

function parseDirective(text: string): ToolCallOut | null {
  if (!text) return null;
  const m = text.match(/\{\s*"tool"\s*:\s*"[^"]+"[\s\S]*?\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]) as { tool?: string; arguments?: Record<string, unknown> };
      if (parsed.tool) return { name: parsed.tool, arguments: parsed.arguments ?? {} };
    } catch {
      /* lanjut ke parser longgar */
    }
  }
  const loose = tryParseLoose(text);
  if (loose && typeof loose.name === 'string') {
    return {
      name: loose.name,
      arguments: loose.parameters ?? loose.arguments ?? {},
    };
  }
  return null;
}

function normalizeMessages(input: ChatMessageIn[]): ORMessage[] {
  const out: ORMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const m of input) {
    if (m.role === 'tool') {
      out.push({
        role: 'user',
        content: `[TOOL_RESULT${m.name ? ' ' + m.name : ''}] ${m.content}`,
      });
      continue;
    }
    if (m.role === 'system') continue;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

export async function runAgent(
  inputMessages: ChatMessageIn[],
  ctx: ToolContext
): Promise<{
  reply: string;
  iterations: number;
  toolCallsUsed: string[];
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const convo = normalizeMessages(inputMessages);
  let nativeToolsBroken = false;
  let iterations = 0;
  const toolCallsUsed: string[] = [];
  let model = '';
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    if (iterations === MAX_ITERATIONS) {
      convo.push({
        role: 'system',
        content:
          'Iterasi terakhir: GUNAKAN data tool yang sudah didapat dan JAWAB pertanyaan pengguna sekarang. Dilarang memanggil tool lagi.',
      });
    }

    // P1: jaga konteks agar tidak melampaui jendela kosong model fallback.
    const budgeted = budgetMessages(convo, {
      systemPrompt: SYSTEM_PROMPT,
      maxInputTokens: MAX_INPUT_TOKENS,
      maxMessageChars: 6000,
    });

    let result: CompletionResult;
    try {
      result = await chatCompletion(
        budgeted,
        nativeToolsBroken ? undefined : TOOL_SCHEMAS,
        undefined,
        nativeToolsBroken ? 'auto' : iterations === 1 ? 'required' : 'auto'
      );
    } catch (err) {
      if (!nativeToolsBroken && iterations === 1) {
        nativeToolsBroken = true;
        convo.push({ role: 'system', content: PROMPT_TOOL_DIRECTIVE });
        iterations -= 1;
        continue;
      }
      throw err;
    }
    if (!model) model = result.model;
    usage.promptTokens += result.usage.promptTokens;
    usage.completionTokens += result.usage.completionTokens;
    usage.totalTokens += result.usage.totalTokens;

    console.log(
      `[agent] it=${iterations} tools=[${result.toolCalls.map((t) => t.name).join(',')}] tokens=${usage.promptTokens}+${usage.completionTokens} model=${result.model}`
    );

    for (const tc of result.toolCalls) {
      const fixed = resolveToolName(tc.name);
      toolCallsUsed.push(fixed);
      if (fixed !== tc.name) console.log(`[agent] nama tool dikoreksi: "${tc.name}" -> "${fixed}"`);
    }
    if (result.toolCalls.length > 0) {
      convo.push({
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
          ...(tc.extraContent !== undefined ? { extra_content: tc.extraContent } : {}),
        })),
      });
      for (const tc of result.toolCalls) {
        const args = parseToolArgs(tc.arguments);
        const toolName = resolveToolName(tc.name);
        if (toolName !== tc.name) {
          console.log(`[agent] nama tool dikoreksi: "${tc.name}" -> "${toolName}"`);
        }
        // P4: tool error dikembalikan ke model untuk percobaan ulang, bukan menggagalkan agen.
        let toolText: string;
        try {
          const toolResult = await executeTool(toolName, args, ctx);
          toolText = JSON.stringify(toolResult);
          if (toolText.length > MAX_TOOL_RESULT_CHARS) toolText = toolText.slice(0, MAX_TOOL_RESULT_CHARS);
        } catch (err) {
          console.log(`[agent] tool error ${toolName}: ${(err as Error).message}`);
          toolText = JSON.stringify({
            summary: `[TOOL_ERROR] ${(err as Error).message}. Perbaiki argumen dan coba lagi.`,
          });
        }
        convo.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: toolName,
          content: toolText,
        });
      }
      continue;
    }

    const directive = parseDirective(result.content);
    if (directive) {
      const toolName = resolveToolName(directive.name);
      let toolText: string;
      try {
        const toolResult = await executeTool(toolName, directive.arguments, ctx);
        toolText = JSON.stringify(toolResult);
        if (toolText.length > MAX_TOOL_RESULT_CHARS) toolText = toolText.slice(0, MAX_TOOL_RESULT_CHARS);
      } catch (err) {
        toolText = JSON.stringify({ summary: `[TOOL_ERROR] ${(err as Error).message} Perbaiki argumen dan coba lagi.` });
      }
      convo.push({ role: 'assistant', content: result.content });
      convo.push({
        role: 'user',
        content: `[TOOL_RESULT ${toolName}] ${toolText}`,
      });
      continue;
    }

    // Model berniat memakai tool tetapi tidak memanggilnya (teks "saya akan cek...")
    // → alihkan ke mode directive berbasis prompt.
    if (
      !result.toolCalls.length &&
      !directive &&
      !nativeToolsBroken &&
      /(\bakan\b|\bcek\b|\bcari informasi\b|\bmemeriksa\b|tunggu|sebentar)/i.test(result.content || '')
    ) {
      nativeToolsBroken = true;
      convo.push({ role: 'system', content: PROMPT_TOOL_DIRECTIVE });
      continue;
    }

    return { reply: result.content.trim(), iterations, toolCallsUsed, model: result.model, usage };
  }

  return {
    reply:
      'Maaf, saya belum bisa menyelesaikan permintaan ini. Silakan coba ulang dengan pertanyaan yang lebih spesifik.',
    iterations,
    toolCallsUsed,
    model,
    usage,
  };
}
