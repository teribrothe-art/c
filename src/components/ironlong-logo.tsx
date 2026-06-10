import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BRAND_NAME, BRAND_TAGLINE } from '../../lib/brand';
import { colors } from '../../lib/theme';

type IronlongLogoMarkProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** 앱 마크 — 뒤로가기·헤더용 컴팩트 로고 */
export function IronlongLogoMark({ size = 36, style }: IronlongLogoMarkProps) {
  return (
    <View style={[styles.markWrap, { width: size, height: size, borderRadius: size * 0.32 }, style]}>
      <LinearGradient
        colors={[colors.purple, colors.coral]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.markGradient, { borderRadius: size * 0.32 }]}>
        <Svg height={size * 0.62} viewBox="0 0 32 32" width={size * 0.62}>
          <Path
            d="M8 22V10l5.5 8.2L19 10v12"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.6"
          />
          <Circle cx="23.5" cy="10.5" fill="#FFFFFF" r="1.8" />
          <Path
            d="M23.5 14.5V22"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
        </Svg>
      </LinearGradient>
    </View>
  );
}

type IronlongLogoWordmarkProps = {
  showTagline?: boolean;
  compact?: boolean;
  align?: 'center' | 'left';
};

/** 워드마크 — 로그인·스플래시용 */
export function IronlongLogoWordmark({
  showTagline = true,
  compact = false,
  align = 'center',
}: IronlongLogoWordmarkProps) {
  return (
    <View style={[styles.wordmark, align === 'left' && styles.wordmarkLeft]}>
      {showTagline ? (
        <Text style={[styles.tagline, compact && styles.taglineCompact]}>{BRAND_TAGLINE}</Text>
      ) : null}
      <Text style={[styles.brandName, compact && styles.brandNameCompact]}>{BRAND_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  markWrap: {
    overflow: 'hidden',
  },
  markGradient: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  wordmark: {
    alignItems: 'center',
    gap: 6,
  },
  wordmarkLeft: {
    alignItems: 'flex-start',
  },
  tagline: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  taglineCompact: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  brandName: {
    color: colors.purple,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 50,
  },
  brandNameCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
});
