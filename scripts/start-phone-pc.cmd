@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [1/2] Expo Go 터널 Metro 시작 (이 창을 닫지 마세요)
echo.
call npm run start:phone
