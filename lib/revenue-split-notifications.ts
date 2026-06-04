import { addNotification } from './notifications';
import {
  formatRevenueSplitSummary,
  REVENUE_SPLIT_PARTY_LABELS,
  type RevenueSplitConfig,
} from './revenue-split-config';
import type { RevenueSplitChangeProposal } from './revenue-split-approval';

/** 데모·테스트에서 알림을 받을 대표 매장·디자이너 계정 */
const NOTIFY_USER_IDS = {
  designer: 'demo-designer-local',
  store: 'store-test',
} as const;

const HREF_BY_PARTY = {
  designer: '/designer/revenue-split',
  store: '/store/revenue-split',
} as const;

async function notifyParty(
  party: keyof typeof NOTIFY_USER_IDS,
  title: string,
  message: string,
) {
  return addNotification({
    user_id: NOTIFY_USER_IDS[party],
    type: 'revenue_split_changed',
    title,
    message,
    treatment_id: '',
    href: HREF_BY_PARTY[party],
  });
}

export async function notifyHqFeeChanged(previousPercent: number, nextPercent: number) {
  const title = '본사 수수료 변경';
  const message = `본사 수수료가 ${previousPercent}%에서 ${nextPercent}%로 변경되었습니다. (본사 단독 적용)`;

  await Promise.all([
    notifyParty('designer', title, message),
    notifyParty('store', title, message),
  ]);
}

export async function notifyShareSplitProposal(proposal: RevenueSplitChangeProposal) {
  const title = '분배 비율 승인 요청';
  const proposer = REVENUE_SPLIT_PARTY_LABELS[proposal.proposedBy];
  const summary = formatRevenueSplitSummary(proposal.proposedConfig);
  const message = `${proposer}에서 디자이너·매장 분배 비율 변경을 요청했습니다. (${summary}) 최종 승인이 필요합니다.`;

  const targets: (keyof typeof NOTIFY_USER_IDS)[] = ['designer', 'store'];

  await Promise.all(
    targets
      .filter((party) => party !== proposal.proposedBy)
      .map((party) => notifyParty(party, title, message)),
  );
}

export async function notifyShareSplitApplied(config: RevenueSplitConfig) {
  const title = '분배 비율 확정';
  const message = `디자이너·매장 분배 비율이 확정되었습니다. (${formatRevenueSplitSummary(config)})`;

  await Promise.all([
    notifyParty('designer', title, message),
    notifyParty('store', title, message),
  ]);
}
