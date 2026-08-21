import { ChatMessageIn, ToolCallOut, ToolContext } from '../types';
import { chatCompletion, ORMessage } from './openrouter';
import { PROMPT_TOOL_DIRECTIVE, TOOL_SCHEMAS } from '../tools/schemas';
import { executeTool } from '../tools/executors';

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Anda adalah Tani AI, asisten pertanian berbahasa Indonesia untuk aplikasi TAWANGTANI.
Aturan wajib:
1. Jangan pernah mengarang dosis, merek, atau bahan aktif. Gunakan tool product_search untuk data produk dan search_knowledge untuk teknik budidaya, hama/penyakit, dan pemupukan menurut umur tanaman.
2. WAJIB: bila jawaban memakai hasil search_knowledge atau product_search, akhiri jawaban dengan baris "Sumber: <isi kolom sumber>" dari artikel/produk yang dipakai. Jangan mengarang sumber lain.
3. Selalu ingatkan pengguna membaca label resmi produk sebelum aplikasi pestisida/pupuk.
4. Gunakan APAPUN tool yang relevan (cuaca, kalkulator, katalog, basis pengetahuan) sebelum menjawab.
5. Jawab ringkas, praktis, dan aman untuk petani kecil.
6. Jika informasi tidak cukup, minta klarifikasi.`;

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
