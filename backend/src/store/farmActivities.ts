import { config } from '../config';

export interface FarmActivityRow {
  user_id: string;
  activity: string;
  product_name?: string;
  dose_text?: string;
  date?: string;
  note?: string;
}

export async function insertFarmActivity(row: FarmActivityRow): Promise<void> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return;
  await fetch(`${config.supabase.url}/rest/v1/farm_activities`, {
    method: 'POST',
    headers: {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: row.user_id,
      activity: row.activity,
      product_name: row.product_name ?? '',
      dose_text: row.dose_text ?? '',
      date: row.date ?? new Date().toISOString().slice(0, 10),
      note: row.note ?? 'Dicatat oleh AI Tani',
    }),
    signal: AbortSignal.timeout(8000),
  });
}