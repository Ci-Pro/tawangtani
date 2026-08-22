import { config } from '../config';

export interface ORMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
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
    tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
  };
  finish_reason?: string;
}

interface ORResponse {
  choices?: ORChoice[];
  error?: { message?: string };
}

const REFERER = 'https://github.com/Ci-Pro/tawangtani';
const TITLE = 'TAWANGTANI';

function candidateModels(preferred?: string): string[] {
  const list = preferred ? [preferred] : [];
  return [...new Set([...list, config.openrouter.model, ...config.openrouter.fallbackModels])];
}

async function callOnce(
  model: string,
  messages: ORMessage[],
  tools?: ORToolSchema[],
  toolChoice: 'auto' | 'required' = 'auto'
): Promise<ORResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': REFERER,
        'X-Title': TITLE,
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools && tools.length ? { tools, tool_choice: toolChoice } : {}),
        temperature: 0.3,
        max_tokens: 1400,
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
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
}

export async function chatCompletion(
  messages: ORMessage[],
  tools?: ORToolSchema[],
  preferredModel?: string,
  toolChoice: 'auto' | 'required' = 'auto'
): Promise<CompletionResult> {
  if (!config.openrouter.apiKey) {
    throw new Error('OPENROUTER_API_KEY belum diatur di server');
  }

  let lastError: Error | null = null;

  for (const model of candidateModels(preferredModel)) {
    for (const attemptTools of tools ? [tools] : []) {
      try {
        const json = await callOnce(model, messages, attemptTools, toolChoice);
        const choice = json.choices?.[0];
        if (!choice) throw new Error('Respons tanpa pilihan model');
        return {
          content: choice.message.content ?? '',
          toolCalls: (choice.message.tool_calls ?? []).map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          })),
        };
      } catch (err) {
        console.log(`[openrouter] gagal model=${model} tools=${!!attemptTools}: ${(err as Error).message}`);
        lastError = err as Error;
      }
    }
  }

  throw lastError ?? new Error('Semua model gagal');
}

export async function visionCompletion(
  imageBase64: string,
  prompt: string,
  preferredModel?: string
): Promise<string> {
  if (!config.openrouter.apiKey) {
    throw new Error('OPENROUTER_API_KEY belum diatur di server');
  }
  const messages: ORMessage[] = [
    {
      role: 'user',
      content: null as unknown as string,
    },
  ];
  messages[0] = {
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      },
    ] as unknown as string,
  };

  let lastError: Error | null = null;
  for (const model of candidateModels(preferredModel || config.openrouter.visionModel)) {
    try {
      const res = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': REFERER,
          'X-Title': TITLE,
        },
        body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 900 }),
      });
      const json = (await res.json().catch(() => ({}))) as ORResponse;
      if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      const text = json.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('Respons kosong dari model');
      return text;
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error('Semua model vision gagal');
}
