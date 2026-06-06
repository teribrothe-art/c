import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { getOrgClientListItems, type OrgClientListItem } from '../../lib/org-client-list';
import {
  buildOrgClientListCacheKey,
  peekOrgClientListCache,
} from '../../lib/designer-workspace-cache';
import { getErrorMessage } from '../../lib/errors';
import { navigateBackOrOrgHome } from '../../lib/navigation';
import { resolveCurrentStoreOrgId } from '../../lib/org-store-scope';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { CustomerGrid, type CustomerGridItem } from '../components/customer-grid';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { TAB_BAR_BOTTOM_INSET } from '../components/role-bottom-tab-bar';

type Props = {
  scope: OrgScope;
};

const INITIAL_GROUP_TILES = 8;

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function resolveCustomerGroupKey(item: OrgClientListItem) {
  const customerId = item.treatment?.customer_id?.trim();

  if (customerId) {
    return customerId;
  }

  return item.customerName.trim().toLowerCase() || item.key;
}

function groupOrgClientsByCustomer(items: OrgClientListItem[]) {
  const buckets = new Map<string, OrgClientListItem[]>();

  for (const item of items) {
    const key = resolveCustomerGroupKey(item);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([customerKey, groupItems]) => {
      const sorted = [...groupItems].sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate));

      return {
        customerKey,
        customerName: sorted[0]?.customerName ?? '고객',
        items: sorted,
      };
    })
    .sort((a, b) => {
      const latestA = a.items[0]?.treatmentDate ?? '';
      const latestB = b.items[0]?.treatmentDate ?? '';

      if (latestA !== latestB) {
        return latestB.localeCompare(latestA);
      }

      return a.customerName.localeCompare(b.customerName, 'ko');
    });
}

type OrgCustomerGroupView = {
  customerKey: string;
  customerName: string;
  latestDate: string;
  items: OrgClientListItem[];
  gridItems: CustomerGridItem[];
};

function mapOrgCustomerGroupView(
  group: {
    customerKey: string;
    customerName: string;
    items: OrgClientListItem[];
  },
  showDesignerBadge: boolean,
): OrgCustomerGroupView {
  const initial = group.customerName.trim().slice(0, 1) || '?';

  return {
    customerKey: group.customerKey,
    customerName: group.customerName,
    latestDate: group.items[0]?.treatmentDate ?? '',
    items: group.items,
    gridItems: group.items.map((item) => ({
      key: item.key,
      initial,
      name: item.treatmentTitle,
      subtitle: item.treatment?.treatment_type ?? '시술',
      meta: formatDate(item.treatmentDate),
      badge: showDesignerBadge ? item.designerName : undefined,
    })),
  };
}

type OrgCustomerListRowProps = {
  group: OrgCustomerGroupView;
  onPress: (customerKey: string) => void;
};

const OrgCustomerListRow = memo(function OrgCustomerListRow({
  group,
  onPress,
}: OrgCustomerListRowProps) {
  const initial = group.customerName.trim().slice(0, 1) || '?';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(group.customerKey)}
      style={({ pressed }) => [styles.customerRow, pressed && styles.customerRowPressed]}>
      <View style={styles.customerRowAvatar}>
        <Text style={styles.customerRowAvatarText}>{initial}</Text>
      </View>
      <View style={styles.customerRowBody}>
        <View style={styles.customerRowTitleLine}>
          <Text numberOfLines={1} style={styles.customerRowName}>
            {group.customerName}
          </Text>
          <Text style={styles.customerRowCount}>{group.items.length}건</Text>
        </View>
        {group.latestDate ? (
          <Text numberOfLines={1} style={styles.customerRowMeta}>
            최근 시술 {formatDate(group.latestDate)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.customerRowChevron}>›</Text>
    </Pressable>
  );
});

type OrgCustomerTreatmentPanelProps = {
  group: OrgCustomerGroupView;
  onPressItem: (key: string) => void;
};

const OrgCustomerTreatmentPanel = memo(function OrgCustomerTreatmentPanel({
  group,
  onPressItem,
}: OrgCustomerTreatmentPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleGridItems =
    expanded || group.gridItems.length <= INITIAL_GROUP_TILES
      ? group.gridItems
      : group.gridItems.slice(0, INITIAL_GROUP_TILES);
  const hiddenCount = group.gridItems.length - visibleGridItems.length;

  return (
    <View style={styles.customerSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.customerName}</Text>
        <Text style={styles.sectionCount}>{group.items.length}건</Text>
      </View>
      <CustomerGrid items={visibleGridItems} onPressItem={onPressItem} />
      {hiddenCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(true)}
          style={({ pressed }) => [styles.moreButton, pressed && styles.moreButtonPressed]}>
          <Text style={styles.moreButtonText}>{hiddenCount}건 더보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

export function OrgCustomersScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const { designerId: designerIdParam } = useLocalSearchParams<{ designerId?: string }>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<OrgClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [designerFilter, setDesignerFilter] = useState<string | null>(designerIdParam ?? null);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const load = useCallback(async () => {
    const storeOrgId = scope === 'store' ? await resolveCurrentStoreOrgId() : undefined;
    const cacheKey = buildOrgClientListCacheKey(scope, storeOrgId);
    const cached = peekOrgClientListCache<OrgClientListItem>(cacheKey);

    if (cached) {
      setItems(cached);
      setErrorMessage('');
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const rows = await getOrgClientListItems(scope, storeOrgId ? { storeOrgId } : undefined);
      setItems(rows);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '고객·시술을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      if (designerIdParam) {
        setDesignerFilter(designerIdParam);
      }

      load();
    }, [designerIdParam, load]),
  );

  const designerChips = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of items) {
      map.set(item.designerId, item.designerName);
    }

    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const visibleItems = useMemo(() => {
    let rows = items;

    if (designerFilter) {
      rows = rows.filter((item) => item.designerId === designerFilter);
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((item) =>
      [item.customerName, item.treatmentTitle, item.designerName, item.treatment?.treatment_type ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [designerFilter, items, searchQuery]);

  const treatmentPath = scope === 'store' ? '/store/treatment' : '/admin/treatment';
  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;

  const customerGroups = useMemo(() => {
    const showDesignerBadge = !designerFilter;

    return groupOrgClientsByCustomer(visibleItems).map((group) =>
      mapOrgCustomerGroupView(group, showDesignerBadge),
    );
  }, [designerFilter, visibleItems]);

  const selectedCustomerGroup = useMemo(
    () => customerGroups.find((group) => group.customerKey === selectedCustomerKey) ?? null,
    [customerGroups, selectedCustomerKey],
  );

  useEffect(() => {
    setSelectedCustomerKey(null);
  }, [designerFilter, searchQuery]);

  useEffect(() => {
    if (selectedCustomerKey && !selectedCustomerGroup) {
      setSelectedCustomerKey(null);
    }
  }, [selectedCustomerGroup, selectedCustomerKey]);

  const handleGridPress = useCallback(
    (key: string) => {
      const item = visibleItems.find((row) => row.key === key);

      if (item?.treatmentId) {
        router.push(`${treatmentPath}/${item.treatmentId}` as '/store/treatment/[id]');
      }
    },
    [treatmentPath, visibleItems],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_BOTTOM_INSET,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {scope === 'admin' ? (
          <Pressable onPress={() => navigateBackOrOrgHome(scope)} style={styles.backLink}>
            <Text style={styles.backLinkText}>‹ 매장</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{scope === 'store' ? '매장 고객' : '고객·시술'}</Text>
        <Text style={styles.subtitle}>소속 디자이너 고객 데이터와 동일하게 연동됩니다.</Text>

        <TextInput
          onChangeText={setSearchQuery}
          placeholder="고객 이름·시술·디자이너 검색"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={searchQuery}
        />

        {!selectedCustomerGroup ? (
          <Text style={styles.listSummary}>고객 {customerGroups.length.toLocaleString('ko-KR')}명</Text>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Pressable
            onPress={() => setDesignerFilter(null)}
            style={[styles.chip, !designerFilter && styles.chipSelected]}>
            <Text style={[styles.chipText, !designerFilter && styles.chipTextSelected]}>전체</Text>
          </Pressable>
          {designerChips.map((chip) => {
            const selected = designerFilter === chip.id;

            return (
              <Pressable
                key={chip.id}
                onPress={() => setDesignerFilter(chip.id)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{chip.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : customerGroups.length === 0 ? (
          <EmptyState
            title="표시할 고객이 없어요"
            subtitle="검색어·디자이너 필터를 바꾸거나 시술 기록 연결을 확인해 주세요."
          />
        ) : selectedCustomerGroup ? (
          <View style={styles.groupList}>
            <Pressable
              onPress={() => setSelectedCustomerKey(null)}
              style={styles.detailBackLink}>
              <Text style={styles.backLinkText}>‹ 고객 목록</Text>
            </Pressable>
            <OrgCustomerTreatmentPanel
              group={selectedCustomerGroup}
              onPressItem={handleGridPress}
            />
          </View>
        ) : (
          <View style={styles.customerList}>
            {customerGroups.map((group) => (
              <OrgCustomerListRow
                key={group.customerKey}
                group={group}
                onPress={setSelectedCustomerKey}
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
    gap: 12,
    paddingHorizontal: 18,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backLinkText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  chipText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#0284C7',
  },
  listSummary: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -4,
  },
  customerList: {
    gap: 10,
  },
  customerRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customerRowPressed: {
    backgroundColor: '#F5F5F8',
    opacity: 0.96,
  },
  customerRowAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFD4D5',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  customerRowAvatarText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '900',
  },
  customerRowBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  customerRowTitleLine: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  customerRowName: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  customerRowCount: {
    color: '#00C2A8',
    fontSize: 12,
    fontWeight: '800',
  },
  customerRowMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  customerRowChevron: {
    color: '#C4C4D0',
    fontSize: 22,
    fontWeight: '700',
  },
  detailBackLink: {
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  groupList: {
    gap: 16,
  },
  customerSection: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#00C2A8',
    fontSize: 12,
    fontWeight: '800',
  },
  moreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  moreButtonPressed: {
    backgroundColor: '#F5F5F8',
    opacity: 0.92,
  },
  moreButtonText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
  },
});
