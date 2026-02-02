
import { FileSystemManager } from '../files/FileSystemManager';
import { DiagnosisActions } from './DiagnosisActions';
import { serverRepository } from '../../storage/ServerRepository';
import { logger } from '../../utils/logger';
import { ServerConfig } from '../../../../shared/types';

export class AutoHealingManager {
    /**
     * Executes a specific diagnosis action securely
     */
    public async executeFix(serverId: string, actionType: string, payload: any): Promise<void> {
        const server = serverRepository.findById(serverId);
        if (!server || !server.workingDirectory) {
            throw new Error(`Cannot execute fix: Server ${serverId} has no working directory.`);
        }

        const fsManager = new FileSystemManager(server.workingDirectory);
        logger.info(`[AutoHealing] Executing ${actionType} for ${serverId}`);

        try {
            switch (actionType) {
                case 'AGREE_EULA':
                    await DiagnosisActions.agreeEula(fsManager);
                    break;
                case 'RESOLVE_PORT_CONFLICT':
                    await DiagnosisActions.resolvePortConflict(server, fsManager);
                    break;
                case 'ADJUST_RAM':
                    await DiagnosisActions.adjustRam(server, payload.newRam);
                    break;
                case 'SWITCH_JAVA':
                    await DiagnosisActions.switchJavaVersion(server, payload.version);
                    break;
                case 'REPAIR_PROPERTIES':
                    await DiagnosisActions.repairProperties(fsManager, server.version);
                    break;
                case 'CLEANUP_TELEMETRY':
                    await DiagnosisActions.cleanupTelemetry(fsManager);
                    break;
                case 'OPTIMIZE_ARGUMENTS':
                    await DiagnosisActions.optimizeArguments(server);
                    break;
                case 'PURGE_GHOST':
                    await DiagnosisActions.purgeGhost(server);
                    break;
                default:
                    throw new Error(`Unknown auto-heal action type: ${actionType}`);
            }

            logger.success(`[AutoHealing] Successfully applied ${actionType} to ${serverId}`);
        } catch (error: any) {
            logger.error(`[AutoHealing] Failed to apply ${actionType} to ${serverId}: ${error.message}`);
            throw error;
        }
    }
}

export const autoHealingManager = new AutoHealingManager();
