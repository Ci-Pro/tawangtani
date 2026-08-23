import 'dotenv/config';

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: Number(env('PORT', '3000')),
  supabase: {
    url: env('SUPABASE_URL'),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  },
  openrouter: {
    apiKey: env('OPENROUTER_API_KEY'),
    baseUrl: 'https://openrouter.ai/api/v1',
    model: env('OPENROUTER_MODEL', 'z-ai/glm-5.2:free'),
    visionModel: env('OPENROUTER_VISION_MODEL', 'nvidia/nemotron-nano-12b-v2-vl:free'),
    fallbackModels: env(
      'OPENROUTER_FALLBACK_MODELS',
      'nvidia/nemotron-3-super-120b-a12b:free,openai/gpt-oss-20b:free,google/gemma-4-31b-it:free'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  },
  gemini: {
    apiKey: env('GEMINI_API_KEY'),
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // Urutan: Flash (kualitas agentic terbaik) lalu Flash-Lite (kuota harian lebih besar)
    model: env('GEMINI_MODEL', 'gemini-2.5-flash'),
    fallbackModels: env('GEMINI_FALLBACK_MODELS', 'gemini-2.5-flash-lite')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  },
  adminToken: env('ADMIN_TOKEN', 'dev-admin-token'),
  cronSecret: env('CRON_SECRET', ''),
};

export function hasApiKey(): boolean {
  return config.gemini.apiKey.length > 0 || config.openrouter.apiKey.length > 0;
}

export function hasSupabase(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}
