import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert, showSuccessAlert, showWarningAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import {
  calculatePayout,
  completeCustomerPayment,
  isTossConfigured,
  PLATFORM_FEE_RATE,
} from '../../lib/payments';
import { getPaymentStatusLabel, normalizePaymentStatus } from '../../lib/payment-status';
import { colors, disabledButtonStyle } from '../../lib/theme';
import { getTreatmentById, Treatment } from '../../lib/treatments';
import { LoadingState } from '../../src/components/loading-state';

function formatDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '-';
}

export default function CustomerPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setErrorMessage('결제 정보를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    getTreatmentById(id)
      .then(({ user, treatment: nextTreatment }) => {
        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (!nextTreatment) {
          setErrorMessage('시술 기록을 찾을 수 없습니다.');
          return;
        }

        const status = normalizePaymentStatus(nextTreatment.payment_status);

        if (status !== 'payment_requested') {
          setErrorMessage('결제 요청된 시술만 결제할 수 있습니다.');
          return;
        }

        setTreatment(nextTreatment);
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePay = async () => {
    if (!treatment || !id) {
      return;
    }

    try {
      setIsPaying(true);

      if (isTossConfigured) {
        showWarningAlert(
          '토스페이먼츠 결제창 연동은 서버 승인 API와 함께 설정됩니다. 지금은 데모 결제로 에스크로 보관을 시뮬레이션합니다.',
          '연동 준비 중',
        );
      }

      await completeCustomerPayment(id, `demo-${Date.now()}`);
      showSuccessAlert(
        '결제가 완료되었습니다. 금액은 에스크로에 보관되며, 디자이너 피드백 완료 후 정산됩니다.',
        () => router.replace('/home'),
      );
    } catch (error) {
      showErrorAlert(getErrorMessage(error), '결제 실패');
    } finally {
      setIsPaying(false);
    }
  };

  const amount = treatment?.price ?? 0;
  const payout = calculatePayout(amount);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>시술 결제</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !treatment ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{errorMessage || '결제 정보가 없습니다.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.flowCard}>
              <Text style={styles.flowTitle}>결제 진행 순서</Text>
              <Text style={styles.flowStep}>1. 시술 완료 (오프라인)</Text>
              <Text style={styles.flowStep}>2. 디자이너 결제 요청</Text>
              <Text style={styles.flowStepHighlight}>3. 고객 결제 → 에스크로 보관</Text>
              <Text style={styles.flowStep}>4. 디자이너 피드백 입력</Text>
              <Text style={styles.flowStep}>5. 수수료 차감 후 디자이너 정산</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.badge}>{getPaymentStatusLabel(treatment.payment_status)}</Text>
              <Text style={styles.treatmentTitle}>{treatment.treatment_title}</Text>
              <Text style={styles.meta}>
                {formatDate(treatment.treatment_date)} · {treatment.designer_name}
              </Text>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>결제 금액</Text>
                <Text style={styles.amount}>{amount.toLocaleString('ko-KR')}원</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>플랫폼 수수료 ({Math.round(PLATFORM_FEE_RATE * 100)}%)</Text>
                <Text style={styles.rowValue}>{payout.platformFee.toLocaleString('ko-KR')}원</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>디자이너 정산 예정</Text>
                <Text style={styles.rowValueMint}>
                  {payout.designerPayout.toLocaleString('ko-KR')}원
                </Text>
              </View>
            </View>

            <View style={styles.escrowBox}>
              <Text style={styles.escrowTitle}>에스크로 안내</Text>
              <Text style={styles.escrowText}>
                결제 즉시 디자이너에게 송금되지 않습니다. 피드백 입력이 완료된 뒤 정산됩니다.
              </Text>
            </View>

            <Pressable
              disabled={isPaying}
              onPress={handlePay}
              style={({ pressed }) => [
                styles.payButton,
                isPaying && styles.payButtonDisabled,
                pressed && !isPaying && styles.payButtonPressed,
              ]}>
              {isPaying ? (
                <View style={styles.payingRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.payButtonText}>토스 결제창 연결 중...</Text>
                </View>
              ) : (
                <Text style={styles.payButtonText}>
                  {isTossConfigured ? '결제하기 (토스페이먼츠)' : '결제하기'}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 40,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  flowCard: {
    backgroundColor: colors.lightPurple,
    borderRadius: 12,
    gap: 6,
    padding: 16,
  },
  flowTitle: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  flowStep: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  flowStepHighlight: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 12,
    padding: 18,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lightCoral,
    borderRadius: 999,
    color: colors.coral,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  treatmentTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowValueMint: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '800',
  },
  amount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  escrowBox: {
    backgroundColor: '#EFEFF4',
    borderRadius: 12,
    gap: 8,
    padding: 16,
  },
  escrowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  escrowText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    paddingVertical: 17,
  },
  payButtonDisabled: {
    ...disabledButtonStyle,
  },
  payButtonPressed: {
    opacity: 0.88,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  payingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
