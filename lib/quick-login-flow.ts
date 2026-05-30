import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { redeemInviteForCurrentUser } from './apply-pending-invite';
import { getPostAuthRoute } from './auth-redirect';
import { getCurrentUser, signInWithEmail } from './auth';
import { peekPendingInviteCode } from './pending-invite-code';

export async function signInAndNavigate(
  email: string,
  password: string,
  options?: { redirectTo?: Href },
) {
  await signInWithEmail({ email, password });

  const user = await getCurrentUser();
  const pendingInvite = await peekPendingInviteCode();

  if (user?.role === 'customer' && pendingInvite.length === 6) {
    const redeemed = await redeemInviteForCurrentUser(pendingInvite);

    if (redeemed) {
      return;
    }
  }

  const nextRoute = options?.redirectTo ?? (await getPostAuthRoute());
  router.replace(nextRoute);
}
