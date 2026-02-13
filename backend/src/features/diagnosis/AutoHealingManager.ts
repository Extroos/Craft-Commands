
import { FileSystemManager } from '../files/FileSystemManager';
import { DiagnosisActions } from './DiagnosisActions';
import { serverRepository } from '../../storage/ServerRepository';
import { logger } from '../../utils/logger';
import {  ServerConfig  } from '@shared/types';
import { notificationService } from '../system/NotificationService';

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
                case 'CREATE_PLUGIN_FOLDER':
                    await DiagnosisActions.createPluginFolder(fsManager);
                    break;
                case 'REMOVE_DUPLICATE_PLUGIN':
                    await DiagnosisActions.removeDuplicatePlugins(fsManager, payload.files);
                    break;
                case 'TAKE_HEAP_SNAPSHOT':
                    await (DiagnosisActions as any).takeHeapSnapshot(payload.reason);
                    break;
                case 'RESTORE_DATA_BACKUP':
                    await (DiagnosisActions as any).restoreDataBackup(payload.filename);
                    break;
                case 'REINSTALL_BEDROCK':
                    await DiagnosisActions.reinstallBedrock(server);
                    break;
                default:
                    throw new Error(`Unknown auto-heal action type: ${actionType}`);
            }

            logger.success(`[AutoHealing] Successfully applied ${actionType} to ${serverId}`);
            
            // Send Notification
            await notificationService.create(
                'ALL', // Notify all admins
                'INFO',
                'Auto-Healing Applied',
                `System applied fix: ${actionType.replace(/_/g, ' ')} to server ${server.name || serverId}.`,
                { serverId, actionType, timestamp: Date.now() },
                `/dashboard/${serverId}`
            );
        } catch (error: any) {
            logger.error(`[AutoHealing] Failed to apply ${actionType} to ${serverId}: ${error.message}`);
            throw error;
        }
    }
}

export const autoHealingManager = new AutoHealingManager();
