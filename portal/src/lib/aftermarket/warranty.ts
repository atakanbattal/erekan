import type { CustomerAsset } from '@/lib/portal/types-ext';

export function isWarrantyActive(asset: Pick<CustomerAsset, 'warranty_end'>): boolean {
  if (!asset.warranty_end) return false;
  const end = new Date(asset.warranty_end);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
}

export function warrantyDaysRemaining(asset: Pick<CustomerAsset, 'warranty_end'>): number | null {
  if (!asset.warranty_end) return null;
  const end = new Date(asset.warranty_end);
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** Compute warranty_end from start date + duration in days. */
export function computeWarrantyEndFromDays(warrantyStart: string, warrantyDays: number): string {
  const start = new Date(warrantyStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + warrantyDays);
  return end.toISOString().slice(0, 10);
}

/** Compute warranty_end from start date + duration in months. */
export function computeWarrantyEnd(warrantyStart: string, warrantyMonths: number): string {
  const start = new Date(warrantyStart);
  const end = new Date(start);
  end.setMonth(end.getMonth() + warrantyMonths);
  return end.toISOString().slice(0, 10);
}

export function warrantyTotalDays(
  asset: Pick<CustomerAsset, 'warranty_start' | 'warranty_end'>
): number | null {
  if (!asset.warranty_start || !asset.warranty_end) return null;
  const start = new Date(asset.warranty_start);
  const end = new Date(asset.warranty_end);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
