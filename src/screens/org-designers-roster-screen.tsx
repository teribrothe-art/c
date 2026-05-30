import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchOrgDashboardSummary,
  groupOrgDesignersByStore,
  type OrgDashboardSummary,
  type OrgDesignerMetrics,
} from '../../lib/org-aggregates';
import { formatAmount } from '../../lib/currency-input';
import { getErrorMessage } from '../../lib/errors';
import { useOrgRoleGuard } from '../../lib/use-org-role-guard';
import { colors } from '../../lib/theme';
import { EmptyState } from '../components/empty-state';
import { LoadingState } from '../components/loading-state';
import { AdminBottomTabBar } from '../components/admin-bottom-tab-bar';

function DesignerRosterCard({ designer }: { designer: OrgDesignerMetrics }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{designer.name}</Text>
        {designer.subtitle ? <Text style={styles.cardMeta}>{designer.subtitle}</Text> : null}
      </View>
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
  );
}

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

  const storeGroups = useMemo(
    () => (summary ? groupOrgDesignersByStore(summary.designers) : []),
    [summary],
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
          소속 매장별로 분류되어 있습니다. 매장을 확인한 뒤 매출·고객을 조회하세요.
        </Text>

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage ? (
          <EmptyState title="불러오기 실패" subtitle={errorMessage} />
        ) : summary ? (
          storeGroups.map((group) => (
            <View key={group.storeId} style={styles.storeSection}>
              <View style={styles.storeHeader}>
                <Text style={styles.storeLabel}>소속 매장</Text>
                <Text style={styles.storeName}>{group.storeName}</Text>
                <Text style={styles.storeRegion}>{group.storeRegion}</Text>
                <Text style={styles.storeStats}>
                  디자이너 {group.designers.length}명 · 고객 {group.customerCount}명 · 이번 달 시술{' '}
                  {group.monthTreatmentCount}건 · 매출 {formatAmount(group.monthRevenue)}
                </Text>
              </View>
              <View style={styles.designerList}>
                {group.designers.map((designer) => (
                  <DesignerRosterCard key={designer.id} designer={designer} />
                ))}
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
    gap: 16,
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
  storeSection: {
    gap: 10,
  },
  storeHeader: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storeLabel: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '800',
  },
  storeName: {
    color: '#1B5E20',
    fontSize: 18,
    fontWeight: '900',
  },
  storeRegion: {
    color: '#388E3C',
    fontSize: 12,
    fontWeight: '600',
  },
  storeStats: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  designerList: {
    gap: 10,
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
