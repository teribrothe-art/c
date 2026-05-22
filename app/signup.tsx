import { Link } from 'expo-router';
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

type Role = 'customer' | 'designer';

const roles: { label: string; value: Role }[] = [
  { label: '고객', value: 'customer' },
  { label: '디자이너', value: 'designer' },
];

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<Role>('customer');

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
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor="#A0A0A0"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호 확인"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            style={styles.input}
            value={passwordConfirm}
          />

          <View style={styles.roleSection}>
            <Text style={styles.roleTitle}>역할 선택</Text>
            <View style={styles.roleOptions}>
              {roles.map((item) => {
                const selected = role === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRole(item.value)}
                    style={[styles.roleOption, selected && styles.roleOptionSelected]}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.signupButton}>
            <Text style={styles.signupButtonText}>가입하기</Text>
          </Pressable>
        </View>

        <Link href="/" asChild>
          <Pressable style={styles.loginLink}>
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
  roleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleOptionSelected: {
    borderColor: '#FF5A5F',
    backgroundColor: '#FFF3F3',
  },
  radioOuter: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CFCFCF',
    borderRadius: 10,
  },
  radioOuterSelected: {
    borderColor: '#FF5A5F',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5A5F',
  },
  roleLabel: {
    color: '#555555',
    fontSize: 16,
    fontWeight: '600',
  },
  roleLabelSelected: {
    color: '#FF5A5F',
  },
  signupButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    marginTop: 10,
    paddingVertical: 16,
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
