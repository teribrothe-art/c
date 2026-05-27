import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { LoadingState } from '../../src/components/loading-state';
import { AdminBottomTabBar } from '../../src/components/admin-bottom-tab-bar';

export default function AdminHomeScreen() {
  useOrgRoleGuard('admin');
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OrgDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    fetchOrgDashboardSummary('admin')
      .then((data) => {
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '본사 현황을 불러오지 못했습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>ADMIN</Text>
        <Text style={styles.title}>본사</Text>
        <Text style={styles.subtitle}>전국 매장·디자이너·매출·고객 시술 데이터를 통합 조회합니다.</Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : summary ? (
          <>
            <View style={styles.cardGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>연결 디자이너</Text>
                <Text style={styles.statValue}>{summary.designerCount}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>이번 달 시술</Text>
                <Text style={styles.statValue}>{summary.monthTreatmentCount}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>이번 달 매출</Text>
                <Text style={styles.statValue}>{summary.monthRevenue.toLocaleString('ko-KR')}</Text>
                <Text style={styles.statMeta}>원</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>전체 고객</Text>
                <Text style={styles.statValue}>{summary.customerCount}</Text>
              </View>
            </View>

            <View style={styles.quickRow}>
              <Link href="/admin/designers" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>디자이너</Text>
                  <Text style={styles.quickMeta}>소속·누적 테스트 포함</Text>
                </Pressable>
              </Link>
              <Link href="/admin/revenue" asChild>
                <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
                  <Text style={styles.quickTitle}>매출</Text>
                  <Text style={styles.quickMeta}>전체 매출·정산</Text>
                </Pressable>
              </Link>
            </View>

            <Text style={styles.sectionTitle}>매출 상위 디자이너</Text>
            {[...summary.designers]
              .sort((a, b) => b.monthRevenue - a.monthRevenue)
              .slice(0, 5)
              .map((designer) => (
                <Pressable
                  key={designer.id}
                  onPress={() => router.push(`/admin/designer/${designer.id}/revenue`)}
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                  <View>
                    <Text style={styles.menuTitle}>{designer.name}</Text>
                    <Text style={styles.menuMeta}>{designer.subtitle ?? '디자이너'}</Text>
                  </View>
                  <Text style={styles.menuAmount}>
                    {designer.monthRevenue.toLocaleString('ko-KR')}원
                  </Text>
                </Pressable>
              ))}
          </>
        ) : null}
      </ScrollView>
      <AdminBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    color: colors.purple,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 96,
    padding: 14,
    width: '48%',
  },
  statLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#1A1A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  statMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  quickPressed: {
    opacity: 0.9,
  },
  quickTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  quickMeta: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  menuRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowPressed: {
    opacity: 0.88,
  },
  menuTitle: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: '800',
  },
  menuMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  menuAmount: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '900',
  },
});
