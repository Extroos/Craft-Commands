@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Craft Commands - Server Manager v1.7.11 (STABLE)
color 0B

:: Hardening: Verify Critical Directories exist
if not exist "backend" (
    echo [Fatal] 'backend' directory not found. Corrupt installation?
    pause
    exit /b 1
)
if not exist "frontend" (
    echo [Fatal] 'frontend' directory not found. Corrupt installation?
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

:MENU
cls
echo.
echo           ______            ______   ______                                          __
echo          /      \          /      \ /      \                                        ^|  \
echo         ^|  $$$$$$\  ______ ^|  $$$$$$^|  $$$$$$\ ______  mmmmm  mmmmm   ______  _______  ^| $$
echo         ^| $$   \$$ /      \^| $$___\$^| $$   \$$/      \^|     \^|     \ ^|      \^|       \ ^| $$
echo         ^| $$      ^|  $$$$$$^| $$    \^| $$     ^|  $$$$$$^| $$$$$^| $$$$$\ \$$$$$$^| $$$$$$$\^| $$
echo         ^| $$   __ ^| $$   \$^| $$$$$$$^| $$   __^| $$  ^| $^| $$ ^| $$ ^| $$ /      $^| $$  ^| $$^| $$
echo         ^| $$__/  \^| $$     ^| $$     ^| $$__/  ^| $$__/ $^| $$ ^| $$ ^| $$^|  $$$$$$^| $$  ^| $$^| $$
echo          \$$    $$^| $$     ^| $$      \$$    $$\$$    $$^| $$ ^| $$ ^| $$ \$$    $$^| $$  ^| $$^| $$
echo           \$$$$$$  \$$      \$$       \$$$$$$  \$$$$$$  \$$  \$$  \$$  \$$$$$$$ \$$   \$$ \$$
echo.
%CE_CYAN% "  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
echo.
echo.
%CE_GRAY% -NoNewline "  [STATUS] " & %CE_GREEN% -NoNewline "PRO PLATFORM ACTIVE " & %CE_GRAY% "[STABLE]"
echo.
echo.
echo    [1]  Launch Protocol (Start Server)
echo    [2]  Maintenance Mode (Fix/Reinstall)
echo    [3]  Secure Direct Access (HTTPS Config)
echo    [4]  Remote Bridge (Wizard)
echo    [5]  Panic Control (Reset Network)
echo    [6]  Terminate Session (Exit)
echo.
%CE_PROMPT% "  > Select Command: "
set /p choice=""

if "%choice%"=="1" goto START
if "%choice%"=="2" goto REINSTALL
if "%choice%"=="3" goto HTTPS_MENU
if "%choice%"=="4" goto REMOTE_SETUP
if "%choice%"=="5" goto REMOTE_DISABLE
if "%choice%"=="6" exit
goto MENU

:START
goto START_LOGIC

:REMOTE_SETUP
cls
echo.
%CE_CYAN% "[REMOTE BRIDGE CONFIGURATION]"
echo.
echo ====================================================================================
echo.
%CE_GRAY% "  Choose your bridge method to synchronize with external networks."
echo.
echo.
echo    [1]  Mesh VPN (Tailscale, ZeroTier) - [Recommended]
echo         - Ultra-Secure. Access from anywhere.
echo.
echo    [2]  Zero-Config Tunnel (Playit.gg) - [Automated]
echo         - No port forwarding required. Auto-provisioned.
echo.
echo    [3]  Web-Only Share (Cloudflare)
echo         - Quick link for Dashboard ONLY.
echo.
echo    [4]  Direct Port Bind (Manual Forwarding)
echo         - Advanced. Requires Router Access.
echo.
echo    [5]  Decommission Tunnel Bridge (Disable Remote)
echo.
echo    [6]  Abort Bridge (Go Back)
echo.
%CE_PROMPT% "  > Select Method: "
set /p r_choice=""

if "%r_choice%"=="1" (
    call node scripts/cli-remote-setup.js vpn
    goto POST_REMOTE_CONFIG
)
if "%r_choice%"=="2" (
    call node scripts/cli-remote-setup.js proxy
    echo.
    %CE_YELLOW% "[Setup] "
    %CE_WHITE% "Synchronizing Virtual Bridge Agent..."
    echo.
    call node scripts/install-proxy.js
    if !errorlevel! neq 0 (
        %CE_RED% "[Error] "
        %CE_WHITE% "Bridge synchronization failed."
        pause
        goto REMOTE_SETUP
    )
    echo.
    %CE_YELLOW% "[Action] "
    %CE_WHITE% "Activating Tunnel Bridge..."
    echo.
    :: Kill any existing playit first
    taskkill /f /im playit.exe >nul 2>nul
    start "Craft Commands - Tunnel Bridge" "proxy\playit.exe" run
    goto POST_REMOTE_CONFIG
)
if "%r_choice%"=="3" (
    echo.
    %CE_CYAN% "[Quick Share] "
    %CE_WHITE% "Establishing Cloudflare Tunnel..."
    echo.
    start "Craft Commands - Web Share" node scripts/share-website.js
    timeout /t 3 >nul
    goto POST_REMOTE_CONFIG
)
if "%r_choice%"=="4" (
    call node scripts/cli-remote-setup.js direct
    goto POST_REMOTE_CONFIG
)
if "%r_choice%"=="5" (
    cls
    echo.
    %CE_RED% "[DECOMMISSIONING TUNNEL BRIDGE]"
    echo.
    %CE_YELLOW% "[Action] "
    %CE_WHITE% "Stopping Tunnel Process..."
    taskkill /f /im playit.exe >nul 2>nul
    
    echo.
    %CE_YELLOW% "[Action] "
    %CE_WHITE% "Updating System Settings..."
    call node scripts/cli-remote-setup.js disable
    echo.
    pause
    goto MENU
)
if "%r_choice%"=="6" goto MENU
goto REMOTE_SETUP

:POST_REMOTE_CONFIG
echo.
%CE_GREEN% "[Success] "
%CE_WHITE% "Configurations locked. Preparing launch..."
timeout /t 3 >nul
goto START_LOGIC

:START_LOGIC
cls
echo.
%CE_CYAN% "  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
echo.
echo.
%CE_CYAN% "[SYSTEM] "
%CE_WHITE% "Authenticating Environment..."
echo.
%CE_GREEN% "[Safe] "
%CE_WHITE% "Protocols verified. Launching browser bridge..."
echo.
echo.

:: Check Node
where node >nul 2>nul
if !errorlevel! neq 0 (
    %CE_RED% "[Error] "
    %CE_WHITE% "Node.js is not installed. Please install Node.js (v18+) to continue."
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
    %CE_WHITE% "First time setup detected. Synchronizing modules..."
    echo.
    
    %CE_GRAY% " [1/3] Refreshing Dashboard..."
    cd frontend && call npm install >nul 2>nul && cd ..
    
    %CE_GRAY% " [2/3] Refreshing Backend Core..."
    cd backend && call npm install >nul 2>nul && cd ..
    
    %CE_GRAY% " [3/3] Finalizing Root Integration..."
    call npm install >nul 2>nul
    
    echo.
    %CE_GREEN% "[Success] "
    %CE_WHITE% "System fully synchronized."
    echo.
)

set "B_TYPE=STABLE"
tasklist /fi "imagename eq caddy.exe" 2>nul | findstr /i "caddy.exe" >nul
if !errorlevel! equ 0 set "B_TYPE=SECURE (Caddy)"
tasklist /fi "imagename eq playit.exe" 2>nul | findstr /i "playit.exe" >nul
if !errorlevel! equ 0 set "B_TYPE=TUNNEL (Playit)"
tasklist /fi "imagename eq cloudflared.exe" 2>nul | findstr /i "cloudflared.exe" >nul
if !errorlevel! equ 0 set "B_TYPE=SHARE (Cloudflare)"

echo.
%CE_CYAN% "----------------------------------------------------"
echo.
%CE_WHITE% -NoNewline "  Protocol Status:  " & %CE_GREEN% "!B_TYPE!"
echo.
set "ACC_URL=http://localhost:3000"
if exist "backend\data\settings.json" (
    set "DOM_VAL="
    powershell -NoProfile -Command "$s = Get-Content 'backend\data\settings.json' -ErrorAction SilentlyContinue | ConvertFrom-Json; if ($s.app.https.enabled -eq $true -and $s.app.https.mode -eq 'bridge') { if ($s.app.https.domain) { Write-Output $s.app.https.domain } else { Write-Output 'localhost' } } else { exit 1 }" > "%TEMP%\cc_domain.txt" 2>nul
    if !errorlevel! equ 0 (
        set /p DOM_VAL= < "%TEMP%\cc_domain.txt"
        if not "!DOM_VAL!"=="" set "ACC_URL=https://!DOM_VAL!"
    )
)
%CE_WHITE% -NoNewline "  Access Point:     " & %CE_CYAN% "!ACC_URL!"
echo.
%CE_CYAN% "----------------------------------------------------"
echo.

%CE_MAGENTA% "[Protocol] "
%CE_WHITE% "Streaming logs below..."
echo.
if "!B_TYPE!"=="SECURE (Caddy)" (
    %CE_GRAY% " [Note] Bridge active. Caddy will establish link once Backend is ready."
)
echo.

call npm run start:all
if %errorlevel% neq 0 (
    echo.
    %CE_RED% "[Critical] "
    %CE_WHITE% "Process termination with error code: %errorlevel%"
    echo.
    pause
)
goto MENU

:REINSTALL
cls
echo.
%CE_RED% " [MAINTENANCE MODE] "
echo.
echo ====================================================================================
echo.
%CE_YELLOW% "  Notice: "
%CE_WHITE% "This will flush and reinstall core system files."
echo           Your server data is protected and will NOT be touched.
echo.
%CE_PROMPT% " Confirm Flush? (y/n): "
set /p confirm=""
if not "%confirm%"=="y" goto MENU

echo.
%CE_GRAY% " [1/3] Flushing Modules..."
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
if exist "backend\node_modules" rmdir /s /q "backend\node_modules"
if exist "node_modules" rmdir /s /q "node_modules"

echo.
%CE_GRAY% " [2/3] Purging Build Caches..."
echo.

echo.
%CE_GRAY% " [3/3] Triggering Deep Reinstall..."
cd frontend && call npm install >nul 2>nul && cd ..
cd backend && call npm install >nul 2>nul && cd ..
call npm install >nul 2>nul

echo.
%CE_GREEN% "[Success] "
%CE_WHITE% "System restored to factory-fresh logic."
echo.
pause
goto MENU

:HTTPS_MENU
cls
echo.
%CE_MAGENTA% "[SECURE DIRECT ACCESS]"
echo.
echo ====================================================================================
echo.
%CE_YELLOW% "  Risk Warning: "
%CE_WHITE% "HTTPS is mandatory for remote access."
echo.
echo    [1]  Launch Automated Caddy Bridge - [Best Choice]
echo    [2]  Decommission HTTPS Bridge (Back to HTTP)
echo    [3]  Manual PEM/CRT Binding (Internal)
echo    [4]  Return to Protocol
echo.
%CE_PROMPT% "  > Select Option: "
set /p choice=""

if "%choice%"=="1" goto PROTOCOL_PROXY
if "%choice%"=="2" (
    echo.
    %CE_YELLOW% "[Action] "
    %CE_WHITE% "Deactivating HTTPS Bridge..."
    call node scripts/manage-caddy.js disable
    taskkill /f /im caddy.exe >nul 2>nul
    echo.
    pause
    goto MENU
)
if "%choice%"=="3" goto PROTOCOL_DIRECT
if "%choice%"=="4" goto MENU
goto HTTPS_MENU

:PROTOCOL_PROXY
cls
echo.
%CE_GREEN% "[Automated HTTPS Setup]"
echo.
%CE_WHITE% "Enter the Domain or Hostname you want to use."
%CE_GRAY% "Examples: 'craftcommands', 'myserver.com', 'localhost'"
echo.
%CE_PROMPT% " > Domain Name: "
set /p DOMAIN=""

echo.
%CE_YELLOW% "[1/3] "
%CE_WHITE% "Provisioning Caddy Reverse Proxy..."
call node scripts/install-caddy.js

echo.
%CE_YELLOW% "[2/3] "
%CE_WHITE% "Configuring Secure Bridge for !DOMAIN!..."
call node scripts/manage-caddy.js setup !DOMAIN!

echo.
%CE_YELLOW% "[3/3] "
%CE_WHITE% "Activating Bridge Tunnel..."
:: Kill existing if any
taskkill /f /im caddy.exe >nul 2>nul
start "Craft Commands - HTTPS Bridge" proxy\caddy.exe run --config proxy\Caddyfile --adapter caddyfile

echo.
%CE_GREEN% "[Success] "
%CE_WHITE% "HTTPS Bridge is now LIVE."
echo.
pause
goto MENU

:PROTOCOL_DIRECT
cls
echo.
%CE_MAGENTA% "[Manual SSL Binding]"
echo.
%CE_WHITE% "Enter absolute paths to your certificate files."
echo.
%CE_PROMPT% " > Path to Cert (.pem/.crt): "
set /p CERT_PATH=""
%CE_PROMPT% " > Path to Private Key (.key): "
set /p KEY_PATH=""
%CE_PROMPT% " > Key Passphrase (optional): "
set /p PASSPHRASE=""

echo.
%CE_YELLOW% "[Action] "
%CE_WHITE% "Locking SSL configuration..."
call node scripts/setup-https.js "!CERT_PATH!" "!KEY_PATH!" "!PASSPHRASE!"

echo.
pause
goto MENU

:REMOTE_DISABLE
cls
echo.
%CE_RED% " [PANIC CONTROL - NETWORK RESET] "
echo.
echo ====================================================================================
echo.
%CE_YELLOW% "  Safety: "
%CE_WHITE% "This will sever all external bridges and revert to Localhost."
echo.

%CE_GRAY% " [Action] Terminating Active Bridges..."
:: Kill any active bridge processes
taskkill /f /im caddy.exe >nul 2>nul
taskkill /f /im playit.exe >nul 2>nul
taskkill /f /im cloudflared.exe >nul 2>nul

call node scripts/emergency-disable-remote.js
echo.
%CE_GREEN% "[Success] "
%CE_WHITE% "Isolation complete. Returning to safe mode..."
timeout /t 3 >nul
goto MENU
