import { Link, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ACCUMULATED_LOGIN_CUSTOMER_COUNT,
  DESIGNER_LOGIN_COUNT,
  STORE_LOGIN_COUNT,
  countRegisteredCustomersByConsonant,
  getDemoLoginGroupCountLabel,
  getRegisteredCustomerLoginPage,
  DEMO_LOGIN_GROUP_ORDER,
  getDemoLoginGroups,
  type DemoLoginAccount,
  type DemoLoginGroupKey,
  demoLoginGroupListsAllWhenExpanded,
  demoLoginGroupRequiresSearch,
  getDemoLoginSearchPlaceholder,
  isCollapsibleDemoLoginGroup,
  isSearchableDemoLoginGroup,
} from '../lib/demo-login-accounts';
import { filterDemoLoginAccounts } from '../lib/demo-login-account-search';
import {
  CUSTOMER_CONSONANT_TABS,
  type CustomerConsonantTab,
} from '../lib/korean-consonant';
import {
  DEMO_LOGIN_PAGE_SIZE,
  DESIGNER_LIST_STAGE_TABS,
  filterDesignersByStage,
  paginateList,
  type DesignerListStageTab,
} from '../lib/demo-login-list-staging';
import type { DesignerRegionFilterKey } from '../lib/designer-region-filter';
import {
  filterStoreLoginAccountsByRegion,
  STORE_LOGIN_REGION_TABS,
} from '../lib/store-login-region-filter';
import { showLoginFailureAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import { navigateBackOrReplace } from '../lib/navigation';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { formatDemoDesignerCustomerCount } from '../lib/demo-designer-customer-counts';
import { colors } from '../lib/theme';
import { AppVersionBadge } from '../src/components/app-version-badge';
import { StoreLoginRegionTabBar } from '../src/components/store-login-region-tab-bar';
import { TestLoginAccountGrid } from '../src/components/test-login-account-grid';

type DemoLoginGroupSectionProps = {
  title: DemoLoginGroupKey;
  description?: string;
  accounts: DemoLoginAccount[];
  expanded: boolean;
  loadingId: string | null;
  groupSearch: string;
  onToggle: () => void;
  onGroupSearchChange: (value: string) => void;
  onLogin: (id: string, email: string, password: string) => void;
};

type CustomerViewTab = CustomerConsonantTab | '전체보기';

type ListPaginationProps = {
  page: number;
  totalMatches: number;
  visibleCount: number;
  hasMore: boolean;
  unit?: string;
  onPrev: () => void;
  onNext: () => void;
};

function ListPagination({
  page,
  totalMatches,
  visibleCount,
  hasMore,
  unit = '명',
  onPrev,
  onNext,
}: ListPaginationProps) {
  if (totalMatches === 0) {
    return null;
  }

  const start = page * DEMO_LOGIN_PAGE_SIZE + 1;
  const end = page * DEMO_LOGIN_PAGE_SIZE + visibleCount;

  return (
    <View style={styles.paginationRow}>
      <Pressable
        disabled={page <= 0}
        onPress={onPrev}
        style={({ pressed }) => [
          styles.paginationButton,
          page <= 0 && styles.paginationButtonDisabled,
          pressed && page > 0 && styles.paginationButtonPressed,
        ]}>
        <Text style={[styles.paginationButtonText, page <= 0 && styles.paginationButtonTextDisabled]}>
          이전
        </Text>
      </Pressable>
      <Text style={styles.paginationLabel}>
        {start.toLocaleString('ko-KR')}–{end.toLocaleString('ko-KR')} /{' '}
        {totalMatches.toLocaleString('ko-KR')}
        {unit}
      </Text>
      <Pressable
        disabled={!hasMore}
        onPress={onNext}
        style={({ pressed }) => [
          styles.paginationButton,
          !hasMore && styles.paginationButtonDisabled,
          pressed && hasMore && styles.paginationButtonPressed,
        ]}>
        <Text style={[styles.paginationButtonText, !hasMore && styles.paginationButtonTextDisabled]}>
          다음
        </Text>
      </Pressable>
    </View>
  );
}

function DemoLoginGroupSection({
  title,
  description,
  accounts,
  expanded,
  loadingId,
  groupSearch,
  onToggle,
  onGroupSearchChange,
  onLogin,
}: DemoLoginGroupSectionProps) {
  const isDesignerGroup = title === '디자이너';
  const isStoreGroup = title === '매장';
  const isRegisteredCustomerGroup = title === '가입고객';
  const [selectedStoreRegion, setSelectedStoreRegion] = useState<DesignerRegionFilterKey>('all');
  const [selectedDesignerStage, setSelectedDesignerStage] =
    useState<DesignerListStageTab>('데모·베타');
  const [selectedCustomerView, setSelectedCustomerView] = useState<CustomerViewTab | null>(null);
  const [listPage, setListPage] = useState(0);
  const [consonantCounts, setConsonantCounts] = useState<Record<CustomerConsonantTab, number> | null>(
    null,
  );
  const collapsible = isCollapsibleDemoLoginGroup(title);
  const searchable = isSearchableDemoLoginGroup(title);
  const listAllWhenExpanded = demoLoginGroupListsAllWhenExpanded(title);
  const requiresSearch = demoLoginGroupRequiresSearch(title);
  const countLabel = getDemoLoginGroupCountLabel(title);
  const searchQuery = groupSearch.trim();

  useEffect(() => {
    if (!isRegisteredCustomerGroup || !expanded) {
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        setConsonantCounts(countRegisteredCustomersByConsonant());
      }
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [expanded, isRegisteredCustomerGroup]);

  useEffect(() => {
    if (!expanded) {
      setListPage(0);
      setSelectedStoreRegion('all');
    }
  }, [expanded]);

  const resetListPage = useCallback(() => {
    setListPage(0);
  }, []);

  const storeScopedAccounts = useMemo(() => {
    if (!isStoreGroup) {
      return accounts;
    }

    return filterStoreLoginAccountsByRegion(accounts, selectedStoreRegion);
  }, [accounts, isStoreGroup, selectedStoreRegion]);

  const handleStoreRegionChange = useCallback(
    (regionKey: DesignerRegionFilterKey) => {
      setSelectedStoreRegion(regionKey);
      resetListPage();
    },
    [resetListPage],
  );

  const handleDesignerStageChange = useCallback(
    (stage: DesignerListStageTab) => {
      setSelectedDesignerStage(stage);
      resetListPage();
    },
    [resetListPage],
  );

  const handleCustomerViewChange = useCallback(
    (view: CustomerViewTab) => {
      setSelectedCustomerView((current) => (current === view ? null : view));
      resetListPage();
    },
    [resetListPage],
  );

  const designerListState = useMemo(() => {
    if (!isDesignerGroup || !expanded) {
      return null;
    }

    const stageAccounts = filterDesignersByStage(accounts, selectedDesignerStage);

    if (searchQuery) {
      const filtered = filterDemoLoginAccounts(stageAccounts, groupSearch, null, {
        offset: listPage * DEMO_LOGIN_PAGE_SIZE,
        limit: DEMO_LOGIN_PAGE_SIZE,
      });

      return {
        accounts: filtered.accounts,
        totalMatches: filtered.totalMatches,
        hasMore: filtered.hasMore,
      };
    }

    if (selectedDesignerStage === '전체보기') {
      const paged = paginateList(stageAccounts, listPage, DEMO_LOGIN_PAGE_SIZE);

      return {
        accounts: paged.slice,
        totalMatches: paged.total,
        hasMore: paged.hasMore,
      };
    }

    const paged = paginateList(stageAccounts, listPage, DEMO_LOGIN_PAGE_SIZE);

    return {
      accounts: paged.slice,
      totalMatches: paged.total,
      hasMore: paged.hasMore,
    };
  }, [
    accounts,
    expanded,
    groupSearch,
    isDesignerGroup,
    listPage,
    searchQuery,
    selectedDesignerStage,
  ]);

  const customerListState = useMemo(() => {
    if (!isRegisteredCustomerGroup || !expanded || !selectedCustomerView) {
      return null;
    }

    return getRegisteredCustomerLoginPage({
      offset: listPage * DEMO_LOGIN_PAGE_SIZE,
      limit: DEMO_LOGIN_PAGE_SIZE,
      consonant: selectedCustomerView === '전체보기' ? null : selectedCustomerView,
      query: groupSearch,
      viewAll: selectedCustomerView === '전체보기',
    });
  }, [
    expanded,
    groupSearch,
    isRegisteredCustomerGroup,
    listPage,
    selectedCustomerView,
  ]);

  const storeSearchResult = useMemo(() => {
    if (title !== '매장' || !expanded) {
      return null;
    }

    if (!searchQuery && selectedStoreRegion === 'all' && !listAllWhenExpanded) {
      return null;
    }

    return filterDemoLoginAccounts(storeScopedAccounts, groupSearch, null, {
      offset: listPage * DEMO_LOGIN_PAGE_SIZE,
      limit: DEMO_LOGIN_PAGE_SIZE,
    });
  }, [
    expanded,
    groupSearch,
    listAllWhenExpanded,
    listPage,
    searchQuery,
    selectedStoreRegion,
    storeScopedAccounts,
    title,
  ]);

  const visibleAccounts = useMemo(() => {
    if (isDesignerGroup) {
      return designerListState?.accounts ?? [];
    }

    if (isRegisteredCustomerGroup) {
      return customerListState?.accounts ?? [];
    }

    if (title === '매장') {
      if (!searchable) {
        return storeScopedAccounts;
      }

      if (!searchQuery && listAllWhenExpanded) {
        return paginateList(storeScopedAccounts, listPage, DEMO_LOGIN_PAGE_SIZE).slice;
      }

      return storeSearchResult?.accounts ?? [];
    }

    if (!searchable) {
      return accounts;
    }

    return [];
  }, [
    accounts,
    customerListState,
    designerListState,
    isDesignerGroup,
    isRegisteredCustomerGroup,
    listAllWhenExpanded,
    listPage,
    searchable,
    searchQuery,
    storeScopedAccounts,
    storeSearchResult,
    title,
  ]);

  const listTotalMatches = useMemo(() => {
    if (isDesignerGroup) {
      return designerListState?.totalMatches ?? 0;
    }

    if (isRegisteredCustomerGroup) {
      return customerListState?.totalMatches ?? 0;
    }

    if (title === '매장') {
      return storeSearchResult?.totalMatches ?? storeScopedAccounts.length;
    }

    return visibleAccounts.length;
  }, [
    accounts.length,
    customerListState,
    designerListState,
    isDesignerGroup,
    isRegisteredCustomerGroup,
    storeScopedAccounts.length,
    storeSearchResult,
    title,
    visibleAccounts.length,
  ]);

  const listHasMore = useMemo(() => {
    if (isDesignerGroup) {
      return designerListState?.hasMore ?? false;
    }

    if (isRegisteredCustomerGroup) {
      return customerListState?.hasMore ?? false;
    }

    if (title === '매장') {
      return storeSearchResult?.hasMore ?? false;
    }

    return false;
  }, [customerListState, designerListState, isDesignerGroup, isRegisteredCustomerGroup, storeSearchResult, title]);

  const canShowList =
    visibleAccounts.length > 0 &&
    (!collapsible || expanded) &&
    (isDesignerGroup ||
      isRegisteredCustomerGroup ||
      title === '매장' ||
      !searchable ||
      listAllWhenExpanded ||
      searchQuery.length > 0);

  const showSearchPanel = searchable && expanded;

  const designerStageHint = () => {
    if (searchQuery) {
      return `${selectedDesignerStage} · 검색 결과 ${listTotalMatches.toLocaleString('ko-KR')}명`;
    }

    if (selectedDesignerStage === '전체보기') {
      return `전체 ${DESIGNER_LOGIN_COUNT.toLocaleString('ko-KR')}명 · 단계별로 나눠 표시 · 검색 가능`;
    }

    return `${selectedDesignerStage} · ${listTotalMatches.toLocaleString('ko-KR')}명 · 탭하면 로그인`;
  };

  const registeredCustomerHint = () => {
    if (!selectedCustomerView) {
      return `총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT.toLocaleString('ko-KR')}명 — 초성 또는 전체보기 탭을 선택하세요`;
    }

    if (selectedCustomerView === '전체보기') {
      if (searchQuery) {
        return `전체보기 · 검색 ${listTotalMatches.toLocaleString('ko-KR')}명`;
      }

      return `전체보기 · 총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT.toLocaleString('ko-KR')}명 · ${DEMO_LOGIN_PAGE_SIZE}명씩 표시`;
    }

    if (searchQuery) {
      return `${selectedCustomerView} · 검색 ${listTotalMatches.toLocaleString('ko-KR')}명`;
    }

    const total = consonantCounts?.[selectedCustomerView] ?? 0;

    if (total === 0) {
      return `${selectedCustomerView} · 해당 초성 고객이 없습니다`;
    }

    return `${selectedCustomerView} · ${total.toLocaleString('ko-KR')}명 · ${DEMO_LOGIN_PAGE_SIZE}명씩 표시`;
  };

  return (
    <View style={styles.group}>
      {collapsible ? (
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [styles.collapseHeader, pressed && styles.collapseHeaderPressed]}>
          <View style={styles.collapseHeaderBody}>
            <Text style={styles.groupTitle}>{title}</Text>
            {description ? <Text style={styles.groupDescription}>{description}</Text> : null}
          </View>
          <View style={styles.collapseTrailing}>
            <Text style={styles.collapseCount}>{countLabel}</Text>
            <Text style={styles.collapseChevron}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </Pressable>
      ) : (
        <>
          <Text style={styles.groupTitle}>{title}</Text>
          {description ? <Text style={styles.groupDescription}>{description}</Text> : null}
        </>
      )}

      {showSearchPanel ? (
        <View style={styles.searchPanel}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={(value) => {
              resetListPage();
              onGroupSearchChange(value);
            }}
            placeholder={getDemoLoginSearchPlaceholder(title)}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={groupSearch}
          />

          {isStoreGroup ? (
            <StoreLoginRegionTabBar
              activeKey={selectedStoreRegion}
              onSelect={handleStoreRegionChange}
            />
          ) : null}

          {isDesignerGroup ? (
            <ScrollView
              horizontal
              contentContainerStyle={styles.textTabRow}
              showsHorizontalScrollIndicator={false}>
              {DESIGNER_LIST_STAGE_TABS.map((tab) => {
                const selected = selectedDesignerStage === tab;

                return (
                  <Pressable
                    key={tab}
                    onPress={() => handleDesignerStageChange(tab)}
                    style={({ pressed }) => [pressed && styles.textTabPressed]}>
                    <Text style={[styles.textTab, selected && styles.textTabSelected]}>{tab}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {isRegisteredCustomerGroup ? (
            <ScrollView
              horizontal
              contentContainerStyle={styles.textTabRow}
              showsHorizontalScrollIndicator={false}>
              {CUSTOMER_CONSONANT_TABS.map((tab) => {
                const selected = selectedCustomerView === tab;
                const count = consonantCounts?.[tab] ?? 0;

                return (
                  <Pressable
                    key={tab}
                    onPress={() => handleCustomerViewChange(tab)}
                    style={({ pressed }) => [pressed && styles.textTabPressed]}>
                    <Text
                      style={[
                        styles.textTab,
                        selected && styles.textTabSelected,
                        count === 0 && styles.textTabEmpty,
                      ]}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => handleCustomerViewChange('전체보기')}
                style={({ pressed }) => [pressed && styles.textTabPressed]}>
                <Text
                  style={[
                    styles.textTab,
                    selectedCustomerView === '전체보기' && styles.textTabSelected,
                  ]}>
                  전체보기
                </Text>
              </Pressable>
            </ScrollView>
          ) : null}

          <Text style={styles.searchHint}>
            {searchQuery && title === '매장'
              ? storeSearchResult?.totalMatches === 0
                ? '검색 결과가 없습니다.'
                : `${storeSearchResult?.totalMatches.toLocaleString('ko-KR')}곳 · ${DEMO_LOGIN_PAGE_SIZE}곳씩 표시${
                    selectedStoreRegion !== 'all'
                      ? ` · ${STORE_LOGIN_REGION_TABS.find((tab) => tab.key === selectedStoreRegion)?.label ?? ''}`
                      : ''
                  }`
              : searchQuery && isDesignerGroup
                ? designerListState?.totalMatches === 0
                  ? '검색 결과가 없습니다.'
                  : designerStageHint()
                : searchQuery && isRegisteredCustomerGroup
                  ? customerListState?.totalMatches === 0
                    ? '검색 결과가 없습니다.'
                    : registeredCustomerHint()
                  : listAllWhenExpanded
                    ? `총 ${countLabel} · 아래에서 탭하면 로그인`
                    : isDesignerGroup
                      ? designerStageHint()
                      : isRegisteredCustomerGroup
                        ? registeredCustomerHint()
                        : requiresSearch
                          ? title === '매장'
                            ? selectedStoreRegion !== 'all'
                              ? `${STORE_LOGIN_REGION_TABS.find((tab) => tab.key === selectedStoreRegion)?.label ?? ''} · ${listTotalMatches.toLocaleString('ko-KR')}곳 · 검색하세요`
                              : `총 ${STORE_LOGIN_COUNT.toLocaleString('ko-KR')}곳 · 지역 탭 또는 매장명·지역·이메일 검색`
                            : `총 ${DESIGNER_LOGIN_COUNT.toLocaleString('ko-KR')}명 · 단계 탭을 선택하세요`
                          : `총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT.toLocaleString('ko-KR')}명 — 탭을 선택하세요`}
          </Text>
        </View>
      ) : null}

      {canShowList && (isDesignerGroup || isRegisteredCustomerGroup || title === '매장') ? (
        <ListPagination
          hasMore={listHasMore}
          onNext={() => setListPage((page) => page + 1)}
          onPrev={() => setListPage((page) => Math.max(0, page - 1))}
          page={listPage}
          totalMatches={listTotalMatches}
          unit={title === '매장' ? '곳' : '명'}
          visibleCount={visibleAccounts.length}
        />
      ) : null}

      {canShowList ? (
        title === '디자이너' ? (
          <TestLoginAccountGrid
            accounts={visibleAccounts}
            loadingId={loadingId}
            onLogin={(account) => onLogin(account.id, account.email, account.password)}
          />
        ) : (
          <View style={[styles.card, collapsible && styles.cardIndented]}>
            {visibleAccounts.map((account, index) => (
              <AccountRow
                key={account.id}
                account={account}
                isLast={index === visibleAccounts.length - 1}
                loadingId={loadingId}
                onLogin={onLogin}
              />
            ))}
          </View>
        )
      ) : null}

      {canShowList && (isDesignerGroup || isRegisteredCustomerGroup || title === '매장') ? (
        <ListPagination
          hasMore={listHasMore}
          onNext={() => setListPage((page) => page + 1)}
          onPrev={() => setListPage((page) => Math.max(0, page - 1))}
          page={listPage}
          totalMatches={listTotalMatches}
          unit={title === '매장' ? '곳' : '명'}
          visibleCount={visibleAccounts.length}
        />
      ) : null}
    </View>
  );
}

function AccountRow({
  account,
  isLast,
  loadingId,
  onLogin,
}: {
  account: DemoLoginAccount;
  isLast: boolean;
  loadingId: string | null;
  onLogin: (id: string, email: string, password: string, redirectTo?: Href) => void;
}) {
  const isLoading = loadingId === account.id;

  return (
    <Pressable
      disabled={Boolean(loadingId)}
      onPress={() => onLogin(account.id, account.email, account.password)}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && !loadingId && styles.rowPressed,
      ]}>
      <View style={[styles.roleBadge, { backgroundColor: account.accent }]}>
        <Text style={styles.roleBadgeText}>{account.roleLabel}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{account.loginLabel}</Text>
        <Text style={styles.rowMeta}>
          {account.email} · {account.password}
        </Text>
        {typeof account.customerCount === 'number' ? (
          <Text style={styles.rowCustomerCount}>
            {formatDemoDesignerCustomerCount(account.customerCount)}
          </Text>
        ) : null}
        {account.meta ? <Text style={styles.rowMeta}>{account.meta}</Text> : null}
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.coral} size="small" />
      ) : (
        <Text style={styles.rowAction}>로그인</Text>
      )}
    </Pressable>
  );
}

function initialExpandedGroups(
  groupParam: string | string[] | undefined,
): Partial<Record<DemoLoginGroupKey, boolean>> {
  const raw = Array.isArray(groupParam) ? groupParam[0] : groupParam;

  if (!raw || raw === '기본' || !(DEMO_LOGIN_GROUP_ORDER as readonly string[]).includes(raw)) {
    return {};
  }

  return { [raw as DemoLoginGroupKey]: true };
}

export default function TestLoginScreen() {
  const { group: groupParam } = useLocalSearchParams<{ group?: string | string[] }>();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<
    Partial<Record<DemoLoginGroupKey, boolean>>
  >(() => initialExpandedGroups(groupParam));
  const [storeSearch, setStoreSearch] = useState('');
  const [designerSearch, setDesignerSearch] = useState('');
  const [signupCustomerSearch, setSignupCustomerSearch] = useState('');
  const routeExpandedGroups = useMemo(
    () => initialExpandedGroups(groupParam),
    [groupParam],
  );
  const activeExpandedGroups = useMemo(
    () => ({ ...routeExpandedGroups, ...expandedGroups }),
    [expandedGroups, routeExpandedGroups],
  );
  const demoLoginGroups = useMemo(() => getDemoLoginGroups(), []);

  const handleAccountLogin = useCallback(
    async (id: string, email: string, password: string, redirectTo?: Href) => {
      if (loadingId) {
        return;
      }

      try {
        setLoadingId(id);
        await signInAndNavigate(email, password, redirectTo ? { redirectTo } : undefined);
      } catch (error) {
        const message = getErrorMessage(error, '로그인에 실패했습니다.');
        showLoginFailureAlert(message);
      } finally {
        setLoadingId(null);
      }
    },
    [loadingId],
  );

  const toggleGroup = useCallback((title: DemoLoginGroupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  if (!isDemoAuthMode) {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableTitle}>테스트 계정 로그인</Text>
        <Text style={styles.unavailableText}>데모 모드에서만 사용할 수 있습니다.</Text>
        <Link href="/" asChild>
          <Pressable style={styles.backLink}>
            <Text style={styles.backLinkText}>로그인으로 돌아가기</Text>
          </Pressable>
        </Link>
        <AppVersionBadge pinned />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>테스트 계정</Text>
          <Text style={styles.subtitle}>탭하면 바로 로그인됩니다.</Text>
          <Link href="/connect-share" asChild>
            <Pressable style={({ pressed }) => [styles.connectShareLink, pressed && { opacity: 0.85 }]}>
              <Text style={styles.connectShareLinkText}>QR</Text>
            </Pressable>
          </Link>
        </View>

        {demoLoginGroups.map((group) => (
          <DemoLoginGroupSection
            key={group.title}
            accounts={group.accounts}
            description={group.description}
            expanded={Boolean(activeExpandedGroups[group.title])}
            groupSearch={
              group.title === '매장'
                ? storeSearch
                : group.title === '디자이너'
                  ? designerSearch
                  : signupCustomerSearch
            }
            loadingId={loadingId}
            onGroupSearchChange={
              group.title === '매장'
                ? setStoreSearch
                : group.title === '디자이너'
                  ? setDesignerSearch
                  : setSignupCustomerSearch
            }
            onLogin={(id, email, password) => void handleAccountLogin(id, email, password)}
            onToggle={() => toggleGroup(group.title)}
            title={group.title}
          />
        ))}

        <Pressable
          disabled={Boolean(loadingId)}
          onPress={() => navigateBackOrReplace('/')}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>일반 로그인으로 돌아가기</Text>
        </Pressable>

        <AppVersionBadge pinned />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 22,
    paddingTop: 56,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: colors.coral,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  connectShareLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 4,
  },
  connectShareLinkText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  group: {
    marginBottom: 18,
  },
  groupTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  groupDescription: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 4,
  },
  collapseHeader: {
    alignItems: 'center',
    backgroundColor: '#FFF8F8',
    borderColor: '#FFE0E1',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  collapseHeaderPressed: {
    opacity: 0.92,
  },
  collapseHeaderBody: {
    flex: 1,
    gap: 2,
  },
  collapseTrailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  collapseCount: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: '800',
  },
  collapseChevron: {
    color: '#9A9AAA',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#F8F8FC',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardIndented: {
    marginTop: 0,
  },
  searchPanel: {
    gap: 8,
    marginBottom: 10,
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
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  searchHint: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    paddingHorizontal: 2,
  },
  consonantRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  textTabRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 4,
  },
  textTab: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 4,
  },
  textTabSelected: {
    color: colors.coral,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  textTabEmpty: {
    opacity: 0.45,
  },
  textTabPressed: {
    opacity: 0.85,
  },
  paginationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  paginationLabel: {
    color: '#6B6B7B',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  paginationButton: {
    borderColor: '#E8E8F0',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationButtonPressed: {
    backgroundColor: '#F5F5F8',
  },
  paginationButtonText: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  paginationButtonTextDisabled: {
    color: '#9CA3AF',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomColor: '#ECECF4',
    borderBottomWidth: 1,
  },
  rowPressed: {
    backgroundColor: '#F0F0F8',
  },
  roleBadge: {
    borderRadius: 8,
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  rowMeta: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  rowCustomerCount: {
    color: '#00C2A8',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  rowAction: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '700',
  },
  unavailable: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  unavailableTitle: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  unavailableText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 24,
    padding: 8,
  },
  backLinkText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '700',
  },
});
