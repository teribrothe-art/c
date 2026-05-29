import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isLikelyUnreachableFromPhone,
  isMetroRunning,
  resolveMetroHostUri,
} from '../../lib/dev-metro-host';
import { colors } from '../../lib/theme';

const POLL_MS = 15_000;

/**
 * Dev-only: Metro/HMR 끊김 또는 휴대폰에서 닿을 수 없는 호스트일 때 안내 배너
 */
export function DevMetroConnectionBanner() {
  const insets = useSafeAreaInsets();
  const hostUri = resolveMetroHostUri();
  const [disconnected, setDisconnected] = useState(false);
  const [unreachableHost, setUnreachableHost] = useState(false);
  const [checking, setChecking] = useState(true);

  const runCheck = useCallback(async () => {
    if (!hostUri) {
      setDisconnected(false);
      setUnreachableHost(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    const likelyUnreachable = isLikelyUnreachableFromPhone(hostUri);
    setUnreachableHost(likelyUnreachable);

    const ok = await isMetroRunning(hostUri);
    setDisconnected(!ok || likelyUnreachable);
    setChecking(false);
  }, [hostUri]);

  useEffect(() => {
    if (!hostUri) {
      return;
    }

    const initialDelay = setTimeout(() => {
      void runCheck();
    }, 800);

    const interval = setInterval(() => {
      void runCheck();
    }, POLL_MS);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [hostUri, runCheck]);

  if (!hostUri || checking || !disconnected) {
    return null;
  }

  const androidHint =
    Platform.OS === 'android'
      ? '\n· USB: PC에서 adb reverse tcp:8081 tcp:8081'
      : '';

  const title = unreachableHost ? '접속오류 — 개발 서버 주소에 연결할 수 없음' : '개발 서버에 연결되지 않습니다';

  const body = unreachableHost
    ? `현재 주소(${hostUri})는 PC/VM 전용입니다.\n· PC에서 npm run start:phone 실행\n· npm run share 로 QR 재생성\n· Expo Go에서 새 QR 스캔 또는 Reload(↻)${androidHint}`
    : `PC에서 Metro를 켠 뒤 다시 연결하세요.\n· npm run start:phone (터널, 권장)\n· 같은 Wi‑Fi면 npm run start:lan\n· QR 재스캔 또는 Reload(↻)${androidHint}`;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void runCheck();
        }}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonLabel}>다시 확인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.coral,
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 200,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
