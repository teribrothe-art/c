import * as Linking from 'expo-linking';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

import { redeemInviteForCurrentUser } from '../../lib/apply-pending-invite';
import { getCurrentUser } from '../../lib/auth';
import { parseInviteCodeFromQrPayload } from '../../lib/customer-invitations';
import { stashPendingInviteCode } from '../../lib/pending-invite-code';

async function routeInviteCode(
  code: string,
  router: ReturnType<typeof useRouter>,
) {
  if (code.length !== 6) {
    return;
  }

  await stashPendingInviteCode(code);

  const user = await getCurrentUser();

  if (user?.role === 'customer') {
    try {
      const redeemed = await redeemInviteForCurrentUser(code);

      if (redeemed) {
        return;
      }
    } catch {
      // 로그인 화면에서 수동 연결 가능
    }
  }

  router.push({
    pathname: '/signup',
    params: { inviteCode: code },
  });
}

/** 앱 외부 QR/링크(hairdiaryapp://invite/CODE) → 회원가입 화면으로 연결 */
export function InviteDeepLinkHandler() {
  const router = useRouter();
  const rootState = useRootNavigationState();
  const handledInitial = useRef(false);

  const navigationReady = Boolean(rootState?.key);

  useEffect(() => {
    if (!navigationReady || handledInitial.current) {
      return;
    }

    handledInitial.current = true;

    const task = InteractionManager.runAfterInteractions(() => {
      Linking.getInitialURL()
        .then((url) => {
          if (!url) {
            return;
          }

          const code = parseInviteCodeFromQrPayload(url);
          return routeInviteCode(code, router);
        })
        .catch(() => undefined);
    });

    return () => task.cancel();
  }, [navigationReady, router]);

  useEffect(() => {
    if (!navigationReady) {
      return;
    }

    const subscription = Linking.addEventListener('url', (event) => {
      const code = parseInviteCodeFromQrPayload(event.url);

      void routeInviteCode(code, router);
    });

    return () => subscription.remove();
  }, [navigationReady, router]);

  return null;
}
