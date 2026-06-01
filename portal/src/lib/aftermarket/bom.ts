import type { AssetBomLine } from '@/lib/portal/types-ext';

export function buildBomByAsset(lines: Pick<AssetBomLine, 'asset_id' | 'part_id'>[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const line of lines) {
    if (!map[line.asset_id]) map[line.asset_id] = [];
    map[line.asset_id].push(line.part_id);
  }
  return map;
}
