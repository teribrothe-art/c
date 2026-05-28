import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CustomerPaymentEntry } from '../../lib/customer-payment-entries';

const CORAL = '#FF5A5F';
const MINT = '#00C2A8';
const PURPLE = '#7B5EE6';
const INK = '#1A1A2E';
const MUTED = '#6B6B7B';

type DetailRowVariant = 'amount' | 'datetime' | 'orderId';

function DetailRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: DetailRowVariant;
}) {
  const variantStyles =
    variant === 'amount'
      ? {
          row: styles.rowAmount,
          label: styles.rowLabelAmount,
          value: styles.rowValueAmount,
        }
      : variant === 'datetime'
        ? {
            row: styles.rowDatetime,
            label: styles.rowLabelDatetime,
            value: styles.rowValueDatetime,
          }
        : {
            row: styles.rowOrder,
            label: styles.rowLabelOrder,
            value: styles.rowValueOrder,
          };

  return (
    <View style={[styles.row, variantStyles.row]}>
      <Text style={[styles.rowLabel, variantStyles.label]}>{label}</Text>
      <Text style={[styles.rowValue, variantStyles.value]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type CustomerPaymentDetailPanelProps = {
  entry: CustomerPaymentEntry;
  onPay: () => void;
  onReceipt: () => void;
  onViewTreatment: () => void;
};

function formatDateLabel(iso?: string | null) {
  if (!iso) {
    return '-';
  }

  return iso.slice(0, 10).replaceAll('-', '.');
}

function toneStyle(tone: CustomerPaymentEntry['statusTone']) {
  if (tone === 'paid') {
    return { box: styles.badgePaid, text: styles.badgePaidText };
  }

  if (tone === 'done') {
    return { box: styles.badgeDone, text: styles.badgeDoneText };
  }

  return { box: styles.badgePending, text: styles.badgePendingText };
}

export function CustomerPaymentDetailPanel({
  entry,
  onPay,
  onReceipt,
  onViewTreatment,
}: CustomerPaymentDetailPanelProps) {
  const { treatment, statusLabel, statusTone, amount } = entry;
  const badge = toneStyle(statusTone);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>금액 상세</Text>
        <View style={[styles.badge, badge.box]}>
          <Text style={[styles.badgeText, badge.text]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.treatmentTitle}>{treatment.treatment_title}</Text>
      <Text style={styles.meta}>
        {formatDateLabel(treatment.treatment_date)} · {treatment.treatment_type} ·{' '}
        {treatment.designer_name || '디자이너'}
      </Text>

      <View style={styles.amountBox}>
        <DetailRow
          label="시술 금액"
          value={`${amount.toLocaleString('ko-KR')}원`}
          variant="amount"
        />
        {entry.payment?.paid_at ? (
          <DetailRow
            label="결제 일시"
            value={entry.payment.paid_at.replace('T', ' ').slice(0, 16)}
            variant="datetime"
          />
        ) : null}
        {entry.payment?.toss_order_id ? (
          <DetailRow
            label="주문 번호"
            value={entry.payment.toss_order_id}
            variant="orderId"
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        {entry.canPay ? (
          <Pressable onPress={onPay} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{amount.toLocaleString('ko-KR')}원 결제하기</Text>
          </Pressable>
        ) : null}
        {entry.canViewReceipt && entry.receiptPaymentId ? (
          <Pressable
            onPress={onReceipt}
            style={({ pressed }) => [
              entry.canPay ? styles.secondaryButton : styles.primaryButton,
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                entry.canPay ? styles.secondaryButtonText : styles.primaryButtonText,
              ]}>
              영수증 보기
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onViewTreatment}
          style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
          <Text style={styles.ghostButtonText}>시술 기록 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '800',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePending: {
    backgroundColor: '#FFF4E0',
  },
  badgePendingText: {
    color: '#FFB627',
    fontSize: 11,
    fontWeight: '800',
  },
  badgePaid: {
    backgroundColor: '#E8FAF7',
  },
  badgePaidText: {
    color: MINT,
    fontSize: 11,
    fontWeight: '800',
  },
  badgeDone: {
    backgroundColor: '#EEEEF4',
  },
  badgeDoneText: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeText: {},
  treatmentTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  amountBox: {
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    gap: 8,
    padding: 12,
  },
  row: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  rowAmount: {
    backgroundColor: '#FFF0F0',
    borderLeftColor: CORAL,
    borderLeftWidth: 3,
  },
  rowDatetime: {
    backgroundColor: '#F3F0FF',
    borderLeftColor: PURPLE,
    borderLeftWidth: 3,
  },
  rowOrder: {
    backgroundColor: '#E8FAF7',
    borderLeftColor: MINT,
    borderLeftWidth: 3,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowLabelAmount: {
    color: CORAL,
  },
  rowLabelDatetime: {
    color: PURPLE,
  },
  rowLabelOrder: {
    color: '#00A88F',
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  rowValueAmount: {
    color: CORAL,
    fontSize: 20,
    fontWeight: '900',
  },
  rowValueDatetime: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
  },
  rowValueOrder: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: CORAL,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E8FAF7',
    borderColor: MINT,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: MINT,
    fontSize: 16,
    fontWeight: '800',
  },
  ghostButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ghostButtonText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
