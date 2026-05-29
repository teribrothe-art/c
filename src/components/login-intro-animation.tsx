import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

const APP_INTRO_LINES = [
  '시술 기록을 한곳에 모아, 오래도록 이어가는 케어',
  '디자이너 진단 · 홈케어 가이드 · AI 맞춤 상담',
  '고객과 살롱이 함께 성장하는 헤어 다이어리',
] as const;

const LINE_STAGGER_MS = 520;
const HOLD_MS = 4200;
const FADE_OUT_MS = 320;

function fadeSlideIn(opacity: Animated.Value, translateY: Animated.Value, duration = 480) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
}

function fadeSlideOut(opacity: Animated.Value, translateY: Animated.Value, duration = FADE_OUT_MS) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: -6,
      duration,
      useNativeDriver: true,
    }),
  ]);
}

export function LoginIntroAnimation() {
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelTranslate = useRef(new Animated.Value(10)).current;
  const lineOpacity = useRef(APP_INTRO_LINES.map(() => new Animated.Value(0))).current;
  const lineTranslate = useRef(APP_INTRO_LINES.map(() => new Animated.Value(12))).current;

  useEffect(() => {
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      labelOpacity.setValue(0);
      labelTranslate.setValue(10);
      lineOpacity.forEach((value) => value.setValue(0));
      lineTranslate.forEach((value) => value.setValue(12));
    };

    const playIntro = () => {
      if (cancelled) {
        return;
      }

      reset();

      Animated.sequence([
        fadeSlideIn(labelOpacity, labelTranslate),
        Animated.stagger(
          LINE_STAGGER_MS,
          APP_INTRO_LINES.map((_, index) =>
            fadeSlideIn(lineOpacity[index], lineTranslate[index]),
          ),
        ),
      ]).start(({ finished }) => {
        if (!finished || cancelled) {
          return;
        }

        holdTimer = setTimeout(() => {
          if (cancelled) {
            return;
          }

          Animated.sequence([
            Animated.stagger(
              120,
              [...APP_INTRO_LINES].reverse().map((_, reverseIndex) => {
                const index = APP_INTRO_LINES.length - 1 - reverseIndex;
                return fadeSlideOut(lineOpacity[index], lineTranslate[index]);
              }),
            ),
            fadeSlideOut(labelOpacity, labelTranslate),
          ]).start(({ finished: loopFinished }) => {
            if (loopFinished && !cancelled) {
              holdTimer = setTimeout(playIntro, 400);
            }
          });
        }, HOLD_MS);
      });
    };

    playIntro();

    return () => {
      cancelled = true;
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      labelOpacity.stopAnimation();
      labelTranslate.stopAnimation();
      lineOpacity.forEach((value) => value.stopAnimation());
      lineTranslate.forEach((value) => value.stopAnimation());
    };
  }, [labelOpacity, labelTranslate, lineOpacity, lineTranslate]);

  return (
    <View style={styles.introBlock}>
      <Animated.Text
        style={[
          styles.introLabel,
          {
            opacity: labelOpacity,
            transform: [{ translateY: labelTranslate }],
          },
        ]}>
        앱 소개
      </Animated.Text>

      {APP_INTRO_LINES.map((line, index) => (
        <Animated.Text
          key={line}
          style={[
            styles.introLine,
            {
              opacity: lineOpacity[index],
              transform: [{ translateY: lineTranslate[index] }],
            },
          ]}>
          · {line}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  introBlock: {
    backgroundColor: '#FAFAFC',
    borderColor: '#EFEFF4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
    minHeight: 132,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  introLabel: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  introLine: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
});
