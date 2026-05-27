import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrgScope } from '../../lib/org-access';
import { getOrgClientListItems, type OrgClientListItem } from '../../lib/org-client-list';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';

type Props = {
  scope: OrgScope;
};

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

export function OrgCustomersScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const { designerId: designerIdParam } = useLocalSearchParams<{ designerId?: string }>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<OrgClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [designerFilter, setDesignerFilter] = useState<string | null>(designerIdParam ?? null);

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
  const showStoreTabBar = scope === 'store';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + (showStoreTabBar ? 100 : 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {scope === 'admin' ? (
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>‹ 디자이너</Text>
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
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="표시할 시술이 없어요"
            subtitle="디자이너 시술 기록이 연결되면 여기에 표시됩니다."
          />
        ) : (
          visibleItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() =>
                item.treatmentId
                  ? router.push(`${treatmentPath}/${item.treatmentId}` as '/store/treatment/[id]')
                  : undefined
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={styles.cardTop}>
                <Text style={styles.customerName}>{item.customerName}</Text>
                <View style={styles.designerBadge}>
                  <Text style={styles.designerBadgeText}>{item.designerName}</Text>
                </View>
              </View>
              <Text style={styles.treatmentTitle}>{item.treatmentTitle}</Text>
              <Text style={styles.meta}>
                {formatDate(item.treatmentDate)} · {item.treatment?.treatment_type ?? '시술'}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      {showStoreTabBar ? <StoreBottomTabBar /> : null}
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customerName: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  designerBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  designerBadgeText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '700',
  },
  treatmentTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
});
