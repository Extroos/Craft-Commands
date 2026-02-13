import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import archiver from 'archiver';

const router = Router();

// Cache the agent zip to avoid re-zipping every time? 
// For dev, maybe not.
const AGENT_DIR = path.join(__dirname, '../../../../agent');

/**
 * GET /api/install/linux
 * Returns a bash script to install and run the agent.
 */
router.get('/linux', (req, res) => {
    const panelUrl = `${req.protocol}://${req.get('host')}`;
    const script = `
#!/bin/bash
set -e

echo ">>> Craft Commands Node Agent Installer"
echo ">>> Serving from: ${panelUrl}"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js (v18+) and npm."
    exit 1
fi

# 2. Setup Directory
INSTALL_DIR="cc-agent"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. Download Agent
echo ">>> Downloading Agent..."
curl -sL "${panelUrl}/api/install/agent" -o agent.zip

# 4. Extract
echo ">>> Extracting..."
if command -v unzip &> /dev/null; then
    unzip -o -q agent.zip
else
    # Fallback if unzip missing? python? tar?
    echo "ERROR: 'unzip' utility not found. Please install unzip."
    exit 1
fi

# 5. Install Dependencies
echo ">>> Installing dependencies..."
npm install --omit=dev --loglevel=error

# 6. Run (parsing args from this script's args)
echo ">>> Starting Agent..."
# Pass all arguments received by this script to the agent
npm start -- "$@"
`;
    res.setHeader('Content-Type', 'text/x-shellscript');
    res.send(script.trim());
});

/**
 * GET /api/install/windows
 * Returns a PowerShell script to install and run the agent.
 */
router.get('/windows', (req, res) => {
    const panelUrl = `${req.protocol}://${req.get('host')}`;
    const script = `
Write-Host ">>> Craft Commands Node Agent Installer" -ForegroundColor Cyan
$ErrorActionPreference = "Stop"

# 1. Check Node.js
try {
    $nodeVer = node --version
    Write-Host "Found Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js (v18+)."
    exit 1
}

# 2. Setup Directory
$InstallDir = "cc-agent"
if (!(Test-Path $InstallDir)) { New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null }
Set-Location $InstallDir

# 3. Download Agent
Write-Host ">>> Downloading Agent..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "${panelUrl}/api/install/agent" -OutFile "agent.zip"

# 4. Extract
Write-Host ">>> Extracting..." -ForegroundColor Cyan
Expand-Archive -Path "agent.zip" -DestinationPath . -Force

# 5. Install Deps
Write-Host ">>> Installing dependencies..." -ForegroundColor Cyan
npm install --omit=dev --loglevel=error

# 6. Define Runner Function to be called by user
function Install-Agent {
    param(
        [string]$Id,
        [string]$Secret,
        [string]$Url
    )
    Write-Host ">>> Starting Agent..." -ForegroundColor Green
    npm start -- --node-id $Id --secret $Secret --panel-url $Url
}

Write-Host ">>> Setup Complete!" -ForegroundColor Green
Write-Host "To start the agent, run:" -ForegroundColor Yellow
Write-Host "Install-Agent -Id '...' -Secret '...' -Url '${panelUrl}'" -ForegroundColor Yellow
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(script.trim());
});

/**
 * GET /api/install/agent
 * Downloads the agent source code as a zip.
 */
router.get('/agent', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="agent.zip"');

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('error', (err) => {
            console.error('[Install] Zip error:', err);
            res.status(500).end();
        });

        archive.pipe(res);

        // Append files from local agent directory
        // Excluding node_modules and other temp files
        archive.glob('**/*', {
            cwd: AGENT_DIR,
            ignore: ['node_modules/**', 'dist/**', '.git/**', '.env', 'agent.config.json']
        });

        await archive.finalize();
    } catch (error) {
        console.error('[Install] Failed to serve agent zip:', error);
        res.status(500).json({ error: 'Failed to serve agent' });
    }
});

export default router;
