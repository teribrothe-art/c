import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('설정 필요', '.env 파일에 Supabase URL과 anon key를 입력해주세요.');
      router.replace('/');
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/');
        return;
      }

      setEmail(session.user.email ?? '이메일 정보 없음');
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (!supabase) {
      router.replace('/');
      return;
    }

    try {
      setIsSigningOut(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그아웃 중 문제가 발생했습니다.';
      Alert.alert('로그아웃 실패', message);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>환영합니다!</Text>
        <Text style={styles.label}>로그인한 사용자</Text>
        <Text style={styles.email}>{isLoading ? '불러오는 중...' : email}</Text>

        <Pressable
          disabled={isLoading || isSigningOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            (pressed || isSigningOut) && styles.logoutButtonPressed,
          ]}>
          <Text style={styles.logoutButtonText}>{isSigningOut ? '로그아웃 중...' : '로그아웃'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0E1',
    borderRadius: 24,
    backgroundColor: '#FFF8F8',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    color: '#FF5A5F',
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    color: '#777777',
    fontSize: 15,
    marginBottom: 8,
  },
  email: {
    color: '#222222',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  logoutButton: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    paddingVertical: 16,
  },
  logoutButtonPressed: {
    opacity: 0.75,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
