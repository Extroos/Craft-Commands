import { ConnectivityProvider } from './ConnectivityProvider';
import { ConnectionStatus, ConnectivityMethod } from '../../../../shared/types';
import axios from 'axios';
import { logger } from '../../utils/logger';

export class DirectProvider implements ConnectivityProvider {
    readonly id: ConnectivityMethod = 'direct';

    async connect(): Promise<ConnectionStatus> {
        const ip = await this.getPublicIP();
        return {
            enabled: true,
            method: 'direct',
            bindAddress: '0.0.0.0',
            externalIP: ip || undefined,
            details: {
                message: 'Port forwarding required on your router.'
            }
        };
    }

    async disconnect(): Promise<void> {
        // Nothing to tear down for direct connection, just stop listening on 0.0.0.0 (handled by manager/settings)
    }

    async getStatus(): Promise<ConnectionStatus> {
        return {
            enabled: true,
            method: 'direct',
            bindAddress: '0.0.0.0'
        };
    }

    async isSupported(): Promise<boolean> {
        return true;
    }

    private async getPublicIP(): Promise<string | null> {
        try {
            const res = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
            return res.data.ip;
        } catch (e: any) {
            logger.warn(`[DirectProvider] Failed to detect public IP: ${e.message}`);
            return null;
        }
    }
}
