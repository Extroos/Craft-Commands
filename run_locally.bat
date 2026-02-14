@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: --- SMART VERSION SYNC ---
set "CC_VERSION=v1.10.1"
if exist "version.json" (
    for /f "tokens=2 delims=:," %%a in ('findstr "version" version.json') do (
        set "VERSION_VAL=%%~a"
        set "VERSION_VAL=!VERSION_VAL: =!"
        set "CC_VERSION=v!VERSION_VAL!"
    )
)

title CraftCommand - Pro Platform Launcher !CC_VERSION! (STABLE)
color 0B

:: ====================================================================================
:: [ENVIRONMENT AUDIT]
:: ====================================================================================
if not exist "backend" (
    echo [Fatal] 'backend' directory not found. Please run from the root folder.
    pause
    exit /b 1
)
if not exist "frontend" (
    echo [Fatal] 'frontend' directory not found. Please run from the root folder.
    pause
    exit /b 1
)

:: Define Color Codes (PowerShell based)
set "CE_RED=powershell -NoProfile -Command Write-Host -ForegroundColor Red"
set "CE_GREEN=powershell -NoProfile -Command Write-Host -ForegroundColor Green"
set "CE_YELLOW=powershell -NoProfile -Command Write-Host -ForegroundColor Yellow"
set "CE_CYAN=powershell -NoProfile -Command Write-Host -ForegroundColor Cyan"
set "CE_MAGENTA=powershell -NoProfile -Command Write-Host -ForegroundColor Magenta"
set "CE_WHITE=powershell -NoProfile -Command Write-Host -ForegroundColor White"
set "CE_GRAY=powershell -NoProfile -Command Write-Host -ForegroundColor Gray"
set "CE_PROMPT=powershell -NoProfile -Command Write-Host -NoNewline -ForegroundColor Cyan"

:: ====================================================================================
:: [SMART UPDATE & ASSET SYNC]
:: ====================================================================================
if exist "version.json" (
    echo.
    %CE_GRAY% -NoNewline "  [System] "
    %CE_WHITE% -NoNewline "Checking for updates..."
    
    (
    echo $wc = New-Object System.Net.WebClient
    echo $wc.Headers.Add^('User-Agent', 'CraftCommand-Launcher'^)
    echo try {
    echo     $remoteJson = $wc.DownloadString^('https://raw.githubusercontent.com/Extroos/Craft-Commands/main/version.json'^) ^| ConvertFrom-Json
    echo     $localJson = Get-Content 'version.json' -Raw ^| ConvertFrom-Json
    echo     if ^($remoteJson.version -ne $localJson.version^) {
    echo         Write-Host 'UPDATE AVAILABLE' -ForegroundColor Yellow
    echo         Write-Host ^('   Current: v' + $localJson.version^) -ForegroundColor Gray
    echo         Write-Host ^('   Latest:  v' + $remoteJson.version^) -ForegroundColor Green
    echo         exit 1
    echo     } else {
    echo         exit 0
    echo     }
    echo ^} catch {
    echo     exit 0
    echo ^}
    ) > "%TEMP%\cc_update_check.ps1"
    
    powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\cc_update_check.ps1"
    set "EXIT_CODE=!errorlevel!"
    del "%TEMP%\cc_update_check.ps1" >nul 2>nul
    
    if !EXIT_CODE! equ 1 (
        echo.
        %CE_YELLOW% "  ****************************************************************"
        %CE_YELLOW% "  *                 NEW VERSION AVAILABLE!                       *"
        %CE_YELLOW% "  ****************************************************************"
        echo.
        %CE_WHITE% "  Please download the latest release from GitHub to get new features."
        echo.
        pause
    ) else (
        echo   [OK]
    )
)

if exist "backend\data\settings.json" (
    %CE_GRAY% -NoNewline "  [Web] "
    %CE_WHITE% -NoNewline "Synchronizing assets..."
    powershell -NoProfile -Command "$s = Get-Content 'backend\data\settings.json' -Raw | ConvertFrom-Json; if ($s.app.updateWeb -eq $true) { exit 1 } else { exit 0 }"
    if !errorlevel! equ 1 (
        node scripts/update-web-cli.js
    ) else (
        echo   [Skipped]
    )
)

:: ====================================================================================
:: [MAIN MENU INTERFACE]
:: ====================================================================================
:MENU
cls
echo.
echo    ______            ______   ______                              \ 
echo   /      \          /      \ /      \                             \ 
echo  /  $$$$$$\  ______ ^|  $$$$$$^|  $$$$$$\ ______  _____  _____   ______  _______ 
echo  ^| $$   \$$ /      \^| $$___\$^| $$   \$$/      \^|     \^|     \ ^|      \^|       \     
echo  ^| $$      ^|  $$$$$$^| $$    \^| $$     ^|  $$$$$$^| $$$$$^| $$$$$\ \$$$$$$^| $$$$$$$\    
echo  ^| $$   __ ^| $$   \$^| $$$$$$$^| $$   __^| $$  ^| $^| $$ ^| $$ ^| $$ /      $^| $$  ^| $$    
echo  ^| $$__/  \^| $$     ^| $$     ^| $$__/  ^| $$__/ $^| $$ ^| $$ ^| $$^|  $$$$$$^| $$  ^| $$    
echo   \$$    $$^| $$     ^| $$      \$$    $$\$$    $$^| $$ ^| $$ ^| $$ \$$    $$^| $$  ^| $$    
echo    \$$$$$$  \$$      \$$       \$$$$$$  \$$$$$$  \$$  \$$  \$$  \$$$$$$$ \$$   \$$    
echo.
%CE_CYAN% "  :::::::::::::::::::::::: SMART PLATFORM :::::::::::::::::::::::::"
echo.

:: --- SYSTEM DASHBOARD ---
set "LOCAL_IP=Detecting..."
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /V "0.0.0.0.0"') do set "LOCAL_IP=%%a"

%CE_GRAY% -NoNewline "  [STATUS] "
%CE_GREEN% -NoNewline "ACTIVE "
echo ^| v1.10.0 STABLE ^| IP: !LOCAL_IP!
echo.
echo.

%CE_WHITE% "  [ OPERATION ]"
echo    [1]  Launch Protocol (Run Website ^& Servers)
echo.
%CE_WHITE% \"  [ NETWORK AND SECURITY ]\"
echo    [2]  Secure Direct Access (Set up HTTPS)
echo    [3]  Remote Bridge Wizard (Share with Friends)
echo.
%CE_WHITE% \"  [ MAINTENANCE AND AUDIT ]\"
echo    [4]  Stability Audit (Check for Errors)
echo    [5]  Maintenance Mode (Fix Broken Apps)
echo    [6]  Launch Node Agent (Remote Worker)
echo.
%CE_WHITE% \"  [ EMERGENCY ]\"
echo    [8]  Panic Control (Instantly Cut External Connections)
echo    [7]  Terminate Session (Exit)
echo.
%CE_PROMPT% \"  > Select Command: \"
set /p choice=""

if "%choice%"=="1" goto START
if "%choice%"=="2" goto HTTPS_MENU
if "%choice%"=="3" goto REMOTE_SETUP
if "%choice%"=="4" goto STABILITY_CHECK
if "%choice%"=="5" goto REINSTALL
if "%choice%"=="6" goto AGENT_START
if "%choice%"=="8" goto REMOTE_DISABLE
if "%choice%"=="7" exit
goto MENU

:: ====================================================================================
:: [LAUNCH LOGIC]
:: ====================================================================================
:START
cls
echo.
%CE_CYAN% "  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
echo.
%CE_CYAN% "[SYSTEM] "
%CE_WHITE% "Authenticating Environment..."
echo.
%CE_GREEN% "[Safe] "
%CE_WHITE% "Protocols verified. Launching bridge..."
echo.

:: Check Node
where node >nul 2>nul
if !errorlevel! neq 0 (
    %CE_RED% "[Error] "
%CE_WHITE% "Node.js is missing. Please install Node.js (v18+)."
    pause
    goto MENU
)

:: Smart Install Logic
set MISSING_DEPS=0
if not exist "node_modules" set MISSING_DEPS=1
if not exist "backend\node_modules" set MISSING_DEPS=1
if not exist "frontend\node_modules" set MISSING_DEPS=1

if "%MISSING_DEPS%"=="1" (
    %CE_YELLOW% "[Setup] "
%CE_WHITE% "First time setup detected. Syncing modules..."
    echo.
    %CE_GRAY% " [1/3] Frontend..."
    cd frontend && call npm install >nul 2>nul && cd ..
    %CE_GRAY% " [2/3] Backend..."
    cd backend && call npm install >nul 2>nul && cd ..
    %CE_GRAY% " [3/3] Root..."
    call npm install >nul 2>nul
    %CE_GREEN% "[Success] "
%CE_WHITE% "System synchronized."
)

:: Detect Protocol
set "B_TYPE=HTTP"
tasklist /fi "imagename eq caddy.exe" 2>nul | findstr /i "caddy.exe" >nul
if !errorlevel! equ 0 set "B_TYPE=HTTPS (Caddy)"
tasklist /fi "imagename eq playit.exe" 2>nul | findstr /i "playit.exe" >nul
if !errorlevel! equ 0 set "B_TYPE=TUNNEL (Playit)"

echo.
%CE_CYAN% "----------------------------------------------------"
%CE_WHITE% -NoNewline "  Protocol:     "
%CE_GREEN% \"!B_TYPE!\"
echo.

set "ACC_URL=http://localhost:3000"
if exist "backend\data\settings.json" (
    set "DOM_VAL="
    powershell -NoProfile -Command "$s = Get-Content 'backend\data\settings.json' -ErrorAction SilentlyContinue | ConvertFrom-Json; if ($s.app.https.enabled -eq $true) { if ($s.app.https.domain) { Write-Output $s.app.https.domain } else { Write-Output 'localhost' } } else { exit 1 }" > "%TEMP%\cc_domain.txt" 2>nul
    if !errorlevel! equ 0 (
        set /p DOM_VAL= < "%TEMP%\cc_domain.txt"
        if not "!DOM_VAL!"=="" set "ACC_URL=https://!DOM_VAL!"
    )
)
%CE_WHITE% -NoNewline "  Access Point: "
%CE_CYAN% "!ACC_URL!"
echo.
%CE_CYAN% "----------------------------------------------------"
echo.
%CE_MAGENTA% "[Protocol] "
%CE_WHITE% "Streaming logs below..."
echo.

call npm run start:all
if %errorlevel% neq 0 (
    echo.
    %CE_RED% "[Critical] "
%CE_WHITE% "Process termination with code: %errorlevel%"
    pause
)
goto MENU

:: ====================================================================================
:: [REMOTE & NETWORK CONFIG]
:: ====================================================================================
:REMOTE_SETUP
cls
echo.
%CE_CYAN% "[REMOTE BRIDGE CONFIGURATION]"
echo.
echo ====================================================================================
echo.
echo    [1]  Mesh VPN (Tailscale, ZeroTier) - [Recommended]
echo    [2]  Zero-Config Tunnel (Playit.gg) - [Automated]
echo    [3]  Web-Only Share (Cloudflare)
echo    [4]  Direct Port Bind (Manual Forwarding)
echo.
echo    [5]  Decommission Bridge (Disable)
echo    [6]  Abort (Go Back)
echo.
%CE_PROMPT% \"  > Select Method: \"
set /p r_choice=""

if "%r_choice%"=="1" (
    call node scripts/ops/cli-remote-setup.js vpn
    goto START
)
if "%r_choice%"=="2" (
    call node scripts/ops/cli-remote-setup.js proxy
    call node scripts/ops/install-proxy.js
    taskkill /f /im playit.exe >nul 2>nul
    start "CraftCommand - Tunnel Bridge" "proxy\playit.exe" run
    goto START
)
if "%r_choice%"=="3" (
    start "CraftCommand - Web Share" node scripts/ops/share-website.js
    timeout /t 3 >nul
    goto START
)
if "%r_choice%"=="4" (
    call node scripts/ops/cli-remote-setup.js direct
    goto START
)
if "%r_choice%"=="5" goto REMOTE_DISABLE
if "%r_choice%"=="6" goto MENU
goto REMOTE_SETUP

:HTTPS_MENU
cls
echo.
%CE_MAGENTA% "[SECURE DIRECT ACCESS]"
echo.
echo ====================================================================================
echo.
echo    [1]  Launch Automated Caddy Bridge - [Best Choice]
echo    [2]  Decommission HTTPS Bridge (Back to HTTP)
echo    [3]  Manual PEM/CRT Binding (Internal)
echo    [4]  Return to Protocol
echo.
%CE_PROMPT% \"  > Select Option: \"
set /p h_choice=""

if "%h_choice%"=="1" goto PROTOCOL_PROXY
if "%h_choice%"=="2" (
    call node scripts/ops/manage-caddy.js disable
    taskkill /f /im caddy.exe >nul 2>nul
    pause
    goto MENU
)
if "%h_choice%"=="3" goto PROTOCOL_DIRECT
if "%h_choice%"=="4" goto MENU
goto HTTPS_MENU

:PROTOCOL_PROXY
cls
echo.
%CE_GREEN% "[Automated HTTPS Setup]"
echo.
%CE_PROMPT% \" > Domain Name (e.g. myserver.com): \"
set /p DOMAIN=""
call node scripts/ops/install-caddy.js
call node scripts/ops/manage-caddy.js setup !DOMAIN!
taskkill /f /im caddy.exe >nul 2>nul
start "CraftCommand - HTTPS Bridge" proxy\caddy.exe run --config proxy\Caddyfile --adapter caddyfile
pause
goto MENU

:PROTOCOL_DIRECT
cls
echo.
%CE_MAGENTA% "[Manual SSL Binding]"
echo.
%CE_PROMPT% \" > Path to Cert (.pem/.crt): \"
set /p CERT_PATH=""
%CE_PROMPT% \" > Path to Private Key (.key): \"
set /p KEY_PATH=""
%CE_PROMPT% \" > Key Passphrase (optional): \"
set /p PASSPHRASE=""
call node scripts/maintenance/setup-https.js "!CERT_PATH!" "!KEY_PATH!" "!PASSPHRASE!"
pause
goto MENU

:REMOTE_DISABLE
cls
echo.
%CE_RED% " [PANIC CONTROL - NETWORK RESET] "
echo.
%CE_GRAY% " Killing active bridges..."
taskkill /f /im caddy.exe >nul 2>nul
taskkill /f /im playit.exe >nul 2>nul
taskkill /f /im cloudflared.exe >nul 2>nul
echo.
%CE_GRAY% " Updating security registry..."
call node scripts/ops/emergency-disable-remote.js
if %errorlevel% neq 0 (
    echo.
    %CE_RED% " [Error] "
    %CE_WHITE% " Failed to isolate system. Please check settings.json manually."
) else (
    echo.
    %CE_GREEN% " [Success] "
    %CE_WHITE% " Isolation complete. Your dashboard is now local-only."
)
timeout /t 5 >nul
goto MENU

:: ====================================================================================
:: [DIAGNOSTICS & AGENTS]
:: ====================================================================================
:STABILITY_CHECK
cls
echo.
%CE_CYAN% \" [SYSTEM STABILITY AUDIT] \"
echo.
%CE_GRAY% \" This will perform a deep scan of your network protocol and local IP detection. \"
echo.
npx ts-node scripts/user_verification_test.ts
echo.
pause
goto MENU

:REINSTALL
cls
echo.
%CE_RED% \" [MAINTENANCE MODE] \"
echo.
set confirm=
%CE_PROMPT% \" Confirm Flush/Reinstall? (y/n): \"
set /p confirm=\"\"
if /i not \"!confirm!\"==\"y\" goto MENU

echo.
%CE_YELLOW% \" [1/3] Flushing dependencies...\"
if exist \"frontend\\node_modules\" rmdir /s /q \"frontend\\node_modules\"
if exist \"backend\\node_modules\" rmdir /s /q \"backend\\node_modules\"
if exist \"node_modules\" rmdir /s /q \"node_modules\"

echo.
%CE_YELLOW% \" [2/3] Reinstalling Frontend...\"
cd frontend && call npm install && cd ..

echo.
%CE_YELLOW% \" [3/3] Reinstalling Backend ^& Core...\"
cd backend && call npm install && cd ..
call npm install

echo.
%CE_GREEN% \" [Success] \"
%CE_WHITE% \" System restored and dependencies synchronized.\"
echo.
pause
goto MENU

:AGENT_START
cls
echo.
%CE_CYAN% "[NODE AGENT LAUNCHER]"
echo.
%CE_PROMPT% \" > Enter Node ID: \"
set /p N_ID=""
%CE_PROMPT% \" > Enter Node Secret: \"
set /p N_SEC=""

if "%N_ID%"=="" goto MENU
cd agent
if not exist "dist" (
    call npm install >nul 2>nul
    call npm run build >nul 2>nul
)
title CraftCommand - Node Agent Worker [%N_ID:~0,8%...]
node dist/index.js --panel-url http://localhost:3001 --node-id %N_ID% --secret %N_SEC%
cd ..
goto MENU
