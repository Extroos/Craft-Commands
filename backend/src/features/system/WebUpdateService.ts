import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { DATA_PATHS } from '../../constants';
import { logger } from '../../utils/logger';
import extract from 'extract-zip';
import { auditService } from './AuditService';
import { authService } from '../auth/AuthService';
import { systemSettingsService } from './SystemSettingsService';

interface WebManifest {
    version: string;
    bundleUrl: string;
    sha256?: string;
    releaseDate?: string;
}

interface WebState {
    version: string;
    lastChecked: number;
    lastUpdated: number;
    lastError?: string;
}

const MANIFEST_URL = 'https://raw.githubusercontent.com/Extroos/Craft-Commands/main/web-manifest.json';

class WebUpdateService {
    private state: WebState = {
        version: '0.0.0',
        lastChecked: 0,
        lastUpdated: 0
    };

    constructor() {
        this.loadState();
    }

    private loadState() {
        try {
            // Baseline from version.json
            const versionFile = path.join(process.cwd(), '../version.json');
            if (fs.existsSync(versionFile)) {
                const projectVersion = fs.readJSONSync(versionFile).version;
                this.state.version = projectVersion;
            }

            if (fs.existsSync(DATA_PATHS.WEB_STATE_FILE)) {
                this.state = fs.readJSONSync(DATA_PATHS.WEB_STATE_FILE) as WebState;
            }
        } catch (e: any) {
            logger.error(`[WebUpdateService] Failed to load state: ${e.message}`);
        }
    }

    private saveState() {
        try {
            fs.ensureDirSync(path.dirname(DATA_PATHS.WEB_STATE_FILE));
            fs.writeJSONSync(DATA_PATHS.WEB_STATE_FILE, this.state, { spaces: 2 });
        } catch (e: any) {
            logger.error(`[WebUpdateService] Failed to save state: ${e.message}`);
        }
    }

    public getStatus() {
        if (!this.isEnabled()) {
            return { ...this.state, disabled: true };
        }
        return this.state;
    }

    private isEnabled(): boolean {
        return systemSettingsService.getSettings().app?.updateWeb === true;
    }

    public async checkForUpdate(): Promise<{ available: boolean; latest?: WebManifest; error?: string }> {
        if (!this.isEnabled()) return { available: false, error: 'Feature disabled in system settings' };
        try {
            const response = await axios.get<WebManifest>(MANIFEST_URL, { timeout: 10000 });
            const latest = response.data;
            
            this.state.lastChecked = Date.now();
            this.saveState();

            if (this.compareVersions(latest.version, this.state.version) > 0) {
                return { available: true, latest };
            }
            return { available: false };
        } catch (e: any) {
            this.state.lastError = e.message;
            this.saveState();
            return { available: false, error: e.message };
        }
    }

    public async runUpdate(): Promise<{ success: boolean; error?: string }> {
        if (!this.isEnabled()) return { success: false, error: 'Feature disabled in system settings' };
        const updateCheck = await this.checkForUpdate();
        if (!updateCheck.available || !updateCheck.latest) {
            return { success: false, error: updateCheck.error || 'No update available' };
        }

        const latest = updateCheck.latest;
        const zipPath = path.join(DATA_PATHS.WEB_STAGING, `web-v${latest.version}.zip`);
        const extractPath = path.join(DATA_PATHS.WEB_STAGING, `extracted-v${latest.version}`);

        try {
            // 1. Prepare Staging
            await fs.ensureDir(DATA_PATHS.WEB_STAGING);
            await fs.emptyDir(DATA_PATHS.WEB_STAGING);

            // 2. Download
            logger.info(`[WebUpdateService] Downloading v${latest.version}...`);
            const response = await axios({
                method: 'get',
                url: latest.bundleUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(zipPath);
            (response.data as any).pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(true));
                writer.on('error', reject);
            });

            // 2.5 Verify Checksum
            if (latest.sha256) {
                logger.info(`[WebUpdateService] Verifying checksum...`);
                const isValid = await this.validateChecksum(zipPath, latest.sha256);
                if (!isValid) {
                    throw new Error('Checksum verification failed: The downloaded file may be corrupted or tampered with.');
                }
                logger.debug('[WebUpdateService] Checksum verified.');
            }

            // 3. Extract
            logger.info(`[WebUpdateService] Extracting bundle...`);
            await extract(zipPath, { dir: extractPath });

            // Sanity Check: Ensure index.html exists
            if (!fs.existsSync(path.join(extractPath, 'index.html'))) {
                throw new Error('Malformed bundle: index.html not found');
            }

            // 4. Atomic Swap
            logger.info(`[WebUpdateService] Swapping assets...`);
            await fs.ensureDir(DATA_PATHS.WEB_BACKUPS);
            
            // Backup current if exists
            if (fs.existsSync(DATA_PATHS.WEB_ROOT)) {
                const backupPath = path.join(DATA_PATHS.WEB_BACKUPS, `${Date.now()}-v${this.state.version}`);
                await fs.move(DATA_PATHS.WEB_ROOT, backupPath);
            }

            // Move extracted to current
            await fs.ensureDir(path.dirname(DATA_PATHS.WEB_ROOT));
            await fs.move(extractPath, DATA_PATHS.WEB_ROOT, { overwrite: true });

            // 5. Cleanup & Save State
            await fs.remove(DATA_PATHS.WEB_STAGING);
            this.state.version = latest.version;
            this.state.lastUpdated = Date.now();
            this.state.lastError = undefined;
            this.saveState();

            // 6. Rotate Backups (Keep last 5)
            await this.rotateBackups();

            // 7. Audit Log
            const owner = authService.getOwner();
            if (owner) {
                await auditService.log(owner.id, 'WEB_UPDATE_RUN', undefined, { version: latest.version });
            }

            logger.info(`[WebUpdateService] Update to v${latest.version} complete!`);
            return { success: true };

        } catch (e: any) {
            logger.error(`[WebUpdateService] Update failed: ${e.message}`);
            this.state.lastError = e.message;
            this.saveState();

            const owner = authService.getOwner();
            if (owner) {
                await auditService.log(owner.id, 'WEB_UPDATE_FAIL', undefined, { version: latest.version, error: e.message });
            }
            return { success: false, error: e.message };
        }
    }

    public async rollback(): Promise<{ success: boolean; error?: string }> {
        if (!this.isEnabled()) return { success: false, error: 'Feature disabled in system settings' };
        try {
            if (!fs.existsSync(DATA_PATHS.WEB_BACKUPS)) return { success: false, error: 'No backups found' };

            const backups = await fs.readdir(DATA_PATHS.WEB_BACKUPS);
            if (backups.length === 0) return { success: false, error: 'No backups found' };

            // Sort by timestamp (prefix) descending
            const sortedBackups = backups.filter(b => b.includes('-v')).sort((a, b) => b.localeCompare(a));
            if (sortedBackups.length === 0) return { success: false, error: 'No valid backups found' };

            const latestBackup = sortedBackups[0];
            const backupPath = path.join(DATA_PATHS.WEB_BACKUPS, latestBackup);
            const backupVersion = latestBackup.split('-v')[1] || 'unknown';

            // Swap back
            const failedPath = path.join(DATA_PATHS.WEB_BACKUPS, `failed-${Date.now()}-v${this.state.version}`);
            if (fs.existsSync(DATA_PATHS.WEB_ROOT)) {
                await fs.move(DATA_PATHS.WEB_ROOT, failedPath);
            }

            await fs.move(backupPath, DATA_PATHS.WEB_ROOT);

            this.state.version = backupVersion;
            this.state.lastUpdated = Date.now();
            this.saveState();

            const owner = authService.getOwner();
            if (owner) {
                await auditService.log(owner.id, 'WEB_UPDATE_ROLLBACK', undefined, { rolledBackTo: backupVersion });
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private async rotateBackups() {
        try {
            if (!fs.existsSync(DATA_PATHS.WEB_BACKUPS)) return;
            const backups = await fs.readdir(DATA_PATHS.WEB_BACKUPS);
            const sorted = backups.filter(b => b.includes('-v')).sort((a, b) => b.localeCompare(a));
            
            if (sorted.length > 5) {
                const toDelete = sorted.slice(5);
                for (const folder of toDelete) {
                    await fs.remove(path.join(DATA_PATHS.WEB_BACKUPS, folder));
                }
                logger.debug(`[WebUpdateService] Purged ${toDelete.length} old backups.`);
            }
        } catch (e: any) {
            logger.warn(`[WebUpdateService] Backup rotation failed: ${e.message}`);
        }
    }

    private async validateChecksum(filePath: string, expectedHash: string): Promise<boolean> {
        return new Promise((resolve) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => {
                const actualHash = hash.digest('hex');
                resolve(actualHash.toLowerCase() === expectedHash.toLowerCase());
            });
            stream.on('error', () => resolve(false));
        });
    }

    private compareVersions(v1: string, v2: string): number {
        const p1 = v1.split('.').map(n => parseInt(n || '0', 10));
        const p2 = v2.split('.').map(n => parseInt(n || '0', 10));
        for (let i = 0; i < 3; i++) {
            if ((p1[i] || 0) > (p2[i] || 0)) return 1;
            if ((p1[i] || 0) < (p2[i] || 0)) return -1;
        }
        return 0;
    }
}

export const webUpdateService = new WebUpdateService();
