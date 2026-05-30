import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const raw = await AsyncStorage.getItem(ACTIVE_KEY);

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
  const raw = await AsyncStorage.getItem(PENDING_KEY);

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

  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(proposal));

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
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next));
    return { applied: false, proposal: next };
  }

  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(next.proposedConfig));
  await AsyncStorage.removeItem(PENDING_KEY);

  return { applied: true, proposal: next };
}

export async function cancelRevenueSplitProposal() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function resetRevenueSplitToDefault() {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(DEFAULT_REVENUE_SPLIT_CONFIG));
  await AsyncStorage.removeItem(PENDING_KEY);
}
