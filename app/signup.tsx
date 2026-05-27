import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { signUpWithEmail, UserRole } from '../lib/auth';
import { getPostAuthRoute } from '../lib/auth-redirect';
import { showErrorAlert } from '../lib/alerts';
import { redeemInviteForCurrentUser } from '../lib/apply-pending-invite';
import {
  formatInviteCodeInput,
  isValidInviteCodeFormat,
  sanitizeInviteCode,
  validateInviteCode,
} from '../lib/customer-invitations';
import { clearPendingInviteCode, peekPendingInviteCode } from '../lib/pending-invite-code';
import { getErrorMessage } from '../lib/errors';
import { colors, disabledButtonStyle } from '../lib/theme';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '../lib/validation';
import { InlineFieldError } from '../src/components/inline-field-error';

const roles: { label: string; value: UserRole }[] = [
  { label: '고객', value: 'customer' },
  { label: '디자이너', value: 'designer' },
  { label: '매장', value: 'store' },
  { label: '어드민', value: 'admin' },
];

export default function SignupScreen() {
  const { inviteCode: inviteCodeParam } = useLocalSearchParams<{ inviteCode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordConfirmError, setPasswordConfirmError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const initialInviteFromLink = inviteCodeParam
    ? sanitizeInviteCode(String(inviteCodeParam))
    : '';
  const [inviteOpen, setInviteOpen] = useState(Boolean(initialInviteFromLink));
  const [inviteCode, setInviteCode] = useState(initialInviteFromLink);
  const [inviteHint, setInviteHint] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!inviteCodeParam) {
      return;
    }

    const code = sanitizeInviteCode(String(inviteCodeParam));

    if (isValidInviteCodeFormat(code)) {
      setInviteCode(code);
      setInviteOpen(true);
      setRole((current) => current ?? 'customer');
    }
  }, [inviteCodeParam]);

  useFocusEffect(
    useCallback(() => {
      peekPendingInviteCode()
        .then((pending) => {
          if (!isValidInviteCodeFormat(pending)) {
            return;
          }

          setInviteCode(pending);
          setInviteOpen(true);
          setRole((current) => current ?? 'customer');
        })
        .catch(() => undefined);
    }, []),
  );

  useEffect(() => {
    if (!inviteOpen || role !== 'customer') {
      setInviteHint(null);
      setInviteValid(null);
      return;
    }

    const code = formatInviteCodeInput(inviteCode);

    if (code.length === 0) {
      setInviteHint(null);
      setInviteValid(null);
      return;
    }

    if (code.length < 6) {
      setInviteHint('6자리 코드를 입력해주세요');
      setInviteValid(false);
      return;
    }

    const timer = setTimeout(() => {
      validateInviteCode(code)
        .then((result) => {
          if (result.valid) {
            setInviteValid(true);
            setInviteHint(`✓ 디자이너 ${result.designerName}의 초대`);
          } else {
            setInviteValid(false);
            setInviteHint(`✗ ${result.message}`);
          }
        })
        .catch(() => {
          setInviteValid(false);
          setInviteHint('✗ 코드 확인에 실패했습니다');
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [inviteCode, inviteOpen, role]);

  const validateForm = () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextPasswordConfirmError = validatePasswordConfirm(password, passwordConfirm);
    const nextRoleError = !role ? '역할을 선택해주세요.' : null;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setPasswordConfirmError(nextPasswordConfirmError);
    setRoleError(nextRoleError);

    return !nextEmailError && !nextPasswordError && !nextPasswordConfirmError && !nextRoleError;
  };

  const handleSignup = async () => {
    if (!validateForm() || !role) {
      return;
    }

    const trimmedEmail = email.trim();

    const code = sanitizeInviteCode(inviteCode);
    const wantsInvite = inviteOpen && isValidInviteCodeFormat(code);

    if (role === 'customer' && wantsInvite && inviteValid === false) {
      showErrorAlert('초대 코드를 확인하거나 비워두고 가입해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await signUpWithEmail({
        email: trimmedEmail,
        password,
        name,
        role,
      });

      if (role === 'designer') {
        router.replace('/designer/welcome');
        return;
      }

      if (role === 'store') {
        router.replace('/store');
        return;
      }

      if (role === 'admin') {
        router.replace('/admin');
        return;
      }

      if (wantsInvite && inviteValid !== false) {
        try {
          const redeemed = await redeemInviteForCurrentUser(code, {
            userId: user.id,
            role: 'customer',
          });

          if (redeemed) {
            return;
          }
        } catch (inviteError) {
          showErrorAlert(
            getErrorMessage(inviteError, '초대 연결에 실패했습니다. 일반 가입으로 계속합니다.'),
          );
        }
      } else {
        await clearPendingInviteCode();
      }

      router.replace(await getPostAuthRoute());
    } catch (error) {
      showErrorAlert(getErrorMessage(error), '회원가입 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>AI 헤어 다이어리를 시작해보세요.</Text>
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
              style={[styles.input, emailError && styles.inputError]}
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
              }}
              placeholder="비밀번호"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              style={[styles.input, passwordError && styles.inputError]}
              value={password}
            />
            <InlineFieldError message={passwordError} />
          </View>

          <View>
            <TextInput
              autoCapitalize="none"
              editable={!isLoading}
              onChangeText={(value) => {
                setPasswordConfirm(value);
                if (passwordConfirmError) {
                  setPasswordConfirmError(null);
                }
              }}
              placeholder="비밀번호 확인"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              style={[styles.input, passwordConfirmError && styles.inputError]}
              value={passwordConfirm}
            />
            <InlineFieldError message={passwordConfirmError} />
          </View>

          <TextInput
            editable={!isLoading}
            onChangeText={setName}
            placeholder="이름 (선택)"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={name}
          />

          <Pressable
            disabled={isLoading}
            onPress={() => setInviteOpen((open) => !open)}
            style={styles.inviteToggle}>
            <Text style={styles.inviteToggleText}>초대 코드 있어요? (선택)</Text>
            <Text style={styles.inviteToggleIcon}>{inviteOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {inviteOpen ? (
            <View style={styles.inviteBox}>
              <TextInput
                autoCapitalize="characters"
                editable={!isLoading}
                maxLength={6}
                onChangeText={(value) => setInviteCode(formatInviteCodeInput(value))}
                placeholder="6자리 코드 (비우면 일반 가입)"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={inviteCode}
              />
              <Pressable
                disabled={isLoading}
                onPress={() => router.push('/scan-invite?returnTo=/signup')}
                style={styles.scanButton}>
                <Text style={styles.scanButtonText}>QR 스캔</Text>
              </Pressable>
              {inviteHint ? (
                <Text
                  style={[
                    styles.inviteHint,
                    inviteValid === true && styles.inviteHintValid,
                    inviteValid === false && styles.inviteHintInvalid,
                  ]}>
                  {inviteHint}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.roleSection}>
            <Text style={styles.roleTitle}>역할 선택</Text>
            <View style={styles.roleToggleGroup}>
              {roles.map((item) => {
                const selected = role === item.value;

                return (
                  <Pressable
                    key={item.value}
                    disabled={isLoading}
                    onPress={() => {
                      setRole(item.value);
                      if (roleError) {
                        setRoleError(null);
                      }
                    }}
                    style={[styles.roleToggle, selected && styles.roleToggleSelected]}>
                    <Text style={[styles.roleToggleText, selected && styles.roleToggleTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <InlineFieldError message={roleError} />
          </View>

          <Pressable
            disabled={isLoading}
            onPress={handleSignup}
            style={({ pressed }) => [
              styles.signupButton,
              isLoading && styles.signupButtonDisabled,
              pressed && !isLoading && styles.signupButtonPressed,
            ]}>
            <Text style={styles.signupButtonText}>{isLoading ? '가입 중...' : '가입하기'}</Text>
          </Pressable>
        </View>

        <Link href="/" asChild>
          <Pressable disabled={isLoading} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>이미 계정이 있으신가요? 로그인</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 44,
  },
  title: {
    color: colors.coral,
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#777777',
    fontSize: 16,
    marginBottom: 40,
    marginTop: 10,
    textAlign: 'center',
  },
  form: {
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
  roleSection: {
    marginTop: 8,
  },
  roleTitle: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  roleToggleGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#FFB8BB',
    borderRadius: 14,
    backgroundColor: '#FFF3F3',
    padding: 4,
    gap: 4,
  },
  roleToggle: {
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  roleToggleSelected: {
    backgroundColor: colors.coral,
  },
  roleToggleText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  roleToggleTextSelected: {
    color: '#FFFFFF',
  },
  signupButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.coral,
    marginTop: 10,
    paddingVertical: 16,
  },
  signupButtonDisabled: {
    ...disabledButtonStyle,
  },
  signupButtonPressed: {
    opacity: 0.85,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 28,
    padding: 8,
  },
  loginLinkText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '600',
  },
  inviteToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  inviteToggleText: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '700',
  },
  inviteToggleIcon: {
    color: colors.purple,
    fontSize: 12,
  },
  inviteBox: {
    gap: 10,
  },
  scanButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lightPurple,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanButtonText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '700',
  },
  inviteHint: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  inviteHintValid: {
    color: colors.mint,
  },
  inviteHintInvalid: {
    color: colors.coral,
  },
});
