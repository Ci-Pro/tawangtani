import { config } from '../config';

function base(): { url: string; key: string } | null {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  return { url: config.supabase.url, key: config.supabase.serviceRoleKey };
}

async function rest(
  pathUrl: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<unknown> {
  const b = base();
  if (!b) throw new Error('Supabase belum dikonfigurasi');
  const res = await fetch(`${b.url}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: b.key,
      Authorization: `Bearer ${b.key}`,
      'Content-Type': 'application/json',
      Prefer: method === 'GET' ? '' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST ${method} plantings -> ${res.status}: ${text.slice(0, 200)}`);
  }
  if (method === 'DELETE') return null;
  const text2 = await res.text();
  return text2 ? JSON.parse(text2) : null;
}

export interface PlantingRow {
  id: string;
  user_id: string;
  commodity: string;
  name: string;
  area: number;
  planted_at: string;
  harvest_days: number;
  yield_kg_per_ha: number;
  cost_total: number;
  status: 'active' | 'harvested' | 'failed';
  harvest_notified: boolean;
  created_at?: string;
}

export interface ReminderInput {
  hst: number;
  label: string;
}

export async function listPlantings(userId: string): Promise<PlantingRow[]> {
  const rows = (await rest(
    `plantings?select=*&user_id=eq.${userId}&order=planted_at.desc&limit=100`,
    'GET'
  )) as PlantingRow[] | null;
  return rows ?? [];
}

export async function listActivePlantings(): Promise<PlantingRow[]> {
  const rows = (await rest(
    'plantings?select=*&status=eq.active&limit=5000',
    'GET'
  )) as PlantingRow[] | null;
  return rows ?? [];
}

export async function insertPlanting(
  row: Omit<PlantingRow, 'id' | 'created_at' | 'harvest_notified'>,
  reminders: ReminderInput[]
): Promise<string> {
  const inserted = (await rest('plantings', 'POST', row)) as Array<{ id: string }> | null;
  const id = inserted?.[0]?.id;
  if (!id) throw new Error('Gagal menyimpan tanaman');
  const rows = reminders
    .filter((r) => Number.isFinite(r.hst) && r.hst >= 0)
    .slice(0, 20)
    .map((r) => ({
      planting_id: id,
      user_id: row.user_id,
      hst: Math.round(r.hst),
      label: String(r.label ?? '').slice(0, 80),
    }));
  if (rows.length > 0) await rest('planting_reminders', 'POST', rows);
  return id;
}

export async function updatePlanting(
  userId: string,
  id: string,
  patch: Partial<Pick<PlantingRow, 'status' | 'cost_total' | 'harvest_notified'>>
): Promise<void> {
  await rest(`plantings?id=eq.${id}&user_id=eq.${userId}`, 'PATCH', patch);
}

export async function deletePlanting(userId: string, id: string): Promise<void> {
  await rest(`plantings?id=eq.${id}&user_id=eq.${userId}`, 'DELETE');
}

export interface PendingReminder {
  id: string;
  planting_id: string;
  user_id: string;
  hst: number;
  label: string;
  fired: boolean;
}

export async function listPendingReminders(): Promise<PendingReminder[]> {
  const rows = (await rest(
    'planting_reminders?select=*&fired=eq.false&limit=2000',
    'GET'
  )) as PendingReminder[] | null;
  return rows ?? [];
}

export async function markReminderFired(id: string): Promise<void> {
  await rest(`planting_reminders?id=eq.${id}`, 'PATCH', { fired: true });
}
