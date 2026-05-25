@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [2/2] 공유 URL / QR 생성
echo.
call npm run share
echo.
if exist expo-go-share.html start "" expo-go-share.html
pause
