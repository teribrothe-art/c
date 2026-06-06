import type { DesignerClientListItem } from './customer-invitations';
import { normalizePaymentStatus } from './payment-status';

export type DesignerClientWorkflowStep =
  | 'link'
  | 'invite'
  | 'payment_pending'
  | 'payment_requested'
  | 'escrow'
  | 'completed';

export type DesignerClientWorkflowStepMeta = {
  key: DesignerClientWorkflowStep;
  order: number;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
};

export const DESIGNER_CLIENT_WORKFLOW_STEPS: DesignerClientWorkflowStepMeta[] = [
  {
    key: 'link',
    order: 1,
    label: '고객 연결',
    shortLabel: '연결',
    description: '앱 가입·연결 필요',
    accent: '#7B5EE6',
  },
  {
    key: 'invite',
    order: 2,
    label: '초대 대기',
    shortLabel: '초대',
    description: '초대 코드·QR 대기',
    accent: '#FFB627',
  },
  {
    key: 'payment_pending',
    order: 3,
    label: '결제 대기',
    shortLabel: '결제',
    description: '결제 요청 전',
    accent: '#9CA3AF',
  },
  {
    key: 'payment_requested',
    order: 4,
    label: '결제 요청',
    shortLabel: '요청',
    description: '고객 결제 진행 중',
    accent: '#00A3FF',
  },
  {
    key: 'escrow',
    order: 5,
    label: '정산 대기',
    shortLabel: '정산',
    description: '결제 완료·정산 전',
    accent: '#FF5A5F',
  },
  {
    key: 'completed',
    order: 6,
    label: '완료',
    shortLabel: '완료',
    description: '정산 완료',
    accent: '#00C2A8',
  },
];

export function classifyDesignerClientWorkflowStep(
  item: DesignerClientListItem,
): DesignerClientWorkflowStep {
  const treatment = item.treatment;
  const linked = Boolean(treatment?.customer_id?.trim());

  if (!linked) {
    return 'link';
  }

  if (
    !item.isRegistered &&
    (item.inviteStatus === 'pending' ||
      item.inviteStatus === 'expired' ||
      item.inviteStatus === 'used')
  ) {
    return 'invite';
  }

  const status = normalizePaymentStatus(treatment?.payment_status);

  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'escrow') {
    return 'escrow';
  }

  if (status === 'payment_requested') {
    return 'payment_requested';
  }

  return 'payment_pending';
}

export function countDesignerClientWorkflowSteps(items: DesignerClientListItem[]) {
  const counts = Object.fromEntries(
    DESIGNER_CLIENT_WORKFLOW_STEPS.map((step) => [step.key, 0]),
  ) as Record<DesignerClientWorkflowStep, number>;

  for (const item of items) {
    counts[classifyDesignerClientWorkflowStep(item)] += 1;
  }

  return counts;
}

export function filterDesignerClientsByWorkflowStep(
  items: DesignerClientListItem[],
  step: DesignerClientWorkflowStep | 'all',
) {
  if (step === 'all') {
    return items;
  }

  return items.filter((item) => classifyDesignerClientWorkflowStep(item) === step);
}

export function getDesignerClientWorkflowStepMeta(step: DesignerClientWorkflowStep) {
  return DESIGNER_CLIENT_WORKFLOW_STEPS.find((item) => item.key === step)!;
}
