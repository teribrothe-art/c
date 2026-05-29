import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCOUNT_SETTING_ITEMS } from '../../lib/account-settings';
import { showConfirmAlert, showErrorAlert, showWarningAlert } from '../../lib/alerts';
import { getCurrentUser, signOut } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { getDesignerStoreAffiliation } from '../../lib/org-store-affiliation';
import { getProfileScreenData, type ProfileData } from '../../lib/profile';
import { getProfileAvatarUri } from '../../lib/profile-update';
import { colors } from '../../lib/theme';
import { AccountMenuCard } from '../../src/components/account-menu-card';
import { AppVersionBadge } from '../../src/components/app-version-badge';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { DesignerStoreAffiliationBadge } from '../../src/components/designer-store-affiliation-badge';
import { LoadingState } from '../../src/components/loading-state';

function getDisplayName(profile: ProfileData) {
  return profile.name?.trim() || profile.email.split('@')[0] || '디자이너';
}

function getInitial(profile: ProfileData) {
  const source = profile.name?.trim() || profile.email;
  return source.charAt(0).toUpperCase();
}

export default function DesignerAccountScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeRegion, setStoreRegion] = useState<string | null>(null);

  const loadAccount = useCallback(() => {
    setIsLoading(true);

    Promise.resolve()
      .then(async () => {
        const user = await getCurrentUser();

        if (!user || user.role !== 'designer') {
          router.replace('/');
          return;
        }

        const data = await getProfileScreenData();

        if (!data) {
          router.replace('/');
          return;
        }

        setProfile(data.profile);
        setErrorMessage('');
        const affiliation = getDesignerStoreAffiliation(user.id);
        setStoreName(affiliation?.store.name ?? null);
        setStoreRegion(affiliation?.store.region ?? null);
        const uri = await getProfileAvatarUri(data.profile.id);
        setAvatarUri(uri);
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '계정 정보를 불러오지 못했습니다.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccount();
    }, [loadAccount]),
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>계정</Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !profile ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>계정을 불러올 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage || '다시 시도해주세요.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarPhoto} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{getInitial(profile)}</Text>
                )}
              </View>
              <Text style={styles.name}>{getDisplayName(profile)}</Text>
              <Text style={styles.email}>{profile.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>디자이너</Text>
              </View>
              {storeName ? (
                <DesignerStoreAffiliationBadge storeName={storeName} storeRegion={storeRegion ?? undefined} />
              ) : (
                <View style={styles.unlinkedStoreBox}>
                  <Text style={styles.unlinkedStoreText}>연결된 매장 정보가 없습니다</Text>
                </View>
              )}
            </View>

            <AccountMenuCard
              title="관리"
              rows={ACCOUNT_SETTING_ITEMS.map((item) => ({
                ...item,
                onPress: () => handleSettingPress(item.label),
              }))}
            />

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>

            <AppVersionBadge pinned />
          </>
        )}
      </ScrollView>

      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  profileSection: {
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#7B5EE6',
    borderRadius: 50,
    height: 100,
    justifyContent: 'center',
    width: 100,
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
  },
  email: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: '#E0D7FA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: '#7B5EE6',
    fontSize: 13,
    fontWeight: '800',
  },
  unlinkedStoreBox: {
    alignSelf: 'stretch',
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unlinkedStoreText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
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
