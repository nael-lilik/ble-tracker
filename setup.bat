@echo off
echo ========================================
echo BLE Tracker - Setup Script
echo ========================================
echo.

echo [1/5] Installing backend dependencies...
cd apps\backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..\..

echo.
echo [2/5] Installing frontend dependencies...
cd apps\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..\..

echo.
echo [3/5] Installing shared-types dependencies...
cd packages\shared-types
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install shared-types dependencies
    pause
    exit /b 1
)
cd ..\..

echo.
echo [4/5] Copying environment file...
copy .env apps\backend\.env
if %errorlevel% neq 0 (
    echo WARNING: Failed to copy .env file
)

echo.
echo [6/6] Generating Prisma client...
cd apps\backend
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)
cd ..\..

echo.
echo [7/7] Pushing database schema...
cd apps\backend
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: Failed to push database schema
    echo Make sure MySQL is running (docker-compose up -d)
    pause
    exit /b 1
)
cd ..\..

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Start backend:  npm run dev:backend
echo 2. Start frontend: npm run dev:frontend
echo.
pause
