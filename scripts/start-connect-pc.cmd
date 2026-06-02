@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [1/2] Expo Go 접속 Metro (LAN IP + ngrok 터널 자동)
echo.
call npm run start:connect
pause
