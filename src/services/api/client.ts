export interface BackendConfig {
  baseUrl?: string;
}

export function getBackendUrl(baseUrl?: string): string | null {
  const url = baseUrl?.trim();
  if (!url) return null;
  return url.replace(/\/$/, '');
}

export async function postJson<T>(url: string, body: unknown, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
