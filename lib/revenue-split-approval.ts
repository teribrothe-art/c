import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  notifyHqFeeChanged,
  notifyShareSplitApplied,
  notifyShareSplitProposal,
} from './revenue-split-notifications';
import {
  adminFeeFieldsEqual,
  configForPartyEdit,
  configsEqual,
  DEFAULT_REVENUE_SPLIT_CONFIG,
  normalizeRevenueSplitConfig,
  shareSplitEqual,
  type RevenueSplitConfig,
  type RevenueSplitParty,
} from './revenue-split-config';

const ACTIVE_KEY = 'hair-diary-revenue-split-active';
const PENDING_KEY = 'hair-diary-revenue-split-pending';

export type RevenueSplitChangeKind = 'share_split';

export type RevenueSplitChangeProposal = {
  id: string;
  changeKind: RevenueSplitChangeKind;
  proposedConfig: RevenueSplitConfig;
  proposedBy: RevenueSplitParty;
  proposedAt: string;
  approvals: Partial<Record<RevenueSplitParty, boolean>>;
  note?: string;
};

const SHARE_APPROVAL_PARTIES: RevenueSplitParty[] = ['store', 'designer'];

function normalizeProposal(raw: RevenueSplitChangeProposal): RevenueSplitChangeProposal {
  return {
    ...raw,
    changeKind: raw.changeKind ?? 'share_split',
  };
}

export function getRequiredShareApprovalParties() {
  return [...SHARE_APPROVAL_PARTIES];
}

/** @deprecated 분배 비율은 디자이너·매장만 승인 */
export function getRequiredApprovalParties() {
  return getRequiredShareApprovalParties();
}

export function isShareProposalFullyApproved(proposal: RevenueSplitChangeProposal) {
  return SHARE_APPROVAL_PARTIES.every((party) => proposal.approvals[party] === true);
}

export function isProposalFullyApproved(proposal: RevenueSplitChangeProposal) {
  return isShareProposalFullyApproved(proposal);
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
    return normalizeProposal(JSON.parse(raw) as RevenueSplitChangeProposal);
  } catch {
    return null;
  }
}

/** 본사(어드민) — 카드·PG·본사 수수료 즉시 적용, 디자이너·매장에는 알림만 */
export async function applyAdminFeeSettings(
  feeDraft: Pick<RevenueSplitConfig, 'cardFeePercent' | 'pgFeePercent' | 'hqFeePercent'>,
): Promise<RevenueSplitConfig> {
  const active = await getActiveRevenueSplitConfig();
  const next = normalizeRevenueSplitConfig({ ...active, ...feeDraft });

  if (adminFeeFieldsEqual(active, next)) {
    throw new Error('변경된 본사 항목이 없습니다.');
  }

  const hqChanged = active.hqFeePercent !== next.hqFeePercent;

  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(next));

  if (hqChanged) {
    await notifyHqFeeChanged(active.hqFeePercent, next.hqFeePercent);
  }

  return next;
}

/** 디자이너·매장 분배 비율 — 양측 최종 승인 후 적용 */
export async function proposeShareSplitChange(
  proposedConfig: RevenueSplitConfig,
  proposedBy: RevenueSplitParty,
  note?: string,
): Promise<RevenueSplitChangeProposal> {
  const active = await getActiveRevenueSplitConfig();
  const merged = configForPartyEdit(proposedBy, proposedConfig, active);

  if (shareSplitEqual(active, merged)) {
    throw new Error('현재 적용 중인 분배 비율과 동일합니다.');
  }

  const existing = await getPendingRevenueSplitProposal();

  if (existing && !isShareProposalFullyApproved(existing)) {
    throw new Error('이미 승인 대기 중인 분배 변경안이 있습니다. 승인을 완료하거나 취소한 뒤 다시 제안하세요.');
  }

  const approvals: Partial<Record<RevenueSplitParty, boolean>> = {};

  if (proposedBy === 'store' || proposedBy === 'designer') {
    approvals[proposedBy] = true;
  }

  const proposal: RevenueSplitChangeProposal = {
    id: `split-${Date.now()}`,
    changeKind: 'share_split',
    proposedConfig: merged,
    proposedBy,
    proposedAt: new Date().toISOString(),
    approvals,
    note,
  };

  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(proposal));
  await notifyShareSplitProposal(proposal);

  return proposal;
}

/** @deprecated proposeShareSplitChange 사용 */
export async function proposeRevenueSplitChange(
  proposedConfig: RevenueSplitConfig,
  proposedBy: RevenueSplitParty,
  note?: string,
) {
  return proposeShareSplitChange(proposedConfig, proposedBy, note);
}

export async function approveRevenueSplitChange(
  party: RevenueSplitParty,
): Promise<{ applied: boolean; proposal: RevenueSplitChangeProposal | null }> {
  if (party === 'admin') {
    throw new Error('본사 수수료는 본사 화면에서 단독 적용합니다. 분배 비율은 디자이너·매장이 승인합니다.');
  }

  const proposal = await getPendingRevenueSplitProposal();

  if (!proposal) {
    return { applied: false, proposal: null };
  }

  if (!SHARE_APPROVAL_PARTIES.includes(party)) {
    throw new Error('승인 권한이 없습니다.');
  }

  const next: RevenueSplitChangeProposal = {
    ...proposal,
    approvals: { ...proposal.approvals, [party]: true },
  };

  if (!isShareProposalFullyApproved(next)) {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next));
    return { applied: false, proposal: next };
  }

  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(next.proposedConfig));
  await AsyncStorage.removeItem(PENDING_KEY);
  await notifyShareSplitApplied(next.proposedConfig);

  return { applied: true, proposal: next };
}

export async function cancelRevenueSplitProposal() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function resetRevenueSplitToDefault() {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(DEFAULT_REVENUE_SPLIT_CONFIG));
  await AsyncStorage.removeItem(PENDING_KEY);
}
