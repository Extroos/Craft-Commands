/**
 * Shared transient state for the system status.
 * This avoids circular dependencies between server.ts and routes.
 */

export let protocol: string = 'http';
export let sslStatus: 'VALID' | 'SELF_SIGNED' | 'NONE' = 'NONE';

export const setSystemStatus = (newProtocol: string, newSslStatus: 'VALID' | 'SELF_SIGNED' | 'NONE') => {
    protocol = newProtocol;
    sslStatus = newSslStatus;
};
