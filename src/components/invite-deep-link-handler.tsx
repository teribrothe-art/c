import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { redeemInviteForCurrentUser } from '../../lib/apply-pending-invite';
import { getCurrentUser } from '../../lib/auth';
import { parseInviteCodeFromQrPayload } from '../../lib/customer-invitations';
import { showErrorAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import { stashPendingInviteCode } from '../../lib/pending-invite-code';

async function routeInviteCode(code: string) {
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
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '초대 코드 연결에 실패했습니다.'));
      return;
    }
  }

  router.push({
    pathname: '/signup',
    params: { inviteCode: code },
  });
}

function handleInviteUrl(url: string | null) {
  if (!url) {
    return;
  }

  const code = parseInviteCodeFromQrPayload(url);

  void routeInviteCode(code);
}

/** 앱 외부 QR/링크(hairdiaryapp://invite/CODE) → 회원가입 화면으로 연결 */
export function InviteDeepLinkHandler() {
  useEffect(() => {
    Linking.getInitialURL()
      .then(handleInviteUrl)
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', (event) => {
      handleInviteUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  return null;
}
