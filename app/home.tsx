import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isDemoAuthMode, signOut, subscribeToAuthState } from '../lib/auth';

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    return subscribeToAuthState((user) => {
      if (!user) {
        router.replace('/');
        return;
      }

      setEmail(user.email);
      setIsLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.replace('/');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>환영합니다!</Text>
        {isDemoAuthMode && <Text style={styles.demoNotice}>데모 모드 로그인입니다.</Text>}
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
    marginBottom: 10,
  },
  demoNotice: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 20,
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
