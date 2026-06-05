import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { redeemInviteForCurrentUser } from './apply-pending-invite';
import { getPostAuthRouteForRole } from './auth-redirect';
import { signInWithEmail, type AuthUser } from './auth';
import { prefetchPostLoginWorkspace } from './post-login-prefetch';
import { peekPendingInviteCode } from './pending-invite-code';

export async function signInAndNavigate(
  email: string,
  password: string,
  options?: { redirectTo?: Href },
) {
  const user = await signInWithEmail({ email, password });
  const nextRoute = options?.redirectTo ?? getPostAuthRouteForRole(user.role);

  prefetchPostLoginWorkspace(user);
  router.replace(nextRoute);

  void runPostLoginInviteFlow(user);
}

async function runPostLoginInviteFlow(user: AuthUser) {
  if (user.role !== 'customer') {
    return;
  }

  const pendingInvite = await peekPendingInviteCode();

  if (pendingInvite.length !== 6) {
    return;
  }

  await redeemInviteForCurrentUser(pendingInvite, {
    userId: user.id,
    role: user.role,
  });
}
