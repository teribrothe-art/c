import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signOut } from '../lib/auth';
import { showConfirmAlert, showErrorAlert, showWarningAlert } from '../lib/alerts';
import { getErrorMessage } from '../lib/errors';
import { LoadingState } from '../src/components/loading-state';
import { getProfileScreenData, ProfileData, ProfileStats } from '../lib/profile';
import { BottomTabBar } from '../src/components/bottom-tab-bar';
import { DesignerBottomTabBar } from '../src/components/designer-bottom-tab-bar';

type SettingItem = {
  icon: string;
  label: string;
};

const settingItems: SettingItem[] = [
  { icon: '✏️', label: '프로필 수정' },
  { icon: '🔔', label: '알림 설정' },
  { icon: '🔒', label: '개인정보 처리방침' },
  { icon: '❓', label: '도움말' },
];

function formatDate(date?: string | null) {
  return date ? date.replaceAll('-', '.') : '-';
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function getDisplayName(profile: ProfileData) {
  return profile.name?.trim() || profile.email.split('@')[0] || '사용자';
}

function getInitial(profile: ProfileData) {
  const source = profile.name?.trim() || profile.email;
  return source.charAt(0).toUpperCase();
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, onPress }: SettingItem & { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingArrow}>›</Text>
    </Pressable>
  );
}

function ActivityCard({ stats }: { stats: ProfileStats }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📊 내 활동</Text>
      {stats.kind === 'customer' ? (
        <>
          <StatRow label="누적 시술 횟수" value={`${stats.treatmentCount}회`} />
          <StatRow label="최근 시술일" value={formatDate(stats.latestTreatmentDate)} />
          <StatRow label="함께한 디자이너" value={`${stats.designerCount}명`} />
        </>
      ) : (
        <>
          <StatRow label="누적 시술 건수" value={`${stats.treatmentCount}건`} />
          <StatRow label="누적 정산 금액" value={formatCurrency(stats.totalSettlementAmount)} />
          <StatRow label="단골 고객" value={`${stats.regularCustomerCount}명`} />
        </>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(() => {
    setIsLoading(true);

    getProfileScreenData()
      .then((data) => {
        if (!data) {
          router.replace('/');
          return;
        }

        setProfile(data.profile);
        setStats(data.stats);
        setErrorMessage('');
      })
      .catch((error) => {
        const message = getErrorMessage(error, '프로필을 불러오지 못했습니다.');
        setErrorMessage(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSettingPress = (label: string) => {
    showWarningAlert('곧 제공될 예정입니다.', label);
  };

  const handleLogout = () => {
    showConfirmAlert({
      title: '로그아웃',
      message: '정말 로그아웃 하시겠어요?',
      confirmLabel: '로그아웃',
      destructive: true,
      onConfirm: () => {
        Promise.resolve()
          .then(() => signOut())
          .then(() => router.replace('/'))
          .catch((error) => {
            showErrorAlert(getErrorMessage(error, '로그아웃에 실패했습니다.'), '로그아웃 실패');
          });
      },
    });
  };

  const isDesigner = profile?.role === 'designer';
  const displayName = profile ? getDisplayName(profile) : '';
  const roleLabel = isDesigner ? '디자이너' : '고객';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !profile || !stats ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>프로필을 불러올 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage || '다시 시도해주세요.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileSection}>
              <View
                style={[
                  styles.avatar,
                  isDesigner ? styles.avatarDesigner : styles.avatarCustomer,
                ]}>
                <Text style={styles.avatarText}>{getInitial(profile)}</Text>
              </View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{profile.email}</Text>
              <View
                style={[
                  styles.roleBadge,
                  isDesigner ? styles.roleBadgeDesigner : styles.roleBadgeCustomer,
                ]}>
                <Text
                  style={[
                    styles.roleBadgeText,
                    isDesigner ? styles.roleBadgeTextDesigner : styles.roleBadgeTextCustomer,
                  ]}>
                  {roleLabel}
                </Text>
              </View>
            </View>

            <ActivityCard stats={stats} />

            <View style={styles.card}>
              {settingItems.map((item, index) => (
                <View key={item.label}>
                  <SettingsRow
                    icon={item.icon}
                    label={item.label}
                    onPress={() => handleSettingPress(item.label)}
                  />
                  {index < settingItems.length - 1 ? <View style={styles.settingDivider} /> : null}
                </View>
              ))}
            </View>

            <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {profile ? isDesigner ? <DesignerBottomTabBar /> : <BottomTabBar /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 50,
    height: 100,
    justifyContent: 'center',
    width: 100,
  },
  avatarCustomer: {
    backgroundColor: '#FF5A5F',
  },
  avatarDesigner: {
    backgroundColor: '#7B5EE6',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
  },
  name: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  email: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  roleBadge: {
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleBadgeCustomer: {
    backgroundColor: '#FFD4D5',
  },
  roleBadgeDesigner: {
    backgroundColor: '#E0D7FA',
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  roleBadgeTextCustomer: {
    color: '#FF5A5F',
  },
  roleBadgeTextDesigner: {
    color: '#7B5EE6',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  settingRowPressed: {
    opacity: 0.7,
  },
  settingIcon: {
    fontSize: 18,
    width: 24,
  },
  settingLabel: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  settingArrow: {
    color: '#9B9BA7',
    fontSize: 22,
    fontWeight: '600',
  },
  settingDivider: {
    backgroundColor: '#EFEFF4',
    height: 1,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 16,
  },
  logoutPressed: {
    opacity: 0.88,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 10,
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
