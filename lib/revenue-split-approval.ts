import { demoGetItem, demoRemoveItem, demoSetItem } from './demo-async-storage';
import {
  configsEqual,
  DEFAULT_REVENUE_SPLIT_CONFIG,
  normalizeRevenueSplitConfig,
  type RevenueSplitConfig,
  type RevenueSplitParty,
} from './revenue-split-config';

const ACTIVE_KEY = 'hair-diary-revenue-split-active';
const PENDING_KEY = 'hair-diary-revenue-split-pending';

export type RevenueSplitChangeProposal = {
  id: string;
  proposedConfig: RevenueSplitConfig;
  proposedBy: RevenueSplitParty;
  proposedAt: string;
  approvals: Partial<Record<RevenueSplitParty, boolean>>;
  note?: string;
};

const ALL_PARTIES: RevenueSplitParty[] = ['admin', 'store', 'designer'];

export function getRequiredApprovalParties() {
  return [...ALL_PARTIES];
}

export function isProposalFullyApproved(proposal: RevenueSplitChangeProposal) {
  return ALL_PARTIES.every((party) => proposal.approvals[party] === true);
}

export async function getActiveRevenueSplitConfig(): Promise<RevenueSplitConfig> {
  const raw = await demoGetItem(ACTIVE_KEY);

  if (!raw) {
    return { ...DEFAULT_REVENUE_SPLIT_CONFIG };
  }

  try {
    return normalizeRevenueSplitConfig(JSON.parse(raw) as Partial<RevenueSplitConfig>);
  } catch {
    return { ...DEFAULT_REVENUE_SPLIT_CONFIG };
  }
}

export async function getPendingRevenueSplitProposal(): Promise<RevenueSplitChangeProposal | null> {
  const raw = await demoGetItem(PENDING_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RevenueSplitChangeProposal;
  } catch {
    return null;
  }
}

export async function proposeRevenueSplitChange(
  proposedConfig: RevenueSplitConfig,
  proposedBy: RevenueSplitParty,
  note?: string,
): Promise<RevenueSplitChangeProposal> {
  const active = await getActiveRevenueSplitConfig();
  const normalized = normalizeRevenueSplitConfig(proposedConfig);

  if (configsEqual(active, normalized)) {
    throw new Error('현재 적용 중인 비율과 동일합니다.');
  }

  const existing = await getPendingRevenueSplitProposal();

  if (existing && !isProposalFullyApproved(existing)) {
    throw new Error('이미 승인 대기 중인 변경안이 있습니다. 상호 승인을 완료하거나 취소한 뒤 다시 제안하세요.');
  }

  const proposal: RevenueSplitChangeProposal = {
    id: `split-${Date.now()}`,
    proposedConfig: normalized,
    proposedBy,
    proposedAt: new Date().toISOString(),
    approvals: { [proposedBy]: true },
    note,
  };

  await demoSetItem(PENDING_KEY, JSON.stringify(proposal));

  return proposal;
}

export async function approveRevenueSplitChange(
  party: RevenueSplitParty,
): Promise<{ applied: boolean; proposal: RevenueSplitChangeProposal | null }> {
  const proposal = await getPendingRevenueSplitProposal();

  if (!proposal) {
    return { applied: false, proposal: null };
  }

  const next: RevenueSplitChangeProposal = {
    ...proposal,
    approvals: { ...proposal.approvals, [party]: true },
  };

  if (!isProposalFullyApproved(next)) {
    await demoSetItem(PENDING_KEY, JSON.stringify(next));
    return { applied: false, proposal: next };
  }

  await demoSetItem(ACTIVE_KEY, JSON.stringify(next.proposedConfig));
  await demoRemoveItem(PENDING_KEY);

  return { applied: true, proposal: next };
}

export async function cancelRevenueSplitProposal() {
  await demoRemoveItem(PENDING_KEY);
}

/** 본사 매출 %만 즉시 반영 (본사 단독 조정 — 상호 승인 없음) */
export async function applyActiveHqFeePercent(hqFeePercent: number): Promise<RevenueSplitConfig> {
  const active = await getActiveRevenueSplitConfig();
  const next = normalizeRevenueSplitConfig({ ...active, hqFeePercent });

  if (active.hqFeePercent === next.hqFeePercent) {
    throw new Error('현재 본사 매출 비율과 동일합니다.');
  }

  await demoSetItem(ACTIVE_KEY, JSON.stringify(next));
  await demoRemoveItem(PENDING_KEY);

  return next;
}

/** 수수료 구조 전체 즉시 저장·적용 (테스트·본사 화면) */
export async function applyActiveRevenueSplitConfig(
  proposedConfig: RevenueSplitConfig,
): Promise<RevenueSplitConfig> {
  const active = await getActiveRevenueSplitConfig();
  const next = normalizeRevenueSplitConfig(proposedConfig);

  if (configsEqual(active, next)) {
    throw new Error('현재 적용 중인 수수료 구조와 동일합니다.');
  }

  await demoSetItem(ACTIVE_KEY, JSON.stringify(next));
  await demoRemoveItem(PENDING_KEY);

  return next;
}

export async function resetRevenueSplitToDefault() {
  await demoSetItem(ACTIVE_KEY, JSON.stringify(DEFAULT_REVENUE_SPLIT_CONFIG));
  await demoRemoveItem(PENDING_KEY);
}
