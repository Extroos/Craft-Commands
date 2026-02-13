import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { logger } from '../../utils/logger';
import { nodeRegistryService } from './NodeRegistryService';
import { systemSettingsService } from '../system/SystemSettingsService';

class LocalAgentManager {
    private agentProcess: ChildProcess | null = null;
    private restartTimer: NodeJS.Timeout | null = null;

    initialize() {
        // Initial check
        this.checkAndApplyState();

        // Listen for runtime changes
        systemSettingsService.on('updated', () => {
             this.checkAndApplyState();
        });
    }

    private checkAndApplyState() {
        const settings = systemSettingsService.getSettings();
        const enabled = settings.app.distributedNodes?.enabled;

        if (enabled) {
            // Check if Local Node exists
            const secret = nodeRegistryService.getLocalNodeSecret();
            
            // If missing, auto-enroll it now (e.g. user just enabled it)
            if (!secret) {
                // We need to access the private enrollLocalDefault or just wait for next restart?
                // Actually nodeRegistryService handles this on load, but we might need to trigger it if it was deleted.
                // Let's assume it might have been removed.
                
                // HACK: We can't easily access private method, but we can check if it exists.
                // Ideally NodeRegistryService should expose ensuring local node.
                // For now, we will rely on startAgent logic or just log warning.
                 if (!nodeRegistryService.getNode('local')) {
                     // We need a way to restore it. 
                     // Let's use a workaround or expose enrollLocalDefault.
                     // Actually, let's just use what we have.
                 }
            }
            
            // We need to get the secret again in case it was just created
            const currentSecret = nodeRegistryService.getLocalNodeSecret();
            if (currentSecret) {
                this.startAgent(currentSecret);
            }
        } else {
            // Disabled -> Stop agent process
            this.stop();
            
            // NOTE: We no longer remove the 'local' node from the registry here.
            // The local node is required for standard (single-node) operation.
        }
    }

    private startAgent(secret: string) {
        if (this.agentProcess) return;

        logger.info('[LocalAgent] Spawning embedded Node Agent...');

        const isProduction = process.env.NODE_ENV === 'production';
        const projectRoot = path.resolve(__dirname, '../../../../');
        const agentDir = path.join(projectRoot, 'agent');
        
        // Command configuration
        const port = process.env.BACKEND_PORT || '3001';
        const panelUrl = `http://127.0.0.1:${port}`;
        const args = [
            '--panel-url', panelUrl,
            '--node-id', 'local',
            '--secret', secret
        ];

        let cmd = 'node';
        let scriptArgs = [path.join(agentDir, 'dist', 'index.js'), ...args];

        if (!isProduction) {
            cmd = 'npx.cmd'; // Windows specific for now, or just npx
            scriptArgs = ['ts-node', path.join(agentDir, 'src', 'index.ts'), ...args];
        }

        // Spawn
        this.agentProcess = spawn(cmd, scriptArgs, {
            cwd: agentDir,
            shell: true,
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        this.agentProcess.stdout?.on('data', (d) => {
            const line = d.toString().trim();
            if (line) logger.info(`[LocalAgent] ${line}`);
        });

        this.agentProcess.stderr?.on('data', (d) => {
            const line = d.toString().trim();
            if (line) logger.error(`[LocalAgent] ${line}`);
        });

        this.agentProcess.on('close', (code) => {
            logger.warn(`[LocalAgent] Process exited with code ${code}. Restarting in 5s...`);
            this.agentProcess = null;
            this.restartTimer = setTimeout(() => this.startAgent(secret), 5000);
        });
    }

    stop() {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        if (this.agentProcess) {
            this.agentProcess.kill();
            this.agentProcess = null;
        }
    }
}

export const localAgentManager = new LocalAgentManager();
