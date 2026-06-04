import type { OrgDesignerMetrics } from './org-aggregates';
import {
  getNationwideStoreById,
  isNationwideDesignerId,
  REGION_SPECS,
} from './nationwide-org-catalog';
import { getDesignerStoreAffiliation } from './org-store-affiliation';

export type DesignerRegionFilterKey = 'all' | string;

/** 매장 region 문자열 → 탭용 짧은 지역명 (서울, 광주 등) */
export function formatDesignerRegionShortLabel(storeRegion: string) {
  const normalized = storeRegion.trim();

  if (!normalized || normalized === '전국') {
    return '전국';
  }

  for (const spec of REGION_SPECS) {
    if (spec.region === '기타') {
      continue;
    }

    const shortLabel = spec.region.includes('·') ? spec.region.split('·')[0]! : spec.region;

    if (normalized.startsWith(spec.region) || normalized.startsWith(shortLabel)) {
      return shortLabel;
    }
  }

  return normalized.split(' ')[0] ?? normalized;
}

export const DESIGNER_REGION_FILTER_TABS: { key: DesignerRegionFilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  ...REGION_SPECS.filter((spec) => spec.region !== '기타').map((spec) => {
    const label = spec.region.includes('·') ? spec.region.split('·')[0]! : spec.region;

    return { key: label, label };
  }),
];

export function resolveDesignerRegionFilterKey(designer: Pick<OrgDesignerMetrics, 'storeId' | 'storeName'>) {
  const nationwideStore = isNationwideDesignerId(designer.storeId)
    ? getNationwideStoreById(designer.storeId)
    : null;
  const affiliation = getDesignerStoreAffiliation(designer.storeId);
  const storeRegion = nationwideStore?.region ?? affiliation?.store.region ?? designer.storeName;

  return formatDesignerRegionShortLabel(storeRegion);
}

export function designerMatchesRegionFilter(
  designer: Pick<OrgDesignerMetrics, 'storeId' | 'storeName' | 'name' | 'subtitle' | 'email'>,
  regionKey: DesignerRegionFilterKey,
) {
  if (regionKey === 'all') {
    return true;
  }

  const designerRegion = resolveDesignerRegionFilterKey(designer);

  if (designerRegion === regionKey) {
    return true;
  }

  const haystack = [designer.name, designer.subtitle ?? '', designer.storeName, designer.email]
    .join(' ')
    .toLowerCase();

  return haystack.includes(regionKey.toLowerCase());
}

export function storeMatchesRegionFilter(
  store: { region: string; name: string; hotPlace?: string },
  regionKey: DesignerRegionFilterKey,
) {
  if (regionKey === 'all') {
    return true;
  }

  const storeRegion = formatDesignerRegionShortLabel(store.region);

  if (storeRegion === regionKey) {
    return true;
  }

  const haystack = [store.region, store.name, store.hotPlace ?? ''].join(' ').toLowerCase();

  return haystack.includes(regionKey.toLowerCase());
}
