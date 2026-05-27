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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ACCUMULATED_DESIGNER_LOGIN_HINT,
  ACCUMULATED_DESIGNER_SHORTCUTS,
  PRIMARY_ACCUMULATED_DESIGNER,
  type AccumulatedDesignerShortcut,
} from '../lib/accumulated-designer-shortcuts';
import { showLoginFailureAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { colors } from '../lib/theme';

export default function AccumDesignerLoginScreen() {
  const insets = useSafeAreaInsets();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (shortcut: AccumulatedDesignerShortcut) => {
      if (loadingId) {
        return;
      }

      try {
        setLoadingId(shortcut.id);
        await signInAndNavigate(shortcut.email, shortcut.password);
      } catch (error) {
        const message = getErrorMessage(error, '로그인에 실패했습니다.');
        showLoginFailureAlert(message);
      } finally {
        setLoadingId(null);
      }
    },
    [loadingId],
  );

  if (!isDemoAuthMode) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.title}>누적 테스트 디자이너</Text>
        <Text style={styles.unavailable}>데모 모드에서만 사용할 수 있습니다.</Text>
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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>로그인</Text>
        </Pressable>

        <Text style={styles.title}>누적 테스트 디자이너</Text>
        <Text style={styles.subtitle}>
          탭하면 바로 로그인됩니다. 비밀번호 공통: {ACCUMULATED_DESIGNER_LOGIN_HINT.password}
        </Text>

        <Pressable
          disabled={Boolean(loadingId)}
          onPress={() => void handleLogin(PRIMARY_ACCUMULATED_DESIGNER)}
          style={({ pressed }) => [
            styles.primaryCard,
            pressed && !loadingId && styles.cardPressed,
          ]}>
          <Text style={styles.primaryBadge}>바로가기</Text>
          <Text style={styles.primaryTitle}>{PRIMARY_ACCUMULATED_DESIGNER.loginLabel}</Text>
          {PRIMARY_ACCUMULATED_DESIGNER.meta ? (
            <Text style={styles.primaryMeta}>{PRIMARY_ACCUMULATED_DESIGNER.meta}</Text>
          ) : null}
          <Text style={styles.primaryEmail}>{PRIMARY_ACCUMULATED_DESIGNER.email}</Text>
          {loadingId === PRIMARY_ACCUMULATED_DESIGNER.id ? (
            <ActivityIndicator color="#FFFFFF" style={styles.primaryLoader} />
          ) : (
            <Text style={styles.primaryAction}>탭하여 접속</Text>
          )}
        </Pressable>

        <Text style={styles.sectionLabel}>다른 프로필</Text>

        {ACCUMULATED_DESIGNER_SHORTCUTS.filter(
          (item) => item.id !== PRIMARY_ACCUMULATED_DESIGNER.id,
        ).map((shortcut) => {
          const isLoading = loadingId === shortcut.id;

          return (
            <Pressable
              key={shortcut.id}
              disabled={Boolean(loadingId)}
              onPress={() => void handleLogin(shortcut)}
              style={({ pressed }) => [styles.row, pressed && !loadingId && styles.cardPressed]}>
              <View style={[styles.rowAccent, { backgroundColor: shortcut.accent }]}>
                <Text style={styles.rowAccentText}>{shortcut.profileKey}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{shortcut.loginLabel}</Text>
                <Text style={styles.rowMeta}>{shortcut.email}</Text>
                {shortcut.meta ? <Text style={styles.rowMeta}>{shortcut.meta}</Text> : null}
              </View>
              {isLoading ? (
                <ActivityIndicator color={colors.coral} size="small" />
              ) : (
                <Text style={styles.rowAction}>접속</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  scroll: {
    paddingHorizontal: 22,
  },
  backRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
    paddingVertical: 4,
  },
  backChevron: {
    color: colors.coral,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
  backText: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 8,
  },
  primaryCard: {
    backgroundColor: '#E85D4C',
    borderRadius: 18,
    gap: 6,
    marginBottom: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  primaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  primaryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  primaryMeta: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  primaryEmail: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  primaryAction: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  primaryLoader: {
    marginTop: 10,
  },
  sectionLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#F8F8FC',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardPressed: {
    opacity: 0.9,
  },
  rowAccent: {
    borderRadius: 10,
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rowAccentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: '#1A1A2E',
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: '800',
  },
  unavailable: {
    color: '#6B6B7B',
    fontSize: 14,
    marginTop: 12,
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
