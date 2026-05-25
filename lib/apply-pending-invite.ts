import { router } from 'expo-router';

import { getCurrentUser, type UserRole } from './auth';
import { normalizeInviteCode, redeemInviteCode } from './customer-invitations';
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

  const code = normalizeInviteCode(rawCode || (await peekPendingInviteCode()));

  if (code.length !== 6) {
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
