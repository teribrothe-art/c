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

import type { HomePromoSlide } from '../../lib/home-promo-slides';

type HomePromoCarouselProps = {
  slides: HomePromoSlide[];
  minHeight?: number;
  onPressSlide: (slide: HomePromoSlide) => void;
};

const AUTO_SCROLL_MS = 4200;
const FOOTER_HEIGHT = 44;

function normalizeSlideIndex(index: number, length: number) {
  if (length === 0) {
    return 0;
  }

  return ((index % length) + length) % length;
}

/** 마지막↔첫 전환 시 역방향 스크롤 애니메이션을 막아 떨림을 줄입니다. */
function shouldAnimateCarouselScroll(fromIndex: number, toIndex: number, length: number) {
  if (length <= 1) {
    return false;
  }

  const wrapsForward = fromIndex === length - 1 && toIndex === 0;
  const wrapsBackward = fromIndex === 0 && toIndex === length - 1;

  return !wrapsForward && !wrapsBackward;
}

export function HomePromoCarousel({ slides, minHeight, onPressSlide }: HomePromoCarouselProps) {
  const listRef = useRef<FlatList<HomePromoSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const slideWidth = Dimensions.get('window').width - 44;
  const carouselHeight = minHeight ?? Math.max(240, Dimensions.get('window').height * 0.3);

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

  const goToPrevious = () => {
    scrollToSlide(activeIndex - 1);
  };

  const goToNext = () => {
    scrollToSlide(activeIndex + 1);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;

    if (typeof index === 'number') {
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
            <Pressable
              onPress={() => onPressSlide(item)}
              style={({ pressed }) => [
                styles.slidePressable,
                { width: slideWidth, height: carouselHeight },
                pressed && styles.slidePressed,
              ]}>
              <LinearGradient colors={item.gradient} style={styles.slideCard}>
                {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <View style={styles.ctaPill}>
                  <Text style={styles.ctaText}>{item.ctaLabel} ›</Text>
                </View>
              </LinearGradient>
            </Pressable>
          )}
        />
      </View>

      {showNav ? (
        <View style={[styles.footer, { height: FOOTER_HEIGHT }]}>
          <Pressable
            accessibilityLabel="이전 배너"
            accessibilityRole="button"
            hitSlop={8}
            onPress={goToPrevious}
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
            onPress={goToNext}
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
    marginBottom: 16,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
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
  slidePressable: {
    paddingRight: 0,
  },
  slidePressed: {
    opacity: 0.92,
  },
  slideCard: {
    borderRadius: 20,
    flex: 1,
    justifyContent: 'space-between',
    padding: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  subtitle: {
    color: '#4B4B5C',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A2E',
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
    backgroundColor: '#FF5A5F',
    width: 18,
  },
});
