import { Link, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
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

import type { DemoLoginAccount } from '../lib/demo-login-account-types';
import { filterDemoLoginAccounts } from '../lib/demo-login-account-search';
import {
  ACCUMULATED_LOGIN_CUSTOMER_COUNT,
  DEMO_LOGIN_GROUP_ORDER,
  DESIGNER_LOGIN_COUNT,
  STORE_LOGIN_COUNT,
  demoLoginGroupListsAllWhenExpanded,
  getDemoLoginGroupCountLabel,
  getDemoLoginSearchPlaceholder,
  isSearchableDemoLoginGroup,
  type DemoLoginGroupKey,
} from '../lib/demo-login-groups-meta';
import { getBootstrapDemoLoginGroups } from '../lib/demo-login-static-groups';
import { CUSTOMER_CONSONANT_TABS, type CustomerConsonantTab } from '../lib/korean-consonant';
import { showLoginFailureAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/demo-auth-mode';
import { getErrorMessage } from '../lib/errors';
import { navigateBackOrReplace } from '../lib/navigation';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { colors } from '../lib/theme';
import { AppVersionBadge } from '../src/components/app-version-badge';
import { TestLoginAccountGrid } from '../src/components/test-login-account-grid';
import { WebPressable, webPressableStyle } from '../src/components/web-pressable';

function formatCustomerCountLabel(count: number) {
  return `고객 ${count.toLocaleString('ko-KR')}명`;
}

type DemoLoginGroupHeaderProps = {
  title: DemoLoginGroupKey;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
};

function DemoLoginGroupHeader({ title, description, expanded, onToggle }: DemoLoginGroupHeaderProps) {
  const countLabel = getDemoLoginGroupCountLabel(title);

  return (
    <WebPressable
      onPress={onToggle}
      style={webPressableStyle(
        [styles.collapseHeader, Platform.OS === 'web' && styles.collapseHeaderWeb],
        styles.collapseHeaderPressed,
      )}>
      <View style={styles.collapseHeaderBody} pointerEvents="none">
        <Text style={styles.groupTitle}>{title}</Text>
        {description ? <Text style={styles.groupDescription}>{description}</Text> : null}
      </View>
      <View style={styles.collapseTrailing} pointerEvents="none">
        <Text style={styles.collapseCount}>{countLabel}</Text>
        <Text style={styles.collapseChevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
    </WebPressable>
  );
}

type DemoLoginGroupPanelProps = {
  title: DemoLoginGroupKey;
  accounts: DemoLoginAccount[];
  designerListReady?: boolean;
  loadingId: string | null;
  groupSearch: string;
  onGroupSearchChange: (value: string) => void;
  onLogin: (id: string, email: string, password: string) => void;
};

type LinkedCustomerSearchResult = {
  accounts: DemoLoginAccount[];
  totalMatches: number;
  truncated: boolean;
};

function DemoLoginGroupPanel({
  title,
  accounts,
  designerListReady = true,
  loadingId,
  groupSearch,
  onGroupSearchChange,
  onLogin,
}: DemoLoginGroupPanelProps) {
  const [selectedConsonant, setSelectedConsonant] = useState<CustomerConsonantTab | null>(null);
  const [linkedCustomerSearch, setLinkedCustomerSearch] = useState<
    ((query: string, consonant?: CustomerConsonantTab | null) => LinkedCustomerSearchResult) | null
  >(null);
  const [generalSignupLoaded, setGeneralSignupLoaded] = useState(false);
  const isRegisteredCustomerGroup = title === '가입고객';
  const searchable = isSearchableDemoLoginGroup(title);
  const listAllWhenExpanded = demoLoginGroupListsAllWhenExpanded(title);

  useEffect(() => {
    if (!isRegisteredCustomerGroup) {
      return;
    }

    let cancelled = false;

    void import('../lib/demo-login-linked-customer-search').then((module) => {
      if (!cancelled) {
        setLinkedCustomerSearch(() => module.searchLinkedCustomerLoginAccounts);
      }

      void module.prefetchGeneralSignupCustomers().then(() => {
        if (!cancelled) {
          setGeneralSignupLoaded(true);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isRegisteredCustomerGroup]);

  const searchResult = useMemo(() => {
    if (!searchable) {
      return null;
    }

    if (isRegisteredCustomerGroup) {
      if (!linkedCustomerSearch) {
        return null;
      }

      return linkedCustomerSearch(groupSearch, selectedConsonant);
    }

    return filterDemoLoginAccounts(accounts, groupSearch, null);
  }, [
    accounts,
    generalSignupLoaded,
    groupSearch,
    isRegisteredCustomerGroup,
    linkedCustomerSearch,
    searchable,
    selectedConsonant,
  ]);

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

  const showSearchPanel = searchable;
  const canShowList =
    designerListReady &&
    visibleAccounts.length > 0 &&
    (!searchable ||
      listAllWhenExpanded ||
      searchQuery.length > 0 ||
      Boolean(hasConsonantFilter));

  const registeredCustomerHint = () => {
    if (selectedConsonant) {
      const total = searchResult?.totalMatches ?? 0;

      if (total === 0) {
        return `${selectedConsonant} · 해당 초성 고객이 없습니다`;
      }

      if (searchResult?.truncated) {
        return `${selectedConsonant} · ${total.toLocaleString('ko-KR')} 명 · 상위 ${visibleAccounts.length.toLocaleString('ko-KR')} 명 표시`;
      }

      return `${selectedConsonant} · ${total.toLocaleString('ko-KR')} 명 · 탭하면 로그인`;
    }

    return `총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT.toLocaleString('ko-KR')} 명+ — 이름·이메일 검색(1자+) · 일반가입 포함 · 초성은 데모·베타·일반`;
  };

  return (
    <View style={styles.groupPanel}>
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

                return (
                  <WebPressable
                    key={tab}
                    onPress={() => setSelectedConsonant(selected ? null : tab)}
                    style={webPressableStyle(
                      [styles.consonantTab, selected && styles.consonantTabSelected],
                      styles.consonantTabPressed,
                    )}>
                    <Text
                      style={[
                        styles.consonantTabText,
                        selected && styles.consonantTabTextSelected,
                      ]}>
                      {tab}
                    </Text>
                  </WebPressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Text style={styles.searchHint}>
            {!linkedCustomerSearch && isRegisteredCustomerGroup
              ? '가입고객 검색 모듈 불러오는 중…'
              : !designerListReady && title === '디자이너'
              ? '목록 준비 중… 잠시 후 검색해 주세요'
              : searchQuery
              ? searchResult?.totalMatches === 0
                ? '검색 결과가 없습니다.'
                : searchResult?.truncated
                  ? `${searchResult.totalMatches.toLocaleString('ko-KR')} 명 일치 · 상위 ${visibleAccounts.length.toLocaleString('ko-KR')} 명 표시`
                  : `${(searchResult?.totalMatches ?? 0).toLocaleString('ko-KR')} 명 표시`
              : listAllWhenExpanded
                ? title === '매장'
                  ? `총 ${STORE_LOGIN_COUNT.toLocaleString('ko-KR')} 곳 · 아래에서 탭하면 로그인`
                  : `총 ${DESIGNER_LOGIN_COUNT.toLocaleString('ko-KR')} 명 · 탭하면 로그인`
                : title === '디자이너'
                  ? `총 ${DESIGNER_LOGIN_COUNT.toLocaleString('ko-KR')} 명 · 검색(예: fleet, 증원, test-fleet-001) 후 타일 탭`
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
          <View style={styles.card}>
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
    <WebPressable
      disabled={Boolean(loadingId)}
      onPress={() => onLogin(account.id, account.email, account.password)}
      style={webPressableStyle(
        [styles.row, !isLast && styles.rowBorder],
        !loadingId ? styles.rowPressed : undefined,
      )}>
      <View style={[styles.roleBadge, { backgroundColor: account.accent }]}>
        <Text style={styles.roleBadgeText}>{account.roleLabel}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{account.displayName ?? account.loginLabel}</Text>
        <Text style={styles.rowMeta}>
          {account.email} · {account.password}
        </Text>
        {typeof account.customerCount === 'number' ? (
          <Text style={styles.rowCustomerCount}>
            {formatCustomerCountLabel(account.customerCount)}
          </Text>
        ) : null}
        {account.meta ? <Text style={styles.rowMeta}>{account.meta}</Text> : null}
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.coral} size="small" />
      ) : (
        <Text style={styles.rowAction}>로그인</Text>
      )}
    </WebPressable>
  );
}

function resolveInitialOpenGroup(
  groupParam: string | string[] | undefined,
): DemoLoginGroupKey | null {
  const raw = Array.isArray(groupParam) ? groupParam[0] : groupParam;

  if (!raw || raw === '기본' || !(DEMO_LOGIN_GROUP_ORDER as readonly string[]).includes(raw)) {
    return null;
  }

  return raw as DemoLoginGroupKey;
}

export default function TestLoginScreen() {
  const { group: groupParam } = useLocalSearchParams<{ group?: string | string[] }>();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<DemoLoginGroupKey | null>(() =>
    resolveInitialOpenGroup(groupParam),
  );
  const [storeSearch, setStoreSearch] = useState('');
  const [designerSearch, setDesignerSearch] = useState('');
  const [signupCustomerSearch, setSignupCustomerSearch] = useState('');
  const [demoLoginGroups, setDemoLoginGroups] = useState<
    ReturnType<typeof getBootstrapDemoLoginGroups>
  >([]);
  const [designerAccounts, setDesignerAccounts] = useState<DemoLoginAccount[]>([]);
  const [mountedGroups, setMountedGroups] = useState<Set<DemoLoginGroupKey>>(
    () => new Set(openGroup ? [openGroup] : []),
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    setDemoLoginGroups(getBootstrapDemoLoginGroups());
  }, []);

  useEffect(() => {
    if (openGroup !== '디자이너' || designerAccounts.length > 0) {
      return;
    }

    let cancelled = false;

    void import('../lib/demo-login-designer-accounts').then((module) => {
      if (!cancelled) {
        setDesignerAccounts(module.getDesignerLoginAccounts());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [designerAccounts.length, openGroup]);

  useEffect(() => {
    if (!openGroup) {
      return;
    }

    setMountedGroups((current) => {
      if (current.has(openGroup)) {
        return current;
      }

      const next = new Set(current);
      next.add(openGroup);
      return next;
    });
  }, [openGroup]);

  const handleAccountLogin = useCallback(
    async (id: string, email: string, password: string, redirectTo?: Href) => {
      if (loadingId) {
        return;
      }

      setLoadingId(id);

      try {
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
    startTransition(() => {
      setOpenGroup((current) => (current === title ? null : title));
    });
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
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>테스트 계정</Text>
          <Text style={styles.subtitle}>아래 그룹에서 검색 후 로그인</Text>
          <Link href="/connect-share" asChild>
            <Pressable style={({ pressed }) => [styles.connectShareLink, pressed && { opacity: 0.85 }]}>
              <Text style={styles.connectShareLinkText}>QR</Text>
            </Pressable>
          </Link>
        </View>

        {demoLoginGroups.length === 0 ? (
          <View style={styles.bootLoading}>
            <ActivityIndicator color={colors.coral} size="small" />
            <Text style={styles.bootLoadingText}>목록 불러오는 중…</Text>
          </View>
        ) : null}

        {demoLoginGroups.map((group) => {
          const expanded = openGroup === group.title;

          return (
            <View key={group.title} style={styles.group}>
              <DemoLoginGroupHeader
                description={group.description}
                expanded={expanded}
                onToggle={() => toggleGroup(group.title)}
                title={group.title}
              />
              {mountedGroups.has(group.title) ? (
                <View
                  style={[styles.groupPanelMount, !expanded && styles.groupPanelMountHidden]}
                  pointerEvents={expanded ? 'auto' : 'none'}>
                  <DemoLoginGroupPanel
                    accounts={group.title === '디자이너' ? designerAccounts : group.accounts}
                    designerListReady={group.title !== '디자이너' || designerAccounts.length > 0}
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
                    title={group.title}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        <WebPressable
          disabled={Boolean(loadingId)}
          onPress={() => navigateBackOrReplace('/')}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>일반 로그인으로 돌아가기</Text>
        </WebPressable>

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
  bootLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  bootLoadingText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  group: {
    marginBottom: 18,
  },
  groupPanel: {
    gap: 0,
  },
  groupPanelMount: {
    width: '100%',
  },
  groupPanelMountHidden: {
    display: 'none',
    height: 0,
    overflow: 'hidden',
  },
  groupLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  groupLoadingText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
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
  collapseHeaderWeb: {
    cursor: 'pointer',
  } as const,
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
