import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { getCurrentUser } from '../../../lib/auth';
import { formatAmount } from '../../../lib/currency-input';
import { getErrorMessage } from '../../../lib/errors';
import { getPaymentByTreatmentId, PaymentRecord } from '../../../lib/payment-record';
import { supabase } from '../../../lib/supabase';
import { isDemoAuthMode } from '../../../lib/auth';
import { getTreatmentById, Treatment } from '../../../lib/treatments';
import { LoadingState } from '../../../src/components/loading-state';
import { BottomTabBar } from '../../../src/components/bottom-tab-bar';
import { TAB_BAR_BOTTOM_INSET } from '../../../src/components/role-bottom-tab-bar';

const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

async function getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
  if (isDemoAuthMode || !supabase) {
    const { getTreatments } = await import('../../../lib/treatments');
    const { treatments } = await getTreatments();

    for (const treatment of treatments) {
      const payment = await getPaymentByTreatmentId(treatment.id);

      if (payment?.id === paymentId) {
        return payment;
      }
    }

    return null;
  }

  const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as PaymentRecord | null;
}

function maskCardLast4(paymentKey?: string | null) {
  if (!paymentKey) {
    return '****';
  }

  return paymentKey.slice(-4);
}

export default function PaymentReceiptScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [useWebReceipt, setUseWebReceipt] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setErrorMessage('영수증을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();

        if (!user) {
          router.replace('/');
          return;
        }

        const nextPayment = await getPaymentById(id);

        if (!nextPayment) {
          setErrorMessage('결제 내역이 없습니다.');
          return;
        }

        const { treatment: nextTreatment } = await getTreatmentById(nextPayment.treatment_id);

        if (!mounted) {
          return;
        }

        setPayment(nextPayment);
        setTreatment(nextTreatment);
        setUseWebReceipt(Boolean(nextPayment.receipt_url));
        setErrorMessage('');
      } catch (error) {
        if (mounted) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  const paidAtLabel = useMemo(() => {
    if (!payment?.paid_at) {
      return '-';
    }

    return payment.paid_at.replace('T', ' ').slice(0, 16);
  }, [payment?.paid_at]);

  if (isLoading) {
    return <LoadingState message="영수증 불러오는 중..." />;
  }

  if (errorMessage || !payment) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{errorMessage || '영수증 없음'}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (useWebReceipt && payment.receipt_url) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>영수증</Text>
          <Pressable onPress={() => setUseWebReceipt(false)}>
            <Text style={styles.switch}>앱 영수증</Text>
          </Pressable>
        </View>
        <WebView source={{ uri: payment.receipt_url }} style={styles.webview} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>영수증</Text>
        {payment.receipt_url ? (
          <Pressable onPress={() => setUseWebReceipt(true)}>
            <Text style={styles.switch}>토스 영수증</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_BOTTOM_INSET + insets.bottom }]}>
        <Text style={styles.receiptTitle}>결제 영수증</Text>
        <Text style={styles.merchant}>{treatment?.designer_name || '헤어 다이어리'} · 강남점</Text>

        <View style={styles.block}>
          <Row label="결제 일시" value={paidAtLabel} />
          <Row label="시술 내역" value={treatment?.treatment_title || '-'} />
          <Row label="결제 금액" value={formatAmount(payment.amount)} highlight />
          <Row label="결제 수단" value={`카드 ****${maskCardLast4(payment.toss_payment_key)}`} />
          <Row label="거래 ID" value={payment.toss_payment_key || payment.toss_order_id || '-'} small />
        </View>

        {(payment.fee_amount ?? 0) > 0 ? (
          <Text style={styles.feeNote}>
            플랫폼 수수료 {formatAmount(payment.fee_amount ?? 0)} 포함
          </Text>
        ) : null}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

function Row({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowHighlight, small && styles.rowSmall]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: { color: '#1A1A2E', fontSize: 36, width: 44 },
  headerTitle: { color: '#1A1A2E', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 72 },
  switch: { color: PURPLE, fontSize: 13, fontWeight: '700', width: 72, textAlign: 'right' },
  webview: { flex: 1 },
  content: { padding: 20 },
  receiptTitle: { color: '#1A1A2E', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  merchant: { color: '#6B6B7B', fontSize: 15, fontWeight: '600', marginBottom: 20 },
  block: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 14,
    padding: 18,
  },
  row: { gap: 4 },
  rowLabel: { color: '#6B6B7B', fontSize: 13, fontWeight: '600' },
  rowValue: { color: '#1A1A2E', fontSize: 16, fontWeight: '700' },
  rowHighlight: { color: MINT, fontSize: 20, fontWeight: '900' },
  rowSmall: { fontSize: 12, fontWeight: '600' },
  feeNote: { color: '#9CA3AF', fontSize: 12, marginTop: 16, textAlign: 'center' },
  error: { color: '#FF5A5F', marginBottom: 12 },
  link: { color: PURPLE, fontWeight: '700' },
});
