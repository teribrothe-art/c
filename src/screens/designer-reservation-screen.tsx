import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '../../lib/auth';
import {
  cancelDesignerReservation,
  countReservationsByFilter,
  formatReservationDate,
  getDesignerReservationItems,
  matchesReservationFilter,
  type DesignerReservationItem,
  type ReservationFilter,
} from '../../lib/designer-booking';
import { getErrorMessage } from '../../lib/errors';
import { colors } from '../../lib/theme';
import { DesignerBottomTabBar } from '../components/designer-bottom-tab-bar';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';

const RESERVATION_FILTERS: { key: ReservationFilter; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'upcoming', label: '예정' },
  { key: 'completed', label: '완료' },
  { key: 'all', label: '전체' },
];

function ReservationRow({
  item,
  onPress,
  onCancel,
}: {
  item: DesignerReservationItem;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const statusStyle =
    item.reservationStatus === 'upcoming'
      ? styles.statusUpcoming
      : item.reservationStatus === 'today'
        ? styles.statusToday
        : item.reservationStatus === 'pending'
          ? styles.statusPending
          : styles.statusCompleted;

  const canCancel =
    onCancel &&
    item.isCustomerBooking &&
    (item.reservationStatus === 'today' || item.reservationStatus === 'upcoming');

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
          {formatReservationDate(item.treatmentDate)}
          {item.bookingTimeLabel ? ` · ${item.bookingTimeLabel}` : ''}
          {` · ${item.treatmentType}`}
          {item.treatment.duration ? ` · ${item.treatment.duration}` : ''}
        </Text>
        {item.isCustomerBooking ? (
          <Text style={styles.bookingTag}>고객 앱 예약</Text>
        ) : null}
      </View>
      {canCancel ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onCancel();
          }}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}>
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function DesignerReservationScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ReservationFilter>('today');
  const [items, setItems] = useState<DesignerReservationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    getCurrentUser()
      .then((user) => {
        if (!user) {
          router.replace('/');
          return null;
        }

        if (user.role !== 'designer') {
          router.replace('/customer-home');
          return null;
        }

        return getDesignerReservationItems();
      })
      .then((rows) => {
        if (!rows) {
          return;
        }

        setItems(rows);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '예약 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

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

  const subtitle = useMemo(() => {
    const customerBookingCount = items.filter((item) => item.isCustomerBooking).length;

    switch (filter) {
      case 'today':
        return `오늘 예약 ${counts.today}건 · 고객 앱 예약 ${customerBookingCount}건 연동`;
      case 'upcoming':
        return `다가오는 예약 ${counts.upcoming}건`;
      case 'completed':
        return `완료·지난 예약 ${counts.completed}건`;
      case 'all':
        return `연결 고객 예약 ${counts.all}건`;
    }
  }, [counts, filter, items]);

  const handleCancel = useCallback(
    (item: DesignerReservationItem) => {
      Alert.alert(
        '예약 취소',
        `${item.customerName}님 ${formatReservationDate(item.treatmentDate)} ${item.bookingTimeLabel ?? ''} 예약을 취소할까요?`,
        [
          { text: '닫기', style: 'cancel' },
          {
            text: '취소하기',
            style: 'destructive',
            onPress: () => {
              void cancelDesignerReservation(item.treatmentId)
                .then(() => load())
                .catch((error) => {
                  Alert.alert('취소 실패', getErrorMessage(error, '예약을 취소하지 못했습니다.'));
                });
            },
          },
        ],
      );
    },
    [load],
  );

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
          <Pressable onPress={() => router.push('/designer/booking-menu')} style={styles.menuLink}>
            <Text style={styles.menuLinkText}>예약 메뉴 설정 ›</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <LoadingState message="예약 현황 불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="표시할 예약이 없어요"
            subtitle="고객이 앱에서 예약하면 여기에 자동으로 표시됩니다."
          />
        ) : (
          <View style={styles.list}>
            {visibleItems.map((item) => (
              <ReservationRow
                key={item.key}
                item={item}
                onPress={() => router.push(`/designer/treatment/${item.treatmentId}`)}
                onCancel={() => handleCancel(item)}
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
    backgroundColor: '#FFF0F0',
    borderColor: colors.coral,
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
    color: colors.coral,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuLink: {
    alignSelf: 'flex-start',
  },
  menuLinkText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
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
    backgroundColor: '#FFF0F0',
    color: colors.coral,
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
  bookingTag: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelButtonPressed: {
    opacity: 0.9,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
});
