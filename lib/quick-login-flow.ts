import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { redeemInviteForCurrentUser } from './apply-pending-invite';
import { getPostAuthRoute } from './auth-redirect';
import { getCurrentUser, signInWithEmail } from './auth';
import { peekPendingInviteCode } from './pending-invite-code';
import { safeReplace } from './safe-navigate';

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

  if (nextRoute === '/') {
    throw new Error('로그인 세션을 저장하지 못했습니다. 앱을 새로고침한 뒤 다시 시도해주세요.');
  }

  safeReplace(nextRoute);
}
