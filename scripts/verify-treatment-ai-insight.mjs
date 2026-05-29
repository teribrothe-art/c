#!/usr/bin/env node
/**
 * 시술 AI 인사이트 재생성 조건 스모크 검증 (RN 의존 없음)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const insightSource = readFileSync(path.join(root, 'lib/treatment-ai-insight.ts'), 'utf8');

assert(
  insightSource.includes('canRegenerateTreatmentAiInsight'),
  'canRegenerateTreatmentAiInsight export',
);
assert(
  insightSource.includes('canUseTreatmentAiInsightAction'),
  'canUseTreatmentAiInsightAction export',
);
assert(
  insightSource.includes('REGENERATE_INSIGHT_TEMPLATES'),
  '재생성 문구 템플릿 순환',
);
assert(
  insightSource.includes('previousInsight'),
  '이전 인사이트 회피',
);

const screenSource = readFileSync(
  path.join(root, 'app/designer/treatment/[id].tsx'),
  'utf8',
);

assert(
  screenSource.includes('canUseTreatmentAiInsightAction'),
  '시술 입력 화면이 canUseTreatmentAiInsightAction 사용',
);
assert(screenSource.includes('regenerate: isRegenerate'), 'regenerate 플래그 전달');
assert(screenSource.includes('variantSeed: Date.now()'), '재생성 variantSeed 전달');

console.log('OK: treatment AI insight regenerate wiring verified');
