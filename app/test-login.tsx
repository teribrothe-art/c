import { Link, router } from 'expo-router';
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
  DEMO_LOGIN_GROUPS,
  type DemoLoginAccount,
  type DemoLoginGroupKey,
  isCollapsibleDemoLoginGroup,
  isSearchableDemoLoginGroup,
} from '../lib/demo-login-accounts';
import { filterDemoLoginCustomerAccounts } from '../lib/demo-login-customer-search';
import { showLoginFailureAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { colors } from '../lib/theme';
import { AppVersionBadge } from '../src/components/app-version-badge';

type DemoLoginGroupSectionProps = {
  title: DemoLoginGroupKey;
  description?: string;
  accounts: DemoLoginAccount[];
  expanded: boolean;
  loadingId: string | null;
  signupCustomerSearch: string;
  onToggle: () => void;
  onSignupCustomerSearchChange: (value: string) => void;
  onLogin: (id: string, email: string, password: string) => void;
};

function DemoLoginGroupSection({
  title,
  description,
  accounts,
  expanded,
  loadingId,
  signupCustomerSearch,
  onToggle,
  onSignupCustomerSearchChange,
  onLogin,
}: DemoLoginGroupSectionProps) {
  const collapsible = isCollapsibleDemoLoginGroup(title);
  const searchable = isSearchableDemoLoginGroup(title);
  const countLabel = `${accounts.length}명`;

  const customerSearchResult = useMemo(() => {
    if (!searchable) {
      return null;
    }

    return filterDemoLoginCustomerAccounts(accounts, signupCustomerSearch);
  }, [accounts, searchable, signupCustomerSearch]);

  const visibleAccounts = searchable ? (customerSearchResult?.accounts ?? []) : accounts;
  const searchQuery = signupCustomerSearch.trim();
  const showSearchPanel = searchable && expanded;

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
            onChangeText={onSignupCustomerSearchChange}
            placeholder="이름 · 이메일 · 1년/2년/5년 누적"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={signupCustomerSearch}
          />
          <Text style={styles.searchHint}>
            {searchQuery
              ? customerSearchResult?.totalMatches === 0
                ? '검색 결과가 없습니다.'
                : customerSearchResult?.truncated
                  ? `${customerSearchResult.totalMatches}명 일치 · 상위 ${visibleAccounts.length}명 표시`
                  : `${customerSearchResult?.totalMatches ?? 0}명 표시`
              : `총 ${ACCUMULATED_LOGIN_CUSTOMER_COUNT}명 — 검색어를 입력하면 목록이 표시됩니다`}
          </Text>
        </View>
      ) : null}

      {(!collapsible || expanded) && (!searchable || searchQuery.length > 0) && visibleAccounts.length > 0 ? (
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
  onLogin: (id: string, email: string, password: string) => void;
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

export default function TestLoginScreen() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Partial<Record<DemoLoginGroupKey, boolean>>>(
    {},
  );
  const [signupCustomerSearch, setSignupCustomerSearch] = useState('');

  const handleAccountLogin = useCallback(async (id: string, email: string, password: string) => {
    if (loadingId) {
      return;
    }

    try {
      setLoadingId(id);
      await signInAndNavigate(email, password);
    } catch (error) {
      const message = getErrorMessage(error, '로그인에 실패했습니다.');
      showLoginFailureAlert(message);
    } finally {
      setLoadingId(null);
    }
  }, [loadingId]);

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
        </View>

        {DEMO_LOGIN_GROUPS.map((group) => (
          <DemoLoginGroupSection
            key={group.title}
            accounts={group.accounts}
            description={group.description}
            expanded={Boolean(expandedGroups[group.title])}
            loadingId={loadingId}
            onLogin={(id, email, password) => void handleAccountLogin(id, email, password)}
            onSignupCustomerSearchChange={setSignupCustomerSearch}
            onToggle={() => toggleGroup(group.title)}
            signupCustomerSearch={signupCustomerSearch}
            title={group.title}
          />
        ))}

        <Pressable
          disabled={Boolean(loadingId)}
          onPress={() => router.back()}
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
