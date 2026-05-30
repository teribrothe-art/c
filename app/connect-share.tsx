import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatExpoConnectShareMessage,
  getExpoConnectShareStatus,
} from '../lib/expo-connect-share';
import { showErrorAlert, showSuccessAlert } from '../lib/alerts';
import { colors } from '../lib/theme';
import { ConnectQrPanel } from '../src/components/connect-qr-panel';

export default function ConnectShareScreen() {
  const insets = useSafeAreaInsets();
  const { url: connectUrl } = getExpoConnectShareStatus();
  const shareMessage = connectUrl ? formatExpoConnectShareMessage(connectUrl) : '';

  const handleCopy = async () => {
    if (!connectUrl) {
      showErrorAlert('접속 주소를 찾을 수 없어요. PC에서 Metro를 먼저 실행해주세요.');
      return;
    }

    await Clipboard.setStringAsync(connectUrl);
    showSuccessAlert('접속 주소를 복사했어요.');
  };

  const handleShare = async () => {
    if (!connectUrl) {
      showErrorAlert('접속 주소를 찾을 수 없어요. PC에서 Metro를 먼저 실행해주세요.');
      return;
    }

    try {
      await Share.share({
        message: shareMessage,
        ...(Platform.OS === 'ios' ? { url: connectUrl } : {}),
      });
    } catch {
      showErrorAlert('공유에 실패했습니다.');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}>
        <Text style={styles.backText}>‹ 뒤로</Text>
      </Pressable>

      <Text style={styles.title}>QR 접속</Text>
      <Text style={styles.subtitle}>Expo Go에서 QR을 스캔하거나 주소를 복사·공유하세요.</Text>

      <ConnectQrPanel />

      {connectUrl ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => void handleCopy()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>주소 복사</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleShare()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>공유하기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.helpCard}>
          <Text style={styles.emptyTitle}>지금은 QR을 표시할 수 없어요</Text>
          <Text style={styles.emptyText}>
            PC에서 Metro를 켠 뒤 이 화면을 다시 열거나, 아래 순서로 공유 파일을 만드세요.
          </Text>
        </View>
      )}

      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>PC에서 준비하기</Text>
        <Text style={styles.helpLine}>1. 터미널 1: npm run start:phone</Text>
        <Text style={styles.helpLine}>2. 터미널 2: npm run share</Text>
        <Text style={styles.helpMeta}>
          생성 파일: expo-go-share.txt · expo-go-share.html · expo-go-qr.png
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
  },
  backText: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 18,
    marginTop: 8,
  },
  actions: {
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderColor: '#FFD4D5',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  helpCard: {
    backgroundColor: '#F7F7FA',
    borderRadius: 14,
    gap: 6,
    padding: 16,
  },
  helpTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  helpLine: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  helpMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 6,
  },
});
