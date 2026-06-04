import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { UserRole } from '../../lib/auth';
import { getCurrentUser } from '../../lib/auth';
import { formatAmount } from '../../lib/currency-input';
import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import {
  adminFeeFieldsEqual,
  calculateRevenueSplit,
  CARD_COMPANY_AVERAGE_FEE_PERCENT,
  configForPartyEdit,
  formatRevenueSplitSummary,
  normalizeRevenueSplitConfig,
  REVENUE_SPLIT_PARTY_LABELS,
  shareSplitEqual,
  type RevenueSplitParty,
} from '../../lib/revenue-split-config';
import {
  applyAdminFeeSettings,
  approveRevenueSplitChange,
  cancelRevenueSplitProposal,
  getActiveRevenueSplitConfig,
  getPendingRevenueSplitProposal,
  getRequiredShareApprovalParties,
  isProposalFullyApproved,
  proposeShareSplitChange,
  type RevenueSplitChangeProposal,
} from '../../lib/revenue-split-approval';
import { colors } from '../../lib/theme';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { DesignerBottomTabBar } from '../components/designer-bottom-tab-bar';
import { RevenueSplitDraftActions } from '../components/revenue-split-draft-actions';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';

const SAMPLE_AMOUNT = 500_000;

const PARTY_ROLE: Record<RevenueSplitParty, UserRole> = {
  admin: 'admin',
  store: 'store',
  designer: 'designer',
};

const BACK_LABEL: Record<RevenueSplitParty, string> = {
  admin: '‹ 본사',
  store: '‹ 매장',
  designer: '‹ 홈',
};

type Props = {
  party: RevenueSplitParty;
};

function PercentField({
  label,
  hint,
  value,
  onChange,
  editable = true,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {editable ? (
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={value}
        />
      ) : (
        <View style={styles.readOnlyValue}>
          <Text style={styles.readOnlyText}>{value}%</Text>
        </View>
      )}
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function BottomTabBar({ party }: { party: RevenueSplitParty }) {
  if (party === 'admin') {
    return <AdminBottomTabBar />;
  }

  if (party === 'store') {
    return <StoreBottomTabBar />;
  }

  return <DesignerBottomTabBar />;
}

export function RevenueSplitEditorScreen({ party }: Props) {
  const insets = useSafeAreaInsets();
  const isAdmin = party === 'admin';
  const [active, setActive] = useState<Awaited<ReturnType<typeof getActiveRevenueSplitConfig>> | null>(
    null,
  );
  const [pending, setPending] = useState<RevenueSplitChangeProposal | null>(null);
  const [cardFee, setCardFee] = useState('');
  const [pgFee, setPgFee] = useState('');
  const [hqFee, setHqFee] = useState('');
  const [designerShare, setDesignerShare] = useState('');
  const [storeShare, setStoreShare] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then((user) => {
        if (!user || user.role !== PARTY_ROLE[party]) {
          router.replace('/');
        }
      });
    }, [party]),
  );

  const applyDraftToFields = useCallback((draft: Awaited<ReturnType<typeof getActiveRevenueSplitConfig>>) => {
    setCardFee(String(draft.cardFeePercent));
    setPgFee(String(draft.pgFeePercent));
    setHqFee(String(draft.hqFeePercent));
    setDesignerShare(String(draft.designerSharePercent));
    setStoreShare(String(draft.storeSharePercent));
  }, []);

  const load = useCallback(async () => {
    const [activeConfig, pendingProposal] = await Promise.all([
      getActiveRevenueSplitConfig(),
      getPendingRevenueSplitProposal(),
    ]);

    setActive(activeConfig);
    setPending(pendingProposal);

    const draft = pendingProposal?.proposedConfig ?? activeConfig;
    applyDraftToFields(draft);
  }, [applyDraftToFields]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const draftConfig = normalizeRevenueSplitConfig({
    cardFeePercent: Number(cardFee),
    pgFeePercent: Number(pgFee),
    hqFeePercent: Number(hqFee),
    designerSharePercent: Number(designerShare),
    storeSharePercent: Number(storeShare),
  });

  const effectiveConfig = active
    ? configForPartyEdit(party, draftConfig, active)
    : draftConfig;

  const sample = calculateRevenueSplit(SAMPLE_AMOUNT, effectiveConfig);

  const hasAdminFeeChanges = Boolean(active && !adminFeeFieldsEqual(effectiveConfig, active));
  const hasShareChanges = Boolean(active && !shareSplitEqual(effectiveConfig, active));

  const matchesPendingProposal = Boolean(
    pending && shareSplitEqual(effectiveConfig, pending.proposedConfig),
  );

  const canRequestShare = Boolean(
    active && hasShareChanges && !matchesPendingProposal,
  );

  const canCancelShare = Boolean(hasShareChanges || pending);

  const resetDraftToActive = useCallback(() => {
    if (active) {
      applyDraftToFields(active);
    }
  }, [active, applyDraftToFields]);

  const handleApplyAdminFees = async () => {
    if (!active || !isAdmin || !hasAdminFeeChanges) {
      return;
    }

    setIsSaving(true);

    try {
      await applyAdminFeeSettings({
        cardFeePercent: effectiveConfig.cardFeePercent,
        pgFeePercent: effectiveConfig.pgFeePercent,
        hqFeePercent: effectiveConfig.hqFeePercent,
      });
      showSuccessAlert('본사 수수료·결제 수수료가 적용되었습니다. 디자이너·매장에 알림을 보냈습니다.');
      await load();
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '본사 수수료 적용에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestShareApproval = async () => {
    if (!active || !canRequestShare) {
      return;
    }

    setIsSaving(true);

    try {
      if (pending && !shareSplitEqual(effectiveConfig, pending.proposedConfig)) {
        await cancelRevenueSplitProposal();
      }

      await proposeShareSplitChange(effectiveConfig, party);
      showSuccessAlert('분배 비율 승인을 요청했습니다. 디자이너·매장 최종 승인 후 반영됩니다.');
      await load();
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '승인 요청에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!canCancelShare) {
      return;
    }

    const hadPending = Boolean(pending);
    setIsSaving(true);

    try {
      if (hadPending) {
        await cancelRevenueSplitProposal();
      }

      resetDraftToActive();
      await load();
      showSuccessAlert(hadPending ? '분배 비율 승인 대기를 취소했습니다.' : '변경 내용을 취소했습니다.');
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '취소 처리에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (approvalParty: RevenueSplitParty) => {
    setIsSaving(true);

    try {
      const result = await approveRevenueSplitChange(approvalParty);

      if (result.applied) {
        showSuccessAlert('디자이너·매장 승인이 완료되어 분배 비율이 적용되었습니다.');
      } else {
        showSuccessAlert(`${REVENUE_SPLIT_PARTY_LABELS[approvalParty]} 승인이 반영되었습니다.`);
      }

      await load();
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '승인 처리에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const partyApproved = pending?.approvals[party] === true;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{BACK_LABEL[party]}</Text>
        </Pressable>

        <Text style={styles.title}>수수료 구조</Text>
        <Text style={styles.subtitle}>
          카드사·PG 수수료를 각각 제외한 뒤 본사·디자이너·매장으로 나눕니다. 본사 수수료(
          {CARD_COMPANY_AVERAGE_FEE_PERCENT}% 카드 평균 기준)는 본사에서만 변경하며 디자이너·매장에는
          알림만 전송됩니다. 디자이너·매장 분배 비율은 양측 최종 승인 후 반영됩니다.
        </Text>

        {active ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeLabel}>현재 적용</Text>
            <Text style={styles.activeSummary}>{formatRevenueSplitSummary(active)}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>본사 항목 {isAdmin ? '(단독 수정)' : '(조회만)'}</Text>
          <PercentField
            editable={isAdmin}
            hint="국내 카드사 가맹점 평균 — 매출에서 먼저 차감"
            label="카드 수수료 (%)"
            value={cardFee}
            onChange={setCardFee}
          />
          <PercentField
            editable={isAdmin}
            hint="결제대행(PG) 수수료 — 카드사 다음 차감"
            label="PG 수수료 (%)"
            value={pgFee}
            onChange={setPgFee}
          />
          <PercentField
            editable={isAdmin}
            hint="총 매출 기준 · 변경 시 디자이너·매장에 알림"
            label="본사 수수료 (%)"
            value={hqFee}
            onChange={setHqFee}
          />
          {isAdmin ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSaving || !hasAdminFeeChanges}
              onPress={() => void handleApplyAdminFees()}
              style={({ pressed }) => [
                styles.applyAdminButton,
                (isSaving || !hasAdminFeeChanges) && styles.buttonDisabled,
                pressed && hasAdminFeeChanges && !isSaving && styles.pressed,
              ]}>
              <Text style={styles.applyAdminButtonText}>본사 수수료 적용</Text>
            </Pressable>
          ) : (
            <Text style={styles.readOnlyNotice}>
              본사 수수료는 본사에서만 변경할 수 있습니다. 변경 시 알림을 받습니다.
            </Text>
          )}

          <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>디자이너 · 매장 분배</Text>
          <PercentField
            editable
            label="디자이너 분배 (%)"
            value={designerShare}
            onChange={setDesignerShare}
          />
          <PercentField editable label="매장 분배 (%)" value={storeShare} onChange={setStoreShare} />
          <RevenueSplitDraftActions
            canCancel={canCancelShare}
            canRequest={canRequestShare}
            isSaving={isSaving}
            onCancel={() => void handleCancel()}
            onRequest={() => void handleRequestShareApproval()}
            requestLabel="분배 비율 승인 요청"
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>시뮬레이션 (시술 {formatAmount(SAMPLE_AMOUNT)})</Text>
          <BreakdownRow label="매출" value={formatAmount(sample.grossAmount)} />
          <BreakdownRow
            label={`카드 수수료 (${effectiveConfig.cardFeePercent}%)`}
            value={`-${formatAmount(sample.cardFeeAmount)}`}
          />
          <BreakdownRow
            label={`PG 수수료 (${effectiveConfig.pgFeePercent}%)`}
            value={`-${formatAmount(sample.pgFeeAmount)}`}
          />
          <BreakdownRow
            label={`본사 (${effectiveConfig.hqFeePercent}%)`}
            value={`-${formatAmount(sample.hqFeeAmount)}`}
          />
          <BreakdownRow
            label={`디자이너 (${effectiveConfig.designerSharePercent}%)`}
            value={formatAmount(sample.designerPayout)}
          />
          <BreakdownRow
            label={`매장 (${effectiveConfig.storeSharePercent}%)`}
            value={formatAmount(sample.storePayout)}
          />
        </View>

        {pending ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>분배 비율 승인 대기</Text>
            <Text style={styles.pendingMeta}>
              제안: {REVENUE_SPLIT_PARTY_LABELS[pending.proposedBy]} · 디자이너{' '}
              {pending.proposedConfig.designerSharePercent}% · 매장{' '}
              {pending.proposedConfig.storeSharePercent}%
            </Text>
            {getRequiredShareApprovalParties().map((approvalParty) => {
              const approved = pending.approvals[approvalParty] === true;
              const isSelf = approvalParty === party;

              return (
                <View key={approvalParty} style={styles.approvalRow}>
                  <Text style={styles.approvalLabel}>
                    {REVENUE_SPLIT_PARTY_LABELS[approvalParty]} {approved ? '✓' : '대기'}
                  </Text>
                  {!approved && isSelf ? (
                    <Pressable
                      disabled={isSaving}
                      onPress={() => void handleApprove(approvalParty)}
                      style={({ pressed }) => [styles.approveButton, pressed && styles.pressed]}>
                      <Text style={styles.approveButtonText}>승인</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
            {isProposalFullyApproved(pending) ? (
              <Text style={styles.pendingDone}>모든 승인 완료 — 적용됨</Text>
            ) : null}
            {!partyApproved && pending.proposedBy !== party && (party === 'store' || party === 'designer') ? (
              <Text style={styles.pendingHint}>
                {REVENUE_SPLIT_PARTY_LABELS[party]} 최종 승인은 위 「승인」 또는 변경 후 「분배 비율 승인
                요청」으로 진행할 수 있습니다.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <BottomTabBar party={party} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 6,
  },
  backText: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 14,
    marginTop: 6,
  },
  activeCard: {
    backgroundColor: '#F0EBFF',
    borderColor: '#D8CCFF',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 12,
    padding: 12,
  },
  activeLabel: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '800',
  },
  activeSummary: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  sectionHeading: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeadingSpaced: {
    marginTop: 4,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  fieldHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyValue: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '700',
  },
  readOnlyNotice: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  applyAdminButton: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 14,
  },
  applyAdminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 14,
    padding: 14,
  },
  previewTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  pendingTitle: {
    color: '#92400E',
    fontSize: 15,
    fontWeight: '900',
  },
  pendingMeta: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  pendingHint: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  approvalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approvalLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  approveButtonText: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '800',
  },
  pendingDone: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
});
