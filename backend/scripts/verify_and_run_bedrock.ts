import fs from 'fs-extra';
import path from 'path';
import { installerService } from '../src/features/installer/InstallerService';
import { saveServer, startServer, getServer } from '../src/features/servers/ServerService';
import { processManager } from '../src/features/processes/ProcessManager';

async function verify() {
    const id = `bedrock-verify-${Date.now()}`;
    const serverDir = path.join(process.cwd(), 'data', 'servers', id);
    const version = '1.21.11.01';

    console.log(`[Verify] Creating Bedrock server: ${id}`);
    
    try {
        await fs.ensureDir(serverDir);

        const config: any = {
            id,
            name: 'Bedrock Verification Server',
            software: 'Bedrock',
            version: version,
            port: 19133,
            ram: 2,
            workingDirectory: serverDir,
            executable: process.platform === 'win32' ? 'bedrock_server.exe' : 'bedrock_server',
            status: 'OFFLINE',
            eula: true,
            onlineMode: true
        };

        saveServer(config);
        console.log(`[Verify] Server saved to database.`);

        console.log(`[Verify] Installing Bedrock v${version}...`);
        await installerService.installBedrock(serverDir, version);
        
        const exePath = path.join(serverDir, config.executable);
        if (!(await fs.pathExists(exePath))) {
            throw new Error(`CRITICAL: Bedrock executable ${config.executable} missing after installation!`);
        }
        console.log(`[Verify] Executable found: ${exePath}`);

        console.log(`[Verify] Attempting to start server...`);
        await startServer(id);
        
        console.log(`[Verify] Server start command issued. Monitoring status...`);
        
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds
        
        while (attempts < maxAttempts) {
            const s = getServer(id);
            const isRunning = processManager.isRunning(id);
            console.log(`[Verify] Status: ${s?.status} | Process Running: ${isRunning} | Attempt: ${attempts + 1}`);
            
            if (isRunning && s?.status === 'ONLINE') {
                console.log(`[SUCCESS] Bedrock server ${id} is ONLINE!`);
                return;
            }
            
            if (attempts > 10 && !isRunning) {
                 throw new Error(`[FAILURE] Server process died prematurely or failed to start.`);
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        console.error(`[FAILURE] Server failed to reach ONLINE status within ${maxAttempts * 2} seconds.`);

    } catch (e) {
        console.error(`[Verify] ERROR:`, e);
    }
}

verify();
