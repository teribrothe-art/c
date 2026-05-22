import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Role = 'customer' | 'designer';

const roles: { label: string; value: Role }[] = [
  { label: '고객', value: 'customer' },
  { label: '디자이너', value: 'designer' },
];

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('설정 필요', '.env 파일에 Supabase URL과 anon key를 입력해주세요.');
      return;
    }

    if (!trimmedEmail || !password || !passwordConfirm) {
      Alert.alert('입력 필요', '이메일, 비밀번호, 비밀번호 확인을 모두 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 확인', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('비밀번호 확인', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    try {
      setIsLoading(true);

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName || null,
            role,
          },
        },
      });

      if (signupError) {
        throw signupError;
      }

      let user = signupData.user;

      if (!signupData.session) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (loginError) {
          throw loginError;
        }

        user = loginData.user ?? user;
      }

      if (!user) {
        throw new Error('가입한 사용자 정보를 확인할 수 없습니다.');
      }

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? trimmedEmail,
          name: trimmedName || null,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        throw profileError;
      }

      router.replace('/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : '회원가입 중 문제가 발생했습니다.';
      Alert.alert('회원가입 실패', message);
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
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!isLoading}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            editable={!isLoading}
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            autoCapitalize="none"
            editable={!isLoading}
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호 확인"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            style={styles.input}
            value={passwordConfirm}
          />
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
                    disabled={isLoading}
                    key={item.value}
                    onPress={() => setRole(item.value)}
                    style={[styles.roleToggle, selected && styles.roleToggleSelected]}>
                    <Text style={[styles.roleToggleText, selected && styles.roleToggleTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            disabled={isLoading}
            onPress={handleSignup}
            style={({ pressed }) => [
              styles.signupButton,
              (pressed || isLoading) && styles.signupButtonPressed,
            ]}>
            <Text style={styles.signupButtonText}>{isLoading ? '가입 중...' : '가입하기'}</Text>
          </Pressable>
        </View>

        <Link href="/" asChild>
          <Pressable disabled={isLoading} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>이미 계정이 있나요? 로그인</Text>
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
    color: '#FF5A5F',
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
    backgroundColor: '#FF5A5F',
  },
  roleToggleText: {
    color: '#FF5A5F',
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
    backgroundColor: '#FF5A5F',
    marginTop: 10,
    paddingVertical: 16,
  },
  signupButtonPressed: {
    opacity: 0.75,
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
    color: '#FF5A5F',
    fontSize: 15,
    fontWeight: '600',
  },
});
