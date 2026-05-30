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

export function mapDesignerClientsToGridItems(items: DesignerClientListItem[]): CustomerGridItem[] {
  return items.map((item) => ({
    key: item.key,
    name: item.customerName,
    subtitle: item.treatmentTitle,
    meta: `${formatTreatmentDisplayDate(item.treatmentDate)} · ${item.treatment?.treatment_type ?? '시술'}`,
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
