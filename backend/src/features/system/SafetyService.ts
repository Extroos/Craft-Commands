import fs from 'fs-extra';
import path from 'path';
import si from 'systeminformation';
import {  ServerConfig  } from '@shared/types';
import { logger } from '../../utils/logger';

export class SafetyError extends Error {
    public code: string;
    public details?: any;

    constructor(message: string, code: string, details?: any) {
        super(message);
        this.name = 'SafetyError';
        this.code = code;
        this.details = details;
    }
}

export class SafetyService {
    
    async validateServer(server: ServerConfig): Promise<void> {
        logger.info(`[Safety] Validating server ${server.id} (${server.name})...`);
        const errors: { code: string, message: string }[] = [];

        // 1. Check Server Executable exists
        const defaultExe = server.software === 'Bedrock' ? (process.platform === 'win32' ? 'bedrock_server.exe' : 'bedrock_server') : 'server.jar';
        const exeName = server.executable || defaultExe;
        const exePath = path.join(server.workingDirectory, exeName);

        if (!fs.existsSync(exePath)) {
             throw new SafetyError(
                `Server executable not found: ${exeName} at ${exePath}`, 
                'MISSING_EXECUTABLE', 
                { path: exePath, executable: exeName }
            );
        }

        // 2. Check EULA (if applicable)
        // Only check if eula.txt exists or if we expect it (e.g. vanilla/paper)
        // We can't strictly enforce it if it's not generated yet, but if it IS there and false, we block.
        const eulaPath = path.join(server.workingDirectory, 'eula.txt');
        if (fs.existsSync(eulaPath)) {
            const eulaContent = await fs.readFile(eulaPath, 'utf8');
            if (!eulaContent.includes('eula=true')) {
                 throw new SafetyError(
                    'EULA not accepted. You must agree to the Minecraft EULA to run this server.',
                    'EULA_NOT_ACCEPTED',
                    { path: eulaPath }
                );
            }
        }

        // 3. Port Availability
        // MOVED TO STARTUP MANAGER: This allows "Adoption" of existing processes (e.g. zombies).
        // Strict checking here prevents the self-healing logic from working.


        // 4. Java Verification (Basic)
        // We rely on the command generation to find Java, but we can check if the basic requirement is met?
        // Actually ServerService handles "ensureJava", so we might skip strict Java path check here 
        // unless we want to validate the "javaVersion" config matches an installed version.
        // For now, let's assume ServerService's ensureJava is enough for synthesis, 
        // but we could check if restricted RAM > System Free RAM?
        
        // 5. Memory Check (Optional but cool)
        // const freeMem = os.freemem();
        // const required = server.ram * 1024 * 1024 * 1024;
        // if (freeMem < required) {
        //    logger.warn(`[Safety] Low memory warning for ${server.name}`);
        //    // We usually don't block on this generally as swap exists, but strict mode could.
        // }


        // 3. Environment Integrity (Directory)
        if (!fs.existsSync(server.workingDirectory)) {
             throw new SafetyError(
                `Server directory missing: ${server.workingDirectory}`,
                'MISSING_DIRECTORY',
                { path: server.workingDirectory }
            );
        }

        // 4. System RAM Check
        try {
            const mem = await si.mem();
            const availableRAM = mem.available / 1024 / 1024 / 1024; // GB
            const totalRAM = mem.total / 1024 / 1024 / 1024;
            const allocatedRAM = server.ram || 2;
    
            if (allocatedRAM > totalRAM) {
                 throw new SafetyError(
                    `CRITICAL: Cannot allocate ${allocatedRAM}GB RAM. System only has ${totalRAM.toFixed(1)}GB installed.`,
                    'insufficient_ram_critical', 
                    { allocated: allocatedRAM, total: totalRAM }
                 );
            }
            
            if (allocatedRAM > availableRAM) {
                logger.warn(`[Safety] WARNING: Allocating ${allocatedRAM}GB but only ${availableRAM.toFixed(1)}GB is free. Swapping may occur.`);
            }
        } catch (e: any) {
            // Ignore if SI fails, strict check only if safe
            if (e instanceof SafetyError) throw e;
        }

        logger.success(`[Safety] ${server.name} passed pre-flight checks.`);
    }


}

export const safetyService = new SafetyService();
