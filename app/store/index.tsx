import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser, signOut } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { showErrorAlert } from '../../lib/alerts';
import { colors } from '../../lib/theme';
import { LoadingState } from '../../src/components/loading-state';

export default function StoreHomeScreen() {
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then((user) => {
        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role !== 'store') {
          router.replace('/');
        }
      });
    }, []),
  );

  const handleSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.replace('/');
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '로그아웃에 실패했습니다.'));
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  if (isSigningOut) {
    return <LoadingState message="로그아웃 중..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>STORE</Text>
        <Text style={styles.title}>매장</Text>
        <Text style={styles.subtitle}>소속 디자이너·매장 매출·운영 현황을 관리합니다.</Text>

        <View style={styles.cardGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>소속 디자이너</Text>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statMeta}>데모 매장</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>이번 달 시술</Text>
            <Text style={styles.statValue}>128</Text>
            <Text style={styles.statMeta}>전월 대비 +12%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>역할</Text>
            <Text style={styles.statValue}>매장</Text>
            <Text style={styles.statMeta}>매장 접속</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>상태</Text>
            <Text style={[styles.statValue, styles.statValueMint]}>운영중</Text>
            <Text style={styles.statMeta}>데모 모드</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <Pressable
            onPress={() => router.push('/designer/clients')}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
            <Text style={styles.menuTitle}>고객·시술 현황</Text>
            <Text style={styles.menuMeta}>소속 디자이너 고객 데이터</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/designer/revenue')}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
            <Text style={styles.menuTitle}>매출·정산</Text>
            <Text style={styles.menuMeta}>매장 매출·정산 내역</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 24,
    marginTop: 8,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 96,
    padding: 14,
    width: '48%',
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  statValueMint: {
    color: colors.mint,
  },
  statMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    gap: 10,
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  menuRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowPressed: {
    opacity: 0.88,
  },
  menuTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  menuMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  logoutButtonPressed: {
    opacity: 0.88,
  },
  logoutText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '800',
  },
});
