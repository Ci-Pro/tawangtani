import 'dotenv/config';

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: Number(env('PORT', '3000')),
  openrouter: {
    apiKey: env('OPENROUTER_API_KEY'),
    baseUrl: 'https://openrouter.ai/api/v1',
    model: env('OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct:free'),
    visionModel: env('OPENROUTER_VISION_MODEL', 'google/gemini-2.0-flash-exp:free'),
    fallbackModels: env(
      'OPENROUTER_FALLBACK_MODELS',
      'google/gemini-2.0-flash-exp:free,qwen/qwen-2.5-72b-instruct:free'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  },
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
  adminToken: env('ADMIN_TOKEN', 'dev-admin-token'),
  dataDir: env('DATA_DIR', 'data'),
};

export function hasApiKey(): boolean {
  return config.openrouter.apiKey.length > 0;
}
