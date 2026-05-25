import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchCustomerPaymentEntries,
  type CustomerPaymentEntry,
} from '../../lib/customer-payment-entries';
import { getErrorMessage } from '../../lib/errors';
import { BottomTabBar } from '../../src/components/bottom-tab-bar';
import { CustomerPaymentDetailPanel } from '../../src/components/customer-payment-detail-panel';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll('-', '.');
}

function listBadgeStyle(tone: CustomerPaymentEntry['statusTone']) {
  if (tone === 'paid') {
    return { box: styles.badgePaid, text: styles.badgePaidText };
  }

  if (tone === 'done') {
    return { box: styles.badgeDone, text: styles.badgeDoneText };
  }

  return { box: styles.badgePending, text: styles.badgePendingText };
}

export default function CustomerPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const [entries, setEntries] = useState<CustomerPaymentEntry[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    fetchCustomerPaymentEntries()
      .then((next) => {
        setEntries(next);
        setErrorMessage('');
        setSelectedTreatmentId((current) => {
          if (current && next.some((entry) => entry.treatment.id === current)) {
            return current;
          }

          if (select && next.some((entry) => entry.treatment.id === select)) {
            return select;
          }

          const firstPending = next.find((entry) => entry.canPay);
          return firstPending?.treatment.id ?? next[0]?.treatment.id ?? null;
        });
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '결제 내역을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [select]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.treatment.id === selectedTreatmentId) ?? null,
    [entries, selectedTreatmentId],
  );

  const pendingCount = entries.filter((entry) => entry.canPay).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>시술별 결제·영수증</Text>
          {pendingCount > 0 ? (
            <Text style={styles.subtitle}>결제 필요 {pendingCount}건 · 시술을 선택하세요</Text>
          ) : (
            <Text style={styles.subtitle}>시술을 선택해 금액과 영수증을 확인하세요</Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: selectedEntry ? insets.bottom + 280 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="💳"
            title="결제·영수증 내역이 없어요"
            subtitle="시술 결제 요청 또는 결제 완료 후 여기에 표시됩니다"
          />
        ) : (
          entries.map((entry) => {
            const badge = listBadgeStyle(entry.statusTone);
            const selected = entry.treatment.id === selectedTreatmentId;
            const date = entry.sortDate || entry.treatment.treatment_date;

            return (
              <Pressable
                key={entry.treatment.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedTreatmentId(entry.treatment.id)}
                style={({ pressed }) => [
                  styles.card,
                  selected && styles.cardSelected,
                  pressed && styles.cardPressed,
                ]}>
                <View style={styles.cardTop}>
                  <Text style={styles.date}>{formatDate(date)}</Text>
                  <View style={[styles.badge, badge.box]}>
                    <Text style={[styles.badgeText, badge.text]}>{entry.statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.designer}>{entry.treatment.designer_name || '디자이너'}</Text>
                <Text style={styles.treatmentTitle}>{entry.treatment.treatment_title}</Text>
                <Text style={styles.amount}>{entry.amount.toLocaleString('ko-KR')}원</Text>
                {selected ? <Text style={styles.selectedHint}>▼ 금액·영수증 확인 중</Text> : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selectedEntry ? (
        <View style={[styles.detailDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <CustomerPaymentDetailPanel
            entry={selectedEntry}
            onPay={() => router.push(`/payment/${selectedEntry.treatment.id}`)}
            onReceipt={() => {
              if (selectedEntry.receiptPaymentId) {
                router.push(`/payment/receipt/${selectedEntry.receiptPaymentId}`);
              }
            }}
            onViewTreatment={() => router.push(`/treatment/${selectedEntry.treatment.id}`)}
          />
        </View>
      ) : null}

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: { height: 44, justifyContent: 'center', width: 44 },
  backText: { color: '#1A1A2E', fontSize: 36 },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  title: { color: '#1A1A2E', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#6B6B7B', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { width: 44 },
  content: { gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  cardSelected: {
    borderColor: CORAL,
    borderWidth: 2,
  },
  cardPressed: { opacity: 0.9 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: '#6B6B7B', fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgePending: { backgroundColor: '#FFF4E0' },
  badgePendingText: { color: '#FFB627', fontSize: 11, fontWeight: '800' },
  badgePaid: { backgroundColor: '#E8FAF7' },
  badgePaidText: { color: MINT, fontSize: 11, fontWeight: '800' },
  badgeDone: { backgroundColor: '#EEEEF4' },
  badgeDoneText: { color: '#6B6B7B', fontSize: 11, fontWeight: '800' },
  badgeText: {},
  designer: { color: '#1A1A2E', fontSize: 16, fontWeight: '800' },
  treatmentTitle: { color: '#6B6B7B', fontSize: 14, fontWeight: '600' },
  amount: { color: CORAL, fontSize: 18, fontWeight: '900', marginTop: 4 },
  selectedHint: {
    color: CORAL,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  detailDock: {
    backgroundColor: '#FAFAFC',
    borderTopColor: '#E8E8F0',
    borderTopWidth: 1,
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    bottom: 56,
  },
  error: { color: CORAL, fontSize: 14, textAlign: 'center' },
});
