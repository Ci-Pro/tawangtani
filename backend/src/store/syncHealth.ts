import { config } from '../config';

export interface SyncHealthRow {
  id: string;
  ok: boolean;
  rows: number;
  provinces: string;
  errors: string;
  ran_at: string;
  updated_at: string;
}

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

export async function getSyncHealth(): Promise<SyncHealthRow | null> {
  try {
    const res = await fetch(
      `${config.supabase.url}/rest/v1/sync_health?select=*&id=eq.market&limit=1`,
      { headers: headers(), signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as SyncHealthRow[] | null;
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function writeSyncHealth(
  partial: Pick<SyncHealthRow, 'ok' | 'rows' | 'provinces' | 'errors'> & { ran_at?: string }
): Promise<void> {
  const body = {
    id: 'market',
    ok: partial.ok,
    rows: partial.rows,
    provinces: partial.provinces,
    errors: partial.errors,
    ran_at: partial.ran_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const res = await fetch(`${config.supabase.url}/rest/v1/sync_health`, {
      method: 'POST',
      headers: {
        ...headers(),
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([body]),
    });
    if (!res.ok) throw new Error(`REST sync_health -> ${res.status}`);
  } catch (err) {
    console.log('[syncHealth] simpan gagal:', (err as Error).message);
  }
}