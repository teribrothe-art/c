@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Expo Go QR 생성 (연합 접속)
call npm run share:connect
start "" expo-go-share.html
