@echo off
echo ========================================
echo IGE Gold Certificate System - Launcher
echo ========================================
echo.

echo Starting Backend Server...
start "IGE Backend" cmd /k "cd backend && npm start"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "IGE Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Both servers are starting up...
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window
pause > nul
