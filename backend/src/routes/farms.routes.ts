import { Router, Request, Response } from 'express';
import {
  listFarms,
  insertFarm,
  updateFarm,
  deleteFarm,
  listFarmCrops,
  insertFarmCrop,
  updateFarmCrop,
  deleteFarmCrop,
  seedFarmsFromLocal,
} from '../store/farms';
import { requireSupabaseUser } from '../middleware/supabaseUser';

export const farmsRouter = Router();

// ---- Farms CRUD ----

farmsRouter.get('/', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const farms = await listFarms(user.id);
    res.json({ farms });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

farmsRouter.post('/', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const { name, areaValue, areaUnit, location } = req.body;
    const farm = await insertFarm({
      user_id: user.id,
      name: String(name ?? '').slice(0, 100),
      area_value: Number(areaValue) || 0,
      area_unit: String(areaUnit ?? 'm2').slice(0, 10),
      location: String(location ?? '').slice(0, 200),
    });
    res.json({ farm });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

farmsRouter.patch('/:id', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const { name, areaValue, areaUnit, location } = req.body;
    const patch: Record<string, any> = {};
    if (name !== undefined) patch.name = String(name).slice(0, 100);
    if (areaValue !== undefined) patch.area_value = Number(areaValue) || 0;
    if (areaUnit !== undefined) patch.area_unit = String(areaUnit).slice(0, 10);
    if (location !== undefined) patch.location = String(location).slice(0, 200);
    await updateFarm(user.id, req.params.id, patch);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

farmsRouter.delete('/:id', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    await deleteFarm(user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- Farm Crops CRUD ----

farmsRouter.get('/:farmId/crops', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const crops = await listFarmCrops(user.id, req.params.farmId);
    res.json({ crops });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

farmsRouter.post('/:farmId/crops', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const { name, plantedDate, harvestDate, areaValue, areaUnit, status } = req.body;
    const crop = await insertFarmCrop({
      farm_id: req.params.farmId,
      user_id: user.id,
      name: String(name ?? '').slice(0, 100),
      planted_date: plantedDate || null,
      harvest_date: harvestDate || null,
      area_value: Number(areaValue) || 0,
      area_unit: String(areaUnit ?? 'm2').slice(0, 10),
      status: String(status ?? 'active').slice(0, 20),
    });
    res.json({ crop });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

farmsRouter.patch('/:farmId/crops/:cropId', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const { name, plantedDate, harvestDate, areaValue, areaUnit, status } = req.body;
    const patch: Record<string, any> = {};
    if (name !== undefined) patch.name = String(name).slice(0, 100);
    if (plantedDate !== undefined) patch.planted_date = plantedDate || null;
    if (harvestDate !== undefined) patch.harvest_date = harvestDate || null;
    if (areaValue !== undefined) patch.area_value = Number(areaValue) || 0;
    if (areaUnit !== undefined) patch.area_unit = String(areaUnit).slice(0, 10);
    if (status !== undefined) patch.status = String(status).slice(0, 20);
    await updateFarmCrop(user.id, req.params.cropId, patch);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

farmsRouter.delete('/:farmId/crops/:cropId', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    await deleteFarmCrop(user.id, req.params.cropId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- Seed from local AsyncStorage data ----

farmsRouter.post('/seed', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).sbUser;
    const { localFarms } = req.body;
    if (!Array.isArray(localFarms) || localFarms.length === 0) {
      res.json({ seeded: 0 });
      return;
    }
    const count = await seedFarmsFromLocal(user.id, localFarms.slice(0, 50));
    res.json({ seeded: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
