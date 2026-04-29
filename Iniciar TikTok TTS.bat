@echo off
title TikTok Live TTS - Control Panel
color 0A

:: Al arrancar, verificar si es primera vez (sin node_modules y sin Node.js)
node --version >nul 2>&1
if %errorlevel% neq 0 (
    goto PRIMERA_VEZ
)
if not exist "node_modules" (
    goto INSTALAR_DEPS
)

:MENU
cls
echo.
echo  ================================================
echo   TikTok Live TTS - Panel de Control
echo  ================================================
echo.

:: Verificar si el servidor esta corriendo
set "PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do set "PID=%%a"

if defined PID (
    echo   Estado: [CORRIENDO] - PID: %PID%
    echo.
    echo   [1] Abrir en navegador
    echo   [2] Detener servidor
    echo   [3] Reiniciar servidor
    echo   [4] Reinstalar dependencias
    echo   [5] Salir
) else (
    echo   Estado: [DETENIDO]
    echo.
    echo   [1] Iniciar servidor
    echo   [2] Reinstalar dependencias
    echo   [3] Salir
)

echo.
echo  ================================================
set /p "OPCION=  Elige una opcion: "

:: Volver a detectar PID para la logica
set "PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do set "PID=%%a"

if defined PID (
    if "%OPCION%"=="1" goto ABRIR_NAVEGADOR
    if "%OPCION%"=="2" goto DETENER
    if "%OPCION%"=="3" goto REINICIAR
    if "%OPCION%"=="4" goto REINSTALAR_DEPS
    if "%OPCION%"=="5" goto FIN
) else (
    if "%OPCION%"=="1" goto INICIAR
    if "%OPCION%"=="2" goto REINSTALAR_DEPS
    if "%OPCION%"=="3" goto FIN
)

goto MENU

:: -----------------------------------------------
:PRIMERA_VEZ
cls
color 0E
echo.
echo  ================================================
echo   PRIMERA INSTALACION DETECTADA
echo  ================================================
echo.
echo  Node.js no esta instalado en este equipo.
echo  Es necesario para ejecutar TikTok Live TTS.
echo.
echo   [1] Instalar Node.js automaticamente (winget)
echo   [2] Abrir pagina de descarga manual
echo   [3] Salir
echo.
echo  ================================================
set /p "OPCION=  Elige una opcion: "

if "%OPCION%"=="1" goto INSTALAR_NODEJS
if "%OPCION%"=="2" (
    start https://nodejs.org
    echo.
    echo  Instala Node.js y vuelve a abrir este programa.
    pause
    exit /b 0
)
if "%OPCION%"=="3" goto FIN
goto PRIMERA_VEZ

:: -----------------------------------------------
:INSTALAR_NODEJS
cls
color 0A
echo.
echo  [INFO] Instalando Node.js mediante winget...
echo  (Puede tardar unos minutos, no cierres esta ventana)
echo.
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] No se pudo instalar automaticamente.
    echo  Ve a https://nodejs.org y descargalo manualmente.
    echo.
    pause
    goto PRIMERA_VEZ
)
echo.
echo  [OK] Node.js instalado correctamente.
echo.
echo  IMPORTANTE: Cierra y vuelve a abrir este .bat
echo  para que los cambios surtan efecto.
echo.
pause
exit /b 0

:: -----------------------------------------------
:INSTALAR_DEPS
cls
echo.
echo  ================================================
echo   INSTALANDO DEPENDENCIAS DEL PROYECTO
echo  ================================================
echo.
echo  [INFO] Ejecutando npm install...
echo.
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Fallo la instalacion de dependencias.
    echo  Revisa tu conexion a internet e intentalo de nuevo.
    echo.
    pause
    goto MENU
)
echo.
echo  [OK] Dependencias instaladas correctamente.
echo.
pause
goto MENU

:: -----------------------------------------------
:REINSTALAR_DEPS
cls
echo.
echo  [INFO] Reinstalando dependencias...
if exist "node_modules" rmdir /s /q "node_modules"
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Fallo la reinstalacion.
    color 0A
) else (
    echo  [OK] Dependencias reinstaladas correctamente.
)
echo.
pause
goto MENU

:: -----------------------------------------------
:INICIAR
cls
echo.
echo  [INFO] Iniciando servidor...
echo.
REM Iniciar Node.js en una nueva ventana
start "TikTok Live TTS Server" /D "%CD%" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

set "NEWPID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do set "NEWPID=%%a"

if defined NEWPID (
    echo  [OK] Servidor iniciado - PID: %NEWPID%
    timeout /t 1 /nobreak >nul
    echo  [INFO] Abriendo navegador...
    timeout /t 1 /nobreak >nul
    start http://localhost:3000
) else (
    color 0C
    echo  [ERROR] El servidor no pudo iniciarse.
    echo  Verifica que:
    echo  - Node.js este instalado (node --version)
    echo  - npm install haya completado sin errores
    echo  - El puerto 3000 no este en uso
    color 0A
)

set "NEWPID="
echo.
pause
goto MENU

:: -----------------------------------------------
:ABRIR_NAVEGADOR
echo.
echo  [INFO] Abriendo http://localhost:3000 ...
start http://localhost:3000
timeout /t 1 /nobreak >nul
goto MENU

:: -----------------------------------------------
:DETENER
echo.
echo  [INFO] Deteniendo servidor (PID: %PID%)...
taskkill /PID %PID% /F >nul 2>&1
timeout /t 1 /nobreak >nul

set "CHECKPID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do set "CHECKPID=%%a"
if defined CHECKPID (
    echo  [ERROR] No se pudo detener el servidor.
) else (
    echo  [OK] Servidor detenido correctamente.
)

set "CHECKPID="
set "PID="
echo.
pause
goto MENU

:: -----------------------------------------------
:REINICIAR
echo.
echo  [INFO] Deteniendo servidor (PID: %PID%)...
taskkill /PID %PID% /F >nul 2>&1
timeout /t 2 /nobreak >nul
echo  [INFO] Iniciando servidor nuevamente...
start "TikTok Live TTS Server" /D "%CD%" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

set "NEWPID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do set "NEWPID=%%a"
if defined NEWPID (
    echo  [OK] Servidor reiniciado - PID: %NEWPID%
    timeout /t 1 /nobreak >nul
    start http://localhost:3000
) else (
    color 0C
    echo  [ERROR] El servidor no pudo reiniciarse.
    color 0A
)

set "NEWPID="
set "PID="
echo.
pause
goto MENU

:: -----------------------------------------------
:FIN
echo.
echo  Hasta luego!
timeout /t 1 /nobreak >nul
exit /b 0
