@echo off
cd /d "%~dp0.."
node scripts\dev-auto-start.mjs --boot %*
