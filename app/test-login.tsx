import { Link, router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  getDemoLoginGroupCountLabel,
  DEMO_LOGIN_GROUP_ORDER,
  getDemoLoginGroups,
  type DemoLoginAccount,
  type DemoLoginGroupKey,
  demoLoginGroupListsAllWhenExpanded,
  getDemoLoginSearchPlaceholder,
  isCollapsibleDemoLoginGroup,
  isSearchableDemoLoginGroup,
} from '../lib/demo-login-accounts';
import { filterDemoLoginAccounts } from '../lib/demo-login-account-search';
import {
  countAccountsByCustomerConsonant,
  CUSTOMER_CONSONANT_TABS,
  type CustomerConsonantTab,
} from '../lib/korean-consonant';
import { showConfirmAlert, showLoginFailureAlert, showSuccessAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/auth';
import { clearAccumulatedDemoCache } from '../lib/demo-accumulated-cache-reset';
import { getErrorMessage } from '../lib/errors';
import { navigateBackOrReplace } from '../lib/navigation';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { formatDemoDesignerCustomerCount } from '../lib/demo-designer-customer-counts';
import { colors } from '../lib/theme';
import { AppVersionBadge } from '../src/components/app-version-badge';
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
  const [selectedConsonant, setSelectedConsonant] = useState<CustomerConsonantTab | null>(null);
  const isRegisteredCustomerGroup = title === '가입고객';
  const collapsible = isCollapsibleDemoLoginGroup(title);
  const searchable = isSearchableDemoLoginGroup(title);
  const listAllWhenExpanded = demoLoginGroupListsAllWhenExpanded(title);
  const countLabel = getDemoLoginGroupCountLabel(title);
  const consonantCounts = useMemo(
    () => (isRegisteredCustomerGroup ? countAccountsByCustomerConsonant(accounts) : null),
    [accounts, isRegisteredCustomerGroup],
  );

  const searchResult = useMemo(() => {
    if (!searchable) {
      return null;
    }

    return filterDemoLoginAccounts(
      accounts,
      groupSearch,
      isRegisteredCustomerGroup ? selectedConsonant : null,
    );
  }, [accounts, groupSearch, isRegisteredCustomerGroup, searchable, selectedConsonant]);

  const searchQuery = groupSearch.trim();
  const hasConsonantFilter = isRegisteredCustomerGroup && selectedConsonant;
  const visibleAccounts = useMemo(() => {
    if (!searchable) {
      return accounts;
    }

    if (isRegisteredCustomerGroup) {
      if (hasConsonantFilter || searchQuery) {
        return searchResult?.accounts ?? [];
      }

      return [];
    }

    if (!searchQuery && listAllWhenExpanded) {
      return accounts;
    }

    return searchResult?.accounts ?? [];
  }, [
    accounts,
    hasConsonantFilter,
    isRegisteredCustomerGroup,
    listAllWhenExpanded,
    searchQuery,
    searchResult,
    searchable,
  ]);

  const showSearchPanel = searchable && expanded;
  const canShowList =
    visibleAccounts.length > 0 &&
    (!collapsible || expanded) &&
    (!searchable ||
      listAllWhenExpanded ||
      searchQuery.length > 0 ||
      Boolean(hasConsonantFilter));

  const registeredCustomerHint = () => {
    if (selectedConsonant) {
      const total = searchResult?.totalMatches ?? consonantCounts?.[selectedConsonant] ?? 0;

      if (total === 0) {
        return `${selectedConsonant} · 해당 초성 고객이 없습니다`;
      }

      if (searchResult?.truncated) {
        return `${selectedConsonant} · ${total.toLocaleString('ko-KR')} 명 · 상위 ${visibleAccounts.length.toLocaleString('ko-KR')} 명 표시`;
      }

      return `${selectedConsonant} · ${total.toLocaleString('ko-KR')} 명 · 탭하면 로그인`;
    }

    return `총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT.toLocaleString('ko-KR')} 명(디자이너 연동 전체) — 초성 탭을 선택하거나 검색어를 입력하세요`;
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
            onChangeText={onGroupSearchChange}
            placeholder={getDemoLoginSearchPlaceholder(title)}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={groupSearch}
          />

          {isRegisteredCustomerGroup ? (
            <ScrollView
              horizontal
              contentContainerStyle={styles.consonantRow}
              showsHorizontalScrollIndicator={false}>
              {CUSTOMER_CONSONANT_TABS.map((tab) => {
                const selected = selectedConsonant === tab;
                const count = consonantCounts?.[tab] ?? 0;

                return (
                  <Pressable
                    key={tab}
                    onPress={() => setSelectedConsonant(selected ? null : tab)}
                    style={({ pressed }) => [
                      styles.consonantTab,
                      selected && styles.consonantTabSelected,
                      count === 0 && styles.consonantTabEmpty,
                      pressed && styles.consonantTabPressed,
                    ]}>
                    <Text
                      style={[
                        styles.consonantTabText,
                        selected && styles.consonantTabTextSelected,
                        count === 0 && styles.consonantTabTextEmpty,
                      ]}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Text style={styles.searchHint}>
            {searchQuery
              ? searchResult?.totalMatches === 0
                ? '검색 결과가 없습니다.'
                : searchResult?.truncated
                  ? `${searchResult.totalMatches.toLocaleString('ko-KR')} 명 일치 · 상위 ${visibleAccounts.length.toLocaleString('ko-KR')} 명 표시`
                  : `${(searchResult?.totalMatches ?? 0).toLocaleString('ko-KR')} 명 표시`
              : listAllWhenExpanded
                ? title === '매장'
                  ? `총 ${STORE_LOGIN_COUNT.toLocaleString('ko-KR')} 곳 · 아래에서 탭하면 로그인`
                  : `총 ${DESIGNER_LOGIN_COUNT.toLocaleString('ko-KR')} 명 · 홈·고객·시술·매출·계정 · 탭하면 로그인`
                : isRegisteredCustomerGroup
                  ? registeredCustomerHint()
                  : `총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT.toLocaleString('ko-KR')} 명(디자이너 연동 전체) — 검색어를 입력하면 목록이 표시됩니다`}
          </Text>
        </View>
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
  const [isClearingCache, setIsClearingCache] = useState(false);
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
  const demoLoginGroups = useMemo(
    () =>
      getDemoLoginGroups({
        includeRegisteredCustomers: Boolean(activeExpandedGroups['가입고객']),
      }),
    [activeExpandedGroups],
  );

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

  const handleClearAccumulatedCache = useCallback(() => {
    if (loadingId || isClearingCache) {
      return;
    }

    showConfirmAlert({
      title: '누적 캐시 삭제',
      message:
        '누적 테스트 시술·결제·패치·관계 캐시를 삭제합니다.\n다음 로그인 시 시드가 다시 불러와집니다.',
      confirmLabel: '삭제',
      destructive: true,
      onConfirm: () => {
        setIsClearingCache(true);

        clearAccumulatedDemoCache()
          .then((result) => {
            showSuccessAlert(
              `시술 ${result.removedTreatments}건 · 결제 ${result.removedPayments}건 · 관계 ${result.removedRelationships}건 캐시를 삭제했습니다.`,
            );
          })
          .catch((error) => {
            showLoginFailureAlert(getErrorMessage(error, '누적 캐시 삭제에 실패했습니다.'));
          })
          .finally(() => {
            setIsClearingCache(false);
          });
      },
    });
  }, [isClearingCache, loadingId]);

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
          disabled={Boolean(loadingId) || isClearingCache}
          onPress={handleClearAccumulatedCache}
          style={({ pressed }) => [
            styles.cacheClearButton,
            (loadingId || isClearingCache) && styles.cacheClearButtonDisabled,
            pressed && !loadingId && !isClearingCache && styles.cacheClearButtonPressed,
          ]}>
          {isClearingCache ? (
            <ActivityIndicator color="#6B6B7B" size="small" />
          ) : (
            <Text style={styles.cacheClearButtonText}>누적 캐시 삭제</Text>
          )}
        </Pressable>

        <Pressable
          disabled={Boolean(loadingId) || isClearingCache}
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
  consonantTab: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  consonantTabSelected: {
    backgroundColor: '#FFE8EA',
    borderColor: colors.coral,
  },
  consonantTabEmpty: {
    opacity: 0.45,
  },
  consonantTabPressed: {
    opacity: 0.88,
  },
  consonantTabText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  consonantTabTextSelected: {
    color: colors.coral,
  },
  consonantTabTextEmpty: {
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
  cacheClearButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cacheClearButtonDisabled: {
    opacity: 0.6,
  },
  cacheClearButtonPressed: {
    backgroundColor: '#ECECF4',
  },
  cacheClearButtonText: {
    color: '#6B6B7B',
    fontSize: 14,
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
