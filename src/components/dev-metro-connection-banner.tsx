import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../lib/theme';

const POLL_MS = 15_000;

function resolveMetroHostUri(): string | null {
  const fromConfig = Constants.expoConfig?.hostUri?.trim();
  if (fromConfig) {
    return fromConfig;
  }

  const legacy = Constants.expoGoConfig?.hostUri?.trim();
  return legacy || null;
}

function metroStatusUrl(hostUri: string): string {
  const base = hostUri.startsWith('http') ? hostUri : `http://${hostUri}`;
  return `${base.replace(/\/$/, '')}/status`;
}

async function isMetroRunning(hostUri: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(metroStatusUrl(hostUri), { signal: controller.signal });
    const body = await response.text();
    return response.ok && body.includes('running');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dev-only: replaces the noisy LogBox "Cannot connect to Expo CLI" overlay with
 * a short banner and reload when Metro/HMR is unreachable.
 */
export function DevMetroConnectionBanner() {
  const insets = useSafeAreaInsets();
  const hostUri = resolveMetroHostUri();
  const [disconnected, setDisconnected] = useState(false);
  const [checking, setChecking] = useState(true);

  const runCheck = useCallback(async () => {
    if (!hostUri) {
      setDisconnected(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    const ok = await isMetroRunning(hostUri);
    setDisconnected(!ok);
    setChecking(false);
  }, [hostUri]);

  useEffect(() => {
    if (!hostUri) {
      return;
    }

    void runCheck();
    const interval = setInterval(() => {
      void runCheck();
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [hostUri, runCheck]);

  if (!hostUri || checking || !disconnected) {
    return null;
  }

  const androidHint =
    Platform.OS === 'android'
      ? '\n· USB 연결 시 PC에서 adb reverse tcp:8081 tcp:8081'
      : '';

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>개발 서버에 연결되지 않습니다</Text>
      <Text style={styles.body}>
        PC에서 Metro를 켠 뒤 Expo Go에서 다시 연결하세요.{'\n'}· npm run start:phone (터널, 권장){'\n'}·
        같은 Wi‑Fi면 npm run start:lan{'\n'}· QR 재스캔 또는 Reload(↻)
        {androidHint}
      </Text>
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
