import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { authService } from '../auth/AuthService';
import { discordService } from '../integrations/DiscordService';
import { logger } from '../../utils/logger';
import { notificationService } from './NotificationService';

const REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/Extroos/Craft-Commands/main/version.json';

type UpdateLevel = 'MAJOR' | 'MINOR' | 'PATCH';

interface VersionInfo {
    version: string;
    title: string;
    notes: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    breaking?: boolean;
    minNodeVersion?: string;
}

interface UpdateCheckResult {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    title?: string;
    notes?: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    breaking?: boolean;
    incompatible?: boolean;
    level?: UpdateLevel;
    error?: string;
}

interface InternalUpdateState {
    lastNotifiedVersion?: string;
}

class UpdateService {
    private localVersionFile = path.join(process.cwd(), '../version.json');
    private stateFile = path.join(process.cwd(), 'data/update_state.json');
    private lastCheck = 0;
    private cachedResult: UpdateCheckResult | null = null;
    private CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    private checkIntervalId: NodeJS.Timeout | null = null;

    public initialize() {
        // Initial check after short delay to allow server to fully boot
        setTimeout(() => {
            this.checkForUpdates();
        }, 60000); // 1 minute delay

        // Periodic check
        this.checkIntervalId = setInterval(() => {
            this.checkForUpdates();
        }, this.CHECK_INTERVAL);
        
        logger.info('[UpdateService] Initialized with auto-check enabled.');
    }

    /**
     * Checks for application updates with advanced infrastructure awareness.
     * Ensures perfect backward compatibility with older Dashboard versions.
     * @param force - If true, bypasses the cache and user preferences.
     */
    public async checkForUpdates(force = false): Promise<UpdateCheckResult> {
        const currentVersion = this.getLocalVersion();

        try {
            const owner = authService.getOwner();
            const updatesEnabled = owner?.preferences?.updates?.check ?? true;
            
            if (!updatesEnabled && !force) {
                return { available: false, currentVersion, latestVersion: currentVersion };
            }

            const now = Date.now();
            if (!force && this.cachedResult && (now - this.lastCheck < this.CHECK_INTERVAL)) {
                return this.cachedResult;
            }

            const remoteData = await this.fetchRemoteVersion(3);
            const level = this.getUpdateLevel(currentVersion, remoteData.version);
            const available = level !== null;

            const incompatible = remoteData.minNodeVersion 
                ? this.compareVersions(process.versions.node, remoteData.minNodeVersion) < 0 
                : false;

            // Smart Breaking: Major and Minor jumps are always considered breaking
            const breaking = (level === 'MAJOR' || level === 'MINOR') || (remoteData.breaking || false);

            this.cachedResult = {
                available,
                currentVersion,
                latestVersion: remoteData.version,
                title: remoteData.title,
                notes: remoteData.notes,
                priority: remoteData.priority || (level === 'MAJOR' ? 'CRITICAL' : (level === 'MINOR' ? 'HIGH' : 'LOW')),
                breaking,
                incompatible,
                level: level || undefined
            };
            this.lastCheck = now;

            if (available) {
                this.handleUpdateNotifications(this.cachedResult);
            }
            
            return this.cachedResult;
        } catch (e: any) {
            logger.error(`[UpdateService] Check failed: ${e.message}`);
            return { 
                available: false, 
                currentVersion, 
                latestVersion: currentVersion,
                error: e.message 
            };
        }
    }

    /**
     * Categorizes the jump level between two semver strings.
     * Only returns a level if latest is strictly greater than current.
     */
    private getUpdateLevel(current: string, latest: string): UpdateLevel | null {
        if (this.compareVersions(latest, current) <= 0) return null;

        const cParts = current.replace(/^v/, '').split('.').map(n => parseInt(n || '0', 10));
        const lParts = latest.replace(/^v/, '').split('.').map(n => parseInt(n || '0', 10));

        if (lParts[0] > cParts[0]) return 'MAJOR';
        if (lParts[1] > cParts[1]) return 'MINOR';
        if (lParts[2] > cParts[2]) return 'PATCH';
        
        return null;
    }

    private async fetchRemoteVersion(retries: number): Promise<VersionInfo> {
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get<VersionInfo>(REMOTE_VERSION_URL, { timeout: 8000 });
                if (response.data && typeof response.data.version === 'string') {
                    return response.data;
                }
                throw new Error('Malformed remote version metadata');
            } catch (e: any) {
                lastError = e;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                }
            }
        }
        throw lastError;
    }

    private async handleUpdateNotifications(result: UpdateCheckResult) {
        try {
            const state = this.getInternalState();
            if (state.lastNotifiedVersion === result.latestVersion) return;

            const priorityColor = result.priority === 'CRITICAL' ? 0xff0000 : (result.priority === 'HIGH' ? 0xffa500 : 0x3b82f6);
            let description = `A new version of CraftCommand is available: **v${result.latestVersion}**\n\n`;
            
            if (result.level === 'MAJOR' || result.breaking) {
                description += `⚠️ **CRITICAL**: This is a major update at a different protocol level.\n`;
            } else if (result.level === 'MINOR') {
                description += `📢 **MAJOR UPDATE**: New features and stabilization.\n`;
            }

            if (result.incompatible) {
                description += `🚫 **INCOMPATIBLE**: Your Node.js version (${process.versions.node}) is below the required v${result.latestVersion}'s minimum.\n`;
            }
            
            description += `\n**Changelog**: ${result.title || 'General improvements'}`;

            await (discordService as any).sendNotification(
                `System Update: ${result.priority} Priority`,
                description,
                priorityColor
            );

            this.saveInternalState({ lastNotifiedVersion: result.latestVersion });
        } catch (e) {
            logger.error(`[UpdateService] Notification failed: ${e}`);
        }
        
        try {
             // System Notification (In-App)
             // Send to ALL users or just admins? Since we don't have easy role-based targeting yet in NotificationService 
             // (it takes userId or 'ALL'), we might spam normal users.
             // But usually updates are relevant to everyone or at least the owner.
             // Ideally we'd have `notificationService.create('ADMINS', ...)` or broadcast to a role room.
             // For now, let's send to 'ALL' but maybe we can filter on frontend or backend later.
             // Actually, `getForUser` filters.
             // Let's implement a simple loop for now if we want to target only admins, OR just send to all if that's the requirement.
             // The user said "appear in notification always there", implying visibility.
             // Given it's a structural update, let's send to 'ALL' for now, or if we can get a list of admins.
             // NotificationService.create takes userId. 'ALL' broadcasts to everyone.
             
             // Determine Notification Type & Persistence based on Semantic Level
             let notifType = 'INFO';
             let dismissible = true;

             if (result.level === 'MAJOR') {
                 notifType = 'ERROR';
                 dismissible = false;
             } else if (result.level === 'MINOR') {
                 notifType = 'WARNING';
             }

             await notificationService.create(
                'ALL', 
                notifType as any, 
                `System Update: v${result.latestVersion}`, 
                `A new ${result.level || 'PATCH'} update is available.\n${result.title || ''}`,
                { version: result.latestVersion, breaking: result.breaking, level: result.level },
                '/admin/settings', // Link to settings page to update
                { dismissible }
            );

        } catch (e) {
            logger.error(`[UpdateService] System Notification failed: ${e}`);
        }
    }

    private getLocalVersion(): string {
        try {
            if (fs.existsSync(this.localVersionFile)) {
                const data = fs.readJSONSync(this.localVersionFile);
                return data?.version || '0.0.0';
            }
        } catch (e) {
            logger.warn('[UpdateService] Failed to read version.json, defaulting to 0.0.0');
        }
        return '0.0.0';
    }

    private getInternalState(): InternalUpdateState {
        try {
            if (fs.existsSync(this.stateFile)) {
                return fs.readJSONSync(this.stateFile);
            }
        } catch (e) {}
        return {};
    }

    private saveInternalState(state: InternalUpdateState) {
        try {
            fs.ensureDirSync(path.dirname(this.stateFile));
            fs.writeJSONSync(this.stateFile, state, { spaces: 2 });
        } catch (e) {}
    }

    private compareVersions(v1: string, v2: string): number {
        const clean1 = v1.replace(/^v/, '').split('-')[0];
        const clean2 = v2.replace(/^v/, '').split('-')[0];
        
        const parts1 = clean1.split('.').map(n => parseInt(n || '0', 10));
        const parts2 = clean2.split('.').map(n => parseInt(n || '0', 10));
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        
        return 0;
    }
}

export const updateService = new UpdateService();



