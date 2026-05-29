import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPaymentByTreatmentId } from '../../lib/payment-record';
import { resolveOrgDesignerAccess } from '../../lib/org-access';
import type { OrgScope } from '../../lib/org-access';
import { resolveCurrentStoreOrgId } from '../../lib/org-store-scope';
import { getCurrentUser } from '../../lib/auth';
import { normalizePaymentStatus } from '../../lib/payment-status';
import { fetchDesignerLedgerForDesignerId } from '../../lib/services/designer-ledger-service';
import { getTreatmentById, type Treatment } from '../../lib/treatments';
import { getErrorMessage } from '../../lib/errors';
import { colors } from '../../lib/theme';
import { LoadingState } from '../components/loading-state';

type Props = {
  scope: OrgScope;
};

function paymentLabel(status: ReturnType<typeof normalizePaymentStatus>) {
  if (status === 'completed') {
    return '정산 완료';
  }

  if (status === 'escrow') {
    return '결제 완료 · 피드백 대기';
  }

  if (status === 'payment_requested') {
    return '결제 요청';
  }

  return '결제 대기';
}

export function OrgTreatmentDetailScreen({ scope }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [designerName, setDesignerName] = useState('');
  const [payout, setPayout] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setErrorMessage('시술 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const user = await getCurrentUser();

      if (!user || user.role !== scope) {
        router.replace('/');
        return;
      }

      const { treatment: loaded } = await getTreatmentById(id);

      if (!loaded?.designer_id) {
        setErrorMessage('시술 기록을 찾을 수 없습니다.');
        setTreatment(null);
        return;
      }

      const storeOrgId = scope === 'store' ? await resolveCurrentStoreOrgId() : undefined;
      const access = resolveOrgDesignerAccess(user.role, loaded.designer_id, storeOrgId);

      if (!access) {
        setErrorMessage('조회 권한이 없습니다.');
        setTreatment(null);
        return;
      }

      setDesignerName(access.designer.name);
      setTreatment(loaded);

      const ledger = await fetchDesignerLedgerForDesignerId(loaded.designer_id);
      const payment =
        ledger?.paymentsByTreatmentId.get(id) ?? (await getPaymentByTreatmentId(id));

      setPayout(payment?.designer_payout ?? payment?.amount ?? null);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '시술 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [id, scope]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (isLoading) {
    return <LoadingState message="불러오는 중..." />;
  }

  if (!treatment) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>시술 상세</Text>
        <Text style={styles.errorText}>{errorMessage || '데이터가 없습니다.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const paymentStatus = normalizePaymentStatus(treatment.payment_status);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ 목록</Text>
        </Pressable>

        <Text style={styles.badge}>{scope === 'store' ? '매장 조회' : '본사 조회'}</Text>
        <Text style={styles.title}>{treatment.treatment_title}</Text>
        <Text style={styles.subtitle}>
          {treatment.customer_name ?? '고객'} · {designerName}
        </Text>

        <View style={styles.card}>
          <Row label="시술일" value={treatment.treatment_date.replaceAll('-', '.')} />
          <Row label="시술 종류" value={treatment.treatment_type} />
          <Row label="결제 상태" value={paymentLabel(paymentStatus)} />
          {typeof treatment.price === 'number' ? (
            <Row label="시술 금액" value={`${treatment.price.toLocaleString('ko-KR')}원`} />
          ) : null}
          {typeof payout === 'number' ? (
            <Row label="정산 예정/완료" value={`${payout.toLocaleString('ko-KR')}원`} />
          ) : null}
        </View>

        {treatment.designer_diagnosis ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>디자이너 진단</Text>
            <Text style={styles.bodyText}>{treatment.designer_diagnosis}</Text>
          </View>
        ) : null}

        {treatment.home_care ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>홈케어</Text>
            <Text style={styles.bodyText}>{treatment.home_care}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  centered: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  backLink: {
    alignSelf: 'flex-start',
  },
  backLinkText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  row: {
    gap: 4,
  },
  rowLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  rowValue: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  bodyText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  errorTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
  },
  errorText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#1A1A2E',
    fontWeight: '800',
  },
});
