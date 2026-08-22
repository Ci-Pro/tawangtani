import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useSettingsStore } from '@/store/useSettingsStore';

const LAST_SYNC_KEY = 'kemtan_last_ingest';
const THROTTLE_MS = 20 * 60 * 60 * 1000;

const KEMTAN_BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';

interface KemtanCandidate {
  level: '1' | '3';
  name: string;
}

const KEMTAN_MAP: Record<string, KemtanCandidate[]> = {
  beras_medium: [
    { level: '3', name: 'Beras Medium' },
    { level: '1', name: 'Beras Medium Penggilingan' },
  ],
  jagung_pipilan: [{ level: '1', name: 'Jagung Pipilan Kering' }],
  bawang_merah: [{ level: '3', name: 'Bawang Merah' }],
  bawang_putih: [{ level: '3', name: 'Bawang Putih Bonggol' }],
  cabai_rawit_merah: [{ level: '3', name: 'Cabai Rawit Merah' }],
  cabai_merah_besar: [{ level: '1', name: 'Cabai Merah Besar' }],
};

function parseTable(html: string): Array<{ name: string; price: number }> {
  const out: Array<{ name: string; price: number }> = [];
  if (!/<table/i.test(html) || html.includes('Data tidak ditemukan')) return out;
  const trs = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trs) {
    if (/<th/i.test(tr)) continue;
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z]+;/gi, ' ')
        .trim()
    );
    if (cells.length < 2 || !cells[0]) continue;
    let price = 0;
    for (let i = cells.length - 1; i >= 1; i--) {
      const v = Number(cells[i].replace(/[^\d]/g, ''));
      if (Number.isFinite(v) && v > 0) {
        price = Math.round(v);
        break;
      }
    }
    if (price > 0) out.push({ name: cells[0], price });
  }
  return out;
}

async function fetchLevel(level: '1' | '3'): Promise<Map<string, number>> {
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    tanggal_mulai: fmt(new Date(Date.now() - 3 * 86400000)),
    tanggal_akhir: fmt(new Date()),
    level_harga: level,
    kode_wilayah: '0',
  });
  const res = await fetch(`${KEMTAN_BASE}?${params}`, {
    headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const map = new Map<string, number>();
  for (const r of parseTable(await res.text())) map.set(r.name, r.price);
  return map;
}

export async function fetchKemtanPrices(): Promise<Array<{ commodity: string; price: number }>> {
  const [konsumen, produsen] = await Promise.all([
    fetchLevel('3'),
    fetchLevel('1').catch(() => new Map<string, number>()),
  ]);
  const tables = new Map<string, Map<string, number>>([
    ['3', konsumen],
    ['1', produsen],
  ]);
  const out: Array<{ commodity: string; price: number }> = [];
  for (const [commodity, candidates] of Object.entries(KEMTAN_MAP)) {
    for (const cand of candidates) {
      const price = tables.get(cand.level)?.get(cand.name);
      if (typeof price === 'number' && price > 0) {
        out.push({ commodity, price });
        break;
      }
    }
  }
  if (out.length === 0) throw new Error('tidak ada harga terbaca');
  return out;
}

/**
 * Dipanggil diam-diam saat layar Harga dibuka. Maksimal sekali per ~20 jam
 * per perangkat. Gagal diabaikan sepenuhnya.
 */
export async function syncHargaJikaPerlu(): Promise<void> {
  try {
    const last = Number((await AsyncStorage.getItem(LAST_SYNC_KEY)) ?? 0);
    if (Date.now() - last < THROTTLE_MS) return;
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    if (!isSupabaseConfigured) return;
    const backendUrl = useSettingsStore.getState().backendUrl?.trim();
    if (!backendUrl) return;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const prices = await fetchKemtanPrices();
    await fetch(`${backendUrl.replace(/\/$/, '')}/api/market/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ prices }),
    });
  } catch {
    // sinkronisasi latar belakang tidak boleh mengganggu pengguna
  }
}
