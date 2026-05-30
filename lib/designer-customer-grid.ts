import type { DesignerClientListItem } from './customer-invitations';
import { normalizePaymentStatus } from './payment-status';
import type { CustomerGridItem } from '../src/components/customer-grid';
import type { SettlementListItem } from './designer-payment-stats';

export function formatTreatmentDisplayDate(date: string) {
  return date.replaceAll('-', '.');
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function formatTreatmentDateSectionLabel(date: string, count: number) {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];

  return `${formatTreatmentDisplayDate(date)} · ${weekday} · ${count.toLocaleString('ko-KR')}건`;
}

export type DesignerClientDateGroup = {
  date: string;
  label: string;
  count: number;
  items: CustomerGridItem[];
};

/** 시술일 내림차순 · 일자별 섹션 */
export function groupDesignerClientsByDate(
  items: DesignerClientListItem[],
): DesignerClientDateGroup[] {
  const buckets = new Map<string, DesignerClientListItem[]>();

  for (const item of items) {
    const bucket = buckets.get(item.treatmentDate);

    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(item.treatmentDate, [item]);
    }
  }

  return [...buckets.entries()]
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, bucket]) => {
      const sorted = [...bucket].sort((a, b) => {
        const byName = a.customerName.localeCompare(b.customerName, 'ko');

        if (byName !== 0) {
          return byName;
        }

        return a.treatmentTitle.localeCompare(b.treatmentTitle, 'ko');
      });

      return {
        date,
        label: formatTreatmentDateSectionLabel(date, sorted.length),
        count: sorted.length,
        items: mapDesignerClientsToGridItems(sorted, { hideDateInMeta: true }),
      };
    });
}

export function formatSettlementBadgeAmount(payout: number) {
  if (payout >= 10000) {
    return `${Math.round(payout / 10000).toLocaleString('ko-KR')}만`;
  }

  return `${payout.toLocaleString('ko-KR')}원`;
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

export function mapDesignerClientsToGridItems(
  items: DesignerClientListItem[],
  options?: { hideDateInMeta?: boolean },
): CustomerGridItem[] {
  return items.map((item) => ({
    key: item.key,
    name: item.customerName,
    subtitle: item.treatmentTitle,
    meta: options?.hideDateInMeta
      ? (item.treatment?.treatment_type ?? '시술')
      : `${formatTreatmentDisplayDate(item.treatmentDate)} · ${item.treatment?.treatment_type ?? '시술'}`,
    badge: getDesignerClientStatusBadge(item),
  }));
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
