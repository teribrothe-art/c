import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useMemo } from 'react';
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
  getExpoConnectShareUrl,
} from '../lib/expo-connect-share';
import { showErrorAlert, showSuccessAlert } from '../lib/alerts';
import { colors } from '../lib/theme';
import { InviteQrCode } from '../src/components/invite-qr-code';

export default function ConnectShareScreen() {
  const insets = useSafeAreaInsets();
  const connectUrl = useMemo(() => getExpoConnectShareUrl(), []);
  const shareMessage = useMemo(
    () => (connectUrl ? formatExpoConnectShareMessage(connectUrl) : ''),
    [connectUrl],
  );

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

      <Text style={styles.title}>접속 주소 공유</Text>
      <Text style={styles.subtitle}>
        휴대폰 Expo Go에서 이 주소로 접속하거나, 카톡·메일로 보내세요.
      </Text>

      {connectUrl ? (
        <View style={styles.card}>
          <Text style={styles.urlLabel}>접속 주소</Text>
          <Text selectable style={styles.url}>
            {connectUrl}
          </Text>
          <View style={styles.qrWrap}>
            <InviteQrCode size={220} value={connectUrl} />
          </View>
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
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>지금은 접속 주소를 불러올 수 없어요</Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
    padding: 18,
  },
  urlLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  url: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  qrWrap: {
    alignItems: 'center',
    paddingVertical: 8,
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
