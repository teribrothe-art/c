import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { redeemInviteForCurrentUser } from '../lib/apply-pending-invite';
import { ADMIN_TEST_PUBLIC } from '../lib/admin-test-accounts';
import { STORE_TEST_PUBLIC } from '../lib/store-test-accounts';
import { getPostAuthRoute } from '../lib/auth-redirect';
import { getCurrentUser, isDemoAuthMode, signInWithEmail } from '../lib/auth';
import { ACCUMULATED_TEST_DESIGNERS_PUBLIC } from '../lib/demo-accumulated-test-accounts';
import { ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE } from '../lib/demo-accumulated-test-data';
import { peekPendingInviteCode } from '../lib/pending-invite-code';
import { showLoginFailureAlert } from '../lib/alerts';
import { getErrorMessage } from '../lib/errors';
import { colors, disabledButtonStyle } from '../lib/theme';
import { validateEmail } from '../lib/validation';
import { InlineFieldError } from '../src/components/inline-field-error';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isSubmitDisabled = isLoading;

  const validateForm = () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = !password ? '비밀번호를 입력해주세요.' : null;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    return !nextEmailError && !nextPasswordError;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    const trimmedEmail = email.trim();

    try {
      setIsLoading(true);
      setLoginError(null);
      await signInWithEmail({ email: trimmedEmail, password });

      const user = await getCurrentUser();
      const pendingInvite = await peekPendingInviteCode();

      if (user?.role === 'customer' && pendingInvite.length === 6) {
        const redeemed = await redeemInviteForCurrentUser(pendingInvite);

        if (redeemed) {
          return;
        }
      }

      const nextRoute = await getPostAuthRoute();
      router.replace(nextRoute);
    } catch (error) {
      const message = getErrorMessage(error, '이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoginError(message);
      showLoginFailureAlert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (accountEmail: string, accountPassword: string) => {
    if (isLoading) {
      return;
    }

    setEmail(accountEmail);
    setPassword(accountPassword);
    setLoginError(null);
    setEmailError(null);
    setPasswordError(null);

    try {
      setIsLoading(true);
      await signInWithEmail({ email: accountEmail, password: accountPassword });

      const user = await getCurrentUser();
      const pendingInvite = await peekPendingInviteCode();

      if (user?.role === 'customer' && pendingInvite.length === 6) {
        const redeemed = await redeemInviteForCurrentUser(pendingInvite);

        if (redeemed) {
          return;
        }
      }

      const nextRoute = await getPostAuthRoute();
      router.replace(nextRoute);
    } catch (error) {
      const message = getErrorMessage(error, '이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoginError(message);
      showLoginFailureAlert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDesignerLogin = async (
    designer: (typeof ACCUMULATED_TEST_DESIGNERS_PUBLIC)[number],
  ) => {
    await handleQuickLogin(designer.email, designer.password);
  };

  const inputBorder = useMemo(
    () => ({
      email: emailError ? styles.inputError : null,
      password: passwordError ? styles.inputError : null,
    }),
    [emailError, passwordError],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>AI 헤어 다이어리</Text>
          <View style={styles.form}>
          <View>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
              keyboardType="email-address"
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) {
                  setEmailError(null);
                }
              }}
              placeholder="이메일"
              placeholderTextColor="#A0A0A0"
              style={[styles.input, inputBorder.email]}
              value={email}
            />
            <InlineFieldError message={emailError} />
          </View>

          <View>
            <TextInput
              autoCapitalize="none"
              editable={!isLoading}
              onChangeText={(value) => {
                setPassword(value);
                if (passwordError) {
                  setPasswordError(null);
                }
                if (loginError) {
                  setLoginError(null);
                }
              }}
              onSubmitEditing={() => void handleLogin()}
              placeholder="비밀번호"
              placeholderTextColor="#A0A0A0"
              returnKeyType="go"
              secureTextEntry
              style={[styles.input, inputBorder.password]}
              value={password}
            />
            <InlineFieldError message={passwordError} />
          </View>

          <InlineFieldError message={loginError} />

          <Pressable
            disabled={isSubmitDisabled}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginButton,
              isSubmitDisabled && styles.loginButtonDisabled,
              pressed && !isSubmitDisabled && styles.loginButtonPressed,
            ]}>
            <Text style={styles.loginButtonText}>{isLoading ? '로그인 중...' : '로그인'}</Text>
          </Pressable>
        </View>

          {isDemoAuthMode ? (
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>데모 · 기능 확인용</Text>
              <View style={styles.demoDesignerBlock}>
                <Pressable
                  disabled={isLoading}
                  onPress={() => void handleQuickLogin(STORE_TEST_PUBLIC.email, STORE_TEST_PUBLIC.password)}
                  style={({ pressed }) => [
                    styles.demoButton,
                    styles.demoButtonStore,
                    pressed && styles.demoButtonPressed,
                  ]}>
                  <Text style={styles.demoButtonText}>{STORE_TEST_PUBLIC.loginLabel}</Text>
                </Pressable>
                <Text style={styles.demoMeta}>ID {STORE_TEST_PUBLIC.id}</Text>
                <Text style={styles.demoMeta}>
                  {STORE_TEST_PUBLIC.email} / {STORE_TEST_PUBLIC.password}
                </Text>
              </View>
              <View style={styles.demoDesignerBlock}>
                <Pressable
                  disabled={isLoading}
                  onPress={() => void handleQuickLogin(ADMIN_TEST_PUBLIC.email, ADMIN_TEST_PUBLIC.password)}
                  style={({ pressed }) => [
                    styles.demoButton,
                    styles.demoButtonAdmin,
                    pressed && styles.demoButtonPressed,
                  ]}>
                  <Text style={styles.demoButtonText}>{ADMIN_TEST_PUBLIC.loginLabel}</Text>
                </Pressable>
                <Text style={styles.demoMeta}>ID {ADMIN_TEST_PUBLIC.id}</Text>
                <Text style={styles.demoMeta}>
                  {ADMIN_TEST_PUBLIC.email} / {ADMIN_TEST_PUBLIC.password}
                </Text>
              </View>
              {ACCUMULATED_TEST_DESIGNERS_PUBLIC.map((designer) => {
                const stats = ACCUMULATED_DEMO_SEED_STATS_BY_PROFILE[designer.profileKey];
                const buttonStyle =
                  designer.profileKey === '1y'
                    ? styles.demoButton1y
                    : designer.profileKey === '3y'
                      ? styles.demoButton3y
                      : styles.demoButton2y;

                return (
                  <View key={designer.id} style={styles.demoDesignerBlock}>
                    <Pressable
                      disabled={isLoading}
                      onPress={() => void handleTestDesignerLogin(designer)}
                      style={({ pressed }) => [
                        styles.demoButton,
                        buttonStyle,
                        pressed && styles.demoButtonPressed,
                      ]}>
                      <Text style={styles.demoButtonText}>{designer.loginLabel} 로그인</Text>
                    </Pressable>
                    <Text style={styles.demoMeta}>ID {designer.id}</Text>
                    <Text style={styles.demoMeta}>
                      {designer.email} / {designer.password}
                    </Text>
                    {stats ? (
                      <Text style={styles.demoMeta}>
                        시술 {stats.treatmentCount}건 · 고객 {stats.customerCount}명 ·{' '}
                        {stats.yearSpanLabel}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          <Link href="/signup" asChild>
            <Pressable disabled={isLoading} style={styles.signupLink}>
              <Text style={styles.signupLinkText}>회원가입</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: colors.coral,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 56,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 14,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    color: '#222222',
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: colors.error,
  },
  loginButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.coral,
    marginTop: 8,
    paddingVertical: 16,
  },
  loginButtonDisabled: {
    ...disabledButtonStyle,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  signupLink: {
    marginTop: 28,
    padding: 8,
  },
  signupLinkText: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '600',
  },
  demoBox: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#F8F8FC',
    borderRadius: 14,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  demoTitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  demoButton: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  demoButton2y: {
    backgroundColor: '#7B5EE6',
  },
  demoButton1y: {
    backgroundColor: '#00C2A8',
  },
  demoButton3y: {
    backgroundColor: '#E85D4C',
  },
  demoButtonStore: {
    backgroundColor: '#0284C7',
  },
  demoButtonAdmin: {
    backgroundColor: '#4B5563',
  },
  demoButtonPressed: {
    opacity: 0.88,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  demoDesignerBlock: {
    gap: 6,
    marginTop: 4,
  },
  demoMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    lineHeight: 17,
  },
});
