import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { fetchCustomerPaymentHistory, CustomerPaymentListItem } from '../../lib/customer-payments';
import { getErrorMessage } from '../../lib/errors';
import { BottomTabBar } from '../../src/components/bottom-tab-bar';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const YELLOW = '#FFB627';

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll('-', '.');
}

function badgeStyle(variant: CustomerPaymentListItem['badgeVariant']) {
  if (variant === 'paid') {
    return { box: styles.badgePaid, text: styles.badgePaidText };
  }

  if (variant === 'waiting') {
    return { box: styles.badgeWaiting, text: styles.badgeWaitingText };
  }

  return { box: styles.badgeDone, text: styles.badgeDoneText };
}

export default function CustomerPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CustomerPaymentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    fetchCustomerPaymentHistory()
      .then((next) => {
        setItems(next);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '결제 내역을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>내 결제 내역</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <EmptyState icon="💳" title="결제 내역이 없어요" subtitle="시술 결제 후 여기에 표시됩니다" />
        ) : (
          items.map(({ payment, treatment, badgeLabel, badgeVariant }) => {
            const badge = badgeStyle(badgeVariant);
            const date = payment.paid_at ?? payment.created_at;

            return (
              <Pressable
                key={payment.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/payment/receipt/${payment.id}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.date}>{formatDate(date)}</Text>
                  <View style={[styles.badge, badge.box]}>
                    <Text style={[styles.badgeText, badge.text]}>{badgeLabel}</Text>
                  </View>
                </View>
                <Text style={styles.designer}>{treatment.designer_name || '디자이너'}</Text>
                <Text style={styles.treatmentTitle}>{treatment.treatment_title}</Text>
                <Text style={styles.amount}>{payment.amount.toLocaleString('ko-KR')}원</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
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
  title: { color: '#1A1A2E', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 44 },
  content: { gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 6,
    padding: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: { opacity: 0.88 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: '#6B6B7B', fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgePaid: { backgroundColor: '#E8FAF7' },
  badgePaidText: { color: MINT, fontSize: 11, fontWeight: '800' },
  badgeWaiting: { backgroundColor: '#FFF4E0' },
  badgeWaitingText: { color: YELLOW, fontSize: 11, fontWeight: '800' },
  badgeDone: { backgroundColor: '#EEEEF4' },
  badgeDoneText: { color: '#6B6B7B', fontSize: 11, fontWeight: '800' },
  badgeText: {},
  designer: { color: '#1A1A2E', fontSize: 16, fontWeight: '800' },
  treatmentTitle: { color: '#6B6B7B', fontSize: 14, fontWeight: '600' },
  amount: { color: CORAL, fontSize: 18, fontWeight: '900', marginTop: 4 },
  error: { color: CORAL, fontSize: 14, textAlign: 'center' },
});
