@echo off
echo ========================================
echo BLE Tracker - Database Setup
echo ========================================
echo.

cd apps\backend

echo [1/3] Pushing schema to database...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo ERROR: Failed to push schema
    pause
    exit /b 1
)

echo.
echo [2/3] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate client
    pause
    exit /b 1
)

echo.
echo [3/3] Seeding database...
call npx tsx prisma/seed.ts
if %errorlevel% neq 0 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
pause
