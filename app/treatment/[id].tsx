import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTreatmentById, Treatment } from '../../lib/treatments';

function formatDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '-';
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function SectionCard({
  children,
  title,
  variant = 'default',
}: {
  children: ReactNode;
  title: string;
  variant?: 'default' | 'purple' | 'mint';
}) {
  return (
    <View style={[styles.card, variant === 'purple' && styles.purpleCard, variant === 'mint' && styles.mintCard]}>
      <Text
        style={[
          styles.cardTitle,
          variant === 'purple' && styles.purpleTitle,
          variant === 'mint' && styles.mintTitle,
        ]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function TreatmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        if (!id) {
          throw new Error('시술 ID를 찾을 수 없습니다.');
        }

        const { user, treatment: nextTreatment } = await getTreatmentById(id);

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (!nextTreatment) {
          setErrorMessage('시술 기록을 찾을 수 없습니다.');
          return;
        }

        setTreatment(nextTreatment);
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : '시술 기록을 불러오지 못했습니다.';
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>시술 기록</Text>
        <Pressable style={styles.headerButton}>
          <Text style={styles.shareIcon}>↗</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#FF5A5F" />
            <Text style={styles.stateText}>시술 기록을 불러오는 중...</Text>
          </View>
        ) : errorMessage || !treatment ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>기록을 볼 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage || '시술 기록이 없습니다.'}</Text>
          </View>
        ) : (
          <>
            <LinearGradient colors={['#FFD4D5', '#E0D7FA']} style={styles.photoArea}>
              <Text style={styles.photoText}>전후 사진</Text>
            </LinearGradient>

            <SectionCard title="기본 정보">
              <InfoRow label="시술" value={treatment.treatment_title} />
              <InfoRow label="날짜" value={formatDate(treatment.treatment_date)} />
              <InfoRow label="시간" value={treatment.duration} />
            </SectionCard>

            <SectionCard title="사용 약품">
              {(treatment.products ?? []).length > 0 ? (
                treatment.products?.map((product) => (
                  <Text key={product} style={styles.bulletText}>
                    • {product}
                  </Text>
                ))
              ) : (
                <Text style={styles.bodyText}>사용 약품 정보가 없습니다.</Text>
              )}
            </SectionCard>

            <SectionCard title="디자이너 진단" variant="purple">
              <Text style={styles.bodyText}>{treatment.designer_diagnosis || '진단 내용이 없습니다.'}</Text>
              <View style={styles.homeCareBox}>
                <Text style={styles.homeCareLabel}>홈케어</Text>
                <Text style={styles.bodyText}>{treatment.home_care || '홈케어 정보가 없습니다.'}</Text>
              </View>
            </SectionCard>

            <SectionCard title="AI 인사이트" variant="mint">
              <Text style={styles.bodyText}>{treatment.ai_insight || 'AI 인사이트가 없습니다.'}</Text>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  headerButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerIcon: {
    color: '#1A1A2E',
    fontSize: 40,
    lineHeight: 40,
  },
  shareIcon: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    gap: 16,
    paddingBottom: 36,
    paddingHorizontal: 22,
  },
  photoArea: {
    alignItems: 'center',
    borderRadius: 24,
    height: 130,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoText: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  purpleCard: {
    backgroundColor: '#E0D7FA',
  },
  mintCard: {
    backgroundColor: '#CCF2EC',
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  purpleTitle: {
    color: '#7B5EE6',
  },
  mintTitle: {
    color: '#00C2A8',
  },
  infoRow: {
    gap: 6,
    marginBottom: 14,
  },
  infoLabel: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  bulletText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 26,
  },
  bodyText: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  homeCareBox: {
    borderTopColor: 'rgba(123, 94, 230, 0.22)',
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  homeCareLabel: {
    color: '#7B5EE6',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  stateBox: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    gap: 10,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
