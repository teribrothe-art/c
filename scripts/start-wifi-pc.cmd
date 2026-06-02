@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [1/2] Expo Go LAN Metro (ngrok 없음, PC·폰 같은 Wi-Fi)
echo.
call npm run start:wifi
pause
