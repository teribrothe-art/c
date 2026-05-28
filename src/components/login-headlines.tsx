import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';
import { LoginHeroAnimation } from './login-hero-animation';

const SALON_TITLE = '나만의 살롱';
const APP_TITLE = 'AI 헤어 다이어리';

export function LoginHeadlines() {
  const [salonWidth, setSalonWidth] = useState(0);
  const [appNaturalWidth, setAppNaturalWidth] = useState(0);

  const appLetterSpacing = useMemo(() => {
    if (salonWidth <= 0 || appNaturalWidth <= 0 || appNaturalWidth >= salonWidth) {
      return 0;
    }

    const gaps = Math.max(APP_TITLE.length - 1, 1);
    const spacing = (salonWidth - appNaturalWidth) / gaps;
    return Math.min(Math.max(spacing, 0), 5);
  }, [salonWidth, appNaturalWidth]);

  return (
    <View style={styles.block}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.app, styles.measure]}
        onLayout={(event) => setAppNaturalWidth(event.nativeEvent.layout.width)}>
        {APP_TITLE}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.app,
          salonWidth > 0 && {
            width: salonWidth,
            letterSpacing: appLetterSpacing,
          },
        ]}>
        {APP_TITLE}
      </Text>

      <Text
        style={styles.salon}
        onLayout={(event) => setSalonWidth(event.nativeEvent.layout.width)}>
        {SALON_TITLE}
      </Text>

      <LoginHeroAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 36,
    width: '100%',
  },
  app: {
    color: colors.coral,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
  salon: {
    color: colors.purple,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 52,
    textAlign: 'center',
  },
  measure: {
    left: 0,
    opacity: 0,
    position: 'absolute',
    top: 0,
    zIndex: -1,
  },
});
