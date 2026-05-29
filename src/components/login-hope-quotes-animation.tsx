import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../../lib/theme';

/** 로그인 하단 희망 글귀 — 한 줄씩 등장 */
const HOPE_QUOTE_SETS = [
  ['첫 시술을 받으면', '자동으로 기록돼요.'],
  ['그동안의 시술 사진도', '추가할 수 있어요.'],
  ['오늘의 케어는', '어제보다 한 뼘 더 건강하게.'],
  ['당신의 아름다움은', '기록될수록 더 깊어져요.'],
  ['디자이너와 함께', '더 빛나는 내일을 만들어요.'],
  ['작은 변화도', '다이어리에 남기면 특별해져요.'],
] as const;

const LINE_STAGGER_MS = 680;
const HOLD_MS = 3600;
const FADE_MS = 380;

function fadeSlideIn(opacity: Animated.Value, translateY: Animated.Value) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
}

function fadeSlideOut(opacity: Animated.Value, translateY: Animated.Value) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: -8,
      duration: FADE_MS,
      useNativeDriver: true,
    }),
  ]);
}

export function LoginHopeQuotesAnimation() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const lineOpacity = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const lineTranslate = useRef([new Animated.Value(14), new Animated.Value(14)]).current;

  const lines = HOPE_QUOTE_SETS[quoteIndex];

  useEffect(() => {
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;

    const resetLines = () => {
      lineOpacity.forEach((value) => value.setValue(0));
      lineTranslate.forEach((value) => value.setValue(14));
    };

    const playQuote = () => {
      if (cancelled) {
        return;
      }

      resetLines();

      Animated.stagger(
        LINE_STAGGER_MS,
        [0, 1].map((index) => fadeSlideIn(lineOpacity[index], lineTranslate[index])),
      ).start(({ finished }) => {
        if (!finished || cancelled) {
          return;
        }

        holdTimer = setTimeout(() => {
          if (cancelled) {
            return;
          }

          Animated.stagger(
            100,
            [1, 0].map((index) => fadeSlideOut(lineOpacity[index], lineTranslate[index])),
          ).start(({ finished: outFinished }) => {
            if (!outFinished || cancelled) {
              return;
            }

            setQuoteIndex((prev) => (prev + 1) % HOPE_QUOTE_SETS.length);
          });
        }, HOLD_MS);
      });
    };

    playQuote();

    return () => {
      cancelled = true;
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      lineOpacity.forEach((value) => value.stopAnimation());
      lineTranslate.forEach((value) => value.stopAnimation());
    };
  }, [quoteIndex, lineOpacity, lineTranslate]);

  return (
    <View style={styles.block}>
      {lines.map((line, index) => (
        <Animated.Text
          key={`${quoteIndex}-${line}`}
          style={[
            styles.line,
            index === 0 ? styles.lineFirst : styles.lineSecond,
            {
              opacity: lineOpacity[index],
              transform: [{ translateY: lineTranslate[index] }],
            },
          ]}>
          {line}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 2,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: '100%',
  },
  line: {
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  lineFirst: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  lineSecond: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
});
