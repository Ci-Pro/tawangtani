import { Annotation, StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { ChatMessageIn, ToolContext } from '../types';
import { chatCompletion, ORMessage, CompletionResult } from './openrouter';
import { PROMPT_TOOL_DIRECTIVE, TOOL_SCHEMAS } from '../tools/schemas';
import { executeTool } from '../tools/executors';
import { budgetMessages } from './tokenBudget';

const MAX_ITERATIONS = 7;

/** Maks karakter hasil tool yang dimasukkan ke konteks (perlindungan aliran token). */
const MAX_TOOL_RESULT_CHARS = 3000;
/** Anggaran input perkiraan token per putaran lengkap. */
const MAX_INPUT_TOKENS = 24000;
/** Refleksi dinonaktifkan bila anggaran gabungan sudah mendekati jendela model. */
const MAX_REFLECT_TOKENS = 16000;
/** AGENT_REFLECT=0 untuk mematikan langkah refleksi (hemat kuota/latensi). */
const REFLECT_ENABLED = process.env.AGENT_REFLECT !== '0';

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

/** Umpan balik verifikasi sebelum jawaban final untuk pertanyaan multi-tool. */
const REFLECT_PROMPT = `Tinjau ulang jawaban Anda yang akan dikirim ke petani di bawah.
Periksa:
(a) Semua angka/dosis/merek harus berasal dari data tool yang diberikan — JANGAN menambah data yang tidak ada.
(b) Bila jawaban memakai search_knowledge/product_search, pastikan baris terakhir "Sumber: ..." tetap ada dan sesuai urutan.
(c) Bila ada klaim yang kurang didukung, perbaiki dan tulis ulang singkat dalam Bahasa Indonesia yang sederhana.
(d) Bila jawaban sudah tepat, balas dengan jawaban yang SAMA persis tanpa perubahan.
Balas HANYA versi final jawaban — tanpa awalan, tanpa komentar.

JAWABAN SEBELUMNYA:
{ANSWER}`;

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

function parseDirective(text: string): { name: string; arguments: Record<string, unknown> } | null {
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

/**
 * Model gratis terkadang membalas LANGKAH tool sebagai JSON mentah di field content
 * (bukan melalui tool_calls native). Deteksi seluruh konten sebagai envelope tool
 * {tool|name, arguments} agar dilewatkan ke eksekutor alih-alih bocor ke jawaban.
 */
function parseWholeEnvelope(text: string | null | undefined): { name: string; arguments: Record<string, unknown> } | null {
  const trimmed = (text ?? '').trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const root = JSON.parse(trimmed) as { tool?: unknown; name?: unknown; arguments?: unknown };
    const name = typeof root.tool === 'string' ? root.tool : typeof root.name === 'string' ? root.name : '';
    if (!name) return null;
    let args: Record<string, unknown> = {};
    if (root.arguments && typeof root.arguments === 'object') args = root.arguments as Record<string, unknown>;
    else if (typeof root.arguments === 'string') {
      try {
        args = JSON.parse(root.arguments) as Record<string, unknown>;
      } catch {
        /* biarkan {} */
      }
    }
    return { name, arguments: args };
  } catch {
    return null;
  }
}

/** Indikasi model berniat memakai tool namun menuliskannya sebagai narasi. */
const RETRY_HINT = /(\bakan\b|\bcek\b|\bcari informasi\b|\bmemeriksa\b|tunggu|sebentar)/i;

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

// ---------- Grafik agen LangGraph ----------

interface GraphToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface GraphLastOutput {
  content: string;
  toolCalls: GraphToolCall[];
  model: string;
  usage: CompletionResult['usage'];
}

const StateAnnotation = Annotation.Root({
  /** Buffer pesan kerja (konteks input + langkah tool). */
  messages: Annotation<ORMessage[]>({ reducer: (_a, b) => b }),
  /** Output model terbaru; null bila belum ada atau setelah tool dieksekusi. */
  lastOutput: Annotation<GraphLastOutput | null>({ reducer: (_a, b) => b }),
  iterations: Annotation<number>({ reducer: (a, b) => a + b }),
  toolCallsUsed: Annotation<string[]>({ reducer: (a, b) => a.concat(b) }),
  nativeToolsBroken: Annotation<boolean>({ reducer: (_a, b) => b }),
  /** True bila model menulis niat tool sebagai narasi → alihkan ke mode directive. */
  hint: Annotation<boolean>({ reducer: (_a, b) => b }),
  final: Annotation<string | null>({ reducer: (_a, b) => b }),
  reflectTaken: Annotation<boolean>({ reducer: (_a, b) => b }),
  model: Annotation<string>({ reducer: (a, b) => a || b }),
  usage: Annotation<CompletionResult['usage']>({
    reducer: (a, b) => ({
      promptTokens: a.promptTokens + b.promptTokens,
      completionTokens: a.completionTokens + b.completionTokens,
      totalTokens: a.totalTokens + b.totalTokens,
    }),
  }),
  ctx: Annotation<ToolContext>({ reducer: (_a, b) => b }),
});

type AgentState = typeof StateAnnotation.State;
type PartialAgentState = Partial<typeof StateAnnotation.State>;

async function agentNode(state: AgentState): Promise<PartialAgentState> {
  const nextIter = state.iterations + 1;
  const convo = [...state.messages];
  if (nextIter === MAX_ITERATIONS) {
    convo.push({
      role: 'system',
      content:
        'Iterasi terakhir: GUNAKAN data tool yang sudah didapat dan JAWAB pertanyaan pengguna sekarang. Dilarang memanggil tool lagi.',
    });
  }

  // P0: jaga konteks agar tidak melampaui jendela kosong model fallback.
  const budgeted = budgetMessages(convo, {
    systemPrompt: SYSTEM_PROMPT,
    maxInputTokens: MAX_INPUT_TOKENS,
    maxMessageChars: 6000,
  });

  const first = state.iterations === 0;
  const native = state.nativeToolsBroken;
  let result: CompletionResult;
  try {
    result = await chatCompletion(
      budgeted,
      native ? undefined : TOOL_SCHEMAS,
      undefined,
      native ? 'auto' : first ? 'required' : 'auto'
    );
  } catch (err) {
    // P2: jika tool native bermasalah di giliran pertama, alihkan ke mode directive berbasis prompt.
    if (!native && first) {
      return {
        nativeToolsBroken: true,
        hint: false,
        messages: [...state.messages, { role: 'system', content: PROMPT_TOOL_DIRECTIVE }],
        iterations: 1,
      };
    }
    throw err;
  }

  console.log(
    `[agent] it=${nextIter} tools=[${result.toolCalls.map((t) => resolveToolName(t.name)).join(',')}] tokens=${result.usage.promptTokens}+${result.usage.completionTokens} model=${result.model}`
  );

  const toolCalls: GraphToolCall[] = result.toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.name,
    arguments: tc.arguments,
  }));

  if (toolCalls.length === 0) {
    const directive = parseDirective(result.content) ?? parseWholeEnvelope(result.content);
    if (directive) {
      toolCalls.push({
        id: `dir_${nextIter}_${toolCalls.length}`,
        name: directive.name,
        arguments: JSON.stringify(directive.arguments ?? {}),
      });
    } else if (!native && RETRY_HINT.test(result.content || '')) {
      return {
        nativeToolsBroken: true,
        hint: true,
        messages: [...state.messages, { role: 'system', content: PROMPT_TOOL_DIRECTIVE }],
        iterations: 1,
      };
    }
  }

  if (toolCalls.length > 0) {
    for (const t of toolCalls) if (resolveToolName(t.name) !== t.name) console.log(`[agent] nama tool dikoreksi: "${t.name}" -> "${resolveToolName(t.name)}"`);
    return {
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: result.content || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        },
      ],
      lastOutput: { content: result.content, toolCalls, model: result.model, usage: result.usage },
      iterations: 1,
      model: result.model,
      usage: result.usage,
      hint: false,
      nativeToolsBroken: native,
      toolCallsUsed: toolCalls.map((tc) => resolveToolName(tc.name)),
    };
  }

  return {
    lastOutput: { content: result.content, toolCalls: [], model: result.model, usage: result.usage },
    iterations: 1,
    model: result.model,
    usage: result.usage,
    final: result.content.trim(),
    hint: false,
    nativeToolsBroken: native,
  };
}

async function toolsNode(state: AgentState): Promise<PartialAgentState> {
  const last = state.lastOutput;
  if (!last || last.toolCalls.length === 0) return { messages: state.messages, lastOutput: null };
  const out: ORMessage[] = [...state.messages];
  for (const tc of last.toolCalls) {
    const toolName = resolveToolName(tc.name);
    const args = parseToolArgs(tc.arguments);
    let toolText: string;
    try {
      const toolResult = await executeTool(toolName, args, state.ctx);
      toolText = JSON.stringify(toolResult);
      if (toolText.length > MAX_TOOL_RESULT_CHARS) toolText = toolText.slice(0, MAX_TOOL_RESULT_CHARS);
    } catch (err) {
      console.log(`[agent] tool error ${toolName}: ${(err as Error).message}`);
      toolText = JSON.stringify({
        summary: `[TOOL_ERROR] ${(err as Error).message}. Perbaiki argumen dan coba lagi.`,
      });
    }
    out.push({ role: 'tool', tool_call_id: tc.id, name: toolName, content: toolText });
  }
  return { messages: out, lastOutput: null };
}

function canReflect(state: AgentState): boolean {
  if (!REFLECT_ENABLED) return false;
  if (state.nativeToolsBroken) return false;
  if (state.reflectTaken) return false;
  if (state.iterations >= MAX_ITERATIONS) return false;
  if (!state.lastOutput || state.lastOutput.toolCalls.length > 0) return false;
  if (state.toolCallsUsed.length < 2) return false;
  if (state.usage.totalTokens >= MAX_REFLECT_TOKENS) return false;
  return true;
}

/**
 * Node refleksi: verifikasi jawaban multi-tool sebelum dikirim agar klaim tidak
 * menyimpang dari data tool (tambahan kualitas — opsional via AGENT_REFLECT=0).
 */
async function reflectNode(state: AgentState): Promise<PartialAgentState> {
  const base = state.final ?? state.lastOutput?.content ?? '';
  const prompt = REFLECT_PROMPT.replace('{ANSWER}', base);
  try {
    const review = budgetMessages([...state.messages, { role: 'user', content: prompt }], {
      systemPrompt: SYSTEM_PROMPT,
      maxInputTokens: MAX_INPUT_TOKENS,
      maxMessageChars: 6000,
    });
    const r = await chatCompletion(review, undefined, undefined, 'auto', { temperature: 0.2, maxTokens: 1600 });
    console.log(`[agent] refleksi model=${r.model} tokens=${r.usage.totalTokens}`);
    return {
      final: r.content.trim(),
      reflectTaken: true,
      model: r.model,
      usage: r.usage,
    };
  } catch (err) {
    console.log(`[agent] refleksi gagal: ${(err as Error).message}`);
    return { final: base, reflectTaken: true };
  }
}

function routeAfterAgent(state: AgentState): 'agent' | 'tools' | 'reflect' | typeof END {
  if (state.hint) return 'agent';
  if (!state.lastOutput) return 'agent';
  if (state.lastOutput.toolCalls.length > 0) {
    return state.iterations < MAX_ITERATIONS ? 'tools' : END;
  }
  if (state.reflectTaken) return END;
  if (canReflect(state)) return 'reflect';
  return END;
}

const agentGraph = new StateGraph(StateAnnotation)
  .addNode('agent', agentNode)
  .addNode('tools', toolsNode)
  .addNode('reflect', reflectNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', routeAfterAgent)
  .addEdge('tools', 'agent')
  .addEdge('reflect', END)
  .compile({ checkpointer: new MemorySaver() });

const APOLOGY =
  'Maaf, saya belum bisa menyelesaikan permintaan ini. Silakan coba ulang dengan pertanyaan yang lebih spesifik.';

export async function runAgent(
  inputMessages: ChatMessageIn[],
  ctx: ToolContext,
  opts?: { sessionId?: string }
): Promise<{
  reply: string;
  iterations: number;
  toolCallsUsed: string[];
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const convo = normalizeMessages(inputMessages);
  // thread_id unik per permintaan (langkah berikutnya bisa memakai per-session
  // bila diinginkan; memori lintas pertanyaan kini tetap lewat riwayat DB yang
  // diputar ulang di input).
  const threadId = `${opts?.sessionId ?? 'anon'}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const state = await agentGraph.invoke(
    {
      messages: convo,
      ctx,
      lastOutput: null,
      iterations: 0,
      toolCallsUsed: [],
      nativeToolsBroken: false,
      hint: false,
      final: null,
      reflectTaken: false,
      model: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    },
    { configurable: { thread_id: threadId } }
  );
  return {
    reply: state.final ?? APOLOGY,
    iterations: state.iterations,
    toolCallsUsed: state.toolCallsUsed,
    model: state.model,
    usage: state.usage,
  };
}