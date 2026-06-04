import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type LoginHeroStaticProps = {
  width: number;
  height: number;
};

/** 웹 초기 로딩용 — 애니메이션 없이 가벼운 배너 */
export function LoginHeroStatic({ width, height }: LoginHeroStaticProps) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      <LinearGradient
        colors={['#F0EBFF', '#FFE8EA']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.gradient}
      />
      <Text style={styles.message}>당신의 손끝이 만드는 아름다움</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    opacity: 0.95,
  },
  message: {
    color: colors.purple,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
    margin: 20,
    textAlign: 'center',
  },
});
