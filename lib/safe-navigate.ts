import { router, type Href } from 'expo-router';

function runAfterPaint(task: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(task);
  });
}

/** 스크롤·제스처 직후 네비게이션이 무시되는 경우 방지 */
export function safePush(href: Href) {
  runAfterPaint(() => {
    router.push(href);
  });
}

/** 로그인 직후 replace가 웹에서 무시되는 경우 방지 */
export function safeReplace(href: Href) {
  runAfterPaint(() => {
    router.replace(href);
  });
}
