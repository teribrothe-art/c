import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDemoAuthMode } from './auth';
import { PaymentRecord } from './payment-record';
import { Treatment } from './treatments';

const STORAGE_KEY = 'hair-diary-notifications';

export type NotificationType = 'payment_completed' | 'payment_requested' | 'settlement_completed';

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  treatment_id: string;
  href: string;
  created_at: string;
  read: boolean;
};

const memoryStore: AppNotification[] = [];

async function readStore(): Promise<AppNotification[]> {
  if (isDemoAuthMode) {
    return [...memoryStore];
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AppNotification[]) : [];
}

async function writeStore(items: AppNotification[]) {
  if (isDemoAuthMode) {
    memoryStore.length = 0;
    memoryStore.push(...items);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function addNotification(input: Omit<AppNotification, 'id' | 'created_at' | 'read'>) {
  const items = await readStore();
  const notification: AppNotification = {
    ...input,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    read: false,
  };

  items.unshift(notification);
  await writeStore(items.slice(0, 50));
  return notification;
}

export async function notifyDesignerPaymentCompleted(treatment: Treatment, payment: PaymentRecord) {
  if (!treatment.designer_id) {
    return null;
  }

  const customerName = treatment.customer_name || '고객';
  const payout = (payment.designer_payout ?? 0).toLocaleString('ko-KR');

  return addNotification({
    user_id: treatment.designer_id,
    type: 'payment_completed',
    title: '결제 완료',
    message: `🔔 ${customerName} 결제 완료. 피드백 입력 후 정산받으세요`,
    treatment_id: treatment.id,
    href: `/designer/treatment/${treatment.id}`,
  });
}

export async function notifyDesignerPaymentRequested(treatment: Treatment) {
  if (!treatment.designer_id) {
    return null;
  }

  const customerName = treatment.customer_name || '고객';

  return addNotification({
    user_id: treatment.designer_id,
    type: 'payment_requested',
    title: '결제 요청',
    message: `${customerName}님에게 결제 요청을 보냈습니다.`,
    treatment_id: treatment.id,
    href: `/designer/treatment/${treatment.id}`,
  });
}

export async function getNotificationsForCurrentUser(userId: string) {
  const items = await readStore();
  return items.filter((item) => item.user_id === userId);
}

export async function markNotificationRead(notificationId: string) {
  const items = await readStore();
  const next = items.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item,
  );
  await writeStore(next);
}

export async function getUnreadNotificationCount(userId: string) {
  const items = await getNotificationsForCurrentUser(userId);
  return items.filter((item) => !item.read).length;
}
