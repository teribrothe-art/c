#!/usr/bin/env node
/**
 * Windows 로그인 시 Expo 웹 개발 서버 자동 시작 등록
 * 사용: node scripts/install-windows-auto-start.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASK_NAME = 'PlanB-HairDiary-DevWeb';
function resolveNodePath() {
  if (process.env.PLANB_NODE_PATH && fs.existsSync(process.env.PLANB_NODE_PATH)) {
    return process.env.PLANB_NODE_PATH;
  }

  if (process.platform === 'win32') {
    try {
      const whereOutput = execFileSync('where', ['node'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      const first = whereOutput.split(/\r?\n/).find(Boolean);

      if (first && !first.toLowerCase().includes('cursor')) {
        return first;
      }
    } catch {
      // fall through
    }

    const candidates = [
      path.join(process.env.ProgramFiles ?? '', 'nodejs', 'node.exe'),
      path.join(process.env['ProgramFiles(x86)'] ?? '', 'nodejs', 'node.exe'),
      path.join(process.env.LocalAppData ?? '', 'Programs', 'node', 'node.exe'),
    ];

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return process.execPath;
}

const nodePath = resolveNodePath();
const autoStartScript = path.join(projectRoot, 'scripts', 'dev-auto-start.mjs');

function quote(value) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function installStartupFolderShortcut() {
  const startupDir = path.join(
    process.env.APPDATA ?? '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup',
  );
  const cmdPath = path.join(startupDir, 'PlanB-HairDiary-DevWeb.cmd');

  const contents = `@echo off
rem Hair Diary — 로그인 30초 후 개발 서버 자동 시작
timeout /t 30 /nobreak >nul
cd /d ${quote(projectRoot)}
${quote(nodePath)} ${quote(autoStartScript)} --boot
`;

  fs.mkdirSync(startupDir, { recursive: true });
  fs.writeFileSync(cmdPath, contents, 'utf8');

  return cmdPath;
}

function installScheduledTask() {
  if (process.platform !== 'win32') {
    return null;
  }

  const psScript = `
$ErrorActionPreference = 'Stop'
$taskName = '${TASK_NAME}'
$nodePath = ${quote(nodePath)}
$scriptPath = ${quote(autoStartScript)}
$workingDirectory = ${quote(projectRoot)}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute $nodePath -Argument ${quote(`${autoStartScript} --boot`)} -WorkingDirectory $workingDirectory
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited -Force | Out-Null
Write-Output "scheduled-task:$taskName"
`;

  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Scheduled task registration failed');
  }

  return TASK_NAME;
}

function main() {
  console.log('PlanB Hair Diary — Windows 자동 시작 등록\n');
  console.log(`프로젝트: ${projectRoot}`);
  console.log(`Node: ${nodePath}\n`);

  let scheduledTask = null;
  let startupCmd = null;

  try {
    scheduledTask = installScheduledTask();
    console.log(`✓ 작업 스케줄러: ${scheduledTask} (로그인 30초 후)`);
  } catch (error) {
    console.log(`△ 작업 스케줄러 등록 실패 — 시작 프로그램 폴더만 사용`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
  }

  startupCmd = installStartupFolderShortcut();
  console.log(`✓ 시작 프로그램: ${startupCmd}`);

  console.log('\n재부팅·로그인 후 자동으로:');
  console.log('  1) Metro 웹 서버 (http://127.0.0.1:8081)');
  console.log('  2) 테스트 로그인 브라우저 탭');
  console.log('\n로그: .cursor/dev-server.log');
  console.log('해제: node scripts/uninstall-windows-auto-start.mjs');
  console.log('수동 1회: node scripts/dev-auto-start.mjs --boot --open-browser');
}

main();
