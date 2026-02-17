@echo off
echo ========================================
echo BLE Tracker - Quick Start
echo ========================================
echo.

echo [1/2] Starting Backend...
start "BLE Tracker Backend" cmd /k "cd apps\backend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo [2/2] Starting Frontend...
start "BLE Tracker Frontend" cmd /k "cd apps\frontend && npm run dev"

echo.
echo ========================================
echo Services Starting...
echo ========================================
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
