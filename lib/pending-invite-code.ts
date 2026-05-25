import AsyncStorage from '@react-native-async-storage/async-storage';

import { isValidInviteCodeFormat, sanitizeInviteCode } from './customer-invitations';

const PENDING_INVITE_KEY = 'hair-diary-pending-invite-code';

export async function stashPendingInviteCode(rawCode: string) {
  const code = sanitizeInviteCode(rawCode);

  if (!isValidInviteCodeFormat(code)) {
    return;
  }

  await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
}

export async function peekPendingInviteCode() {
  const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);

  if (!raw) {
    return '';
  }

  const code = sanitizeInviteCode(raw);

  if (!isValidInviteCodeFormat(code)) {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return '';
  }

  return code;
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
