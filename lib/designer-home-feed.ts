import type { DesignerClientListItem } from './customer-invitations';
import { formatTreatmentDisplayDate, getDesignerClientStatusBadge } from './designer-customer-grid';
import { getPaymentStatusLabel, normalizePaymentStatus } from './payment-status';

export type DesignerHomeActionItem = {
  key: string;
  treatmentId: string;
  title: string;
  subtitle: string;
  cta: string;
  priority: number;
};

export type DesignerHomeRecentItem = {
  key: string;
  treatmentId: string;
  customerName: string;
  treatmentTitle: string;
  dateLabel: string;
  statusLabel: string;
};

function actionPriority(kind: 'link-customer' | 'settle' | 'payment-wait' | 'invite') {
  switch (kind) {
    case 'link-customer':
      return 0;
    case 'settle':
      return 1;
    case 'payment-wait':
      return 2;
    case 'invite':
      return 3;
    default:
      return 9;
  }
}

export function countTodayTreatments(items: DesignerClientListItem[]) {
  const today = new Date().toISOString().slice(0, 10);
  return items.filter((item) => item.treatmentDate === today).length;
}

/** 홈 «처리할 일» — 연결·정산·결제·초대 */
export function buildDesignerHomeActionItems(
  items: DesignerClientListItem[],
  limit = 5,
): DesignerHomeActionItem[] {
  const actions: DesignerHomeActionItem[] = [];

  for (const item of items) {
    const treatment = item.treatment;

    if (!treatment) {
      continue;
    }

    const status = normalizePaymentStatus(treatment.payment_status);
    const linked = Boolean(treatment.customer_id?.trim());

    if (!linked) {
      actions.push({
        key: `action-link-${item.treatmentId}`,
        treatmentId: item.treatmentId,
        title: item.customerName,
        subtitle: `${item.treatmentTitle} · 고객 연결 필요`,
        cta: '연결하기',
        priority: actionPriority('link-customer'),
      });
      continue;
    }

    if (status === 'escrow') {
      actions.push({
        key: `action-settle-${item.treatmentId}`,
        treatmentId: item.treatmentId,
        title: item.customerName,
        subtitle: `${item.treatmentTitle} · 정산 대기`,
        cta: '시술 보기',
        priority: actionPriority('settle'),
      });
      continue;
    }

    if (status === 'payment_requested') {
      actions.push({
        key: `action-pay-${item.treatmentId}`,
        treatmentId: item.treatmentId,
        title: item.customerName,
        subtitle: `${item.treatmentTitle} · 고객 결제 대기`,
        cta: '상세',
        priority: actionPriority('payment-wait'),
      });
      continue;
    }

    if (!item.isRegistered && item.inviteStatus === 'pending') {
      actions.push({
        key: `action-invite-${item.treatmentId}`,
        treatmentId: item.treatmentId,
        title: item.customerName,
        subtitle: `${item.treatmentTitle} · 초대 대기`,
        cta: '초대',
        priority: actionPriority('invite'),
      });
    }
  }

  return actions
    .sort(
      (a, b) => a.priority - b.priority || a.title.localeCompare(b.title, 'ko'),
    )
    .slice(0, limit);
}

export function buildDesignerHomeRecentItems(
  items: DesignerClientListItem[],
  limit = 5,
): DesignerHomeRecentItem[] {
  return [...items]
    .sort(
      (a, b) =>
        b.treatmentDate.localeCompare(a.treatmentDate) ||
        b.treatmentId.localeCompare(a.treatmentId),
    )
    .slice(0, limit)
    .map((item) => {
      const badge = getDesignerClientStatusBadge(item);

      return {
        key: item.key,
        treatmentId: item.treatmentId,
        customerName: item.customerName,
        treatmentTitle: item.treatmentTitle,
        dateLabel: formatTreatmentDisplayDate(item.treatmentDate),
        statusLabel:
          badge ??
          (!item.treatment?.customer_id?.trim()
            ? '미연결'
            : getPaymentStatusLabel(item.treatment?.payment_status)),
      };
    });
}
