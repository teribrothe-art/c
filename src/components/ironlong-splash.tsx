import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { BRAND_DESCRIPTION } from '../../lib/brand';
import { colors } from '../../lib/theme';
import { IronlongLogoMark, IronlongLogoWordmark } from './ironlong-logo';

type IronlongSplashProps = {
  message?: string;
};

export function IronlongSplash({ message = '접속 중...' }: IronlongSplashProps) {
  const pulse = useRef(new Animated.Value(0.88)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.88,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const dotLoop = Animated.loop(
      Animated.timing(dot, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      dotLoop.stop();
    };
  }, [dot, fade, pulse]);

  const dotOpacity = dot.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.25, 1, 0.25, 0.25],
  });

  return (
    <LinearGradient
      colors={['#F7F4FF', '#FFF5F6', '#FAFAFC']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ scale: pulse }] }]}>
        <IronlongLogoMark size={84} />
        <IronlongLogoWordmark />
        <Text style={styles.description}>{BRAND_DESCRIPTION}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.message}>{message}</Text>
        <Animated.View style={[styles.dotRow, { opacity: dotOpacity }]}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    gap: 18,
    marginBottom: 48,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    bottom: 72,
    gap: 10,
    position: 'absolute',
  },
  message: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    backgroundColor: colors.coral,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
});
