import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDemoAuthMode } from './auth';
import { PaymentRecord } from './payment-record';
import { Treatment } from './treatments';

const STORAGE_KEY = 'hair-diary-notifications';

export type NotificationType =
  | 'payment_completed'
  | 'payment_requested'
  | 'settlement_completed'
  | 'customer_payment_due'
  | 'customer_feedback';

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
  const customerName = treatment.customer_name || '고객';

  if (treatment.designer_id) {
    await addNotification({
      user_id: treatment.designer_id,
      type: 'payment_requested',
      title: '결제 요청',
      message: `${customerName}님에게 결제 요청을 보냈습니다.`,
      treatment_id: treatment.id,
      href: `/designer/treatment/${treatment.id}`,
    });
  }

  if (treatment.customer_id) {
    await addNotification({
      user_id: treatment.customer_id,
      type: 'customer_payment_due',
      title: '결제 안내',
      message: `${treatment.treatment_title} 시술 결제가 필요해요.`,
      treatment_id: treatment.id,
      href: `/payment/${treatment.id}`,
    });
  }

  return null;
}

export async function notifyCustomerFeedbackNeeded(treatment: Treatment) {
  if (!treatment.customer_id) {
    return null;
  }

  return addNotification({
    user_id: treatment.customer_id,
    type: 'customer_feedback',
    title: '피드백 요청',
    message: `${treatment.treatment_title} 시술 후기를 남겨주세요.`,
    treatment_id: treatment.id,
    href: `/treatment/${treatment.id}`,
  });
}

/** 알림 탭 시 이동 경로 (역할·타입 기준) */
export function resolveNotificationHref(
  item: AppNotification,
  role: 'customer' | 'designer' | null | undefined,
) {
  if (item.href) {
    return item.href;
  }

  if (item.type === 'customer_payment_due') {
    return `/payment/${item.treatment_id}`;
  }

  if (item.type === 'customer_feedback') {
    return `/treatment/${item.treatment_id}`;
  }

  if (role === 'customer') {
    if (item.type === 'payment_requested') {
      return `/payment/${item.treatment_id}`;
    }

    return `/treatment/${item.treatment_id}`;
  }

  return `/designer/treatment/${item.treatment_id}`;
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
