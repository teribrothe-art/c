import { router, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { getDesignerTreatments, Treatment } from '../../lib/treatments';

type PaymentStatus = NonNullable<Treatment['payment_status']>;

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function getInitial(name?: string | null) {
  return name?.trim().slice(0, 1) || '?';
}

function isCurrentMonth(date: string) {
  const treatmentDate = new Date(`${date}T00:00:00`);
  const now = new Date();
  return (
    treatmentDate.getFullYear() === now.getFullYear() &&
    treatmentDate.getMonth() === now.getMonth()
  );
}

function getStatusMeta(status?: PaymentStatus | null) {
  if (status === 'completed') {
    return { label: '정산 완료', style: styles.completedBadge, textStyle: styles.completedBadgeText };
  }

  if (status === 'feedback_required') {
    return { label: '정산 대기', style: styles.requiredBadge, textStyle: styles.requiredBadgeText };
  }

  return { label: '결제 대기', style: styles.pendingBadge, textStyle: styles.pendingBadgeText };
}

function ClientTreatmentCard({ onPress, treatment }: { onPress: () => void; treatment: Treatment }) {
  const status = getStatusMeta(treatment.payment_status);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.clientCard, pressed && styles.clientCardPressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(treatment.customer_name)}</Text>
      </View>
      <View style={styles.clientInfo}>
        <View style={styles.cardTopRow}>
          <Text style={styles.customerName}>{treatment.customer_name || '고객'}</Text>
          <View style={[styles.statusBadge, status.style]}>
            <Text style={[styles.statusText, status.textStyle]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.treatmentMeta}>
          {formatDate(treatment.treatment_date)} · {treatment.treatment_type}
        </Text>
        <Text style={styles.treatmentTitle}>{treatment.treatment_title}</Text>
        {typeof treatment.price === 'number' && (
          <Text style={styles.priceText}>{treatment.price.toLocaleString('ko-KR')}원</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function DesignerClientsScreen() {
  const insets = useSafeAreaInsets();
  const detailRouter = useRouter();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const { user, treatments: nextTreatments } = await getDesignerTreatments();

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role !== 'designer') {
          router.replace('/home');
          return;
        }

        setTreatments(nextTreatments);
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : '고객 시술을 불러오지 못했습니다.';
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      monthCount: treatments.filter((treatment) => isCurrentMonth(treatment.treatment_date)).length,
      waitingCount: treatments.filter(
        (treatment) => treatment.payment_status === 'feedback_required',
      ).length,
    };
  }, [treatments]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>내 고객들</Text>
          <Pressable style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>이번 달 시술</Text>
            <Text style={styles.summaryValue}>{summary.monthCount}건</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>정산 대기</Text>
            <Text style={[styles.summaryValue, styles.waitingValue]}>{summary.waitingCount}건</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#FF5A5F" />
            <Text style={styles.stateText}>고객 시술을 불러오는 중...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>고객 목록을 불러오지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : treatments.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>아직 고객 시술이 없어요</Text>
            <Text style={styles.stateText}>시술 기록이 생기면 이곳에 표시됩니다.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {treatments.map((treatment) => (
              <ClientTreatmentCard
                key={treatment.id}
                onPress={() => detailRouter.push(`/designer/treatment/${treatment.id}`)}
                treatment={treatment}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 30,
    fontWeight: '800',
  },
  notificationButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationIcon: {
    fontSize: 24,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
  },
  waitingValue: {
    color: '#FF5A5F',
  },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#EFEFF4',
  },
  list: {
    gap: 14,
  },
  clientCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  clientCardPressed: {
    opacity: 0.82,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#FFD4D5',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#FF5A5F',
    fontSize: 18,
    fontWeight: '900',
  },
  clientInfo: {
    flex: 1,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
  treatmentMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  treatmentTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  priceText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  completedBadge: {
    backgroundColor: '#CCF2EC',
  },
  completedBadgeText: {
    color: '#00C2A8',
  },
  requiredBadge: {
    backgroundColor: '#FFD4D5',
  },
  requiredBadgeText: {
    color: '#FF5A5F',
  },
  pendingBadge: {
    backgroundColor: '#FFF0C7',
  },
  pendingBadgeText: {
    color: '#FFB627',
  },
  stateBox: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
