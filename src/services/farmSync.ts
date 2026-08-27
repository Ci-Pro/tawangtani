import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFarmStore } from '@/store/useFarmStore';

export async function syncFarmsToServer(): Promise<number> {
  const backendUrl = useSettingsStore.getState().backendUrl?.trim();
  if (!backendUrl || !isSupabaseConfigured) return 0;
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return 0;
  const farms = useFarmStore.getState().farms;
  if (farms.length === 0) return 0;
  const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/farms/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ localFarms: farms }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sync gagal (${res.status}): ${text.slice(0, 120)}`);
  }
  const data = await res.json().catch(() => ({}));
  return data.seeded ?? 0;
}