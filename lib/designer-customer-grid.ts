import type { DesignerClientListItem } from './customer-invitations';
import { normalizePaymentStatus } from './payment-status';
import type { CustomerGridItem } from '../src/components/customer-grid';
import type { SettlementListItem } from './designer-payment-stats';

export function formatTreatmentDisplayDate(date: string) {
  return date.replaceAll('-', '.');
}

export function formatSettlementBadgeAmount(payout: number) {
  if (payout >= 10000) {
    return `${Math.round(payout / 10000).toLocaleString('ko-KR')}만`;
  }

  return `${payout.toLocaleString('ko-KR')}원`;
}

/** 고객별 그리드·집계용 키 (customer_id 우선, 없으면 이름) */
export function getDesignerClientGroupKey(item: DesignerClientListItem) {
  const customerId = item.treatment?.customer_id?.trim();

  if (customerId) {
    return `id:${customerId}`;
  }

  return `name:${item.customerName.trim().toLowerCase()}`;
}

export type GroupedDesignerClient = {
  groupKey: string;
  latest: DesignerClientListItem;
  visitCount: number;
};

type GroupDesignerClientsOptions = {
  /** 매장·본사 등 디자이너 구분이 필요할 때 접두사 (예: designerId) */
  groupKeyPrefix?: (item: DesignerClientListItem) => string;
};

/** 시술 건별 목록 → 고객별 1행 (최근 시술 기준) */
export function groupDesignerClientsByCustomer(
  items: DesignerClientListItem[],
  options?: GroupDesignerClientsOptions,
): GroupedDesignerClient[] {
  const buckets = new Map<string, DesignerClientListItem[]>();

  for (const item of items) {
    const prefix = options?.groupKeyPrefix?.(item) ?? '';
    const key = `${prefix}${getDesignerClientGroupKey(item)}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  const groups: GroupedDesignerClient[] = [];

  for (const [groupKey, bucket] of buckets) {
    const sorted = [...bucket].sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate));

    groups.push({
      groupKey,
      latest: sorted[0],
      visitCount: sorted.length,
    });
  }

  return groups.sort((a, b) => b.latest.treatmentDate.localeCompare(a.latest.treatmentDate));
}

export function getDesignerClientStatusBadge(item: DesignerClientListItem) {
  if (!item.isRegistered) {
    if (item.inviteStatus === 'pending') {
      return '초대';
    }

    if (item.inviteStatus === 'expired') {
      return '만료';
    }

    if (item.inviteStatus === 'used') {
      return '가입';
    }

    return undefined;
  }

  const normalized = normalizePaymentStatus(item.treatment?.payment_status);

  if (normalized === 'completed') {
    return '정산';
  }

  if (normalized === 'escrow') {
    return '대기';
  }

  if (normalized === 'payment_requested') {
    return '요청';
  }

  return '미결제';
}

export function mapGroupedDesignerClientsToGridItems(
  groups: GroupedDesignerClient[],
): CustomerGridItem[] {
  return groups.map(({ groupKey, latest, visitCount }) => {
    const typeLabel = latest.treatment?.treatment_type ?? '시술';
    const dateLabel = formatTreatmentDisplayDate(latest.treatmentDate);
    const meta =
      visitCount > 1 ? `${dateLabel} · ${typeLabel} · 시술 ${visitCount}건` : `${dateLabel} · ${typeLabel}`;

    return {
      key: groupKey,
      name: latest.customerName,
      subtitle: latest.treatmentTitle,
      meta,
      badge: getDesignerClientStatusBadge(latest),
    };
  });
}

/** 고객별로 묶어 4열 그리드용 아이템 생성 */
export function mapDesignerClientsToGridItems(items: DesignerClientListItem[]): CustomerGridItem[] {
  return mapGroupedDesignerClientsToGridItems(groupDesignerClientsByCustomer(items));
}

export function mapSettlementsToGridItems(items: SettlementListItem[]): CustomerGridItem[] {
  return items.map((item) => ({
    key: item.paymentId,
    name: item.customerName,
    subtitle: item.treatmentTitle,
    meta: formatTreatmentDisplayDate(item.date),
    badge: formatSettlementBadgeAmount(item.payout),
  }));
}

export function mapRevenueSettlementsToGridItems(
  items: {
    paymentId: string;
    customerName: string;
    treatmentTitle: string;
    date: string;
    payout: number;
  }[],
): CustomerGridItem[] {
  return items.map((item) => ({
    key: item.paymentId,
    name: item.customerName,
    subtitle: item.treatmentTitle,
    meta: formatTreatmentDisplayDate(item.date),
    badge: formatSettlementBadgeAmount(item.payout),
  }));
}
