import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { ensureAuthReady, getCurrentUser } from '../../lib/auth';
import {
  isPublicAuthRoute,
  resolveSessionRestoreRoute,
  saveDevLastRoute,
} from '../../lib/auth-session-routes';

/** 코드 변경·새로고침 후에도 데모 로그인·마지막 화면을 자동 복원 */
export function AuthSessionBootstrap() {
  const pathname = usePathname();
  const initialPathnameRef = useRef(pathname);

  useEffect(() => {
    let cancelled = false;

    void ensureAuthReady()
      .then(() => getCurrentUser())
      .then((user) => {
        if (cancelled || !user) {
          return;
        }

        const nextRoute = resolveSessionRestoreRoute(user, initialPathnameRef.current);

        if (nextRoute) {
          router.replace(nextRoute);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPublicAuthRoute(pathname)) {
      saveDevLastRoute(pathname);
    }
  }, [pathname]);

  return null;
}
