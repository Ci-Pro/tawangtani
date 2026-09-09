import { config } from '../config';

const TABLE = 'farm_activities';

export interface FarmActivityRow {
  user_id: string;
  activity: string;
  product_name?: string;
  dose_text?: string;
  date?: string;
  note?: string;
  source?: string;
  crop_label?: string;
  done?: boolean;
  remind_at?: string | null;
}

export interface FarmActivityOut {
  id: string;
  user_id: string;
  activity: string;
  product_name: string;
  dose_text: string;
  date: string;
  note: string;
  source: string;
  done: boolean;
  crop_label: string | null;
  remind_at: string | null;
  created_at: string;
}

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

async function parseRows(res: Response): Promise<FarmActivityOut[]> {
  const text = await res.text();
  if (!res.ok) throw new Error(res.status >= 500 ? 'server' : `HTTP ${res.status}: ${text.slice(0, 120)}`);
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function remap(r: Record<string, any>): FarmActivityOut {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    activity: String(r.activity ?? 'lainnya'),
    product_name: String(r.product_name ?? ''),
    dose_text: String(r.dose_text ?? ''),
    date: String(r.date ?? new Date().toISOString().slice(0, 10)),
    note: String(r.note ?? ''),
    source: String(r.source ?? 'manual'),
    done: Boolean(r.done),
    crop_label: r.crop_label ? String(r.crop_label) : null,
    remind_at: r.remind_at ?? null,
    created_at: String(r.created_at ?? ''),
  };
}

export async function insertFarmActivity(row: FarmActivityRow): Promise<FarmActivityOut | null> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  const res = await fetch(`${config.supabase.url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: row.user_id,
      activity: row.activity,
      product_name: row.product_name ?? '',
      dose_text: row.dose_text ?? '',
      date: row.date ?? new Date().toISOString().slice(0, 10),
      note: row.note ?? '',
      source: row.source ?? 'manual',
      crop_label: row.crop_label ?? '',
      done: row.done ?? false,
      remind_at: row.remind_at ?? null,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const rows = await parseRows(res);
  return rows[0] ? remap(rows[0]) : null;
}

export async function listFarmActivities(userId: string): Promise<FarmActivityOut[]> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return [];
  const url = `${config.supabase.url}/rest/v1/${TABLE}?user_id=eq.${encodeURIComponent(userId)}&order=date.desc,created_at.desc&limit=500`;
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8000) });
  const rows = await parseRows(res);
  return rows.map(remap);
}

export async function updateFarmActivity(
  userId: string,
  id: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return false;
  const url = `${config.supabase.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 120));
  }
  return true;
}

export async function deleteFarmActivity(userId: string, id: string): Promise<boolean> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return false;
  const url = `${config.supabase.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}