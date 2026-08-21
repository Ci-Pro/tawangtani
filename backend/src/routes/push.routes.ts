import { Router, Request, Response } from 'express';
import { fetchWeatherAlerts } from '../services/weatherAlerts';
import { listPushTokens, sendExpoPush, upsertPushToken } from '../store/pushTokens';
import { config, hasSupabase } from '../config';
import { optionalSupabaseUser } from '../middleware/supabaseUser';

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
    console.log(
      `[cron] perangkat=${result.devices} terdaftar=${tokens.length} notif=${result.messages}`
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
