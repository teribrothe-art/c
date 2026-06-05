import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';
import { formatAmount } from '../../lib/currency-input';
import { getErrorMessage } from '../../lib/errors';
import type { OrgMonthSettlementTotals } from '../../lib/org-month-settlement';
import { formatHqYieldRateLabel } from '../../lib/org-month-settlement';
import { applyActiveHqFeePercent } from '../../lib/revenue-split-approval';
import { calculateRevenueSplit, normalizeRevenueSplitConfig } from '../../lib/revenue-split-config';
import { colors } from '../../lib/theme';
import { RevenuePeriodNavigator } from './revenue-period-navigator';

type HqRevenueSummaryCardProps = {
  totals: OrgMonthSettlementTotals;
  monthCaption: string;
  canPreviousMonth?: boolean;
  canNextMonth?: boolean;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  /** false면 상단 월 이동은 부모 화면에서만 표시 */
  showMonthNavigator?: boolean;
  /** 본사(admin) — 본사 매출 % 단독 조정 */
  editable?: boolean;
  onHqRateApplied?: () => void;
};

type HqRevenueTab = 'yield' | 'revenue';

export function HqRevenueSummaryCard({
  totals,
  monthCaption,
  canPreviousMonth = false,
  canNextMonth = false,
  onPreviousMonth,
  onNextMonth,
  showMonthNavigator = true,
  editable = false,
  onHqRateApplied,
}: HqRevenueSummaryCardProps) {
  const [tab, setTab] = useState<HqRevenueTab>('yield');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [draftHqRate, setDraftHqRate] = useState(String(totals.configuredHqRate));
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setDraftHqRate(String(totals.configuredHqRate));
    setAdjustOpen(false);
  }, [totals.configuredHqRate, totals.monthGrossSales]);

  const draftConfig = useMemo(
    () =>
      normalizeRevenueSplitConfig({
        hqFeePercent: Number(draftHqRate),
      }),
    [draftHqRate],
  );

  const previewSplit = useMemo(
    () => calculateRevenueSplit(totals.monthGrossSales, draftConfig),
    [draftConfig, totals.monthGrossSales],
  );

  const hasDraftChange = draftConfig.hqFeePercent !== totals.configuredHqRate;

  const handleApplyHqRate = async () => {
    setIsApplying(true);

    try {
      await applyActiveHqFeePercent(Number(draftHqRate));
      showSuccessAlert(`본사 매출 ${draftConfig.hqFeePercent}%가 즉시 적용되었습니다.`);
      setAdjustOpen(false);
      onHqRateApplied?.();
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '본사 매출 비율 적용에 실패했습니다.'));
    } finally {
      setIsApplying(false);
    }
  };

  const handleYieldPress = () => {
    setTab('yield');

    if (editable) {
      setAdjustOpen((open) => !open);
    }
  };

  return (
    <View style={styles.card}>
      {showMonthNavigator ? (
        <RevenuePeriodNavigator
          canNext={canNextMonth}
          canPrevious={canPreviousMonth}
          label={`본사 수익률 · ${monthCaption}`}
          onNext={onNextMonth}
          onPrevious={onPreviousMonth}
        />
      ) : (
        <Text style={styles.title}>본사 수익률 · {monthCaption}</Text>
      )}
      <Text style={styles.subtitle}>
        {tab === 'yield'
          ? editable && adjustOpen
            ? '본사 매출 %만 단독 조정 · 카드·PG·디자이너·매장 비율은 유지'
            : `수수료 구조 반영 · 설정 본사 ${totals.configuredHqRate}% (매출 기준)`
          : '총 매출에서 카드·PG·디자이너·매장 분배 후 본사 몫'}
      </Text>

      <View style={styles.heroRow}>
        <Pressable
          accessibilityHint={editable ? '탭하면 본사 매출 비율을 조정합니다' : undefined}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'yield', expanded: adjustOpen }}
          onPress={handleYieldPress}
          style={({ pressed }) => [styles.heroCellWrap, pressed && styles.heroCellPressed]}>
          <View style={[styles.heroBlock, tab === 'yield' && styles.heroBlockActive]}>
            <Text style={[styles.heroLabel, tab === 'yield' && styles.heroLabelActive]}>
              본사 수익률
            </Text>
            <Text style={[styles.heroValue, tab === 'yield' && styles.heroValueActive]}>
              {formatHqYieldRateLabel(totals)}
            </Text>
            {editable && !adjustOpen ? (
              <Text style={styles.heroHint}>탭하여 조정</Text>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'revenue' }}
          onPress={() => {
            setTab('revenue');
            setAdjustOpen(false);
          }}
          style={({ pressed }) => [styles.heroCellWrap, pressed && styles.heroCellPressed]}>
          <View style={[styles.heroBlock, tab === 'revenue' && styles.heroBlockActive]}>
            <Text style={[styles.heroLabel, tab === 'revenue' && styles.heroLabelActive]}>
              본사 수익
            </Text>
            <Text style={[styles.heroValue, tab === 'revenue' && styles.heroValueActive]}>
              {formatAmount(totals.monthHqRevenue)}
            </Text>
          </View>
        </Pressable>
      </View>

      {editable && adjustOpen && tab === 'yield' ? (
        <View style={styles.adjustPanel}>
          <Text style={styles.adjustTitle}>본사 매출 % 단독 조정</Text>
          <View style={styles.adjustInputRow}>
            <TextInput
              editable={!isApplying}
              keyboardType="decimal-pad"
              onChangeText={setDraftHqRate}
              placeholder="4"
              placeholderTextColor="#9CA3AF"
              style={styles.adjustInput}
              value={draftHqRate}
            />
            <Text style={styles.adjustSuffix}>%</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isApplying || !hasDraftChange}
              onPress={() => void handleApplyHqRate()}
              style={({ pressed }) => [
                styles.applyButton,
                (isApplying || !hasDraftChange) && styles.applyButtonDisabled,
                pressed && !isApplying && hasDraftChange && styles.applyButtonPressed,
              ]}>
              <Text style={styles.applyButtonText}>{isApplying ? '적용 중…' : '적용'}</Text>
            </Pressable>
          </View>
          <Text style={styles.adjustPreview}>
            {monthCaption} 본사 수익 예상{' '}
            <Text style={styles.adjustPreviewEmphasis}>
              {formatAmount(previewSplit.hqFeeAmount)}
            </Text>
            {' · '}총 매출 {formatAmount(totals.monthGrossSales)} 기준
          </Text>
        </View>
      ) : null}

      {tab === 'yield' ? (
        <View style={styles.breakdown}>
          <Row label="설정 본사율" value={`${totals.configuredHqRate}%`} />
          <Row label="실효 수익률" value={formatHqYieldRateLabel(totals)} />
          <Row label="총 매출" value={formatAmount(totals.monthGrossSales)} />
        </View>
      ) : (
        <View style={styles.breakdown}>
          <Row label="총 매출" value={formatAmount(totals.monthGrossSales)} />
          <Row label="카드 수수료" value={`-${formatAmount(totals.monthCardFee)}`} />
          <Row label="PG 수수료" value={`-${formatAmount(totals.monthPgFee)}`} />
          <Row label="디자이너 분배" value={formatAmount(totals.monthDesignerPayout)} />
          <Row label="매장 분배" value={formatAmount(totals.monthStoreShare)} />
          <Row label="본사 수익" value={formatAmount(totals.monthHqRevenue)} emphasis />
        </View>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.rowLabelEmphasis]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D7FA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
    padding: 14,
  },
  title: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCellWrap: {
    flex: 1,
  },
  heroCellPressed: {
    opacity: 0.92,
  },
  heroBlock: {
    backgroundColor: '#F7F4FF',
    borderColor: '#F7F4FF',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  heroBlockActive: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  heroLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '700',
  },
  heroLabelActive: {
    color: colors.purple,
  },
  heroValue: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  heroValueActive: {
    color: colors.purple,
  },
  heroHint: {
    color: '#9B8FD9',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  adjustPanel: {
    backgroundColor: '#F7F4FF',
    borderColor: '#DDD6FE',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  adjustTitle: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '900',
  },
  adjustInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  adjustInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D7FA',
    borderRadius: 10,
    borderWidth: 1,
    color: '#1A1A2E',
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  adjustSuffix: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
  },
  applyButton: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  applyButtonDisabled: {
    opacity: 0.45,
  },
  applyButtonPressed: {
    opacity: 0.9,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  adjustPreview: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  adjustPreviewEmphasis: {
    color: colors.purple,
    fontWeight: '900',
  },
  breakdown: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  rowLabelEmphasis: {
    color: '#1A1A2E',
    fontWeight: '800',
  },
  rowValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
  rowValueEmphasis: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '900',
  },
});
