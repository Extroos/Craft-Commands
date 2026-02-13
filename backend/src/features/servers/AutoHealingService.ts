import { processManager } from '../processes/ProcessManager';
import { logger } from '../../utils/logger';
import { diagnosisService } from '../diagnosis/DiagnosisService';
import { autoHealingManager } from '../diagnosis/AutoHealingManager';
import net from 'net';
import { NetUtils } from '../../utils/NetUtils';

class AutoHealingService {
    private checkInterval: NodeJS.Timeout | null = null;
    private restartAttempts: Map<string, number> = new Map();
    private healthCheckLocks: Set<string> = new Set();

    constructor() {
        // Initialization moved to explicit call
    }

    public initialize() {
        // Initial delay to let system settle
        setTimeout(() => {
            this.startMonitoring();
            this.listenForCrashes();
        }, 10000);
    }

    private startMonitoring() {
        logger.info('[AutoHealing] Intelligence Engine ACTIVE. Monitoring health vectors...');
        
        // Dynamic Interval Loop
        this.checkInterval = setInterval(() => {
            const { getServers } = require('./ServerService');
            const servers = getServers();
            
            for (const server of servers) {
                if (server.advancedFlags?.autoHealing || server.crashDetection) {
                    // Respect custom interval if set, otherwise default to 60s
                    // We use the same loop but filter based on timestamp to avoid multiple intervals
                    const interval = (server.advancedFlags?.healthCheckInterval || 60) * 1000;
                    const lastCheck = (this as any)[`lastCheck_${server.id}`] || 0;
                    
                    if (Date.now() - lastCheck >= interval) {
                        (this as any)[`lastCheck_${server.id}`] = Date.now();
                        this.evalHealth(server);
                    }
                }
            }
        }, 10000); // Internal tick every 10s to react faster to custom intervals
    }

    private listenForCrashes() {
        processManager.on('status', ({ id, status }) => {
            if (status === 'CRASHED') {
                const { getServer } = require('./ServerService');
                const server = getServer(id);
                if (server?.advancedFlags?.autoHealing || server?.crashDetection) {
                    logger.warn(`[AutoHealing:${id}] Abnormal termination detected. Triggering recovery protocol...`);
                    this.triggerRecovery(id, 'CRASH_RECOVERY');
                }
            }
        });
    }

// Removed pingSocket in favor of NetUtils

    private async evalHealth(server: any) {
        if (this.healthCheckLocks.has(server.id)) return;
        
        // Only check if supposed to be online
        const isRunning = processManager.isRunning(server.id);
        const status = processManager.getCachedStatus(server.id);
        
        if (!isRunning && server.autoStart) {
             // Server should be running but isn't
             this.triggerRecovery(server.id, 'ZOMBIE_REPAIR');
             return;
        }

        if (isRunning && status.status === 'ONLINE') {
             // Deep Health Check: Socket Test
             this.healthCheckLocks.add(server.id);
             try {
                 const isHealthy = await NetUtils.checkServiceHealth(server.port);
                 if (!isHealthy) {
                     logger.error(`[AutoHealing:${server.id}] Health test FAILED (Socket Timeout). Instance may be hung.`);
                     this.triggerRecovery(server.id, 'HUNG_PROCESS_RESTART');
                 }
             } finally {
                 this.healthCheckLocks.delete(server.id);
             }
        }
    }

    private ruleAttempts: Map<string, number> = new Map();

    private async triggerRecovery(serverId: string, reason: string) {
        const attempts = this.restartAttempts.get(serverId) || 0;
        
        // Max 3 retries per 10 minutes to prevent infinite loops on corrupted installs
        if (attempts >= 3) {
            logger.error(`[AutoHealing:${serverId}] Max recovery attempts reached. manual intervention required.`);
            return;
        }

        const { startServer, stopServer } = require('./ServerService');
        
        logger.info(`[AutoHealing:${serverId}] Initiating ${reason} (Attempt ${attempts + 1}/3)`);
        
        // Emit Recovery Status to UI
        processManager.updateCachedStatus(serverId, { status: 'RECOVERING', online: false });
        
        // --- DEEP DIAGNOSIS PHASE ---
        try {
            const logs = processManager.getLogs(serverId);
            // Mock system stats for diagnosis
            const stats = { totalMemory: 0, freeMemory: 0, javaVersion: 'unknown' }; 
            const diagnosis = await diagnosisService.diagnose(require('./ServerService').getServer(serverId), logs, stats);
            
            const healableAction = diagnosis.find(d => d.action?.autoHeal);

            if (healableAction && healableAction.action) {
                const ruleKey = `${serverId}:${healableAction.ruleId}`;
                const ruleRetries = this.ruleAttempts.get(ruleKey) || 0;

                if (ruleRetries >= 2) {
                     logger.warn(`[AutoHealing:${serverId}] Rule '${healableAction.ruleId}' has failed ${ruleRetries} times. Skipping auto-fix to prevent loops.`);
                     // Fallthrough to standard restart or other fixes
                } else {
                    logger.info(`[AutoHealing:${serverId}] Proactive Stabilization: ${healableAction.title}. Applying fix...`);
                    this.ruleAttempts.set(ruleKey, ruleRetries + 1);
                    await this.applyHealAction(healableAction.action);
                    // After healing, we continue to startup
                }
            }
            
            // Check for fatal errors if no healable action was taken (or it was skipped)
            const fatalError = diagnosis.find(d => 
                d.severity === 'CRITICAL' && 
                ['eula_check', 'missing_jar', 'port_binding', 'java_version', 'bad_config'].includes(d.ruleId)
            );

            if (fatalError) {
                // If we skipped the fix (due to loops) AND it's critical, we must abort
                 const ruleKey = `${serverId}:${fatalError.ruleId}`;
                 if ((this.ruleAttempts.get(ruleKey) || 0) >= 2) {
                     logger.error(`[AutoHealing:${serverId}] Recovery ABORTED: ${fatalError.title} persists after fixes.`);
                     processManager.updateCachedStatus(serverId, { status: 'CRASHED', online: false });
                     return;
                 }
                
                 if (!healableAction) { // Only abort if we didn't just try to fix it (and it wasn't skipped)
                    logger.error(`[AutoHealing:${serverId}] Recovery ABORTED: ${fatalError.title}. Manual fix required.`);
                    processManager.updateCachedStatus(serverId, { status: 'CRASHED', online: false });
                    return;
                 }
            }
        } catch (diagError) {
            logger.warn(`[AutoHealing:${serverId}] Diagnosis failed to run, proceeding with cautious recovery.`);
        }

        try {
            if (processManager.isRunning(serverId)) {
                await stopServer(serverId, true); // Force stop
                await new Promise(r => setTimeout(r, 5000));
            }
            
            await startServer(serverId);
            this.restartAttempts.set(serverId, attempts + 1);
            
            // Re-zero attempts after 10 mins of stability
            setTimeout(() => {
                const current = this.restartAttempts.get(serverId) || 0;
                if (current > 0) this.restartAttempts.set(serverId, current - 1);
                
                // Clear rule attempts for this server
                for (const [key] of this.ruleAttempts) {
                    if (key.startsWith(`${serverId}:`)) this.ruleAttempts.delete(key);
                }
            }, 600000);

        } catch (e: any) {
            logger.error(`[AutoHealing:${serverId}] Recovery failed: ${e.message}`);
        }
    }
    private async applyHealAction(action: any) {
        try {
            await autoHealingManager.executeFix(action.payload.serverId, action.type, action.payload);
        } catch (error: any) {
            logger.error(`[AutoHealing] Execution failed: ${error.message}`);
        }
    }
}

export const autoHealingService = new AutoHealingService();
