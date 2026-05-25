import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert } from '../lib/alerts';
import { isValidInviteCodeFormat, parseInviteCodeFromQrPayload } from '../lib/customer-invitations';

export default function ScanInviteScreen() {
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.message}>QR 스캔을 위해 카메라 권한이 필요해요</Text>
        <Pressable onPress={() => void requestPermission()} style={styles.button}>
          <Text style={styles.buttonText}>권한 허용</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.linkButton}>
          <Text style={styles.linkText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (scanned) {
            return;
          }

          setScanned(true);

          try {
            const code = parseInviteCodeFromQrPayload(data);

            if (!isValidInviteCodeFormat(code)) {
              throw new Error('초대 QR이 아니에요. 디자이너 초대 코드 QR을 스캔해주세요.');
            }

            router.replace({
              pathname: (returnTo as '/signup') ?? '/signup',
              params: { inviteCode: code },
            });
          } catch {
            setScanned(false);
            showErrorAlert('다시 시도해주세요', 'QR 스캔 실패');
          }
        }}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>닫기</Text>
        </Pressable>
        <Text style={styles.hint}>초대 QR 코드를 화면 안에 맞춰주세요</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF5A5F',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 15,
    opacity: 0.8,
  },
  overlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    padding: 8,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 15,
    marginTop: 24,
    textAlign: 'center',
  },
});
