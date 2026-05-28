import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';
import { LoginHeroAnimation } from './login-hero-animation';

const SALON_TITLE = '나만의 살롱';
const DIARY_TITLE = '다이어리';
const HAIR_TITLE = 'AI 헤어';

export function LoginHeadlines() {
  const [headlineRowWidth, setHeadlineRowWidth] = useState(0);
  const [hairNaturalWidth, setHairNaturalWidth] = useState(0);

  const hairLetterSpacing = useMemo(() => {
    if (headlineRowWidth <= 0 || hairNaturalWidth <= 0 || hairNaturalWidth >= headlineRowWidth) {
      return 0;
    }

    const gaps = Math.max(HAIR_TITLE.length - 1, 1);
    return (headlineRowWidth - hairNaturalWidth) / gaps;
  }, [headlineRowWidth, hairNaturalWidth]);

  return (
    <View style={styles.block}>
      <LoginHeroAnimation />

      <View
        style={styles.headlineRow}
        onLayout={(event) => setHeadlineRowWidth(event.nativeEvent.layout.width)}>
        <Text style={styles.salon}>{SALON_TITLE}</Text>
        <Text style={styles.diary}>{DIARY_TITLE}</Text>
      </View>

      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.hair, styles.measure]}
        onLayout={(event) => setHairNaturalWidth(event.nativeEvent.layout.width)}>
        {HAIR_TITLE}
      </Text>

      <Text
        style={[
          styles.hair,
          headlineRowWidth > 0 && {
            width: headlineRowWidth,
            letterSpacing: hairLetterSpacing,
          },
        ]}>
        {HAIR_TITLE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 36,
    width: '100%',
  },
  headlineRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  hair: {
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
