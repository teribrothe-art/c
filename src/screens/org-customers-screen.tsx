import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { mapDesignerClientsToGridItems } from '../../lib/designer-customer-grid';
import { getOrgClientListItems, type OrgClientListItem } from '../../lib/org-client-list';
import {
  defaultClientPeriodSelection,
  filterClientsByPeriod,
  formatClientPeriodScopeLabel,
  type ClientPeriodSelection,
} from '../../lib/org-client-period-tabs';
import { getErrorMessage } from '../../lib/errors';
import { navigateBackOrOrgHome } from '../../lib/navigation';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { CustomerGrid } from '../components/customer-grid';
import { OrgClientPeriodTabBar } from '../components/org-client-period-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { TAB_BAR_BOTTOM_INSET } from '../components/role-bottom-tab-bar';

type Props = {
  scope: OrgScope;
};

const EMPTY_PERIOD_SELECTION: ClientPeriodSelection = {
  monthKey: null,
  weekKey: null,
  date: null,
};

export function OrgCustomersScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const { designerId: designerIdParam } = useLocalSearchParams<{ designerId?: string }>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<OrgClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [designerFilter, setDesignerFilter] = useState<string | null>(designerIdParam ?? null);
  const [periodSelection, setPeriodSelection] = useState<ClientPeriodSelection>(EMPTY_PERIOD_SELECTION);

  const load = useCallback(() => {
    setIsLoading(true);

    getOrgClientListItems(scope)
      .then((rows) => {
        setItems(rows);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '고객·시술을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
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

  const searchFilteredItems = useMemo(() => {
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

  useEffect(() => {
    if (searchFilteredItems.length === 0) {
      setPeriodSelection(EMPTY_PERIOD_SELECTION);
      return;
    }

    const periodFiltered = filterClientsByPeriod(searchFilteredItems, periodSelection);

    if (!periodSelection.monthKey || periodFiltered.length === 0) {
      setPeriodSelection(defaultClientPeriodSelection(searchFilteredItems));
    }
  }, [periodSelection.monthKey, searchFilteredItems]);

  const visibleItems = useMemo(
    () => filterClientsByPeriod(searchFilteredItems, periodSelection),
    [periodSelection, searchFilteredItems],
  );

  const periodScopeLabel = useMemo(
    () => formatClientPeriodScopeLabel(periodSelection, searchFilteredItems),
    [periodSelection, searchFilteredItems],
  );

  const treatmentPath = scope === 'store' ? '/store/treatment' : '/admin/treatment';
  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;

  const gridItems = useMemo(
    () =>
      mapDesignerClientsToGridItems(visibleItems, {
        hideDateInMeta: Boolean(periodSelection.date || periodSelection.weekKey),
      }).map((item) => {
        const source = visibleItems.find((row) => row.key === item.key);

        return {
          ...item,
          badge: source?.designerName ?? item.badge,
        };
      }),
    [periodSelection.date, periodSelection.weekKey, visibleItems],
  );

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
          placeholder="고객·시술·디자이너 검색"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={searchQuery}
        />

        {searchFilteredItems.length > 0 ? (
          <OrgClientPeriodTabBar
            items={searchFilteredItems}
            onSelectionChange={setPeriodSelection}
            selection={periodSelection}
          />
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

        {periodSelection.monthKey ? (
          <Text style={styles.periodScope}>{periodScopeLabel}</Text>
        ) : null}

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="표시할 시술이 없어요"
            subtitle="선택한 기간·디자이너에 해당하는 시술이 없습니다."
          />
        ) : (
          <CustomerGrid items={gridItems} onPressItem={handleGridPress} />
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
  periodScope: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
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
});
