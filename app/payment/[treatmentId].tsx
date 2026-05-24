import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import { ensurePaymentRecordForTreatment } from '../../lib/payment-record';
import {
  calculatePayout,
  handleTossPaymentFailure,
  handleTossPaymentSuccess,
  PLATFORM_FEE_RATE,
  preparePaymentSession,
} from '../../lib/payments';
import { normalizePaymentStatus } from '../../lib/payment-status';
import {
  buildTossPaymentWebViewHtml,
  getTossClientKey,
  isTossConfigured,
  requestTossPaymentOnWeb,
  shouldUsePaymentWebView,
} from '../../lib/toss';
import { colors, disabledButtonStyle } from '../../lib/theme';
import { getTreatmentById, Treatment } from '../../lib/treatments';
import { LoadingState } from '../../src/components/loading-state';
import { TossPaymentWebView } from '../../src/components/toss-payment-webview';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';

function getInitials(name?: string | null) {
  if (!name) {
    return '?';
  }

  return name.trim().slice(0, 1);
}

function formatWon(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

export default function CustomerPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { treatmentId } = useLocalSearchParams<{ treatmentId?: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [webViewHtml, setWebViewHtml] = useState('');
  const [webViewVisible, setWebViewVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!treatmentId) {
        if (isMounted) {
          setErrorMessage('결제 정보를 찾을 수 없습니다.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const { user, treatment: nextTreatment } = await getTreatmentById(treatmentId);

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

        if (status === 'completed') {
          setIsSuccess(true);
          setTreatment(nextTreatment);
          setErrorMessage('');
          return;
        }

        if (status !== 'payment_requested' && status !== 'escrow') {
          setErrorMessage('결제 요청된 시술만 결제할 수 있습니다.');
          return;
        }

        if (status === 'payment_requested') {
          await ensurePaymentRecordForTreatment(treatmentId);
        }

        if (!isMounted) {
          return;
        }

        setTreatment(nextTreatment);
        setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [treatmentId]);

  const amount = treatment?.price ?? 0;
  const payout = useMemo(() => calculatePayout(amount), [amount]);

  const handlePay = async () => {
    if (!treatment || !treatmentId || isPaying) {
      return;
    }

    try {
      setIsPaying(true);

      const { orderId } = await preparePaymentSession(treatmentId);
      const orderName = `${treatment.treatment_type} · ${treatment.treatment_title}`;
      const clientKey = getTossClientKey();
      const useDemoSimulator = !isTossConfigured();

      if (shouldUsePaymentWebView()) {
        const html = buildTossPaymentWebViewHtml({
          amount,
          orderId,
          orderName,
          treatmentId,
          clientKey: clientKey || 'test_ck_demo',
          useDemoSimulator,
        });
        setWebViewHtml(html);
        setWebViewVisible(true);
        return;
      }

      if (useDemoSimulator) {
        await handleTossPaymentSuccess(treatmentId, {
          paymentKey: `demo_${Date.now()}`,
          orderId,
        });
        setIsSuccess(true);
        return;
      }

      await requestTossPaymentOnWeb({
        amount,
        orderId,
        orderName,
        treatmentId,
      });
    } catch (error) {
      if (treatmentId) {
        await handleTossPaymentFailure(treatmentId).catch(() => undefined);
      }
      showErrorAlert(getErrorMessage(error, '결제에 실패했어요'), '결제 실패');
    } finally {
      setIsPaying(false);
    }
  };

  const onWebViewSuccess = async (result: {
    paymentKey: string;
    orderId: string;
    amount: number;
  }) => {
    if (!treatmentId) {
      return;
    }

    setWebViewVisible(false);
    setIsPaying(true);

    try {
      await handleTossPaymentSuccess(treatmentId, {
        paymentKey: result.paymentKey,
        orderId: result.orderId,
      });
      setIsSuccess(true);
    } catch (error) {
      await handleTossPaymentFailure(treatmentId).catch(() => undefined);
      showErrorAlert(getErrorMessage(error, '결제에 실패했어요'), '결제 실패');
    } finally {
      setIsPaying(false);
    }
  };

  const onWebViewFail = async (result: { code: string; message: string }) => {
    if (treatmentId) {
      await handleTossPaymentFailure(treatmentId).catch(() => undefined);
    }

    setWebViewVisible(false);
    setIsPaying(false);
    showErrorAlert(result.message || '결제에 실패했어요', '결제 실패');
  };

  if (isLoading) {
    return <LoadingState message="결제 정보를 불러오는 중..." />;
  }

  if (errorMessage) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (isSuccess) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>결제가 완료되었습니다 ✓</Text>
        <Text style={styles.successSub}>디자이너 피드백 입력 후 정산됩니다</Text>
        <Text style={styles.successHint}>에스크로 방식으로 안전하게 보관됩니다</Text>
        <Pressable style={styles.confirmButton} onPress={() => router.replace('/home')}>
          <Text style={styles.confirmButtonText}>확인</Text>
        </Pressable>
      </View>
    );
  }

  if (!treatment) {
    return null;
  }

  const shopLabel = '강남점';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>결제</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.designerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(treatment.designer_name)}</Text>
          </View>
          <View style={styles.designerInfo}>
            <Text style={styles.designerName}>{treatment.designer_name || '디자이너'}</Text>
            <Text style={styles.designerMeta}>
              {treatment.treatment_type} · {shopLabel}
            </Text>
          </View>
        </View>

        <View style={styles.amountHero}>
          <Text style={styles.amountLabel}>결제 금액</Text>
          <Text style={styles.amountValue}>{formatWon(amount)}</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>시술 금액</Text>
            <Text style={styles.detailValue}>{formatWon(amount)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>앱 수수료 ({Math.round(PLATFORM_FEE_RATE * 100)}%)</Text>
            <Text style={styles.feeValue}>-{formatWon(payout.platformFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.payoutLabel}>디자이너 입금</Text>
            <Text style={styles.payoutValue}>{formatWon(payout.designerPayout)}</Text>
          </View>
        </View>

        <View style={styles.methodCard}>
          <Text style={styles.methodIcon}>💳</Text>
          <Text style={styles.methodText}>신용/체크카드</Text>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>🛡️ 디자이너 피드백 입력 후 정산</Text>
          <Text style={styles.noticeSub}>에스크로 방식으로 안전하게 보관됩니다</Text>
        </View>

        {!isTossConfigured() ? (
          <Text style={styles.demoHint}>
            테스트 모드: 토스 결제창 대신 데모 결제가 실행됩니다.{' '}
            {Platform.OS === 'web' ? '(웹)' : '(WebView)'}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.payButton, isPaying && disabledButtonStyle]}
          disabled={isPaying}
          onPress={handlePay}>
          {isPaying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>{formatWon(amount)} 결제하기</Text>
          )}
        </Pressable>
      </View>

      <TossPaymentWebView
        visible={webViewVisible}
        html={webViewHtml}
        onClose={() => {
          setWebViewVisible(false);
          setIsPaying(false);
        }}
        onSuccess={onWebViewSuccess}
        onFail={onWebViewFail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 16,
    padding: 12,
  },
  backLinkText: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBack: {
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerBackText: {
    color: '#1A1A2E',
    fontSize: 36,
    lineHeight: 36,
  },
  headerTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  designerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E0D7FA',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: {
    color: PURPLE,
    fontSize: 22,
    fontWeight: '800',
  },
  designerInfo: {
    flex: 1,
  },
  designerName: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  designerMeta: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  amountHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountValue: {
    color: '#1A1A2E',
    fontSize: 40,
    fontWeight: '800',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 12,
    marginBottom: 12,
    padding: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
  },
  feeValue: {
    color: CORAL,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: '#E8E8F0',
    height: 1,
    marginVertical: 4,
  },
  payoutLabel: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '700',
  },
  payoutValue: {
    color: MINT,
    fontSize: 16,
    fontWeight: '800',
  },
  methodCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    padding: 16,
  },
  methodIcon: {
    fontSize: 20,
  },
  methodText: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: '#E8FAF7',
    borderRadius: 14,
    marginBottom: 8,
    padding: 16,
  },
  noticeTitle: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  noticeSub: {
    color: '#6B6B7B',
    fontSize: 12,
    lineHeight: 18,
  },
  demoHint: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FAFAFC',
    borderTopColor: '#E8E8F0',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: CORAL,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: 16,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    backgroundColor: MINT,
    borderRadius: 40,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    height: 72,
    lineHeight: 72,
    marginBottom: 20,
    overflow: 'hidden',
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
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  successHint: {
    color: '#6B6B7B',
    fontSize: 13,
    marginBottom: 32,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: CORAL,
    borderRadius: 14,
    minWidth: 200,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
