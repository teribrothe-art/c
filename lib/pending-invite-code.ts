import { demoPersistedStorage } from './demo-persisted-storage';

import { isValidInviteCodeFormat, sanitizeInviteCode } from './customer-invitations';

const PENDING_INVITE_KEY = 'hair-diary-pending-invite-code';

export async function stashPendingInviteCode(rawCode: string) {
  const code = sanitizeInviteCode(rawCode);

  if (!isValidInviteCodeFormat(code)) {
    return;
  }

  await demoPersistedStorage.setItem(PENDING_INVITE_KEY, code);
}

export async function peekPendingInviteCode() {
  const raw = await demoPersistedStorage.getItem(PENDING_INVITE_KEY);

  if (!raw) {
    return '';
  }

  const code = sanitizeInviteCode(raw);

  if (!isValidInviteCodeFormat(code)) {
    await demoPersistedStorage.removeItem(PENDING_INVITE_KEY);
    return '';
  }

  return code;
}

export async function consumePendingInviteCode() {
  const code = await peekPendingInviteCode();

  if (code) {
    await demoPersistedStorage.removeItem(PENDING_INVITE_KEY);
  }

  return code;
}

export async function clearPendingInviteCode() {
  await demoPersistedStorage.removeItem(PENDING_INVITE_KEY);
}
