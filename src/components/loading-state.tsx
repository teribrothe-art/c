import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';
import { IronlongLogoMark } from './ironlong-logo';
import { IronlongSplash } from './ironlong-splash';

type LoadingStateProps = {
  message?: string;
  minHeight?: number;
  /** 전체 화면 아이롱 스플래시 (접속·세션 복원) */
  splash?: boolean;
  /** 인라인 로딩에 브랜드 마크 표시 */
  branded?: boolean;
};

export function LoadingState({
  message = '불러오는 중...',
  minHeight = 220,
  splash = false,
  branded = false,
}: LoadingStateProps) {
  if (splash) {
    return <IronlongSplash message={message} />;
  }

  return (
    <View style={[styles.container, { minHeight }]}>
      {branded ? <IronlongLogoMark size={48} /> : <ActivityIndicator color={colors.coral} size="large" />}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
