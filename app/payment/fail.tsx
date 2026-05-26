import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { navigateBackOrReplace } from '../../lib/navigation';
import { parsePaymentReturnFromSearchParams } from '../../lib/payment-return';
import { handleTossPaymentFailure } from '../../lib/payments';

export default function PaymentFailReturnScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const handled = useRef(false);
  const [treatmentId, setTreatmentId] = useState<string | undefined>();
  const [message, setMessage] = useState('결제에 실패했습니다.');

  useEffect(() => {
    if (handled.current) {
      return;
    }

    handled.current = true;

    const parsed = parsePaymentReturnFromSearchParams(
      params as Record<string, string | string[] | undefined>,
    );
    const tid = parsed.treatmentId;

    setTreatmentId(tid);
    setMessage(parsed.failure?.message ?? '결제에 실패했습니다.');

    if (tid) {
      void handleTossPaymentFailure(tid);
    }
  }, [params]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>결제 실패</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          if (treatmentId) {
            router.replace(`/payment/${treatmentId}`);
            return;
          }

          navigateBackOrReplace('/home');
        }}>
        <Text style={styles.primaryButtonText}>다시 시도</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.replace('/home')}>
        <Text style={styles.secondaryButtonText}>홈으로</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
    paddingHorizontal: 24,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#6B6B7B',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
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
