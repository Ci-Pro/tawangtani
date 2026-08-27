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
      Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST ${method} ${pathUrl.split('?')[0]} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

// ---- Farms ----

export interface FarmRow {
  id?: string;
  user_id: string;
  name: string;
  area_value: number;
  area_unit: string;
  location: string;
  created_at?: string;
}

export interface FarmCropRow {
  id?: string;
  farm_id: string;
  user_id: string;
  name: string;
  planted_date: string | null;
  harvest_date: string | null;
  area_value: number;
  area_unit: string;
  status: string;
  created_at?: string;
}

export async function listFarms(userId: string): Promise<FarmRow[]> {
  return (await rest(`farms?select=*&user_id=eq.${userId}&order=created_at.desc`, 'GET')) as FarmRow[] ?? [];
}

export async function insertFarm(row: FarmRow): Promise<FarmRow> {
  return (await rest('farms', 'POST', row)) as FarmRow;
}

export async function updateFarm(userId: string, id: string, patch: Partial<FarmRow>): Promise<void> {
  await rest(`farms?id=eq.${id}&user_id=eq.${userId}`, 'PATCH', patch);
}

export async function deleteFarm(userId: string, id: string): Promise<void> {
  await rest(`farms?id=eq.${id}&user_id=eq.${userId}`, 'DELETE');
}

// ---- Farm Crops ----

export async function listFarmCrops(userId: string, farmId?: string): Promise<FarmCropRow[]> {
  const filter = farmId ? `farm_id=eq.${farmId}&` : '';
  return (await rest(
    `farm_crops?select=*&${filter}user_id=eq.${userId}&order=created_at.desc`,
    'GET'
  )) as FarmCropRow[] ?? [];
}

export async function insertFarmCrop(row: FarmCropRow): Promise<FarmCropRow> {
  return (await rest('farm_crops', 'POST', row)) as FarmCropRow;
}

export async function updateFarmCrop(userId: string, id: string, patch: Partial<FarmCropRow>): Promise<void> {
  await rest(`farm_crops?id=eq.${id}&user_id=eq.${userId}`, 'PATCH', patch);
}

export async function deleteFarmCrop(userId: string, id: string): Promise<void> {
  await rest(`farm_crops?id=eq.${id}&user_id=eq.${userId}`, 'DELETE');
}

// ---- Seed from local data ----

export async function seedFarmsFromLocal(userId: string, localFarms: any[]): Promise<number> {
  if (localFarms.length === 0) return 0;
  let count = 0;
  for (const f of localFarms) {
    const row = await insertFarm({
      user_id: userId,
      name: f.name ?? '',
      area_value: f.areaValue ?? 0,
      area_unit: f.areaUnit ?? 'm2',
      location: f.location ?? '',
    });
    const newFarmId = row.id;
    if (!newFarmId) continue;
    for (const c of (f.crops ?? [])) {
      await insertFarmCrop({
        farm_id: newFarmId,
        user_id: userId,
        name: c.name ?? '',
        planted_date: c.plantedDate ?? null,
        harvest_date: c.harvestDate ?? null,
        area_value: c.areaValue ?? 0,
        area_unit: c.areaUnit ?? 'm2',
        status: c.status ?? 'active',
      });
      count++;
    }
    count++;
  }
  return count;
}
