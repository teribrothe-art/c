import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { signInWithEmail } from '../lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('입력 필요', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmail({ email: trimmedEmail, password });
      router.replace('/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 중 문제가 발생했습니다.';
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AI 헤어 다이어리</Text>
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

          <Pressable
            disabled={isLoading}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginButton,
              (pressed || isLoading) && styles.loginButtonPressed,
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
    color: '#FF5A5F',
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
  loginButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    marginTop: 8,
    paddingVertical: 16,
  },
  loginButtonPressed: {
    opacity: 0.75,
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
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
  },
});
