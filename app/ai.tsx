import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';

export default function AiConsultScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>AI 상담</Text>
        <Text style={styles.subtitle}>곧 만나요.</Text>
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '600',
  },
});
