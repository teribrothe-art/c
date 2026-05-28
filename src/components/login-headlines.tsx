import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';
import { LoginHeroAnimation } from './login-hero-animation';

const SALON_TITLE = '나만의 살롱';
const DIARY_TITLE = '다이어리';
const APP_TITLE = 'AI 헤어 다이어리';

export function LoginHeadlines() {
  const [headlineRowWidth, setHeadlineRowWidth] = useState(0);
  const [appNaturalWidth, setAppNaturalWidth] = useState(0);

  const appLetterSpacing = useMemo(() => {
    if (headlineRowWidth <= 0 || appNaturalWidth <= 0 || appNaturalWidth >= headlineRowWidth) {
      return 0;
    }

    const gaps = Math.max(APP_TITLE.length - 1, 1);
    return (headlineRowWidth - appNaturalWidth) / gaps;
  }, [headlineRowWidth, appNaturalWidth]);

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
          headlineRowWidth > 0 && {
            width: headlineRowWidth,
            letterSpacing: appLetterSpacing,
          },
        ]}>
        {APP_TITLE}
      </Text>

      <View
        style={styles.headlineRow}
        onLayout={(event) => setHeadlineRowWidth(event.nativeEvent.layout.width)}>
        <Text style={styles.salon}>{SALON_TITLE}</Text>
        <Text style={styles.diary}>{DIARY_TITLE}</Text>
      </View>

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
  headlineRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'center',
  },
  salon: {
    color: colors.purple,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 46,
  },
  diary: {
    color: colors.coral,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 4,
  },
  app: {
    color: colors.coral,
    fontSize: 18,
    fontWeight: '800',
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
