import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../lib/theme';

type InviteQrCodeProps = {
  value: string;
  size?: number;
};

/** 고객 초대 QR (react-native-svg — Metro에서 commonjs 엔트리로 해석) */
export function InviteQrCode({ value, size = 200 }: InviteQrCodeProps) {
  if (!value.trim()) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  return (
    <View style={styles.wrap}>
      <QRCode backgroundColor="#FFFFFF" color={colors.text} size={size} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#F5F5F8',
    borderRadius: 12,
  },
});
