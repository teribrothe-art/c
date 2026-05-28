import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';
import { LoginHeroAnimation } from './login-hero-animation';

const SALON_TITLE = '나만의 살롱';
const APP_TITLE = 'AI 헤어 다이어리';

function stretchLetterSpacing(targetWidth: number, naturalWidth: number, charCount: number, maxSpacing = 5) {
  if (targetWidth <= 0 || naturalWidth <= 0 || naturalWidth >= targetWidth) {
    return 0;
  }

  const gaps = Math.max(charCount - 1, 1);
  const spacing = (targetWidth - naturalWidth) / gaps;
  return Math.min(Math.max(spacing, 0), maxSpacing);
}

export function LoginHeadlines() {
  const [salonNaturalWidth, setSalonNaturalWidth] = useState(0);
  const [appNaturalWidth, setAppNaturalWidth] = useState(0);

  const headlineWidth = Math.max(salonNaturalWidth, appNaturalWidth);

  const appLetterSpacing = useMemo(
    () => stretchLetterSpacing(headlineWidth, appNaturalWidth, APP_TITLE.length),
    [headlineWidth, appNaturalWidth],
  );

  const salonLetterSpacing = useMemo(
    () => stretchLetterSpacing(headlineWidth, salonNaturalWidth, SALON_TITLE.length, 3),
    [headlineWidth, salonNaturalWidth],
  );

  const widthReady = headlineWidth > 0;

  return (
    <View style={styles.block}>
      <View pointerEvents="none" style={styles.measureBox}>
        <Text
          style={[styles.app, styles.measure]}
          onLayout={(event) => setAppNaturalWidth(event.nativeEvent.layout.width)}>
          {APP_TITLE}
        </Text>
        <Text
          style={[styles.salon, styles.measure]}
          onLayout={(event) => setSalonNaturalWidth(event.nativeEvent.layout.width)}>
          {SALON_TITLE}
        </Text>
      </View>

      <Text
        style={[
          styles.app,
          widthReady && {
            width: headlineWidth,
            letterSpacing: appLetterSpacing,
          },
        ]}>
        {APP_TITLE}
      </Text>

      <Text
        style={[
          styles.salon,
          widthReady && {
            width: headlineWidth,
            letterSpacing: salonLetterSpacing,
          },
        ]}>
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
    paddingHorizontal: 8,
    width: '100%',
  },
  measureBox: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%',
    zIndex: -1,
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
    alignSelf: 'center',
  },
});
