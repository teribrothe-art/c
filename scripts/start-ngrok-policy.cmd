@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [ngrok v3] Traffic Policy 터널 (policy.yaml)
echo.
echo 터미널 1: npm run start:wifi
echo 터미널 2: 이 스크립트 또는 npm run tunnel:policy
echo.
if "%NGROK_UPSTREAM_PORT%"=="" set NGROK_UPSTREAM_PORT=8081
node scripts/start-ngrok-policy.mjs %NGROK_UPSTREAM_PORT%
