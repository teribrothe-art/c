#!/usr/bin/env node
/**
 * Windows 자동 시작 해제
 * 사용: node scripts/uninstall-windows-auto-start.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TASK_NAME = 'PlanB-HairDiary-DevWeb';
const startupCmd = path.join(
  process.env.APPDATA ?? '',
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup',
  'PlanB-HairDiary-DevWeb.cmd',
);

function main() {
  if (process.platform === 'win32') {
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Unregister-ScheduledTask -TaskName '${TASK_NAME}' -Confirm:$false -ErrorAction SilentlyContinue`,
      ],
      { encoding: 'utf8' },
    );
    console.log(`✓ 작업 스케줄러 제거: ${TASK_NAME}`);
  }

  if (fs.existsSync(startupCmd)) {
    fs.unlinkSync(startupCmd);
    console.log(`✓ 시작 프로그램 제거: ${startupCmd}`);
  } else {
    console.log('△ 시작 프로그램 항목 없음');
  }

  console.log('\n자동 시작이 해제되었습니다.');
}

main();
