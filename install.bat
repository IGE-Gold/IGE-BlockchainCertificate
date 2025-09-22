@echo off
echo ========================================
echo IGE Gold Certificate System - Installer
echo ========================================
echo.

echo [1/4] Installing Backend Dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)
echo Backend dependencies installed successfully!
echo.

echo [2/4] Installing Frontend Dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)
echo Frontend dependencies installed successfully!
echo.

echo [3/4] Creating Environment Files...
cd ..\backend
if not exist .env (
    copy env.example .env
    echo Backend .env file created from template
) else (
    echo Backend .env file already exists
)

cd ..\frontend
if not exist .env (
    copy env.example .env
    echo Frontend .env file created from template
) else (
    echo Frontend .env file already exists
)
echo.

echo [4/4] Creating Required Directories...
cd ..
if not exist data mkdir data
if not exist backups mkdir backups
if not exist logs mkdir logs
if not exist backend\logs mkdir backend\logs
echo Required directories created!
echo.

echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your .env files in backend/ and frontend/
echo 2. Add your private key to backend/.env
echo 3. Run start-all.bat to launch the system
echo.
pause
