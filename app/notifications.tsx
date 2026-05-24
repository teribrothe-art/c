import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const notifications = [
  {
    id: 'payment-1',
    message: '김미용 디자이너님이 결제를 요청했어요 · 250,000원',
    tone: 'danger' as const,
    href: '/payment/demo-treatment-1' as const,
  },
  {
    id: '2',
    message: '박민지님이 다이어리에 사진을 추가했어요',
    tone: 'default' as const,
  },
  {
    id: '3',
    message: '이번 주 시술 5건 완료!',
    tone: 'gold' as const,
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {notifications.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            disabled={!item.href}
            onPress={() => {
              if (item.href) {
                router.push(item.href);
              }
            }}>
            {item.tone === 'danger' ? <View style={styles.dangerDot} /> : null}
            <Text style={styles.message}>{item.message}</Text>
            {item.href ? <Text style={styles.chevron}>›</Text> : null}
          </Pressable>
        ))}
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
    fontSize: 40,
    lineHeight: 40,
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
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  dangerDot: {
    backgroundColor: '#FF5A5F',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  message: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: 22,
    fontWeight: '300',
  },
});
