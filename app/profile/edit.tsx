import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import { imagePickerOptions, normalizePickerAssetUri } from '../../lib/image-uri';
import { getProfileAvatarUri, updateProfile } from '../../lib/profile-update';
import { getProfileScreenData } from '../../lib/profile';
import { colors } from '../../lib/theme';
import { LoadingState } from '../../src/components/loading-state';

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getProfileScreenData()
      .then(async (data) => {
        if (!data) {
          router.replace('/');
          return;
        }

        setName(data.profile.name ?? '');
        const savedAvatar = await getProfileAvatarUri(data.profile.id);
        setAvatarUri(savedAvatar);
      })
      .catch(() => {
        showErrorAlert('프로필을 불러오지 못했습니다.');
        router.back();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showErrorAlert('사진 라이브러리 접근 권한이 필요해요.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions({ aspect: [1, 1] }));

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(normalizePickerAssetUri(result.assets[0]));
      }
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '사진을 선택하지 못했습니다.'));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({ name, avatarUri });
      showSuccessAlert('프로필이 저장되었어요.', () => router.back());
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '저장에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>프로필 수정</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <LoadingState message="불러오는 중..." />
      ) : (
        <View style={styles.body}>
          <Pressable
            onPress={() => void handlePickPhoto()}
            style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.85 }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>📷</Text>
              </View>
            )}
            <Text style={styles.avatarHint}>탭하여 프로필 사진 선택 (선택)</Text>
          </Pressable>

          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력하세요"
            placeholderTextColor="#9CA3AF"
            editable={!isSaving}
          />

          <Pressable
            disabled={isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.savePressed,
              isSaving && styles.saveDisabled,
            ]}>
            <Text style={styles.saveText}>{isSaving ? '저장 중...' : '저장'}</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  backText: { color: colors.text, fontSize: 40, lineHeight: 40 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 44 },
  body: { gap: 16, padding: 20 },
  avatarButton: { alignItems: 'center', gap: 8 },
  avatarImage: { borderRadius: 50, height: 100, width: 100 },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#EFEFF4',
    borderRadius: 50,
    height: 100,
    justifyContent: 'center',
    width: 100,
  },
  avatarPlaceholderText: { fontSize: 40 },
  avatarHint: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginTop: 8,
    paddingVertical: 16,
  },
  savePressed: { opacity: 0.7 },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
