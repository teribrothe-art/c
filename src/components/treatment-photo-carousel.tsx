import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { appLayout } from '../../lib/theme';
import { getTreatmentPhotoSignedUrl } from '../../lib/treatment-photos';
import { TreatmentPhotoPreviewModal } from './treatment-photo-preview-modal';

type Slide = {
  key: 'before' | 'after';
  label: string;
  storagePath: string | null;
  emptyText: string;
};

type TreatmentPhotoCarouselProps = {
  beforePhotoPath?: string | null;
  afterPhotoPath?: string | null;
};

const SLIDES: Omit<Slide, 'storagePath'>[] = [
  { key: 'before', label: 'Before (전)', emptyText: '전 사진이 아직 없어요' },
  { key: 'after', label: 'After (후)', emptyText: '후 사진이 아직 없어요' },
];

export function TreatmentPhotoCarousel({
  beforePhotoPath,
  afterPhotoPath,
}: TreatmentPhotoCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth =
    Platform.OS === 'web' ? Math.min(windowWidth, appLayout.maxScreenWidth) : windowWidth;
  const slideWidth = layoutWidth - 44;
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState<Partial<Record<Slide['key'], string>>>({});
  const [photoPreview, setPhotoPreview] = useState<{ uri: string; title: string } | null>(null);

  const slides = useMemo<Slide[]>(
    () =>
      SLIDES.map((slide) => ({
        ...slide,
        storagePath: slide.key === 'before' ? beforePhotoPath ?? null : afterPhotoPath ?? null,
      })),
    [afterPhotoPath, beforePhotoPath],
  );

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        const entries = await Promise.all(
          slides.map(async (slide) => {
            if (!slide.storagePath) {
              return [slide.key, null] as const;
            }

            try {
              const url = await getTreatmentPhotoSignedUrl(slide.storagePath);
              return [slide.key, url] as const;
            } catch {
              return [slide.key, null] as const;
            }
          }),
        );

        if (!isMounted) {
          return;
        }

        const nextSignedUrls: Partial<Record<Slide['key'], string>> = {};

        for (const [key, url] of entries) {
          if (url) {
            nextSignedUrls[key] = url;
          }
        }

        setSignedUrls(nextSignedUrls);
        setActiveIndex(0);
        scrollRef.current?.scrollTo({ x: 0, animated: false });
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

  const goToSlide = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
    setActiveIndex(safeIndex);
    scrollRef.current?.scrollTo({ x: slideWidth * safeIndex, animated: true });
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(index);
  };

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.segmentRow}>
          {slides.map((slide, index) => {
            const selected = index === activeIndex;

            return (
              <Pressable
                key={slide.key}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => goToSlide(index)}
                style={[styles.segment, selected && styles.segmentSelected]}>
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {slide.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          onMomentumScrollEnd={onScrollEnd}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={slideWidth}
          decelerationRate="fast"
          style={[styles.scroller, { width: slideWidth }]}>
          {slides.map((item) => {
            const imageUri = signedUrls[item.key];

            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                disabled={!imageUri}
                onPress={() => {
                  if (!imageUri) {
                    return;
                  }

                  setPhotoPreview({
                    uri: imageUri,
                    title: item.label,
                  });
                }}
                style={[styles.slide, { width: slideWidth }]}>
                {imageUri ? (
                  <Image contentFit="cover" source={{ uri: imageUri }} style={styles.image} />
                ) : (
                  <LinearGradient
                    colors={item.key === 'before' ? ['#FFD4D5', '#E0D7FA'] : ['#E0D7FA', '#FFD4D5']}
                    style={styles.emptySlide}>
                    <Text style={styles.emptySlideText}>{item.emptyText}</Text>
                  </LinearGradient>
                )}
                <View style={styles.badge} pointerEvents="none">
                  <Text style={styles.badgeText}>{item.label}</Text>
                </View>
                {imageUri ? (
                  <View style={styles.tapHint} pointerEvents="none">
                    <Text style={styles.tapHintText}>탭하여 크게 보기</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.indicatorRow}>
          {slides.map((slide, index) => (
            <Pressable
              key={slide.key}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => goToSlide(index)}
              style={styles.dotPressable}>
              <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.helperText}>
          Before·After 버튼을 누르거나 좌우로 넘겨 전·후 사진을 확인하세요
        </Text>
      </View>

      <TreatmentPhotoPreviewModal
        imageUri={photoPreview?.uri ?? null}
        title={photoPreview?.title ?? '시술 사진'}
        visible={Boolean(photoPreview)}
        onClose={() => setPhotoPreview(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  segmentSelected: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  segmentText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
  scroller: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  slide: {
    borderRadius: 12,
    height: 180,
    overflow: 'hidden',
  },
  image: {
    height: 180,
    width: '100%',
  },
  emptySlide: {
    alignItems: 'center',
    height: 180,
    justifyContent: 'center',
    width: '100%',
  },
  emptySlideText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
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
  tapHint: {
    backgroundColor: 'rgba(26, 26, 46, 0.55)',
    borderRadius: 8,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
  },
  tapHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  helperText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  indicatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dotPressable: {
    padding: 4,
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
});
