import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { getTreatmentPhotoSignedUrl } from '../../lib/treatment-photos';

type Slide = {
  key: string;
  label: string;
  storagePath: string;
};

type TreatmentPhotoCarouselProps = {
  beforePhotoPath?: string | null;
  afterPhotoPath?: string | null;
};

export function TreatmentPhotoCarousel({
  beforePhotoPath,
  afterPhotoPath,
}: TreatmentPhotoCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = windowWidth - 44;
  const [activeIndex, setActiveIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const slides = useMemo<Slide[]>(() => {
    const nextSlides: Slide[] = [];

    if (beforePhotoPath) {
      nextSlides.push({ key: 'before', label: 'Before (전)', storagePath: beforePhotoPath });
    }

    if (afterPhotoPath) {
      nextSlides.push({ key: 'after', label: 'After (후)', storagePath: afterPhotoPath });
    }

    return nextSlides;
  }, [afterPhotoPath, beforePhotoPath]);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const entries = await Promise.all(
          slides.map(async (slide) => {
            const url = await getTreatmentPhotoSignedUrl(slide.storagePath);
            return [slide.key, url] as const;
          }),
        );

        if (!isMounted) {
          return;
        }

        const nextSignedUrls: Record<string, string> = {};

        for (const [key, url] of entries) {
          if (url) {
            nextSignedUrls[key] = url;
          }
        }

        setSignedUrls(nextSignedUrls);
        setActiveIndex(0);
      })
      .catch(() => {
        if (isMounted) {
          setSignedUrls({});
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slides]);

  const resolvedSlides = slides.filter((slide) => signedUrls[slide.key]);

  if (resolvedSlides.length === 0) {
    return (
      <LinearGradient colors={['#FFD4D5', '#E0D7FA']} style={styles.fallback}>
        <Text style={styles.fallbackText}>전후 사진</Text>
      </LinearGradient>
    );
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(index);
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={resolvedSlides}
        horizontal
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={onScrollEnd}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: slideWidth }]}>
            <Image contentFit="cover" source={{ uri: signedUrls[item.key] }} style={styles.image} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.label}</Text>
            </View>
          </View>
        )}
      />

      {resolvedSlides.length > 1 ? (
        <View style={styles.indicatorRow}>
          {resolvedSlides.map((slide, index) => (
            <View
              key={slide.key}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  slide: {
    borderRadius: 12,
    height: 130,
    overflow: 'hidden',
  },
  image: {
    height: 130,
    width: '100%',
  },
  badge: {
    backgroundColor: 'rgba(26, 26, 46, 0.55)',
    borderRadius: 999,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  indicatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    backgroundColor: '#E6E6EE',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: '#00C2A8',
    width: 18,
  },
  fallback: {
    alignItems: 'center',
    borderRadius: 12,
    height: 130,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
  },
});
