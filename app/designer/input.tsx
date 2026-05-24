import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';

const quickInputs = [
  { icon: '✂️', label: '컷' },
  { icon: '🎨', label: '컬러' },
  { icon: '💫', label: '펌' },
  { icon: '✨', label: '탈색' },
  { icon: '💧', label: '트리트먼트' },
  { icon: '🪄', label: '매직' },
];

export default function DesignerInputScreen() {
  const insets = useSafeAreaInsets();

  const handleQuickInput = (label: string) => {
    Alert.alert('준비 중', `${label} 시술 입력 기능은 곧 제공될 예정입니다.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>새 시술 입력</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>어떤 시술을 추가할까요?</Text>
          <Text style={styles.heroSubtitle}>빠른 입력으로 시술 종류를 선택하세요.</Text>
        </View>

        <View style={styles.grid}>
          {quickInputs.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => handleQuickInput(item.label)}
              style={({ pressed }) => [styles.quickButton, pressed && styles.quickButtonPressed]}>
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footerHint}>기존 고객의 시술 추가는 [고객] 탭에서 가능합니다</Text>
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
    gap: 16,
    paddingHorizontal: 16,
  },
  pageTitle: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    height: 108,
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  quickButtonPressed: {
    opacity: 0.82,
  },
  quickIcon: {
    fontSize: 28,
  },
  quickLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  footerHint: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
});
