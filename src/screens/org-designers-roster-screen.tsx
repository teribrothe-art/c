import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchOrgDashboardSummary, type OrgDashboardSummary } from '../../lib/org-aggregates';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { DesignerStoreAffiliationBadge } from '../components/designer-store-affiliation-badge';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';

export function OrgDesignersRosterScreen() {
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
        setErrorMessage(getErrorMessage(error, '디자이너 목록을 불러오지 못했습니다.'));
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
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>디자이너</Text>
        <Text style={styles.subtitle}>
          모든 디자이너가 매장에 연결되어 있습니다. 소속 매장을 확인한 뒤 매출·고객을 조회하세요.
        </Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : summary ? (
          summary.designers.map((designer) => (
            <View key={designer.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{designer.name}</Text>
                {designer.subtitle ? <Text style={styles.cardMeta}>{designer.subtitle}</Text> : null}
              </View>
              <DesignerStoreAffiliationBadge
                compact
                storeName={designer.storeName}
                storeRegion={designer.storeRegion}
              />
              <Text style={styles.cardStats}>
                고객 {designer.customerCount}명 · 시술 {designer.treatmentCount}건 · 이번 달{' '}
                {designer.monthTreatmentCount}건
              </Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push(`/admin/designer/${designer.id}/revenue`)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
                  <Text style={styles.actionPrimary}>매출 보기</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/admin/customers',
                      params: { designerId: designer.id },
                    })
                  }
                  style={({ pressed }) => [styles.actionButtonOutline, pressed && styles.actionPressed]}>
                  <Text style={styles.actionOutline}>고객·시술</Text>
                </Pressable>
              </View>
            </View>
          ))
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
    gap: 12,
    paddingHorizontal: 18,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardStats: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  actionButtonOutline: {
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  actionPressed: {
    opacity: 0.9,
  },
  actionPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionOutline: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
