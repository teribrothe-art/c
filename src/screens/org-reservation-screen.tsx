import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { getErrorMessage } from '../../lib/errors';
import {
  countReservationsByFilter,
  formatReservationDate,
  getOrgReservationItems,
  matchesReservationFilter,
  type OrgReservationItem,
  type ReservationFilter,
} from '../../lib/org-reservations';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';

type Props = {
  scope: OrgScope;
};

const RESERVATION_FILTERS: { key: ReservationFilter; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'upcoming', label: '예정' },
  { key: 'completed', label: '완료' },
  { key: 'all', label: '전체' },
];

function ReservationRow({
  item,
  onPress,
}: {
  item: OrgReservationItem;
  onPress: () => void;
}) {
  const statusStyle =
    item.reservationStatus === 'upcoming'
      ? styles.statusUpcoming
      : item.reservationStatus === 'today'
        ? styles.statusToday
        : item.reservationStatus === 'pending'
          ? styles.statusPending
          : styles.statusCompleted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{item.customerName}</Text>
          <Text style={[styles.statusBadge, statusStyle]}>{item.statusLabel}</Text>
        </View>
        <Text style={styles.rowTreatment}>{item.treatmentTitle}</Text>
        <Text style={styles.rowMeta}>
          {formatReservationDate(item.treatmentDate)} · {item.treatment?.treatment_type ?? '시술'}
          {item.treatment?.duration ? ` · ${item.treatment.duration}` : ''}
        </Text>
        <Text style={styles.rowDesigner}>
          {item.designerName} · {item.designerStoreName}
        </Text>
      </View>
    </Pressable>
  );
}

export function OrgReservationScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ReservationFilter>('today');
  const [items, setItems] = useState<OrgReservationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    getOrgReservationItems(scope)
      .then((rows) => {
        setItems(rows);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '예약 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const counts = useMemo(() => countReservationsByFilter(items), [items]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesReservationFilter(item, filter)),
    [filter, items],
  );

  const treatmentPath = scope === 'store' ? '/store/treatment' : '/admin/treatment';
  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;

  const subtitle = useMemo(() => {
    switch (filter) {
      case 'today':
        return `오늘 예약 ${counts.today}건 · 가입 고객 시술 기록 기준`;
      case 'upcoming':
        return `다가오는 예약 ${counts.upcoming}건`;
      case 'completed':
        return `완료·지난 예약 ${counts.completed}건`;
      case 'all':
        return `가입 고객 예약 ${counts.all}건`;
    }
  }, [counts, filter]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>예약</Text>
            <View style={styles.filterTabHost}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterTabRow}>
                  {RESERVATION_FILTERS.map(({ key, label }) => {
                    const active = filter === key;
                    const count =
                      key === 'today'
                        ? counts.today
                        : key === 'upcoming'
                          ? counts.upcoming
                          : key === 'completed'
                            ? counts.completed
                            : counts.all;

                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setFilter(key)}
                        style={({ pressed }) => [
                          styles.filterTab,
                          active && styles.filterTabActive,
                          pressed && styles.filterTabPressed,
                        ]}>
                        <Text style={[styles.filterTabLabel, active && styles.filterTabLabelActive]}>
                          {label} {count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {isLoading ? (
          <LoadingState message="예약 현황 불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="표시할 예약이 없어요"
            subtitle="가입 고객의 시술 기록이 연결되면 여기에 예약 현황이 표시됩니다."
          />
        ) : (
          <View style={styles.list}>
            {visibleItems.map((item) => (
              <ReservationRow
                key={item.key}
                item={item}
                onPress={() => router.push(`${treatmentPath}/${item.treatmentId}` as '/admin/treatment/[id]')}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <TabBar />
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
    paddingHorizontal: 18,
  },
  headerBlock: {
    gap: 6,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#1A1A2E',
    flexShrink: 0,
    fontSize: 24,
    fontWeight: '900',
  },
  filterTabHost: {
    flex: 1,
    minWidth: 0,
  },
  filterTabRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
  },
  filterTab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  filterTabActive: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.purple,
  },
  filterTabPressed: {
    opacity: 0.92,
  },
  filterTabLabel: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '700',
  },
  filterTabLabelActive: {
    color: colors.purple,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  list: {
    gap: 10,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowMain: {
    gap: 4,
  },
  rowTitleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusToday: {
    backgroundColor: '#EDE9FE',
    color: colors.purple,
  },
  statusUpcoming: {
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
  },
  statusPending: {
    backgroundColor: '#FFF7ED',
    color: '#EA580C',
  },
  statusCompleted: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  rowTreatment: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  rowDesigner: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
});
