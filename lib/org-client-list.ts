import {
  getDesignerClientListItemsForDesigner,
  type DesignerClientListItem,
} from './customer-invitations';
import type { OrgScope } from './org-access';
import { getOrgDesignerRoster } from './org-designer-roster';

export type OrgClientListItem = DesignerClientListItem & {
  designerId: string;
  designerName: string;
  designerStoreName: string;
};

export async function getOrgClientListItems(scope: OrgScope): Promise<OrgClientListItem[]> {
  const roster = getOrgDesignerRoster(scope);
  const rows: OrgClientListItem[] = [];

  for (const designer of roster) {
    const items = await getDesignerClientListItemsForDesigner(designer.id);

    for (const item of items) {
      rows.push({
        ...item,
        key: `${designer.id}-${item.key}`,
        designerId: designer.id,
        designerName: designer.name,
        designerStoreName: designer.storeName,
      });
    }
  }

  return rows.sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate));
}
