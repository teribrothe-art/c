import { Link } from 'expo-router';
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

import { showLoginFailureAlert } from '../lib/alerts';
import { isDemoAuthMode } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import { signInAndNavigate } from '../lib/quick-login-flow';
import { colors, disabledButtonStyle, loginLayout } from '../lib/theme';
import { validateEmail } from '../lib/validation';
import { AppVersionBadge } from '../src/components/app-version-badge';
import { ConnectQrPanel } from '../src/components/connect-qr-panel';
import { InlineFieldError } from '../src/components/inline-field-error';
import { LoginHeadlines } from '../src/components/login-headlines';
import { LoginHeroAnimation } from '../src/components/login-hero-animation';

type LoginView = 'login' | 'qr';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<LoginView>('login');

  const isSubmitDisabled = isLoading;
  const showQrEntry = isDemoAuthMode;

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
          <LoginHeadlines />

          {showQrEntry && activeView === 'qr' ? (
            <ConnectQrPanel embedded />
          ) : (
            <>
              <LoginHeroAnimation />
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
                onPress={() => void handleLogin()}
                style={({ pressed }) => [
                  styles.loginButton,
                  isSubmitDisabled && styles.loginButtonDisabled,
                  pressed && !isSubmitDisabled && styles.loginButtonPressed,
                ]}>
                <Text style={styles.loginButtonText}>{isLoading ? '로그인 중...' : '로그인'}</Text>
              </Pressable>
              </View>
            </>
          )}

          <View style={styles.footerLinks}>
            <Link href="/signup" asChild>
              <Pressable
                disabled={isLoading}
                onPress={() => setActiveView('login')}
                style={styles.footerLink}>
                <Text style={styles.footerLinkText}>회원가입</Text>
              </Pressable>
            </Link>

            {showQrEntry ? (
              <>
                <Text style={styles.footerDivider}>·</Text>
                <Link href="/test-login" asChild>
                  <Pressable
                    disabled={isLoading}
                    onPress={() => setActiveView('login')}
                    style={styles.footerLink}>
                    <Text style={styles.footerLinkText}>테스트 계정</Text>
                  </Pressable>
                </Link>
                <Text style={styles.footerDivider}>·</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeView === 'qr' }}
                  disabled={isLoading}
                  onPress={() => setActiveView((current) => (current === 'qr' ? 'login' : 'qr'))}
                  style={styles.footerLink}>
                  <Text
                    style={[styles.footerLinkText, activeView === 'qr' && styles.footerLinkTextActive]}>
                    QR
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>

          <AppVersionBadge pinned />
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
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
    paddingHorizontal: loginLayout.horizontalPadding,
    paddingTop: 32,
  },
  content: {
    alignItems: 'center',
    gap: 18,
    maxWidth: loginLayout.maxContentWidth,
    width: '100%',
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
  footerLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  footerLink: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  footerLinkText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '600',
  },
  footerLinkTextActive: {
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  footerDivider: {
    color: '#C4C4D0',
    fontSize: 15,
    fontWeight: '600',
  },
});
