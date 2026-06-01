#!/usr/bin/env node
/**
 * 전국 디자이너 테스트 로그인 카탈로그 등록 검증
 * 실행: npm run verify:nationwide-login
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NATIONWIDE_DESIGNERS_PUBLIC, NATIONWIDE_TEST_PASSWORD } from '../lib/nationwide-org-catalog.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

function run() {
  const catalogSource = fs.readFileSync(path.join(projectRoot, 'lib/demo-user-catalog.ts'), 'utf8');

  assert(
    catalogSource.includes('NATIONWIDE_DESIGNERS_PUBLIC'),
    'demo-user-catalog.ts 에 전국 디자이너 카탈로그 미등록',
  );

  assert(NATIONWIDE_DESIGNERS_PUBLIC.length === 1000, '전국 디자이너 1000명');

  const sample = NATIONWIDE_DESIGNERS_PUBLIC[0];
  assert(sample.email.endsWith('@hair.app'), '전국 디자이너 이메일 형식');
  assert(sample.password === NATIONWIDE_TEST_PASSWORD, '전국 디자이너 비밀번호 test1234');

  console.log('verify-nationwide-designer-login: OK');
  console.log(`  전국 디자이너 ${NATIONWIDE_DESIGNERS_PUBLIC.length}명 · 카탈로그 등록 확인`);
  console.log(`  예: ${sample.email} / ${NATIONWIDE_TEST_PASSWORD}`);
}

run();
