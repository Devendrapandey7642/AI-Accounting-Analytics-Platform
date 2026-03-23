@echo off
echo Starting AI Accounting Analytics Platform...
echo.

cd frontend
if %errorlevel% neq 0 (
    echo Error: Could not find frontend directory
    pause
    exit /b 1
)

echo Installing dependencies (if needed)...
npm install >nul 2>&1

echo.
echo Starting both frontend and backend...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
echo Press Ctrl+C to stop both services
echo.

npm run dev-full
