import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { PaymentRecord } from './payment-record';
import { supabase } from './supabase';
import { Treatment } from './treatments';

const STORAGE_KEY = 'hair-diary-notifications';

export type NotificationType =
  | 'payment_completed'
  | 'payment_requested'
  | 'settlement_completed'
  | 'customer_payment_due'
  | 'customer_feedback'
  | 'invite_customer_joined'
  | 'treatment_recorded';

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

const selectFields = 'id, user_id, type, title, message, treatment_id, href, read, created_at';

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: row.type as NotificationType,
    title: String(row.title ?? ''),
    message: String(row.message),
    treatment_id: String(row.treatment_id ?? ''),
    href: String(row.href ?? ''),
    created_at: String(row.created_at),
    read: Boolean(row.read),
  };
}

async function readLocalStore(): Promise<AppNotification[]> {
  if (isDemoAuthMode && memoryStore.length > 0) {
    return [...memoryStore];
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const items = raw ? (JSON.parse(raw) as AppNotification[]) : [];

  if (isDemoAuthMode) {
    memoryStore.length = 0;
    memoryStore.push(...items);
  }

  return items;
}

async function writeLocalStore(items: AppNotification[]) {
  memoryStore.length = 0;
  memoryStore.push(...items);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function addNotification(input: Omit<AppNotification, 'id' | 'created_at' | 'read'>) {
  if (!isDemoAuthMode && supabase) {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('알림을 저장할 권한이 없습니다.');
    }

    if (user.id !== input.user_id) {
      const { data: notificationId, error } = await supabase.rpc('create_app_notification', {
        p_user_id: input.user_id,
        p_type: input.type,
        p_title: input.title,
        p_message: input.message,
        p_treatment_id: input.treatment_id || null,
        p_href: input.href || null,
      });

      if (error) {
        throw toAppError(error);
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(selectFields)
        .eq('id', notificationId)
        .single();

      if (fetchError) {
        throw toAppError(fetchError);
      }

      return mapRow(data as Record<string, unknown>);
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message,
        treatment_id: input.treatment_id || null,
        href: input.href || null,
        read: false,
      })
      .select(selectFields)
      .single();

    if (error) {
      throw toAppError(error);
    }

    return mapRow(data as Record<string, unknown>);
  }

  const items = await readLocalStore();
  const notification: AppNotification = {
    ...input,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    read: false,
  };

  items.unshift(notification);
  await writeLocalStore(items.slice(0, 50));
  return notification;
}

export async function notifyDesignerPaymentCompleted(treatment: Treatment, payment: PaymentRecord) {
  if (!treatment.designer_id) {
    return null;
  }

  const customerName = treatment.customer_name || '고객';

  return addNotification({
    user_id: treatment.designer_id,
    type: 'payment_completed',
    title: '결제 완료',
    message: `🔔 ${customerName} 결제 완료. 피드백 입력 후 정산받으세요`,
    treatment_id: treatment.id,
    href: `/designer/treatment/${treatment.id}`,
  });
}

export async function notifyDesignerSettlementCompleted(
  treatment: Treatment,
  payment: PaymentRecord,
) {
  if (!treatment.designer_id) {
    return null;
  }

  const customerName = treatment.customer_name || '고객';
  const amount = (payment.amount ?? treatment.price ?? 0).toLocaleString('ko-KR');

  return addNotification({
    user_id: treatment.designer_id,
    type: 'settlement_completed',
    title: '정산 완료',
    message: `${customerName} 시술 정산 완료 - ${amount}원`,
    treatment_id: treatment.id,
    href: '/designer/revenue',
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

export async function notifyCustomerTreatmentRecorded(treatment: Treatment) {
  if (!treatment.customer_id) {
    return null;
  }

  const designerName = treatment.designer_name?.trim() || '디자이너';

  return addNotification({
    user_id: treatment.customer_id,
    type: 'treatment_recorded',
    title: '새 시술 기록',
    message: `💡 ${designerName}님이 새 시술을 기록했어요`,
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

  if (item.type === 'settlement_completed' && role === 'designer') {
    return '/designer/revenue';
  }

  if (item.type === 'customer_payment_due') {
    return `/payment/${item.treatment_id}`;
  }

  if (item.type === 'customer_feedback' || item.type === 'treatment_recorded') {
    return `/treatment/${item.treatment_id}`;
  }

  if (item.type === 'invite_customer_joined' && role === 'designer') {
    return '/designer/clients';
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
  if (!isDemoAuthMode && supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .select(selectFields)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw toAppError(error);
    }

    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  }

  const items = await readLocalStore();
  return items.filter((item) => item.user_id === userId);
}

export async function markNotificationRead(notificationId: string) {
  if (!isDemoAuthMode && supabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      throw toAppError(error);
    }

    return;
  }

  const items = await readLocalStore();
  const next = items.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item,
  );
  await writeLocalStore(next);
}

export async function getUnreadNotificationCount(userId: string) {
  const items = await getNotificationsForCurrentUser(userId);
  return items.filter((item) => !item.read).length;
}
