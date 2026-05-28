import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors } from '../../lib/theme';

/** 로그인 배너 그리드 (2×2 정사각형) */
const GRID_COLUMNS = 2;
const GRID_ROWS = 2;
const HORIZONTAL_INSET = 56;

const HERO_MESSAGES = [
  '당신의 손끝이 만드는 아름다움',
  '기록이 쌓일수록 깊어지는 신뢰',
  '오늘도 빛나는 살롱을 응원해요',
  '한 사람의 하루를 밝히는 시간',
] as const;

const FLOATING_ICONS = ['✨', '💇‍♀️', '💜', '✨'] as const;

export function LoginHeroAnimation() {
  const { width: windowWidth } = useWindowDimensions();
  const [messageIndex, setMessageIndex] = useState(0);
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const messageTranslate = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  const gridSize = useMemo(() => {
    const unit = (windowWidth - HORIZONTAL_INSET) / GRID_COLUMNS;
    return unit * GRID_ROWS;
  }, [windowWidth]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(floatA, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatA, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(floatB, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatB, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.06,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();
    glowLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [floatA, floatB, glowScale]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslate, {
          toValue: -6,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          return;
        }

        setMessageIndex((prev) => (prev + 1) % HERO_MESSAGES.length);
        messageTranslate.setValue(8);

        Animated.parallel([
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.timing(messageTranslate, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3200);

    return () => clearInterval(timer);
  }, [messageOpacity, messageTranslate]);

  const floatATranslateY = floatA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const floatBTranslateY = floatB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={[styles.wrap, { width: gridSize.width, height: gridSize.height }]}>
      <Animated.View style={[styles.glow, { transform: [{ scale: glowScale }] }]}>
        <LinearGradient
          colors={['#F0EBFF', '#FFE8EA']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>

      <Animated.Text
        style={[styles.floatIcon, styles.floatTopLeft, { transform: [{ translateY: floatATranslateY }] }]}>
        {FLOATING_ICONS[0]}
      </Animated.Text>
      <Animated.Text
        style={[styles.floatIcon, styles.floatTopRight, { transform: [{ translateY: floatBTranslateY }] }]}>
        {FLOATING_ICONS[1]}
      </Animated.Text>
      <Text style={[styles.floatIcon, styles.floatBottomRight]}>{FLOATING_ICONS[2]}</Text>

      <View style={styles.messageCenter}>
        <Text style={styles.badge}>✨</Text>
        <Animated.Text
          numberOfLines={2}
          style={[
            styles.message,
            {
              opacity: messageOpacity,
              transform: [{ translateY: messageTranslate }],
            },
          ]}>
          {HERO_MESSAGES[messageIndex]}
        </Animated.Text>
        <Text style={styles.badge}>✨</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    opacity: 0.95,
  },
  floatIcon: {
    fontSize: 24,
    position: 'absolute',
  },
  floatTopLeft: {
    left: 14,
    top: 14,
  },
  floatTopRight: {
    right: 14,
    top: 14,
  },
  floatBottomRight: {
    bottom: 14,
    fontSize: 22,
    right: 14,
  },
  messageCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  badge: {
    fontSize: 16,
  },
  message: {
    color: colors.purple,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
});
