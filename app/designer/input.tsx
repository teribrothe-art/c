import { router } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';

type InputItem = {
  label: string;
  value: string;
  status: 'complete' | 'required';
};

type InputSection = {
  title: string;
  items: InputItem[];
};

const sections: InputSection[] = [
  {
    title: '기본 정보',
    items: [
      { label: '시술 종류', value: '탈색+토닝', status: 'complete' },
      { label: '소요 시간', value: '3시간 20분', status: 'complete' },
    ],
  },
  {
    title: '기술 데이터',
    items: [
      { label: '사용 약품', value: '웰라 12% · 로레알', status: 'complete' },
      { label: '기법·세팅', value: '선택 안 됨', status: 'required' },
    ],
  },
  {
    title: '전문가 진단',
    items: [
      { label: '모발 상태', value: '필수', status: 'required' },
      { label: '홈케어 가이드', value: '필수', status: 'required' },
    ],
  },
];

const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
const completedItems = sections.reduce(
  (sum, section) => sum + section.items.filter((item) => item.status === 'complete').length,
  0,
);
const requiredCount = totalItems - completedItems;
const progress = completedItems / totalItems;

function FieldCard({ item }: { item: InputItem }) {
  const complete = item.status === 'complete';

  return (
    <View style={[styles.fieldCard, complete ? styles.completeCard : styles.requiredCard]}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, complete ? styles.completeText : styles.requiredText]}>
          {item.label}
        </Text>
        <View style={[styles.statusPill, complete ? styles.completePill : styles.requiredPill]}>
          <Text style={[styles.statusPillText, complete ? styles.completePillText : styles.requiredPillText]}>
            {complete ? '✓' : '!'}
          </Text>
        </View>
      </View>
      <Text style={styles.fieldValue}>{item.value}</Text>
    </View>
  );
}

export default function DesignerInputScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>시술 입력 · 김지원</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressText}>완료 {completedItems}/{totalItems}</Text>
            <Text style={styles.remainingText}>정산까지 {requiredCount}개</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.cardList}>
              {section.items.map((item) => (
                <FieldCard key={item.label} item={item} />
              ))}
            </View>
          </View>
        ))}

        <Pressable disabled style={styles.settlementButton}>
          <Text style={styles.settlementButtonText}>필수 항목 {requiredCount}개 입력 후 정산</Text>
        </Pressable>
      </ScrollView>
      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    paddingBottom: 130,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  closeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  closeText: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  progressBlock: {
    marginBottom: 28,
  },
  progressTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  remainingText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '900',
  },
  progressTrack: {
    height: 12,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E6E6EE',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1A1A2E',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  cardList: {
    gap: 12,
  },
  fieldCard: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  completeCard: {
    borderColor: '#CCF2EC',
  },
  requiredCard: {
    borderColor: '#FFD4D5',
  },
  fieldHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  completeText: {
    color: '#00C2A8',
  },
  requiredText: {
    color: '#FF5A5F',
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  completePill: {
    backgroundColor: '#CCF2EC',
  },
  requiredPill: {
    backgroundColor: '#FFD4D5',
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '900',
  },
  completePillText: {
    color: '#00C2A8',
  },
  requiredPillText: {
    color: '#FF5A5F',
  },
  fieldValue: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  settlementButton: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#E1E1E8',
    marginTop: 4,
    paddingVertical: 17,
  },
  settlementButtonText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '900',
  },
});
