import fs from 'fs';
import path from 'path';
import { config } from '../config';
import seed from '../data/products.seed.json';

export type CatalogProduct = (typeof seed)[number];

function file(): string {
  return path.join(config.dataDir, 'catalog.json');
}

export function loadCatalog(): CatalogProduct[] {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8')) as CatalogProduct[];
  } catch {
    return seed as CatalogProduct[];
  }
}

export function saveCatalog(products: unknown[], updatedBy: string): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const stamped = (products as CatalogProduct[]).map((p) => ({
    ...p,
    updatedAt: new Date().toISOString(),
    source: p.source || `admin:${updatedBy}`,
  }));
  fs.writeFileSync(file(), JSON.stringify(stamped, null, 2));
}
