import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GlobalSettings } from '@shared/types';
import { API } from '../services/api';
import { useUser } from './UserContext';

interface SystemState {
    settings: GlobalSettings | null;
    hostMode: boolean;
    version: string; // Dynamic version
    isSolo: boolean; // Helper: !hostMode
    isLoading: boolean;
    refreshSettings: () => Promise<void>;
}

const SystemContext = createContext<SystemState | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useUser();
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshSettings = useCallback(async () => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        try {
            const data = await API.getGlobalSettings();
            setSettings(data);
        } catch (e) {
            console.error('[SystemContext] Failed to fetch settings:', e);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Fetch on mount or when auth changes
    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    const hostMode = settings?.app?.hostMode !== false; // Default to true if not set

    return (
        <SystemContext.Provider value={{
            settings,
            hostMode,
            version: settings?.version || '0.0.0',
            isSolo: !hostMode,
            isLoading,
            refreshSettings
        }}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystem = () => {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error('useSystem must be used within a SystemProvider');
    }
    return context;
};
