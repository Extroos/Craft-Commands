import { ConnectionStatus, ConnectivityMethod } from '../../../../shared/types';

export interface ConnectivityProvider {
    readonly id: ConnectivityMethod;
    
    /**
     * Attempts to establish connectivity.
     * @returns The updated connection status.
     */
    connect(): Promise<ConnectionStatus>;

    /**
     * Tears down connectivity.
     */
    disconnect(): Promise<void>;

    /**
     * Returns the current status of this provider.
     */
    getStatus(): Promise<ConnectionStatus>;

    /**
     * Checks if the environment supports this method (e.g. is cloudflared installed?).
     */
    isSupported(): Promise<boolean>;
}
