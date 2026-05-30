import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SettlementListItem } from '../../lib/designer-payment-stats';
import {
  DESIGNER_HOME_QUICK_ACTIONS,
  type DesignerHomeActionItem,
  type DesignerHomeRecentItem,
} from '../../lib/designer-home-feed';
import { colors } from '../../lib/theme';

type DesignerHomeSectionsProps = {
  todayTreatmentCount: number;
  actionItems: DesignerHomeActionItem[];
  recentItems: DesignerHomeRecentItem[];
  recentSettlements: SettlementListItem[];
  pendingPayoutCount: number;
};

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable hitSlop={8} onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DesignerHomeSections({
  todayTreatmentCount,
  actionItems,
  recentItems,
  recentSettlements,
  pendingPayoutCount,
}: DesignerHomeSectionsProps) {
  return (
    <View style={styles.wrapper}>
      {todayTreatmentCount > 0 ? (
        <View style={styles.todayBanner}>
          <Text style={styles.todayBannerText}>오늘 시술 {todayTreatmentCount}건</Text>
          <Pressable onPress={() => router.push('/designer/clients')}>
            <Text style={styles.todayBannerLink}>목록 보기</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>빠른 실행</Text>
        <View style={styles.quickRow}>
          {DESIGNER_HOME_QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => router.push(action.href)}
              style={({ pressed }) => [styles.quickTile, pressed && styles.tilePressed]}>
              <Text style={styles.quickIcon}>{action.icon}</Text>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {actionItems.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title={`처리할 일 ${actionItems.length}건`}
            actionLabel="고객 탭"
            onAction={() => router.push('/designer/clients')}
          />
          <View style={styles.cardList}>
            {actionItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => router.push(`/designer/treatment/${item.treatmentId}`)}
                style={({ pressed }) => [styles.listCard, pressed && styles.tilePressed]}>
                <View style={styles.listCardBody}>
                  <Text style={styles.listCardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.listCardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>
                <Text style={styles.listCardCta}>{item.cta}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {recentItems.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="최근 시술"
            actionLabel="전체"
            onAction={() => router.push('/designer/clients')}
          />
          <View style={styles.cardList}>
            {recentItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => router.push(`/designer/treatment/${item.treatmentId}`)}
                style={({ pressed }) => [styles.listCard, pressed && styles.tilePressed]}>
                <View style={styles.listCardBody}>
                  <Text style={styles.listCardTitle} numberOfLines={1}>
                    {item.customerName}
                  </Text>
                  <Text style={styles.listCardSubtitle} numberOfLines={1}>
                    {item.treatmentTitle} · {item.dateLabel}
                  </Text>
                </View>
                <Text style={styles.statusPill}>{item.statusLabel}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {pendingPayoutCount > 0 || recentSettlements.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="정산"
            actionLabel={pendingPayoutCount > 0 ? `대기 ${pendingPayoutCount}건` : '매출'}
            onAction={() => router.push('/designer/revenue')}
          />
          {recentSettlements.length > 0 ? (
            <View style={styles.cardList}>
              {recentSettlements.slice(0, 3).map((item) => (
                <Pressable
                  key={item.paymentId}
                  onPress={() => router.push(`/designer/treatment/${item.treatmentId}`)}
                  style={({ pressed }) => [styles.listCard, pressed && styles.tilePressed]}>
                  <View style={styles.listCardBody}>
                    <Text style={styles.listCardTitle} numberOfLines={1}>
                      {item.customerName}
                    </Text>
                    <Text style={styles.listCardSubtitle} numberOfLines={1}>
                      {item.treatmentTitle} · {item.date.replaceAll('-', '.')}
                    </Text>
                  </View>
                  <Text style={styles.payoutText}>
                    +{item.payout.toLocaleString('ko-KR')}원
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>정산 대기 건은 매출 탭에서 확인하세요.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 20,
  },
  todayBanner: {
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  todayBannerText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  todayBannerLink: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionAction: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingVertical: 14,
  },
  quickIcon: {
    fontSize: 22,
  },
  quickLabel: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '800',
  },
  cardList: {
    gap: 8,
  },
  listCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listCardBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  listCardTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  listCardSubtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  listCardCta: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  statusPill: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '800',
  },
  payoutText: {
    color: '#00A896',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyHint: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  tilePressed: {
    opacity: 0.92,
  },
});
