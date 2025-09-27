@echo off
echo ========================================
echo  IGE Blockchain Certificate - Stop
echo ========================================
echo.

echo Chiudendo tutti i processi Node.js...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Tutti i processi Node.js chiusi con successo
) else (
    echo ! Nessun processo Node.js trovato
)
echo.

echo ========================================
echo  ✓ SERVER FERMATI!
echo ========================================
echo.
echo Premi un tasto per chiudere questa finestra...
pause >nul
