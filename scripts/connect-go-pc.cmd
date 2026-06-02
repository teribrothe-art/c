@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Expo Go 원클릭 접속 (cloudflared 터널 + Metro + QR)
echo.
call npm run connect
pause
