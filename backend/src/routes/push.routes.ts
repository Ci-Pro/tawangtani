import { Router, Request, Response } from 'express';
import { fetchWeatherAlerts } from '../services/weatherAlerts';
import { listPushTokens, sendExpoPush, upsertPushToken } from '../store/pushTokens';
import { listProvinces, listMarketPrices } from '../store/marketPrices';
import { snapshotToday } from '../services/marketHistory';
import {
  deactivateAlert,
  listActiveAlerts,
  listMyAlerts,
  markAlertFired,
  upsertPriceAlert,
} from '../store/priceAlerts';
import { config, hasSupabase } from '../config';
import { optionalSupabaseUser, requireSupabaseUser } from '../middleware/supabaseUser';

export const pushRouter = Router();

pushRouter.post('/register', optionalSupabaseUser, async (req: Request, res: Response) => {
  try {
    const { expoToken, lat, lon, locationName } = req.body as {
      expoToken?: string;
      lat?: number;
      lon?: number;
      locationName?: string;
    };
    if (!expoToken || typeof expoToken !== 'string' || !expoToken.startsWith('ExpoPushToken')) {
      res.status(400).json({ error: 'expoToken tidak valid' });
      return;
    }
    await upsertPushToken({
      expo_token: expoToken,
      user_id: (req as Request & { sbUser?: { id: string } }).sbUser?.id ?? null,
      lat: Number(lat) || 0,
      lon: Number(lon) || 0,
      location_name: String(locationName ?? ''),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

pushRouter.get('/weather-alerts', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: 'lat & lon wajib angka' });
      return;
    }
    const alerts = await fetchWeatherAlerts(lat, lon);
    res.json({ alerts });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export async function runWeatherPushJob(): Promise<{
  devices: number;
  messages: number;
  sent: number;
  failed: number;
}> {
  const tokens = await listPushTokens();
  const valid = tokens.filter((t) => t.lat !== 0 || t.lon !== 0);
  let messages = 0;
  let sent = 0;
  let failed = 0;
  for (const t of valid.slice(0, 200)) {
    try {
      const alerts = await fetchWeatherAlerts(t.lat, t.lon);
      const serious = alerts.filter((a) => a.severity === 'siaga');
      if (serious.length === 0) continue;
      const body = serious.map((a) => `• ${a.message}`).join('\n').slice(0, 350);
      const result = await sendExpoPush([
        {
          to: t.expo_token,
          title:
            '⚠️ Cuaca Ekstrem — ' +
            (t.location_name ? `${t.location_name}` : new Date().toLocaleDateString('id-ID')),
          body,
        },
      ]);
      messages += result.sent;
      sent += result.sent;
      failed += result.failed;
    } catch {
      failed += 1;
      continue;
    }
  }
  return { devices: valid.length, messages, sent, failed };
}

pushRouter.get('/cron/weather-push', async (req: Request, res: Response) => {
  try {
    if (config.cronSecret) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${config.cronSecret}`) {
        res.status(401).json({ error: 'Cron secret tidak valid' });
        return;
      }
    }
    const tokens = await listPushTokens();
    const result = await runWeatherPushJob();
    let snapshot = 0;
    try {
      for (const province of await listProvinces()) {
        snapshot += await snapshotToday(province);
      }
    } catch (e) {
      console.log('[cron] snapshot harga gagal:', (e as Error).message);
    }
    let alerts = 0;
    try {
      alerts = await runPriceAlertJob();
    } catch (e) {
      console.log('[cron] alarm harga gagal:', (e as Error).message);
    }
    console.log(
      `[cron] perangkat=${result.devices} terdaftar=${tokens.length} notif=${result.messages} snapshot_harga=${snapshot} alarm=${alerts}`
    );
    res.json({ ok: true, ...result, snapshotHarga: snapshot, alertTerpicu: alerts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ================= Alarm harga ================= */

function requireCronSecret(req: Request, res: Response): boolean {
  if (!config.cronSecret || req.headers.authorization === `Bearer ${config.cronSecret}`) {
    return true;
  }
  res.status(401).json({ error: 'Cron secret tidak valid' });
  return false;
}

pushRouter.get('/alerts', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { sbUser?: { id: string } }).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const alerts = await listMyAlerts(user.id);
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

pushRouter.post('/alerts', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { sbUser?: { id: string } }).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const expoToken = String(body.expoToken ?? '');
    if (!expoToken.startsWith('ExpoPushToken')) {
      res.status(400).json({ error: 'Token notifikasi tidak tersedia. Izinkan notifikasi dahulu.' });
      return;
    }
    const commodity = String(body.commodity ?? '');
    if (!/^[a-z_]{3,40}$/.test(commodity)) {
      res.status(400).json({ error: 'Komoditas tidak valid' });
      return;
    }
    const target = Math.round(Number(body.target));
    if (!Number.isFinite(target) || target < 500 || target > 10_000_000) {
      res.status(400).json({ error: 'Target harga tidak wajar' });
      return;
    }
    const direction = body.direction === 'below' ? 'below' : 'above';
    const province =
      String(body.province ?? 'nasional').trim().toLowerCase().slice(0, 40) || 'nasional';
    const lvlQ = Number(body.level);
    const level = [1, 2, 3].includes(lvlQ) ? lvlQ : 3;
    await upsertPriceAlert({
      user_id: user.id,
      expo_push_token: expoToken,
      commodity,
      province,
      level,
      direction,
      target,
      active: true,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

pushRouter.delete('/alerts', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { sbUser?: { id: string } }).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const id = String(req.query.id ?? '');
    if (!id) {
      res.status(400).json({ error: 'id wajib' });
      return;
    }
    await deactivateAlert(user.id, id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Evaluasi semua alarm aktif terhadap harga terkini; sekali picu lalu nonaktif. */
export async function runPriceAlertJob(): Promise<number> {
  if (!hasSupabase()) return 0;
  const alerts = await listActiveAlerts();
  if (alerts.length === 0) return 0;
  const rows = await listMarketPrices();
  const priceMap = new Map(
    rows.map((r) => [`${r.commodity}|${r.province}|${r.level ?? 3}`, r.price])
  );
  let fired = 0;
  const messages: Array<{ to: string; title: string; body: string }> = [];
  for (const a of alerts.slice(0, 1000)) {
    const price = priceMap.get(`${a.commodity}|${a.province}|${a.level}`);
    if (price === undefined) continue;
    const hit = a.direction === 'above' ? price >= a.target : price <= a.target;
    if (!hit) continue;
    const arah =
      a.direction === 'above'
        ? `naik mencapai`
        : `turun sampai`;
    messages.push({
      to: a.expo_push_token,
      title: `🔔 Alarm Harga ${a.commodity.replace(/_/g, ' ')}`,
      body: `Harga ${arah} Rp${a.target.toLocaleString('id-ID')}: sekarang Rp${price.toLocaleString('id-ID')} (${a.province}).`,
    });
    await markAlertFired(a.id ?? '', a.fired_count ?? 0);
    fired += 1;
    if (messages.length >= 90) break;
  }
  if (messages.length > 0) {
    await sendExpoPush(messages);
  }
  return fired;
}

pushRouter.get('/cron/price-alerts', async (req: Request, res: Response) => {
  try {
    if (!requireCronSecret(req, res)) return;
    const fired = await runPriceAlertJob();
    res.json({ ok: true, terpicu: fired });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
