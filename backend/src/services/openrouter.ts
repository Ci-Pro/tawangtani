import { config } from '../config';

export interface ORMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
    /** Gemini 3.x: thought_signature wajib di-echo pada giliran berikutnya. */
    extra_content?: unknown;
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface ORToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ORChoice {
  message: {
    role: 'string';
    content: string | null;
    tool_calls?: Array<{
      id: string;
      function: { name: string; arguments: string };
      extra_content?: unknown;
    }>;
  };
  finish_reason?: string;
}

interface ORResponse {
  choices?: ORChoice[];
  error?: { message?: string };
}

const REFERER = 'https://github.com/Ci-Pro/tawangtani';
const TITLE = 'TAWANGTANI';

interface Provider {
  name: 'gemini' | 'openrouter';
  baseUrl: string;
  apiKey: string;
  headers: Record<string, string>;
}

function providers(): Provider[] {
  const list: Provider[] = [];
  if (config.gemini.apiKey) {
    list.push({
      name: 'gemini',
      baseUrl: config.gemini.baseUrl,
      apiKey: config.gemini.apiKey,
      headers: { Authorization: `Bearer ${config.gemini.apiKey}` },
    });
  }
  if (config.openrouter.apiKey) {
    list.push({
      name: 'openrouter',
      baseUrl: config.openrouter.baseUrl,
      apiKey: config.openrouter.apiKey,
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        'HTTP-Referer': REFERER,
        'X-Title': TITLE,
      },
    });
  }
  return list;
}

/** Urutan percobaan: Gemini (utama) -> model fallback Gemini -> OpenRouter -> fallback OR. */
function candidateCalls(preferred?: string): Array<{ provider: Provider; model: string }> {
  const out: Array<{ provider: Provider; model: string }> = [];
  for (const p of providers()) {
    const models =
      p.name === 'gemini'
        ? [config.gemini.model, ...config.gemini.fallbackModels]
        : [config.openrouter.model, ...config.openrouter.fallbackModels];
    for (const m of models) out.push({ provider: p, model: m });
  }
  if (preferred) {
    // Model eksplisit dicoba lebih dulu pada penyedia pertama yang tersedia
    out.unshift({ provider: providers()[0], model: preferred });
  }
  return out.filter((c) => c.provider);
}

async function callOnce(
  provider: Provider,
  model: string,
  messages: ORMessage[],
  tools?: ORToolSchema[],
  toolChoice: 'auto' | 'required' = 'auto',
  maxTokens = 1400,
  temperature = 0.3
): Promise<ORResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { ...provider.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        ...(tools && tools.length ? { tools, tool_choice: toolChoice } : {}),
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as ORResponse;
    if (!res.ok) {
      const msg = json.error?.message ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export interface CompletionResult {
  content: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: string;
    extraContent?: unknown;
  }>;
}

export async function chatCompletion(
  messages: ORMessage[],
  tools?: ORToolSchema[],
  preferredModel?: string,
  toolChoice: 'auto' | 'required' = 'auto'
): Promise<CompletionResult> {
  if (!hasLlmKey()) {
    throw new Error('GEMINI_API_KEY / OPENROUTER_API_KEY belum diatur di server');
  }

  let lastError: Error | null = null;

  for (const { provider, model } of candidateCalls(preferredModel)) {
    try {
      const json = await callOnce(
        provider,
        model,
        messages,
        tools && tools.length ? tools : undefined,
        toolChoice
      );
      const choice = json.choices?.[0];
      if (!choice) throw new Error('Respons tanpa pilihan model');
      return {
        content: choice.message.content ?? '',
        toolCalls: (choice.message.tool_calls ?? []).map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
          extraContent: tc.extra_content,
        })),
      };
    } catch (err) {
      console.log(
        `[llm] gagal provider=${provider.name} model=${model}: ${(err as Error).message}`
      );
      lastError = err as Error;
      // Jeda kecil saat rate-limit agar percobaan kandidat berikutnya tak langsung 429 lagi
      if (/429|quota|rate/i.test((err as Error).message)) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw lastError ?? new Error('Semua model gagal');
}

export async function visionCompletion(
  imageBase64: string,
  prompt: string,
  _preferredModel?: string
): Promise<string> {
  if (!hasLlmKey()) {
    throw new Error('GEMINI_API_KEY / OPENROUTER_API_KEY belum diatur di server');
  }
  const messages: ORMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ] as unknown as string,
    },
  ];

  let lastError: Error | null = null;
  for (const { provider, model } of candidateCalls(config.gemini.apiKey ? undefined : config.openrouter.visionModel)) {
    try {
      const json = await callOnce(provider, model, messages, undefined, 'auto', 900, 0.2);
      const text = json.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('Respons kosong dari model');
      return text;
    } catch (err) {
      console.log(`[llm] vision gagal provider=${provider.name} model=${model}: ${(err as Error).message}`);
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error('Semua model vision gagal');
}

function hasLlmKey(): boolean {
  return config.gemini.apiKey.length > 0 || config.openrouter.apiKey.length > 0;
}
