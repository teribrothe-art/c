import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { getCurrentUser } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import {
  AppNotification,
  getNotificationsForCurrentUser,
  markNotificationRead,
} from '../lib/notifications';
import { LoadingState } from '../src/components/loading-state';

const CORAL = '#FF5A5F';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    getCurrentUser()
      .then(async (user) => {
        if (!user) {
          router.replace('/');
          return;
        }

        const notifications = await getNotificationsForCurrentUser(user.id);
        setItems(notifications);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePress = async (item: AppNotification) => {
    await markNotificationRead(item.id);
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));

    if (item.href) {
      router.push(item.href as `/designer/treatment/${string}`);
    }
  };

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
        {isLoading ? (
          <LoadingState message="알림 불러오는 중..." />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>알림이 없습니다.</Text>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => handlePress(item)}>
              {!item.read ? <View style={styles.dot} /> : null}
              <View style={styles.cardBody}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{item.created_at.slice(0, 10).replaceAll('-', '.')}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  backText: { color: '#1A1A2E', fontSize: 40, lineHeight: 40 },
  headerTitle: { color: '#1A1A2E', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 44 },
  content: { gap: 12, paddingHorizontal: 16, paddingTop: 8 },
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
  cardUnread: { borderColor: '#FFE0E1', borderWidth: 1 },
  dot: { backgroundColor: CORAL, borderRadius: 4, height: 8, width: 8 },
  cardBody: { flex: 1, gap: 4 },
  message: { color: '#1A1A2E', fontSize: 14, fontWeight: '700', lineHeight: 21 },
  time: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  chevron: { color: '#9CA3AF', fontSize: 22 },
  empty: { color: '#6B6B7B', fontSize: 14, textAlign: 'center' },
  error: { color: CORAL, textAlign: 'center' },
});
