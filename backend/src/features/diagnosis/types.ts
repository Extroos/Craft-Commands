import {  ServerConfig, DiagnosisResult  } from '@shared/types';
export { ServerConfig, DiagnosisResult };
import { CrashReport } from './CrashReportReader';

export interface SystemStats {
    totalMemory: number;
    freeMemory: number;
    javaVersion: string;
    // Runtime performance metrics
    cpu?: number;
    memoryUsed?: number;
    memoryTotal?: number;
    tps?: number;
    nodeStatus?: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'ENROLLING';
}

export interface DiagnosisRule {
    id: string;
    name: string;
    description: string;
    // Log patterns to quickly identify if this rule *might* apply (optimization)
    triggers: RegExp[]; 
    // The core logic
    analyze: (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport) => Promise<DiagnosisResult | null>;
    
    // Proactive properties
    isHealable?: boolean;
    heal?: (server: ServerConfig) => Promise<boolean>;
}
