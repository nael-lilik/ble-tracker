@echo off
echo ========================================
echo BLE Tracker - Simulation Tester
echo ========================================
echo.

cd apps\backend
echo [1/2] Installing axios...
call npm install axios --save-dev

echo.
echo [2/2] Running simulation...
echo.
npx tsx scripts/simulate.ts

pause
