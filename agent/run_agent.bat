@echo off
setlocal enabledelayedexpansion
title CraftCommand - Node Agent Worker (Local Repo)
color 0E

echo.
echo  ====================================================================================
echo    [NODE AGENT REPO LAUNCHER]
echo  ====================================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed.
    pause
    exit /b 1
)

:: Get Credentials
echo  Enter the credentials from the Panel (Nodes -> Add Node):
echo.
set /p N_ID=" > Node ID: "
set /p N_SEC=" > Secret:  "

if "%N_ID%"=="" (
    echo [Error] Node ID is required.
    pause
    exit /b 1
)

:: Build if needed
if not exist "dist" (
    echo [Action] Building agent...
    call npm install
    call npm run build
)

echo.
echo [System] Connecting to panel at http://localhost:3001...
echo.

node dist/index.js --panel-url http://localhost:3001 --node-id %N_ID% --secret %N_SEC%
if %errorlevel% neq 0 (
    echo.
    echo [Critical] Agent failure. Code: %errorlevel%
    pause
)
