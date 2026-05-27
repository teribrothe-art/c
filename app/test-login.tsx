import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DEMO_LOGIN_GROUPS } from '../lib/demo-login-accounts';
import { showLoginFailureAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { colors } from '../lib/theme';

export default function TestLoginScreen() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.accounts.map((account, index) => {
                const isLoading = loadingId === account.id;
                const isLast = index === group.accounts.length - 1;

                return (
                  <Pressable
                    key={account.id}
                    disabled={Boolean(loadingId)}
                    onPress={() => void handleAccountLogin(account.id, account.email, account.password)}
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
              })}
            </View>
          </View>
        ))}

        <Pressable
          disabled={Boolean(loadingId)}
          onPress={() => router.back()}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>일반 로그인으로 돌아가기</Text>
        </Pressable>
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
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#F8F8FC',
    borderRadius: 14,
    overflow: 'hidden',
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
