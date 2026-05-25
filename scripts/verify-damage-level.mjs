import assert from 'node:assert/strict';

function parseDamageLevelFromAiText(text) {
  const trimmed = text.trim();
  const direct = Number(trimmed);

  if (Number.isInteger(direct) && direct >= 1 && direct <= 10) {
    return direct;
  }

  const match = trimmed.match(/\b(10|[1-9])\s*\/\s*10\b/) ?? trimmed.match(/\b(10|[1-9])\b/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
}

function inferDamageLevelRuleBased(treatment) {
  const type = treatment.treatment_type?.trim() ?? '';
  const text = [
    treatment.treatment_title,
    treatment.technique,
    treatment.designer_diagnosis,
    treatment.home_care,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (type.includes('탈색')) {
    return 8;
  }

  if (type.includes('컷')) {
    return 4;
  }

  return 5;
}

assert.equal(parseDamageLevelFromAiText('7'), 7);
assert.equal(parseDamageLevelFromAiText('손상도 8/10'), 8);
assert.equal(parseDamageLevelFromAiText('invalid'), null);
assert.equal(
  inferDamageLevelRuleBased({
    treatment_type: '탈색',
    treatment_title: '탈색',
    technique: '',
    designer_diagnosis: '',
    home_care: '',
  }),
  8,
);

console.log('OK: damage level helpers');
