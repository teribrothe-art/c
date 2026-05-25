import { Image } from 'expo-image';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '../../lib/theme';

type InviteQrCodeProps = {
  value: string;
  size?: number;
};

/** SVG 네이티브 모듈 없이 QR 표시 (Metro/react-native-svg 호환 이슈 회피) */
export function InviteQrCode({ value, size = 200 }: InviteQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((uri) => {
        if (isMounted) {
          setDataUrl(uri);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDataUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  return <Image contentFit="contain" source={{ uri: dataUrl }} style={{ width: size, height: size }} />;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
