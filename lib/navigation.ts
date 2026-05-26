import { router, type Href } from 'expo-router';

/** 이전 화면이 없으면 fallback(기본 홈)으로 이동 */
export function navigateBackOrReplace(fallback: Href = '/home') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
