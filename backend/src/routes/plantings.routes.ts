import { Router, Request, Response } from 'express';
import { requireSupabaseUser } from '../middleware/supabaseUser';
import {
  deletePlanting,
  insertPlanting,
  listPlantings,
  ReminderInput,
  updatePlanting,
} from '../store/plantings';

export const plantingsRouter = Router();

interface SbReq extends Request {
  sbUser?: { id: string };
}

plantingsRouter.get('/', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as SbReq).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    res.json({ plantings: await listPlantings(user.id) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

plantingsRouter.post('/', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as SbReq).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const commodity = String(body.commodity ?? '').trim();
    if (!/^[a-z_]{3,40}$/.test(commodity)) {
      res.status(400).json({ error: 'Komoditas tidak valid' });
      return;
    }
    const plantedAt = String(body.plantedAt ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plantedAt)) {
      res.status(400).json({ error: 'Tanggal tanam wajib format YYYY-MM-DD' });
      return;
    }
    const harvestDays = Math.round(Number(body.harvestDays));
    if (!Number.isFinite(harvestDays) || harvestDays < 20 || harvestDays > 1500) {
      res.status(400).json({ error: 'Umur panen harus 20-1500 hari' });
      return;
    }
    const area = Number(body.area);
    if (!Number.isFinite(area) || area <= 0 || area > 100000) {
      res.status(400).json({ error: 'Luas tidak wajar' });
      return;
    }
    const yieldKgHa = Math.max(0, Math.round(Number(body.yieldKgPerHa ?? 0)));
    const costTotal = Math.max(0, Math.round(Number(body.costTotal ?? 0)));
    const reminders = Array.isArray(body.reminders)
      ? (body.reminders as ReminderInput[]).map((r) => ({
          hst: Math.round(Number(r?.hst)),
          label: String(r?.label ?? ''),
        }))
      : [];
    const id = await insertPlanting(
      {
        user_id: user.id,
        commodity,
        name: String(body.name ?? '').trim().slice(0, 60),
        area,
        planted_at: plantedAt,
        harvest_days: harvestDays,
        yield_kg_per_ha: yieldKgHa,
        cost_total: costTotal,
        status: 'active',
      },
      reminders
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

plantingsRouter.patch('/:id', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as SbReq).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const id = String(req.params.id ?? '');
    if (!id) {
      res.status(400).json({ error: 'id wajib' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (body.status && ['active', 'harvested', 'failed'].includes(String(body.status))) {
      patch.status = body.status;
    }
    if (body.costTotal !== undefined && Number.isFinite(Number(body.costTotal))) {
      patch.cost_total = Math.max(0, Math.round(Number(body.costTotal)));
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Tidak ada perubahan valid' });
      return;
    }
    await updatePlanting(user.id, id, patch);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

plantingsRouter.delete('/:id', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as SbReq).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const id = String(req.params.id ?? '');
    if (!id) {
      res.status(400).json({ error: 'id wajib' });
      return;
    }
    await deletePlanting(user.id, id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
