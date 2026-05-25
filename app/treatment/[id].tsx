import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TreatmentPhotoCarousel } from '../../src/components/treatment-photo-carousel';
import { TreatmentRecordNav } from '../../src/components/treatment-record-nav';
import { getErrorMessage } from '../../lib/errors';
import { getCustomerPaymentBadge, type CustomerPaymentBadge } from '../../lib/payment-status';
import { normalizePaymentStatus } from '../../lib/payment-status';
import { getPaymentByTreatmentId } from '../../lib/payments';
import { getTreatmentNavigation } from '../../lib/treatment-navigation';
import { getTreatmentById, getTreatments, Treatment } from '../../lib/treatments';
import { LoadingState } from '../../src/components/loading-state';

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
  const [paymentBadge, setPaymentBadge] = useState<CustomerPaymentBadge>({ label: '결제 대기', variant: 'pending' });
  const [recordNav, setRecordNav] = useState<ReturnType<typeof getTreatmentNavigation>>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        if (!id) {
          throw new Error('시술 ID를 찾을 수 없습니다.');
        }

        setIsLoading(true);

        const [{ user, treatment: nextTreatment }, { treatments }] = await Promise.all([
          getTreatmentById(id),
          getTreatments(),
        ]);

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (!nextTreatment) {
          setErrorMessage('시술 기록을 찾을 수 없습니다.');
          setRecordNav(null);
          return;
        }

        setTreatment(nextTreatment);
        setRecordNav(getTreatmentNavigation(treatments, id));
        const payment = await getPaymentByTreatmentId(id);
        setPaymentBadge(getCustomerPaymentBadge(nextTreatment.payment_status, payment?.status ?? null));
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = getErrorMessage(error, '시술 기록을 불러오지 못했습니다.');
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>시술 기록</Text>
          <View style={[
            styles.payBadge,
            paymentBadge.variant === 'settlement' && styles.payBadgeSettlement,
            paymentBadge.variant === 'done' && styles.payBadgeDone,
          ]}>
            <Text style={[
              styles.payBadgeText,
              paymentBadge.variant === 'settlement' && styles.payBadgeTextSettlement,
              paymentBadge.variant === 'done' && styles.payBadgeTextDone,
            ]}>{paymentBadge.label}</Text>
          </View>
        </View>
        <Pressable style={styles.headerButton}>
          <Text style={styles.shareIcon}>↗</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !treatment ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>기록을 볼 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage || '시술 기록이 없습니다.'}</Text>
          </View>
        ) : (
          <>
            {recordNav && recordNav.total > 1 ? (
              <TreatmentRecordNav
                newerId={recordNav.newerId}
                olderId={recordNav.olderId}
                onNavigate={(targetId) => router.replace(`/treatment/${targetId}`)}
                positionLabel={`${recordNav.index + 1} / ${recordNav.total}`}
              />
            ) : null}

            {normalizePaymentStatus(treatment.payment_status) === 'payment_requested' ? (
              <Pressable
                style={styles.payCta}
                onPress={() => router.push(`/payment/${treatment.id}`)}>
                <Text style={styles.payCtaText}>결제하기</Text>
              </Pressable>
            ) : null}

            <TreatmentPhotoCarousel
              afterPhotoPath={treatment.after_photo_url}
              beforePhotoPath={treatment.before_photo_url}
            />

            <SectionCard title="기본 정보">
              <InfoRow label="시술" value={treatment.treatment_title} />
              <InfoRow label="날짜" value={formatDate(treatment.treatment_date)} />
              <InfoRow label="시간" value={treatment.duration} />
            </SectionCard>

            <SectionCard title="내가 받은 시술">
              <InfoRow label="시술 종류" value={treatment.treatment_type} />
              <InfoRow label="시술 소요 시간" value={treatment.duration} />
              <InfoRow label="디자이너 이름" value={treatment.designer_name} />
            </SectionCard>

            <SectionCard title="디자이너 진단" variant="purple">
              <Text style={styles.bodyText}>{treatment.designer_diagnosis || '진단 내용이 없습니다.'}</Text>
              <View style={styles.homeCareBox}>
                <Text style={styles.homeCareLabel}>홈케어</Text>
                <Text style={styles.bodyText}>{treatment.home_care || '홈케어 정보가 없습니다.'}</Text>
              </View>
            </SectionCard>

            <SectionCard title="AI 인사이트" variant="mint">
              <Text style={styles.bodyText}>
                {treatment.ai_insight ||
                  '디자이너가 시술 입력을 마치면 AI 인사이트가 생성돼요.'}
              </Text>
              <Pressable
                onPress={() => router.push('/voice')}
                style={({ pressed }) => [styles.aiConsultLink, pressed && { opacity: 0.85 }]}>
                <Text style={styles.aiConsultLinkText}>AI 상담에서 더 물어보기 →</Text>
              </Pressable>
            </SectionCard>

            <Text style={styles.footerNotice}>
              * 일부 시술 세부 정보는 디자이너 전용으로 관리됩니다.
            </Text>
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
  headerCenter: { alignItems: 'center', flex: 1 },
  payBadge: { backgroundColor: '#FFF0F0', borderRadius: 999, marginTop: 4, paddingHorizontal: 10, paddingVertical: 3 },
  payBadgeSettlement: { backgroundColor: '#E8FAF7' },
  payBadgeDone: { backgroundColor: '#EEEEF4' },
  payBadgeText: { color: '#FF5A5F', fontSize: 11, fontWeight: '800' },
  payBadgeTextSettlement: { color: '#00C2A8' },
  payBadgeTextDone: { color: '#6B6B7B' },
  payCta: {
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    marginBottom: 16,
    paddingVertical: 14,
  },
  payCtaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
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
  bodyText: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  aiConsultLink: {
    marginTop: 12,
  },
  aiConsultLinkText: {
    color: '#00C2A8',
    fontSize: 14,
    fontWeight: '800',
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
  footerNotice: {
    color: '#9B9BA7',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
