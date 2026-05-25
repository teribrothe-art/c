import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeInviteCode } from './customer-invitations';

const PENDING_INVITE_KEY = 'hair-diary-pending-invite-code';

export async function stashPendingInviteCode(rawCode: string) {
  const code = normalizeInviteCode(rawCode);

  if (code.length !== 6) {
    return;
  }

  await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
}

export async function peekPendingInviteCode() {
  const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  return raw ? normalizeInviteCode(raw) : '';
}

export async function consumePendingInviteCode() {
  const code = await peekPendingInviteCode();

  if (code) {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);
  }

  return code;
}

export async function clearPendingInviteCode() {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}
