import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount } from '../../lib/currency-input';
import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import {
  calculateRevenueSplit,
  CARD_COMPANY_AVERAGE_FEE_PERCENT,
  formatRevenueSplitSummary,
  normalizeRevenueSplitConfig,
  REVENUE_SPLIT_PARTY_LABELS,
  type RevenueSplitParty,
} from '../../lib/revenue-split-config';
import {
  approveRevenueSplitChange,
  cancelRevenueSplitProposal,
  getActiveRevenueSplitConfig,
  getPendingRevenueSplitProposal,
  getRequiredApprovalParties,
  isProposalFullyApproved,
  type RevenueSplitChangeProposal,
} from '../../lib/revenue-split-approval';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { AdminBottomTabBar } from '../../src/components/admin-bottom-tab-bar';

const SAMPLE_AMOUNT = 500_000;

function PercentField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export default function AdminRevenueSplitScreen() {
  useOrgRoleGuard('admin');
  const insets = useSafeAreaInsets();
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

  const load = useCallback(async () => {
    const [activeConfig, pendingProposal] = await Promise.all([
      getActiveRevenueSplitConfig(),
      getPendingRevenueSplitProposal(),
    ]);

    setActive(activeConfig);
    setPending(pendingProposal);

    const draft = pendingProposal?.proposedConfig ?? activeConfig;
    setCardFee(String(draft.cardFeePercent));
    setPgFee(String(draft.pgFeePercent));
    setHqFee(String(draft.hqFeePercent));
    setDesignerShare(String(draft.designerSharePercent));
    setStoreShare(String(draft.storeSharePercent));
  }, []);

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

  const sample = calculateRevenueSplit(SAMPLE_AMOUNT, draftConfig);

  const handleApprove = async (party: RevenueSplitParty) => {
    setIsSaving(true);

    try {
      const result = await approveRevenueSplitChange(party);

      if (result.applied) {
        showSuccessAlert('상호 승인이 완료되어 새 비율이 적용되었습니다.');
      } else {
        showSuccessAlert(`${REVENUE_SPLIT_PARTY_LABELS[party]} 승인이 반영되었습니다.`);
      }

      await load();
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '승인 처리에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    await cancelRevenueSplitProposal();
    await load();
    showSuccessAlert('승인 대기 변경안을 취소했습니다.');
  };

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
          <Text style={styles.backText}>‹ 본사</Text>
        </Pressable>

        <Text style={styles.title}>수수료 구조</Text>
        <Text style={styles.subtitle}>
          카드사·PG 수수료를 각각 제외한 뒤 본사·디자이너·매장으로 나눕니다. 카드사 수수료는 국내
          평균({CARD_COMPANY_AVERAGE_FEE_PERCENT}%)을 기본값으로 적용합니다. 비율 변경은 본사·매장·
          디자이너 상호 승인 후 반영됩니다.
        </Text>

        {active ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeLabel}>현재 적용</Text>
            <Text style={styles.activeSummary}>{formatRevenueSplitSummary(active)}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <PercentField
            hint="국내 카드사 가맹점 평균 — 매출에서 먼저 차감"
            label="카드 수수료 (%)"
            value={cardFee}
            onChange={setCardFee}
          />
          <PercentField
            hint="결제대행(PG) 수수료 — 카드사 다음 차감"
            label="PG 수수료 (%)"
            value={pgFee}
            onChange={setPgFee}
          />
          <PercentField
            hint="총 매출 기준"
            label="본사 수수료 (%)"
            value={hqFee}
            onChange={setHqFee}
          />
          <PercentField label="디자이너 분배 (%)" value={designerShare} onChange={setDesignerShare} />
          <PercentField label="매장 분배 (%)" value={storeShare} onChange={setStoreShare} />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>시뮬레이션 (시술 {formatAmount(SAMPLE_AMOUNT)})</Text>
          <BreakdownRow label="매출" value={formatAmount(sample.grossAmount)} />
          <BreakdownRow
            label={`카드 수수료 (${draftConfig.cardFeePercent}%)`}
            value={`-${formatAmount(sample.cardFeeAmount)}`}
          />
          <BreakdownRow
            label={`PG 수수료 (${draftConfig.pgFeePercent}%)`}
            value={`-${formatAmount(sample.pgFeeAmount)}`}
          />
          <BreakdownRow label={`본사 (${draftConfig.hqFeePercent}%)`} value={`-${formatAmount(sample.hqFeeAmount)}`} />
          <BreakdownRow
            label={`디자이너 (${draftConfig.designerSharePercent}%)`}
            value={formatAmount(sample.designerPayout)}
          />
          <BreakdownRow
            label={`매장 (${draftConfig.storeSharePercent}%)`}
            value={formatAmount(sample.storePayout)}
          />
        </View>

        {pending ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>승인 대기</Text>
            <Text style={styles.pendingMeta}>
              제안: {REVENUE_SPLIT_PARTY_LABELS[pending.proposedBy]} ·{' '}
              {formatRevenueSplitSummary(pending.proposedConfig)}
            </Text>
            {getRequiredApprovalParties().map((party) => {
              const approved = pending.approvals[party] === true;

              return (
                <View key={party} style={styles.approvalRow}>
                  <Text style={styles.approvalLabel}>
                    {REVENUE_SPLIT_PARTY_LABELS[party]} {approved ? '✓' : '대기'}
                  </Text>
                  {!approved ? (
                    <Pressable
                      disabled={isSaving}
                      onPress={() => void handleApprove(party)}
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
            <Pressable onPress={() => void handleCancel()} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>변경안 취소</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <AdminBottomTabBar />
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
  cancelLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cancelLinkText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
