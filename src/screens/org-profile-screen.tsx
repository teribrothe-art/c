import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser, signOut } from '../../lib/auth';
import type { OrgScope } from '../../lib/org-access';
import { showConfirmAlert, showErrorAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';
import { StoreBottomTabBar } from '../components/store-bottom-tab-bar';

type Props = {
  scope: OrgScope;
};

export function OrgProfileScreen({ scope }: Props) {
  useOrgRoleGuard(scope);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then((user) => {
        setEmail(user?.email ?? '');
      });
    }, []),
  );

  const handleLogout = () => {
    showConfirmAlert({
      title: '로그아웃',
      message: '정말 로그아웃 하시겠어요?',
      confirmLabel: '로그아웃',
      destructive: true,
      onConfirm: () => {
        setIsSigningOut(true);

        signOut()
          .then(() => router.replace('/'))
          .catch((error) => {
            showErrorAlert(getErrorMessage(error, '로그아웃에 실패했습니다.'));
          })
          .finally(() => setIsSigningOut(false));
      },
    });
  };

  const TabBar = scope === 'store' ? StoreBottomTabBar : AdminBottomTabBar;
  const roleLabel = scope === 'store' ? '매장' : '본사';
  const accent = scope === 'store' ? '#0284C7' : colors.purple;

  if (isSigningOut) {
    return <LoadingState message="로그아웃 중..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.avatar, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.avatarText, { color: accent }]}>{roleLabel.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{roleLabel} 계정</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={[styles.badge, { backgroundColor: `${accent}18` }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{roleLabel} 접속</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>연동 안내</Text>
          <Text style={styles.cardBody}>
            고객·디자이너 탭과 동일한 시술·결제·정산 데이터를 조회합니다. 시술 수정은 디자이너
            계정에서만 가능합니다.
          </Text>
        </View>

        <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
  },
  name: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  email: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 999,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
    padding: 16,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  cardBody: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  logout: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 14,
  },
  logoutPressed: {
    opacity: 0.88,
  },
  logoutText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '800',
  },
});
