import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';

import type { DesignerWelcomeSlide } from '../../lib/designer-welcome-slides';

type DesignerWelcomeCarouselProps = {
  slides: DesignerWelcomeSlide[];
  minHeight?: number;
};

const AUTO_SCROLL_MS = 3500;
const FOOTER_HEIGHT = 44;

function normalizeSlideIndex(index: number, length: number) {
  if (length === 0) {
    return 0;
  }

  return ((index % length) + length) % length;
}

function shouldAnimateCarouselScroll(fromIndex: number, toIndex: number, length: number) {
  if (length <= 1) {
    return false;
  }

  const wrapsForward = fromIndex === length - 1 && toIndex === 0;
  const wrapsBackward = fromIndex === 0 && toIndex === length - 1;

  return !wrapsForward && !wrapsBackward;
}

export function DesignerWelcomeCarousel({ slides, minHeight }: DesignerWelcomeCarouselProps) {
  const listRef = useRef<FlatList<DesignerWelcomeSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const slideWidth = Dimensions.get('window').width - 48;
  const carouselHeight = minHeight ?? Math.max(280, Dimensions.get('window').height * 0.38);

  const scrollToOffsetForIndex = useCallback(
    (nextIndex: number, fromIndex: number) => {
      const animated = shouldAnimateCarouselScroll(fromIndex, nextIndex, slides.length);
      listRef.current?.scrollToOffset({ offset: slideWidth * nextIndex, animated });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    },
    [slideWidth, slides.length],
  );

  const scrollToSlide = useCallback(
    (index: number) => {
      if (slides.length === 0) {
        return;
      }

      const next = normalizeSlideIndex(index, slides.length);
      scrollToOffsetForIndex(next, activeIndexRef.current);
    },
    [scrollToOffsetForIndex, slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      const current = activeIndexRef.current;
      const next = (current + 1) % slides.length;
      scrollToOffsetForIndex(next, current);
    }, AUTO_SCROLL_MS);

    return () => clearInterval(timer);
  }, [scrollToOffsetForIndex, slides.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;

    if (typeof index === 'number') {
      activeIndexRef.current = index;
      setActiveIndex(index);
    }
  }).current;

  if (slides.length === 0) {
    return null;
  }

  const showNav = slides.length > 1;

  return (
    <View style={styles.wrap}>
      <View style={{ height: carouselHeight }}>
        <FlatList
          ref={listRef}
          data={slides}
          horizontal
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={() => undefined}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={slideWidth}
          decelerationRate="fast"
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          getItemLayout={(_, index) => ({
            length: slideWidth,
            offset: slideWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
            activeIndexRef.current = index;
            setActiveIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={[styles.slideFrame, { width: slideWidth, height: carouselHeight }]}>
              <LinearGradient colors={item.gradient} style={styles.slideCard}>
                <Text style={styles.word}>{item.word}</Text>
                <Text style={styles.message}>{item.message}</Text>
              </LinearGradient>
            </View>
          )}
        />
      </View>

      {showNav ? (
        <View style={[styles.footer, { height: FOOTER_HEIGHT }]}>
          <Pressable
            accessibilityLabel="이전 배너"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => scrollToSlide(activeIndex - 1)}
            style={({ pressed }) => [styles.navHit, pressed && styles.navHitPressed]}>
            <View style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </View>
          </Pressable>

          <View style={styles.dots}>
            {slides.map((slide, index) => (
              <View
                key={slide.id}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>

          <Pressable
            accessibilityLabel="다음 배너"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => scrollToSlide(activeIndex + 1)}
            style={({ pressed }) => [styles.navHit, pressed && styles.navHitPressed]}>
            <View style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  navHit: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 40,
  },
  navHitPressed: {
    opacity: 0.85,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navButtonText: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: -2,
  },
  slideFrame: {
    paddingRight: 0,
  },
  slideCard: {
    alignItems: 'center',
    borderRadius: 24,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  word: {
    color: '#1A1A2E',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  message: {
    color: '#4B4B5C',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 26,
    marginTop: 16,
    textAlign: 'center',
  },
  dots: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    backgroundColor: '#D8D8E4',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: '#7B5EE6',
    width: 18,
  },
});
