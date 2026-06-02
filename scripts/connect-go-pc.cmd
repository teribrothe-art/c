@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Expo Go 원클릭 접속 + 브라우저 검증
echo.
call npm run connect
if errorlevel 1 exit /b 1
echo.
call npm run verify:connect
pause
