import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '../../lib/errors';
import {
  CustomerDesignerSummary,
  getCustomerDesignerSummaries,
} from '../../lib/customer-designers';
import { LoadingState } from '../../src/components/loading-state';
import { BottomTabBar } from '../../src/components/bottom-tab-bar';

const PURPLE = '#7B5EE6';

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

export default function CustomerDesignersScreen() {
  const insets = useSafeAreaInsets();
  const [designers, setDesigners] = useState<CustomerDesignerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    getCustomerDesignerSummaries()
      .then((items) => {
        setDesigners(items);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, '디자이너 목록을 불러오지 못했습니다.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>함께한 디자이너</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <LoadingState message="불러오는 중..." />
      ) : errorMessage ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : designers.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>아직 연결된 디자이너가 없어요</Text>
          <Text style={styles.stateText}>시술 기록이 생기면 여기에 표시됩니다.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}>
          {designers.map((designer) => (
            <Pressable
              key={designer.key}
              onPress={() =>
                router.push({
                  pathname: '/home',
                  params: {
                    designerName: designer.designerName,
                    ...(designer.designerId ? { designerId: designer.designerId } : {}),
                  },
                })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{designer.designerName.slice(0, 1)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{designer.designerName}</Text>
                <Text style={styles.meta}>
                  시술 {designer.treatmentCount}회 · 최근 {formatDate(designer.latestTreatmentDate)}
                </Text>
                {designer.treatmentTypes.length > 0 ? (
                  <Text style={styles.types} numberOfLines={1}>
                    {designer.treatmentTypes.join(' · ')}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <BottomTabBar />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    color: '#1A1A2E',
    fontSize: 36,
  },
  headerTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.88,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E0D7FA',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: PURPLE,
    fontSize: 20,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  types: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: 24,
    fontWeight: '600',
  },
  stateBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
