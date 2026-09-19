@echo off
title CareConnect Launcher
cls

echo ===================================================
echo           CareConnect Platform Launcher
echo ===================================================
echo.

:: Detect root and target directories
set "SCRIPT_DIR=%~dp0"

if exist "%SCRIPT_DIR%backend\run.py" (
    set "PROJECT_ROOT=%SCRIPT_DIR%"
) else if exist "%SCRIPT_DIR%CareConnect\CareConnect\backend\run.py" (
    set "PROJECT_ROOT=%SCRIPT_DIR%CareConnect\CareConnect\"
) else if exist "%SCRIPT_DIR%CareConnect\backend\run.py" (
    set "PROJECT_ROOT=%SCRIPT_DIR%CareConnect\"
) else (
    echo [ERROR] Could not locate backend\run.py!
    echo Looked in:
    echo   - %SCRIPT_DIR%backend
    echo   - %SCRIPT_DIR%CareConnect\CareConnect\backend
    echo   - %SCRIPT_DIR%CareConnect\backend
    echo.
    echo Please run this script from the CareConnect project folder.
    pause
    exit /b 1
)

set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"

echo [*] Project Root : %PROJECT_ROOT%
echo [*] Backend Dir  : %BACKEND_DIR%
echo [*] Frontend Dir : %FRONTEND_DIR%
echo.

:: Verify Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found in your PATH!
    echo Please install Python 3.10+ and ensure Add Python to PATH is checked.
    pause
    exit /b 1
)

:: Verify Node / npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm was not found in your PATH!
    echo Please install Node.js v18 or higher and add it to your system PATH.
    pause
    exit /b 1
)

echo [1/3] Launching FastAPI Backend on Port 8000...
start "CareConnect Backend" cmd /k "cd /d %BACKEND_DIR% && python run.py"

echo [2/3] Launching Vite Frontend on Port 5173...
start "CareConnect Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

echo [3/3] Waiting for services to initialize...
ping -n 6 127.0.0.1 >nul

echo.
echo ---------------------------------------------------
echo Service Health Check:
echo ---------------------------------------------------

netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo   [OK] Backend  is LISTENING on http://localhost:8000
) else (
    echo   [!] Backend is still starting or failed. See Backend window.
)

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo   [OK] Frontend is LISTENING on http://localhost:5173
) else (
    echo   [!] Frontend is still starting or failed. See Frontend window.
)

echo.
echo ===================================================
echo           CareConnect Platform is Ready!
echo ===================================================
echo   - Web Application : http://localhost:5173
echo   - Backend REST API: http://localhost:8000
echo   - Swagger Docs    : http://localhost:8000/docs
echo ===================================================
echo.
echo Opening default web browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo Leave this and the two spawned server windows open while using the platform.
echo To shut down all services, run stop_project.bat or close the windows.
echo.
if not "%~1"=="--no-pause" pause
