import { Href, Link } from 'expo-router';
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

import { PRIMARY_ACCUMULATED_DESIGNER } from '../lib/accumulated-designer-shortcuts';
import { isDemoAuthMode } from '../lib/auth';
import { signInAndNavigate } from '../lib/quick-login-flow';
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

    try {
      setIsLoading(true);
      setLoginError(null);
      await signInAndNavigate(email.trim(), password);
    } catch (error) {
      const message = getErrorMessage(error, '이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoginError(message);
      showLoginFailureAlert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrimaryAccumDesigner = async () => {
    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setLoginError(null);
      await signInAndNavigate(
        PRIMARY_ACCUMULATED_DESIGNER.email,
        PRIMARY_ACCUMULATED_DESIGNER.password,
      );
    } catch (error) {
      const message = getErrorMessage(error, '로그인에 실패했습니다.');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>AI 헤어 다이어리</Text>

          {isDemoAuthMode ? (
            <View style={styles.shortcutBox}>
              <Pressable
                disabled={isLoading}
                onPress={() => void handlePrimaryAccumDesigner()}
                style={({ pressed }) => [
                  styles.shortcutPrimary,
                  pressed && styles.shortcutPressed,
                  isLoading && styles.shortcutDisabled,
                ]}>
                <Text style={styles.shortcutPrimaryBadge}>바로가기</Text>
                <Text style={styles.shortcutPrimaryTitle}>3년 누적 테스트 디자이너</Text>
                <Text style={styles.shortcutPrimaryMeta}>
                  {PRIMARY_ACCUMULATED_DESIGNER.email} · test1234
                </Text>
              </Pressable>
              <Link href={'/accum-designer' as Href} asChild>
                <Pressable disabled={isLoading} style={styles.shortcutLink}>
                  <Text style={styles.shortcutLinkText}>1년 · 2년 · 3년 누적 디자이너 전체</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}

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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 28,
    textAlign: 'center',
  },
  shortcutBox: {
    marginBottom: 22,
    width: '100%',
  },
  shortcutPrimary: {
    alignItems: 'center',
    backgroundColor: '#E85D4C',
    borderRadius: 14,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  shortcutPrimaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  shortcutPrimaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  shortcutPrimaryMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutLink: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  shortcutLinkText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: '700',
  },
  shortcutPressed: {
    opacity: 0.9,
  },
  shortcutDisabled: {
    opacity: 0.65,
  },
  form: {
    width: '100%',
    gap: 12,
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
    paddingVertical: 14,
  },
  inputError: {
    borderColor: colors.error,
  },
  loginButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.coral,
    marginTop: 4,
    paddingVertical: 14,
  },
  loginButtonDisabled: {
    ...disabledButtonStyle,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signupLink: {
    marginTop: 22,
    padding: 8,
  },
  signupLinkText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '600',
  },
});
