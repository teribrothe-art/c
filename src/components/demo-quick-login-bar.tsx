import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { DEMO_LOGIN_HINT } from '../../lib/auth';
import { isDemoAuthMode } from '../../lib/demo-mode';
import { getErrorMessage } from '../../lib/errors';
import { signInAndNavigate } from '../../lib/quick-login-flow';
import { showLoginFailureAlert } from '../../lib/alerts';
import { colors } from '../../lib/theme';

type DemoQuickLoginBarProps = {
  disabled?: boolean;
};

export function DemoQuickLoginBar({ disabled = false }: DemoQuickLoginBarProps) {
  const [loadingRole, setLoadingRole] = useState<'customer' | 'designer' | null>(null);

  const handleQuickLogin = useCallback(
    async (role: 'customer' | 'designer') => {
      if (disabled || loadingRole) {
        return;
      }

      const email =
        role === 'customer' ? DEMO_LOGIN_HINT.customerEmail : DEMO_LOGIN_HINT.designerEmail;
      const password =
        role === 'customer'
          ? DEMO_LOGIN_HINT.customerPassword
          : DEMO_LOGIN_HINT.designerPassword;

      try {
        setLoadingRole(role);
        await signInAndNavigate(email, password);
      } catch (error) {
        showLoginFailureAlert(getErrorMessage(error, '데모 로그인에 실패했습니다.'));
      } finally {
        setLoadingRole(null);
      }
    },
    [disabled, loadingRole],
  );

  if (!isDemoAuthMode) {
    return null;
  }

  const platformHint =
    Platform.OS === 'web'
      ? '브라우저에서 바로 체험'
      : Platform.OS === 'ios' || Platform.OS === 'android'
        ? 'Expo Go·앱에서 바로 체험'
        : '웹·휴대폰에서 바로 체험';

  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>데모 모드</Text>
      <Text style={styles.hint}>{platformHint} · 탭하면 즉시 로그인</Text>
      <View style={styles.row}>
        <Pressable
          disabled={disabled || Boolean(loadingRole)}
          onPress={() => void handleQuickLogin('customer')}
          style={({ pressed }) => [
            styles.chip,
            styles.chipCustomer,
            pressed && !loadingRole && styles.chipPressed,
          ]}>
          {loadingRole === 'customer' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.chipText}>고객 데모</Text>
          )}
        </Pressable>
        <Pressable
          disabled={disabled || Boolean(loadingRole)}
          onPress={() => void handleQuickLogin('designer')}
          style={({ pressed }) => [
            styles.chip,
            styles.chipDesigner,
            pressed && !loadingRole && styles.chipPressed,
          ]}>
          {loadingRole === 'designer' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.chipText}>디자이너 데모</Text>
          )}
        </Pressable>
      </View>
      <Text style={styles.credentialHint}>
        {DEMO_LOGIN_HINT.customerEmail} / {DEMO_LOGIN_HINT.designerEmail} · 비밀번호 demo1234
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'stretch',
    backgroundColor: '#FFF8F8',
    borderColor: '#FFE0E1',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.coral,
    borderRadius: 6,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hint: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipCustomer: {
    backgroundColor: colors.coral,
  },
  chipDesigner: {
    backgroundColor: colors.purple,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  credentialHint: {
    color: '#9A9AAA',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
});
