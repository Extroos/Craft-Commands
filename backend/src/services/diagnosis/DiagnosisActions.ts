
import { serverRepository } from '../../storage/ServerRepository';
import { logger } from '../../utils/logger';
import { startupManager } from '../servers/StartupManager';
import { FileSystemManager } from '../files/FileSystemManager';
import { ServerConfig } from '../../../../shared/types';
import si from 'systeminformation';

/**
 * Proactive Healing Actions
 * These are called by AutoHealingManager with a scoped FileSystemManager.
 */
export const DiagnosisActions = {
    /**
     * Automatically accepts the EULA
     */
    agreeEula: async (fs: FileSystemManager) => {
        logger.info(`[DiagnosisAction] Automatically agreeing to EULA`);
        await fs.writeFile('eula.txt', 'eula=true');
    },

    /**
     * Resolves port conflicts by finding the next available port
     */
    resolvePortConflict: async (server: ServerConfig, fs: FileSystemManager) => {
        let currentPort = server.port;
        let newPort = currentPort;
        let isAvailable = false;

        logger.info(`[DiagnosisAction] Resolving port conflict (Current: ${currentPort})`);

        const { NetUtils } = require('../../utils/NetUtils'); // Dynamic import
        for (let i = 1; i <= 10; i++) {
            const testPort = currentPort + i;
            const busy = await NetUtils.checkPort(testPort);
            if (!busy) {
                newPort = testPort;
                isAvailable = true;
                break;
            }
        }

        if (isAvailable) {
            serverRepository.update(server.id, { port: newPort });
            
            // Sync properties via FS manager
            try {
                let props = await fs.readFile('server.properties');
                props = props.replace(/^server-port=.*$/m, `server-port=${newPort}`);
                props = props.replace(/^query.port=.*$/m, `query.port=${newPort}`);
                await fs.writeFile('server.properties', props);
            } catch (e) {
                // Ignore if props don't exist yet
            }
        } else {
            throw new Error('Could not find an available port within range.');
        }
    },

    /**
     * Updates server RAM configuration with Safety Guard
     */
    adjustRam: async (server: ServerConfig, newRam: number) => {
        const mem = await si.mem();
        const totalRamGb = Math.floor(mem.total / 1024 / 1024 / 1024);
        const safeLimit = totalRamGb - 2; // Keep 2GB for OS

        if (newRam > safeLimit) {
            logger.warn(`[DiagnosisAction] RAM upgrade ABORTED. Target ${newRam}GB exceeds safety limit (${safeLimit}GB) on this machine.`);
            // Fallback: Enable optimizations instead of raw power
            logger.info(`[DiagnosisAction] Falling back to optimizations...`);
            await DiagnosisActions.optimizeArguments(server);
            return;
        }

        serverRepository.update(server.id, { ram: newRam });
    },

    /**
     * Switches Java version
     */
    switchJavaVersion: async (server: ServerConfig, version: string) => {
        serverRepository.update(server.id, { javaVersion: version as any });
    },

    /**
     * Advanced: Deep-merges properties with sane defaults
     */
    repairProperties: async (fs: FileSystemManager, version: string) => {
        logger.info(`[DiagnosisAction] Repairing server.properties...`);
        try {
            let content = await fs.readFile('server.properties');
            // Ensure core performance settings
            if (!content.includes('network-compression-threshold')) {
                content += '\nnetwork-compression-threshold=256';
            }
            if (!content.includes('view-distance')) {
                content += '\nview-distance=10';
            }
            await fs.writeFile('server.properties', content);
        } catch (e) {
            // Create default properties if missing
            await fs.writeFile('server.properties', 'online-mode=true\nserver-port=25565\nmax-players=20');
        }
    },

    /**
     * Advanced: Truncates massive logs and clears locks
     */
    cleanupTelemetry: async (fs: FileSystemManager) => {
        logger.info(`[DiagnosisAction] Cleaning up telemetry...`);
        
        // Truncate latest.log if it exists
        try {
            await fs.writeFile('logs/latest.log', '--- Log truncated by Auto-Healing ---');
        } catch (e) {}

        // Remove lock files
        try {
            await fs.deletePath('session.lock');
        } catch (e) {}
    },

    optimizeArguments: async (server: ServerConfig) => {
        logger.info(`[DiagnosisAction] Optimizing arguments for ${server.id}`);
        const advancedFlags = {
            ...server.advancedFlags,
            aikarFlags: true,
            installSpark: true // Proactively encourage monitoring
        };
        serverRepository.update(server.id, { advancedFlags });
    },

    /**
     * Purges ghost processes holding the server port
     */
    purgeGhost: async (server: ServerConfig) => {
        logger.warn(`[DiagnosisAction] Purging ghost process for ${server.id} on port ${server.port}`);
        const { NetUtils } = require('../../utils/NetUtils'); // Dynamic import to avoid circular dep risks
        await NetUtils.killProcessOnPort(server.port);
    }
};
