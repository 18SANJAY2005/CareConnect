@echo off
title Stop CareConnect
cls
echo ===================================================
echo             Stopping CareConnect Services
echo ===================================================
echo.

echo [*] Terminating Python/Uvicorn processes on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a 2>nul
)

echo [*] Terminating Node/Vite processes on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a 2>nul
)

echo [*] Terminating Caregiver PWA processes on port 5174...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a 2>nul
)

echo [*] Terminating Cloudflare Tunnel processes...
taskkill /f /im cloudflared.exe 2>nul

echo.
echo All CareConnect servers have been stopped.
echo.
pause

