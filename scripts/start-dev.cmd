@echo off
chcp 65001 >nul
cd /d "%~dp0.."
if not exist .env copy .env.example .env
echo.
echo === 헤어 다이어리 - 처음 개발 방식 ===
echo   npm start
echo.
echo 같은 Wi-Fi: 터미널 QR 스캔
echo Wi-Fi 다름: npm run start:phone 후 npm run share
echo.
call npx expo start --clear
