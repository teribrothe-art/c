import { router } from 'expo-router';

import { getCurrentUser } from './auth';
import { normalizeInviteCode, redeemInviteCode } from './customer-invitations';
import { consumePendingInviteCode, peekPendingInviteCode } from './pending-invite-code';

export async function redeemInviteForCurrentUser(rawCode?: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    return false;
  }

  const code = normalizeInviteCode(rawCode || (await peekPendingInviteCode()));

  if (code.length !== 6) {
    return false;
  }

  const redeemed = await redeemInviteCode(code, user.id);
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
