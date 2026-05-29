import { router, type Href } from 'expo-router';

/** 이전 화면이 없으면 fallback으로 이동 (GO_BACK 미처리 방지) */
export function navigateBackOrReplace(fallback: Href = '/customer-home') {
  requestAnimationFrame(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallback);
  });
}

export function orgScopeFallbackRoute(scope: 'store' | 'admin'): Href {
  return scope === 'store' ? '/store' : '/admin';
}

/** 매장·본사 상세 화면용 — 스택이 없으면 해당 홈으로 */
export function navigateBackOrOrgHome(scope: 'store' | 'admin') {
  navigateBackOrReplace(orgScopeFallbackRoute(scope));
}
