import { Router, Request, Response } from 'express';
import {
  insertFarmActivity,
  listFarmActivities,
  updateFarmActivity,
  deleteFarmActivity,
} from '../store/farmActivities';
import { requireSupabaseUser } from '../middleware/supabaseUser';

export const activitiesRouter = Router();

const VALID_ACTIVITIES = ['tanam', 'pemupukan', 'penyemprotan', 'penyiraman', 'penyiangan', 'panen', 'lainnya'];

function clampActivity(a: unknown): string {
  return VALID_ACTIVITIES.includes(String(a)) ? String(a) : 'lainnya';
}

activitiesRouter.get('/', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const activities = await listFarmActivities(user.id);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

activitiesRouter.post('/', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const created = await insertFarmActivity({
      user_id: user.id,
      activity: clampActivity(body.activity),
      product_name: body.productName ? String(body.productName).slice(0, 120) : undefined,
      dose_text: body.doseText ? String(body.doseText).slice(0, 300) : undefined,
      date: body.date ? String(body.date).slice(0, 10) : undefined,
      note: body.note ? String(body.note).slice(0, 500) : undefined,
      source: body.source === 'ai' ? 'ai' : 'manual',
      crop_label: body.cropLabel ? String(body.cropLabel).slice(0, 80) : undefined,
      done: Boolean(body.done),
      remind_at: typeof body.remindAt === 'string' ? body.remindAt.slice(0, 30) : null,
    });
    if (!created) {
      res.status(502).json({ error: 'Penyimpanan aktivitas tidak tersedia' });
      return;
    }
    res.json({ activity: created });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

activitiesRouter.patch('/:id', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (body.done !== undefined) patch.done = Boolean(body.done);
    if (body.note !== undefined) patch.note = String(body.note).slice(0, 500);
    if (body.doseText !== undefined) patch.dose_text = String(body.doseText).slice(0, 300);
    if (body.productName !== undefined) patch.product_name = String(body.productName).slice(0, 120);
    if (body.date !== undefined) patch.date = String(body.date).slice(0, 10);
    if (body.cropLabel !== undefined) patch.crop_label = String(body.cropLabel).slice(0, 80);
    if (body.remindAt !== undefined) patch.remind_at = typeof body.remindAt === 'string' ? body.remindAt.slice(0, 30) : null;
    await updateFarmActivity(user.id, req.params.id, patch);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

activitiesRouter.delete('/:id', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    await deleteFarmActivity(user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});