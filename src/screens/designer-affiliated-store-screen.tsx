import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '../../lib/auth';
import {
  calculateTreatmentRevenueSplit,
  getStoreDesignerRevenueSplitForDesigner,
  summarizeDesignerStoreSplitForMonth,
  type StoreDesignerRevenueSplit,
  type TreatmentRevenueSplitBreakdown,
} from '../../lib/designer-store-revenue-split';
import { getErrorMessage } from '../../lib/errors';
import { navigateBackOrReplace } from '../../lib/navigation';
import { calculatePaymentFees } from '../../lib/payment-fees';
import { formatStoreRegionLine } from '../../lib/org-store-affiliation';
import { fetchDesignerLedger } from '../../lib/services/designer-ledger-service';
import { colors } from '../../lib/theme';
import { DesignerBottomTabBar } from '../components/designer-bottom-tab-bar';
import { LoadingState } from '../components/loading-state';

function formatWon(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function SplitBar({
  storePercent,
  designerPercent,
}: {
  storePercent: number;
  designerPercent: number;
}) {
  return (
    <View style={styles.splitBarTrack}>
      <View style={[styles.splitBarStore, { flex: storePercent }]}>
        <Text style={styles.splitBarStoreText}>매장 {storePercent}%</Text>
      </View>
      <View style={[styles.splitBarDesigner, { flex: designerPercent }]}>
        <Text style={styles.splitBarDesignerText}>디자이너 {designerPercent}%</Text>
      </View>
    </View>
  );
}

function BreakdownRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function TreatmentSplitCard({
  title,
  date,
  breakdown,
  onPress,
}: {
  title: string;
  date: string;
  breakdown: TreatmentRevenueSplitBreakdown;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.treatmentCard, pressed && styles.treatmentCardPressed]}>
      <View style={styles.treatmentCardHeader}>
        <Text style={styles.treatmentCardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.treatmentCardDate}>{date.replaceAll('-', '.')}</Text>
      </View>
      <Text style={styles.treatmentCardGross}>시술비 {formatWon(breakdown.grossAmount)}</Text>
      <View style={styles.treatmentSplitRow}>
        <Text style={styles.treatmentSplitStore}>매장 {formatWon(breakdown.storeAmount)}</Text>
        <Text style={styles.treatmentSplitDesigner}>나 {formatWon(breakdown.designerAmount)}</Text>
      </View>
      <Text style={styles.treatmentSplitMeta}>
        플랫폼 {breakdown.platformFeePercent}% · 분배 {breakdown.storeSharePercent}/{breakdown.designerSharePercent}
      </Text>
    </Pressable>
  );
}

export function DesignerAffiliatedStoreScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeRegion, setStoreRegion] = useState('');
  const [split, setSplit] = useState<StoreDesignerRevenueSplit | null>(null);
  const [monthSummary, setMonthSummary] = useState<ReturnType<typeof summarizeDesignerStoreSplitForMonth> | null>(
    null,
  );
  const [recentTreatments, setRecentTreatments] = useState<
    { id: string; title: string; date: string; breakdown: TreatmentRevenueSplitBreakdown }[]
  >([]);

  const load = useCallback(() => {
    setIsLoading(true);

    Promise.resolve()
      .then(async () => {
        const user = await getCurrentUser();

        if (!user || user.role !== 'designer') {
          router.replace('/');
          return;
        }

        const affiliation = getStoreDesignerRevenueSplitForDesigner(user.id);

        if (!affiliation) {
          setErrorMessage('연결된 소속 매장이 없습니다.');
          setSplit(null);
          return;
        }

        setStoreName(affiliation.store.name);
        setStoreRegion(formatStoreRegionLine(affiliation.store));
        setSplit(affiliation.split);

        const ledger = await fetchDesignerLedger();

        if (!ledger) {
          setErrorMessage('시술 데이터를 불러오지 못했습니다.');
          return;
        }

        const monthKey = new Date().toISOString().slice(0, 7);
        const amountEntries = ledger.entries.map((entry) => {
          const payment = entry.payment;
          const gross = payment?.amount ?? entry.treatment.price ?? 0;

          return {
            treatmentId: entry.treatment.id,
            title: entry.treatment.treatment_title ?? entry.treatment.treatment_type ?? '시술',
            treatmentDate: entry.treatment.treatment_date,
            amount: gross,
          };
        });

        setMonthSummary(
          summarizeDesignerStoreSplitForMonth(
            amountEntries.map((item) => ({
              treatmentDate: item.treatmentDate,
              amount: item.amount,
            })),
            affiliation.split,
            monthKey,
          ),
        );

        const recent = amountEntries
          .filter((item) => item.treatmentDate.slice(0, 7) === monthKey)
          .sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate))
          .slice(0, 12)
          .map((item) => ({
            id: item.treatmentId,
            title: item.title,
            date: item.treatmentDate,
            breakdown: calculateTreatmentRevenueSplit(item.amount, affiliation.split),
          }));

        setRecentTreatments(recent);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '소속 매장 정보를 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sampleBreakdown = useMemo(() => {
    if (!split) {
      return null;
    }

    return calculateTreatmentRevenueSplit(200_000, split);
  }, [split]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigateBackOrReplace('/designer/account')} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ 계정</Text>
        </Pressable>

        <Text style={styles.badge}>소속 매장 연동</Text>
        <Text style={styles.title}>{storeName || '소속 매장'}</Text>
        {storeRegion ? <Text style={styles.subtitle}>{storeRegion}</Text> : null}

        {isLoading ? (
          <LoadingState message="매장·분배 정보 불러오는 중..." />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>연동할 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : split && monthSummary && sampleBreakdown ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>시술비 분배 비율</Text>
              <Text style={styles.cardDescription}>
                고객 결제액에서 플랫폼 수수료({split.platformFeePercent}%)를 제외한 금액을 매장·디자이너가
                나눕니다.
              </Text>
              <SplitBar storePercent={split.storeSharePercent} designerPercent={split.designerSharePercent} />
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotStore]} />
                  <Text style={styles.legendText}>매장 {split.storeSharePercent}%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotDesigner]} />
                  <Text style={styles.legendText}>디자이너 {split.designerSharePercent}%</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>예시 (시술비 20만원)</Text>
              <BreakdownRow label="결제 금액" value={formatWon(sampleBreakdown.grossAmount)} />
              <BreakdownRow
                label={`플랫폼 수수료 (${sampleBreakdown.platformFeePercent}%)`}
                value={`- ${formatWon(sampleBreakdown.platformFee)}`}
              />
              <BreakdownRow label="분배 대상" value={formatWon(sampleBreakdown.distributableAmount)} />
              <BreakdownRow
                accent="#0284C7"
                label={`매장 (${sampleBreakdown.storeSharePercent}%)`}
                value={formatWon(sampleBreakdown.storeAmount)}
              />
              <BreakdownRow
                accent={colors.mint}
                label={`디자이너 (${sampleBreakdown.designerSharePercent}%)`}
                value={formatWon(sampleBreakdown.designerAmount)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{monthSummary.monthLabel} 합산</Text>
              <Text style={styles.cardMeta}>완료·진행 시술 {monthSummary.treatmentCount}건 기준</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryTileLabel}>총 시술비</Text>
                  <Text style={styles.summaryTileValue}>{formatWon(monthSummary.grossTotal)}</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryTileLabel}>매장 몫</Text>
                  <Text style={[styles.summaryTileValue, styles.summaryStore]}>
                    {formatWon(monthSummary.storeTotal)}
                  </Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryTileLabel}>내 몫</Text>
                  <Text style={[styles.summaryTileValue, styles.summaryDesigner]}>
                    {formatWon(monthSummary.designerTotal)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>이번 달 시술별 분배</Text>
            {recentTreatments.length === 0 ? (
              <Text style={styles.emptyText}>이번 달 시술 기록이 없습니다.</Text>
            ) : (
              recentTreatments.map((item) => (
                <TreatmentSplitCard
                  key={item.id}
                  breakdown={item.breakdown}
                  date={item.date}
                  title={item.title}
                  onPress={() => router.push(`/designer/treatment/${item.id}`)}
                />
              ))
            )}

            <Text style={styles.footnote}>
              매장 관리자 화면과 동일한 소속 매장·시술 데이터를 기준으로 표시합니다. 실제 정산은 결제·정산
              상태에 따라 달라질 수 있습니다.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backLinkText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '800',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: -6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '900',
  },
  cardDescription: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  splitBarTrack: {
    borderRadius: 12,
    flexDirection: 'row',
    height: 44,
    overflow: 'hidden',
  },
  splitBarStore: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    minWidth: 72,
  },
  splitBarDesigner: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    justifyContent: 'center',
    minWidth: 72,
  },
  splitBarStoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  splitBarDesignerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendDotStore: {
    backgroundColor: '#0284C7',
  },
  legendDotDesigner: {
    backgroundColor: colors.mint,
  },
  legendText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownValue: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryTile: {
    backgroundColor: '#F8F8FC',
    borderRadius: 12,
    flexGrow: 1,
    minWidth: '30%',
    padding: 12,
  },
  summaryTileLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryTileValue: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryStore: {
    color: '#0284C7',
  },
  summaryDesigner: {
    color: colors.mint,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  treatmentCardPressed: {
    opacity: 0.9,
  },
  treatmentCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  treatmentCardTitle: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  treatmentCardDate: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  treatmentCardGross: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  treatmentSplitRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  treatmentSplitStore: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '800',
  },
  treatmentSplitDesigner: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: '800',
  },
  treatmentSplitMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  footnote: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 4,
  },
  emptyText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 8,
    padding: 28,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '900',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
