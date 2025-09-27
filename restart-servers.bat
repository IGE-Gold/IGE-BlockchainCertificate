@echo off
echo ========================================
echo  IGE Blockchain Certificate - Restart
echo ========================================
echo.

echo [1/4] Chiudendo processi Node.js esistenti...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Processi Node.js chiusi con successo
) else (
    echo ! Nessun processo Node.js trovato
)
echo.

echo [2/4] Attendendo 2 secondi per la chiusura completa...
timeout /t 2 /nobreak >nul
echo.

echo [3/4] Avviando server backend...
cd backend
start /B node server.js
if %errorlevel% equ 0 (
    echo ✓ Backend avviato con successo
) else (
    echo ✗ Errore nell'avvio del backend
    pause
    exit /b 1
)
echo.

echo [4/4] Avviando server frontend...
cd ..\frontend
start /B npm start
if %errorlevel% equ 0 (
    echo ✓ Frontend avviato con successo
) else (
    echo ✗ Errore nell'avvio del frontend
    pause
    exit /b 1
)
echo.

echo ========================================
echo  ✓ SERVER RIAVVIATI CON SUCCESSO!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Premi un tasto per chiudere questa finestra...
pause >nul
