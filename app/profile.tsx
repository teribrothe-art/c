import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signOut } from '../lib/auth';
import { formatAmount } from '../lib/currency-input';
import { showConfirmAlert, showErrorAlert, showWarningAlert } from '../lib/alerts';
import { getErrorMessage } from '../lib/errors';
import { LoadingState } from '../src/components/loading-state';
import { getProfileAvatarUri } from '../lib/profile-update';
import { getProfileScreenData, ProfileData, ProfileStats } from '../lib/profile';
import { BottomTabBar } from '../src/components/bottom-tab-bar';
import { DesignerBottomTabBar } from '../src/components/designer-bottom-tab-bar';
import { CustomerGrid } from '../src/components/customer-grid';
import { MonthlySettlementGrid } from '../src/components/monthly-settlement-grid';
import { mapSettlementsToGridItems } from '../lib/designer-customer-grid';

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

function ActivitySummaryColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.activityColumn}>
      <Text style={styles.activityColumnLabel}>{label}</Text>
      <Text
        style={styles.activityColumnValue}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.65}>
        {value}
      </Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: SettingItem & { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress ?? (() => {})} style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingArrow}>›</Text>
    </Pressable>
  );
}

function ActivityCard({ stats }: { stats: ProfileStats }) {
  const settlementGridItems =
    stats.kind === 'designer' ? mapSettlementsToGridItems(stats.recentSettlements) : [];

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
          <View style={styles.activitySummaryGrid}>
            <ActivitySummaryColumn
              label="누적시술"
              value={`${stats.treatmentCount.toLocaleString('ko-KR')}건`}
            />
            <ActivitySummaryColumn
              label="누적정산"
              value={formatAmount(stats.totalSettlementAmount)}
            />
            <ActivitySummaryColumn
              label="이달의정산"
              value={formatAmount(stats.monthSettlementAmount)}
            />
          </View>
          {stats.monthlySettlementTotals.length > 0 ? (
            <View style={styles.monthlySettlementBlock}>
              <Text style={styles.monthlySettlementTitle}>월별 정산</Text>
              <MonthlySettlementGrid
                items={stats.monthlySettlementTotals}
                onPressAll={() => router.push('/designer/revenue')}
                onPressItem={(monthKey) =>
                  router.push({ pathname: '/designer/revenue', params: { month: monthKey } })
                }
              />
            </View>
          ) : null}
          <StatRow label="정산 대기" value={`${stats.pendingSettlementCount}건`} />
          <StatRow label="단골 고객" value={`${stats.regularCustomerCount}명`} />
          {stats.recentSettlements.length ? (
            <View style={styles.activityList}>
              <Text style={styles.activityListTitle}>최근 정산</Text>
              <CustomerGrid
                items={settlementGridItems}
                onPressItem={(paymentId) => {
                  const item = stats.recentSettlements.find((row) => row.paymentId === paymentId);

                  if (item?.treatmentId) {
                    router.push(`/designer/treatment/${item.treatmentId}`);
                  }
                }}
              />
            </View>
          ) : (
            <Text style={styles.activityEmpty}>정산 완료 내역이 여기에 표시됩니다.</Text>
          )}
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
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

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
        getProfileAvatarUri(data.profile.id).then(setAvatarUri);
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
    if (label === '프로필 수정') {
      router.push('/profile/edit');
      return;
    }

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
            {isDesigner ? <Text style={styles.pageTitle}>계정</Text> : null}
            <View style={styles.profileSection}>
              <View
                style={[
                  styles.avatar,
                  isDesigner ? styles.avatarDesigner : styles.avatarCustomer,
                ]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarPhoto} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{getInitial(profile)}</Text>
                )}
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

            {!isDesigner ? (
              <Pressable
                style={({ pressed }) => [styles.paymentsLink, pressed && styles.paymentsLinkPressed]}
                onPress={() => router.push('/customer/payments')}>
                <Text style={styles.paymentsLinkIcon}>💳</Text>
                <Text style={styles.paymentsLinkLabel}>시술별 결제·영수증</Text>
                <Text style={styles.paymentsLinkArrow}>›</Text>
              </Pressable>
            ) : null}

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
  pageTitle: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
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
  avatarPhoto: {
    borderRadius: 50,
    height: 100,
    width: 100,
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
  paymentsLink: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  paymentsLinkPressed: { opacity: 0.88 },
  paymentsLinkIcon: { fontSize: 20 },
  paymentsLinkLabel: { color: '#1A1A2E', flex: 1, fontSize: 16, fontWeight: '800' },
  paymentsLinkArrow: { color: '#9CA3AF', fontSize: 22 },
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
  activitySummaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  activityColumn: {
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderRadius: 12,
    flex: 1,
    gap: 6,
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  activityColumnLabel: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  activityColumnValue: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  monthlySettlementBlock: {
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    marginBottom: 4,
    marginTop: 4,
    paddingTop: 10,
  },
  monthlySettlementTitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  activityList: {
    borderTopColor: '#EFEFF4',
    borderTopWidth: 1,
    gap: 10,
    marginTop: 8,
    paddingTop: 14,
  },
  activityListTitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
  },
  activityEmpty: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 8,
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
