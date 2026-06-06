import { isDemoAuthMode } from './auth';
import {
  buildDesignerClientListItems,
  getDesignerClientListItemsForDesigner,
  readDemoInvitationsByDesignerIds,
  type DesignerClientListItem,
} from './customer-invitations';
import {
  buildOrgClientListCacheKey,
  peekOrgClientListCache,
  storeOrgClientListCache,
} from './designer-workspace-cache';
import type { OrgScope } from './org-access';
import { getOrgDesignerRoster, type OrgDesignerRosterEntry } from './org-designer-roster';
import { resolveStoreOrgIdForOrgScope } from './org-store-scope';
import { preloadTreatmentsForDesignerIds } from './treatments';
import { supabase } from './supabase';

export type OrgClientListItem = DesignerClientListItem & {
  designerId: string;
  designerName: string;
  designerStoreName: string;
};

function attachDesignerMeta(
  items: DesignerClientListItem[],
  designer: OrgDesignerRosterEntry,
): OrgClientListItem[] {
  return items.map((item) => ({
    ...item,
    key: `${designer.id}-${item.key}`,
    designerId: designer.id,
    designerName: designer.name,
    designerStoreName: designer.storeName,
  }));
}

async function buildOrgClientListItems(
  roster: OrgDesignerRosterEntry[],
): Promise<OrgClientListItem[]> {
  if (roster.length === 0) {
    return [];
  }

  const designerIds = roster.map((designer) => designer.id);

  if (isDemoAuthMode || !supabase) {
    const [treatmentsByDesigner, invitationsByDesigner] = await Promise.all([
      preloadTreatmentsForDesignerIds(designerIds),
      readDemoInvitationsByDesignerIds(designerIds),
    ]);

    const rows: OrgClientListItem[] = [];

    for (const designer of roster) {
      const treatments = treatmentsByDesigner.get(designer.id) ?? [];
      const invitations = invitationsByDesigner.get(designer.id) ?? [];
      const items = buildDesignerClientListItems(treatments, invitations);

      rows.push(...attachDesignerMeta(items, designer));
    }

    return rows.sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate));
  }

  const batches = await Promise.all(
    roster.map(async (designer) => {
      const items = await getDesignerClientListItemsForDesigner(designer.id);
      return attachDesignerMeta(items, designer);
    }),
  );

  return batches.flat().sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate));
}

export async function getOrgClientListItems(
  scope: OrgScope,
  options?: { storeOrgId?: string },
): Promise<OrgClientListItem[]> {
  const storeOrgId = await resolveStoreOrgIdForOrgScope(scope, options?.storeOrgId);
  const cacheKey = buildOrgClientListCacheKey(scope, storeOrgId);
  const cached = peekOrgClientListCache<OrgClientListItem>(cacheKey);

  if (cached) {
    return cached;
  }

  const roster = getOrgDesignerRoster(scope, storeOrgId);
  const rows = await buildOrgClientListItems(roster);

  storeOrgClientListCache(cacheKey, rows);

  return rows;
}
