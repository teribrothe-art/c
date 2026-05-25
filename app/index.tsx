import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { redeemInviteForCurrentUser } from '../lib/apply-pending-invite';
import { getPostAuthRoute } from '../lib/auth-redirect';
import { getCurrentUser } from '../lib/auth';
import { peekPendingInviteCode } from '../lib/pending-invite-code';
import { BETA_DESIGNERS, BETA_TEST_PASSWORD } from '../lib/beta-test-accounts';
import { DEMO_LOGIN_HINT, isDemoAuthMode, signInWithEmail } from '../lib/auth';
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

          {isDemoAuthMode ? (
            <>
              <Text style={styles.demoHint}>
                데모: {DEMO_LOGIN_HINT.customerEmail} / {DEMO_LOGIN_HINT.customerPassword}
              </Text>
              <Text style={styles.demoHint}>
                베타 디자이너: {BETA_DESIGNERS[0].email} … {BETA_DESIGNERS[4].email} / {BETA_TEST_PASSWORD}
              </Text>
            </>
          ) : null}

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

        <Link href="/signup" asChild>
          <Pressable disabled={isLoading} style={styles.signupLink}>
            <Text style={styles.signupLinkText}>회원가입</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
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
  demoHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
