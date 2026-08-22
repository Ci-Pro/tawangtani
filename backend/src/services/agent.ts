import { ChatMessageIn, ToolCallOut, ToolContext } from '../types';
import { chatCompletion, ORMessage } from './openrouter';
import { PROMPT_TOOL_DIRECTIVE, TOOL_SCHEMAS } from '../tools/schemas';
import { executeTool } from '../tools/executors';

const MAX_ITERATIONS = 5;

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
4. WAJIB akhiri jawaban yang memakai search_knowledge/product_search dengan baris "Sumber: <isi kolom sumber>" persis dari artikel/produk yang dipakai. Untuk harga, sebut sumber & tanggal pembaruan dan ingatkan harga nasional bisa beda dari harga lokal.
5. Selalu ingatkan membaca label resmi sebelum aplikasi pestisida/pupuk, patuhi interval pra-panen.
6. Bahasa Indonesia sederhana yang dipahami petani; angka dosis jelas; hindari istilah asing tanpa penjelasan.
7. Prioritaskan pendekatan PHT (budaya teknis dulu, kimia terakhir bila perlu) dan keselamatan pengguna.`;

function parseDirective(text: string): ToolCallOut | null {
  const match = text.match(/\{\s*"tool"\s*:\s*"[^"]+"[\s\S]*?\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { tool?: string; arguments?: Record<string, unknown> };
    if (!parsed.tool) return null;
    return { name: parsed.tool, arguments: parsed.arguments ?? {} };
  } catch {
    return null;
  }
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
): Promise<{ reply: string; iterations: number }> {
  const convo = normalizeMessages(inputMessages);
  let nativeToolsBroken = false;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    let result;
    try {
      result = await chatCompletion(
        convo,
        nativeToolsBroken ? undefined : TOOL_SCHEMAS
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

    if (result.toolCalls.length > 0) {
      convo.push({
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });
      for (const tc of result.toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments || '{}') as Record<string, unknown>;
        } catch {
          args = {};
        }
        const toolResult = await executeTool(tc.name, args, ctx);
        convo.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(toolResult),
        });
      }
      continue;
    }

    const directive = parseDirective(result.content);
    if (directive) {
      const toolResult = await executeTool(directive.name, directive.arguments, ctx);
      convo.push({ role: 'assistant', content: result.content });
      convo.push({
        role: 'user',
        content: `[TOOL_RESULT ${directive.name}] ${JSON.stringify(toolResult)}`,
      });
      continue;
    }

    return { reply: result.content.trim(), iterations };
  }

  return {
    reply:
      'Maaf, saya belum bisa menyelesaikan permintaan ini. Silakan coba ulang dengan pertanyaan yang lebih spesifik.',
    iterations,
  };
}
