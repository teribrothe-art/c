@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [1/2] Expo 연합 서버 (Metro + 릴레이)
echo.
call npm run start:connect
