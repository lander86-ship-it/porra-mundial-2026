@echo off
title Porra Mundial 2026
echo ⚽ Arrancando Porra Mundial 2026...
echo.

cd /d "%~dp0"

start "Servidor Backend" cmd /k "cd server && node index.js"
timeout /t 2 /nobreak > nul
start "Frontend Vite" cmd /k "cd client && npm run dev"
timeout /t 4 /nobreak > nul

start http://localhost:5173

echo.
echo ✅ App iniciada en http://localhost:5173
echo    Credenciales por defecto:
echo    Admin:   nombre=Admin / PIN=1234
echo    Jugador: Registrate en la web
echo.
pause
