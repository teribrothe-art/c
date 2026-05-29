#!/usr/bin/env node
/**
 * start:phone 전에 @expo/ngrok 설치 여부 확인
 * 없으면 터널이 안 뜨고 exp://172.x 같은 내부 IP만 나와 폰 접속 불가
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  require.resolve('@expo/ngrok');
  process.exit(0);
} catch {
  console.error('\n【접속오류 원인】 @expo/ngrok 패키지가 없습니다.\n');
  console.error('Expo 터널이 켜지지 않아 휴대폰에서 Metro에 연결할 수 없습니다.\n');
  console.error('해결:\n  npm install\n  (또는) npm install @expo/ngrok@^4.1.0 --save-dev\n');
  console.error('이후:\n  npm run start:phone\n  npm run share\n');
  process.exit(1);
}
