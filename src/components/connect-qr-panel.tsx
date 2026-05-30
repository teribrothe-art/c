import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getExpoConnectShareUrl } from '../../lib/expo-connect-share';
import { InviteQrCode } from './invite-qr-code';

type ConnectQrPanelProps = {
  /** 로그인 화면 등 좁은 영역 */
  compact?: boolean;
};

export function ConnectQrPanel({ compact = false }: ConnectQrPanelProps) {
  const connectUrl = useMemo(() => getExpoConnectShareUrl(), []);

  if (!connectUrl) {
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <Text style={styles.title}>QR</Text>
        <Text style={styles.emptyText}>
          PC에서 Metro를 켠 뒤 Expo Go로 다시 열면 QR이 표시됩니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.title}>QR</Text>
      <Text style={styles.subtitle}>Expo Go → Scan QR code</Text>
      <View style={styles.qrWrap}>
        <InviteQrCode size={compact ? 148 : 220} value={connectUrl} />
      </View>
      {!compact ? (
        <Text selectable style={styles.url}>
          {connectUrl}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  wrapCompact: {
    marginTop: 8,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  qrWrap: {
    paddingVertical: 4,
  },
  url: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
});
