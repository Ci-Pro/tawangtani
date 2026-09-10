import { runUpstreamSync } from '../../src/services/upstreamSync';
import { writeSyncHealth } from '../../src/store/syncHealth';

export default async () => {
  const started = Date.now();
  try {
    const r = await runUpstreamSync();
    const durMs = Date.now() - started;
    await writeSyncHealth({
      ok: true,
      rows: r.rows,
      provinces: String(r.provinces),
      errors: r.errors.join('; '),
    });
    return {
      statusCode: 200,
      body: `ok rows=${r.rows} provinces=${r.provinces} changed=${r.changed} dur=${durMs}ms errors=${r.errors.length}`,
    };
  } catch (err) {
    await writeSyncHealth({
      ok: false,
      rows: 0,
      provinces: '0',
      errors: String((err as Error).message),
    });
    return { statusCode: 500, body: String((err as Error).message) };
  }
};