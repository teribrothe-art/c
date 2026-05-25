import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
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

export function HomePromoCarousel({ slides, minHeight, onPressSlide }: HomePromoCarouselProps) {
  const listRef = useRef<FlatList<HomePromoSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = Dimensions.get('window').width - 44;
  const carouselHeight = minHeight ?? Math.max(240, Dimensions.get('window').height * 0.3);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);

    return () => clearInterval(timer);
  }, [slides.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;

    if (typeof index === 'number') {
      setActiveIndex(index);
    }
  }).current;

  if (slides.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, { height: carouselHeight }]}>
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
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPressSlide(item)}
            style={({ pressed }) => [
              styles.slidePressable,
              { width: slideWidth, height: carouselHeight - 28 },
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

      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    width: '100%',
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
    bottom: 4,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    position: 'absolute',
    width: '100%',
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
