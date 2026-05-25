import { router, type Href } from 'expo-router';

/** 스크롤·제스처 직후 네비게이션이 무시되는 경우 방지 */
export function safePush(href: Href) {
  requestAnimationFrame(() => {
    router.push(href);
  });
}
