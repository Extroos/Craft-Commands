import { systemSettingsService } from './SystemSettingsService';
import { auditService } from './AuditService';
import axios from 'axios';
import { logger } from '../../utils/logger';

export class RemoteAccessService {
    
    private isDetectingIP = false;

    /**
     * Returns the safe bind address for the HTTP/Socket server.
     */
    getBindAddress(): string {
        const settings = systemSettingsService.getSettings();
        if (settings.app.remoteAccess?.enabled) {
            return '0.0.0.0';
        }
        return '127.0.0.1';
    }

    async detectPublicIP(): Promise<string | null> {
        if (this.isDetectingIP) return null;
        this.isDetectingIP = true;

        try {
            logger.info('[RemoteAccess] Detecting public IP address...');
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            const ip = response.data.ip;
            
            if (ip) {
                logger.success(`[RemoteAccess] Detected Public IP: ${ip}`);
                const settings = systemSettingsService.getSettings();
                systemSettingsService.updateSettings({
                    app: {
                        remoteAccess: {
                            ...settings.app.remoteAccess,
                            enabled: settings.app.remoteAccess?.enabled || false,
                            externalIP: ip
                        }
                    }
                });
                return ip;
            }
        } catch (e: any) {
            logger.error(`[RemoteAccess] IP Detection failed: ${e.message}`);
        } finally {
            this.isDetectingIP = false;
        }
        return null;
    }

    async validateSafetyGates(): Promise<void> {
        return;
    }

    enable(method: 'vpn' | 'proxy' | 'direct' | 'cloudflare'): void {
        this.validateSafetyGates();

        systemSettingsService.updateSettings({
            app: {
                remoteAccess: {
                    enabled: true,
                    method,
                    externalIP: undefined // Reset to trigger detection
                }
            }
        });

        if (method === 'direct') {
            this.detectPublicIP(); // Background trigger
        }

        auditService.log('SYSTEM', 'SYSTEM_SETTINGS_UPDATE', 'system', { remoteAccess: true, method }, '127.0.0.1');
    }

    disable(): void {
        systemSettingsService.updateSettings({
            app: {
                remoteAccess: {
                    enabled: false
                }
            }
        });

        auditService.log('SYSTEM', 'SYSTEM_SETTINGS_UPDATE', 'system', { remoteAccess: false }, '127.0.0.1');
    }

    getStatus() {
        const settings = systemSettingsService.getSettings();
        
        // If direct is enabled but we don't have an IP yet, trigger detection in background
        if (settings.app.remoteAccess?.enabled && 
            settings.app.remoteAccess?.method === 'direct' && 
            !settings.app.remoteAccess?.externalIP && 
            !this.isDetectingIP) {
            this.detectPublicIP();
        }

        return {
            enabled: settings.app.remoteAccess?.enabled || false,
            method: settings.app.remoteAccess?.method,
            externalIP: settings.app.remoteAccess?.externalIP,
            bindAddress: this.getBindAddress()
        };
    }
}

export const remoteAccessService = new RemoteAccessService();
