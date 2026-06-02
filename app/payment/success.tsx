import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '../../lib/errors';
import { navigateBackOrReplace } from '../../lib/navigation';
import { parsePaymentReturnFromSearchParams } from '../../lib/payment-return';
import { getPaymentByTreatmentId } from '../../lib/payment-record';
import {
  handleTossPaymentFailure,
  handleTossPaymentSuccess,
} from '../../lib/payments';

export default function PaymentSuccessReturnScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const handled = useRef(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [treatmentId, setTreatmentId] = useState<string | undefined>();

  useEffect(() => {
    if (handled.current) {
      return;
    }

    handled.current = true;

    async function complete() {
      const parsed = parsePaymentReturnFromSearchParams(
        params as Record<string, string | string[] | undefined>,
      );
      const tid = parsed.treatmentId;
      const result = parsed.success;

      if (!tid || !result?.paymentKey || !result.orderId) {
        setErrorMessage('결제 결과를 확인하지 못했습니다. 결제 화면에서 다시 시도해 주세요.');
        return;
      }

      setTreatmentId(tid);

      try {
        await handleTossPaymentSuccess(tid, {
          paymentKey: result.paymentKey,
          orderId: result.orderId,
        });
        setIsSuccess(true);
      } catch (error) {
        await handleTossPaymentFailure(tid).catch(() => undefined);
        setErrorMessage(getErrorMessage(error, '결제에 실패했어요'));
      }
    }

    void complete();
  }, [params]);

  if (isSuccess) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>결제가 완료되었습니다</Text>
        <Text style={styles.successSub}>디자이너 피드백 입력 후 정산됩니다</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            const payment = treatmentId
              ? await getPaymentByTreatmentId(treatmentId)
              : null;

            if (payment?.id) {
              router.replace(`/payment/receipt/${payment.id}`);
              return;
            }

            router.replace('/home');
          }}>
          <Text style={styles.primaryButtonText}>영수증 보기</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/home')}>
          <Text style={styles.secondaryButtonText}>다이어리로</Text>
        </Pressable>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            if (treatmentId) {
              router.replace(`/payment/${treatmentId}`);
              return;
            }

            navigateBackOrReplace('/home');
          }}>
          <Text style={styles.primaryButtonText}>결제 화면으로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#FF5A5F" />
      <Text style={styles.loadingText}>결제를 처리하는 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
    paddingHorizontal: 24,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6B6B7B',
    fontSize: 15,
    marginTop: 16,
  },
  successIcon: {
    alignSelf: 'center',
    backgroundColor: '#00C2A8',
    borderRadius: 40,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    height: 72,
    lineHeight: 72,
    marginBottom: 20,
    textAlign: 'center',
    width: 72,
  },
  successTitle: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSub: {
    color: '#6B6B7B',
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  errorText: {
    color: '#E5484D',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    marginTop: 8,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
