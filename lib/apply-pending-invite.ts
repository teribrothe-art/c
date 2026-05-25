import { router } from 'expo-router';

import { getCurrentUser, type UserRole } from './auth';
import { isValidInviteCodeFormat, redeemInviteCode, sanitizeInviteCode } from './customer-invitations';
import { consumePendingInviteCode, peekPendingInviteCode } from './pending-invite-code';

type RedeemInviteOptions = {
  userId?: string;
  role?: UserRole | null;
};

export async function redeemInviteForCurrentUser(
  rawCode?: string,
  options?: RedeemInviteOptions,
) {
  const sessionUser = await getCurrentUser();
  const userId = options?.userId ?? sessionUser?.id;
  const role = options?.role ?? sessionUser?.role;

  if (!userId || role !== 'customer') {
    return false;
  }

  const code = sanitizeInviteCode(rawCode || (await peekPendingInviteCode()));

  if (!isValidInviteCodeFormat(code)) {
    return false;
  }

  const redeemed = await redeemInviteCode(code, userId);
  await consumePendingInviteCode();

  router.replace({
    pathname: '/invite-welcome',
    params: {
      designerName: redeemed.designerName,
      customerName: redeemed.customerName,
    },
  });

  return true;
}
