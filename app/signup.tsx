import { Link, router } from 'expo-router';
import { useState } from 'react';
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
import { showErrorAlert } from '../lib/alerts';
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
];

export default function SignupScreen() {
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

    try {
      setIsLoading(true);
      await signUpWithEmail({
        email: trimmedEmail,
        password,
        name,
        role,
      });
      router.replace(role === 'designer' ? '/designer/clients' : '/home');
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
    borderWidth: 1,
    borderColor: '#FFB8BB',
    borderRadius: 14,
    backgroundColor: '#FFF3F3',
    padding: 4,
  },
  roleToggle: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  roleToggleSelected: {
    backgroundColor: colors.coral,
  },
  roleToggleText: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '700',
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
});
