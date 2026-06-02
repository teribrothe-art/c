import type { OrgDesignerMetrics } from './org-aggregates';

/** 검색어·매장명 비교용 (공백·중점 통일) */
export function normalizeOrgSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·・∙]/g, '·');
}

export function designerMatchesOrgSearch(
  designer: Pick<OrgDesignerMetrics, 'name' | 'storeName' | 'storeRegion' | 'subtitle' | 'email' | 'storeId'>,
  query: string,
  storeId?: string,
) {
  if (storeId?.trim()) {
    return designer.storeId === storeId.trim();
  }

  const normalizedQuery = normalizeOrgSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeOrgSearchText(
    [designer.name, designer.storeName, designer.storeRegion, designer.subtitle ?? '', designer.email].join(' '),
  );

  return haystack.includes(normalizedQuery);
}
