import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getExpoConnectShareUrl } from '../../lib/expo-connect-share';
import { InviteQrCode } from './invite-qr-code';

type ConnectQrPanelProps = {
  /** 탭 안에서는 제목 생략 */
  embedded?: boolean;
};

export function ConnectQrPanel({ embedded = false }: ConnectQrPanelProps) {
  const connectUrl = useMemo(() => getExpoConnectShareUrl(), []);

  if (!connectUrl) {
    return (
      <View style={styles.wrap}>
        {!embedded ? <Text style={styles.title}>QR</Text> : null}
        <Text style={styles.emptyText}>
          PC에서 Metro를 켠 뒤 Expo Go로 다시 열면 QR이 표시됩니다.
        </Text>
        <Text style={styles.helpLine}>터미널 1: npm run start:phone</Text>
        <Text style={styles.helpLine}>터미널 2: npm run share</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {!embedded ? <Text style={styles.title}>QR</Text> : null}
      <Text style={styles.subtitle}>Expo Go → Scan QR code</Text>
      <View style={styles.qrWrap}>
        <InviteQrCode size={embedded ? 200 : 220} value={connectUrl} />
      </View>
      <Text selectable style={styles.url}>
        {connectUrl}
      </Text>
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
  helpLine: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
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
