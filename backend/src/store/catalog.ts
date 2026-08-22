import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import seed from '../data/products.seed.json';

export interface CatalogProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  formulation: string;
  active_ingredient?: string;
  activeIngredient?: string;
  doses: Array<Record<string, unknown>>;
  warnings?: Record<string, unknown> | null;
  source: string;
  verified: boolean;
  updated_at?: string;
}

let client: SupabaseClient | null = null;

function db(): SupabaseClient | null {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

function fromRow(row: CatalogProduct): CatalogProduct {
  return {
    ...row,
    activeIngredient: row.activeIngredient ?? row.active_ingredient ?? '',
    updatedAt: row.updated_at,
  } as CatalogProduct & { updatedAt?: string };
}

export async function loadCatalog(): Promise<CatalogProduct[]> {
  const c = db();
  if (!c) return seed as CatalogProduct[];
  const { data, error } = await c
    .from('products')
    .select('*')
    .order('category', { ascending: true });
  if (error) {
    console.error('[catalog] gagal baca Supabase:', error.message);
    return seed as CatalogProduct[];
  }
  if (!data || data.length === 0) return seed as CatalogProduct[];
  return (data as CatalogProduct[]).map(fromRow);
}

export async function saveCatalog(
  products: Array<Record<string, unknown>>,
  actor: string
): Promise<number> {
  const c = db();
  if (!c) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY belum diatur di server');
  const rows = products.map((p) => ({
    id: String(p.id),
    brand: String(p.brand ?? ''),
    name: String(p.name ?? ''),
    category: String(p.category ?? 'lainnya'),
    formulation: String(p.formulation ?? ''),
    active_ingredient: String(p.activeIngredient ?? p.active_ingredient ?? ''),
    doses: (p.doses as Array<Record<string, unknown>>) ?? [],
    warnings: (p.warnings as Record<string, unknown>) ?? null,
    source: String(p.source ?? `admin:${actor}`),
    verified: Boolean(p.verified),
    updated_at: new Date().toISOString(),
  }));

  const { error: delErr } = await c.from('products').delete().neq('id', '__none__');
  if (delErr) throw new Error(`Gagal mengosongkan katalog: ${delErr.message}`);
  const { error: insErr } = await c.from('products').insert(rows);
  if (insErr) throw new Error(`Gagal menyimpan katalog: ${insErr.message}`);

  await c.from('audit_log').insert({
    action: 'replace',
    actor,
    detail: { count: rows.length },
  });
  return rows.length;
}

export async function logAudit(
  productId: string,
  action: string,
  detail: Record<string, unknown>
): Promise<void> {
  const c = db();
  if (!c) return;
  await c.from('audit_log').insert({ product_id: productId, action, detail });
}
