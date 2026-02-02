import { ServerConfig, DiagnosisResult } from '../../../../shared/types';
import fs from 'fs-extra';
import path from 'path';
import { CoreRules } from './DiagnosisRules';
import { CrashReportReader, CrashReport } from './CrashReportReader';

export interface SystemStats {
    totalMemory: number;
    freeMemory: number;
    javaVersion: string;
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
}

export class DiagnosisService {
    private rules: DiagnosisRule[] = [];

    constructor() {
        this.registerDefaultRules();
    }

    public registerRule(rule: DiagnosisRule) {
        this.rules.push(rule);
        console.log(`[Diagnosis] Registered rule: ${rule.name} (${rule.id})`);
    }

    private registerDefaultRules() {
        CoreRules.forEach(rule => this.registerRule(rule));
        console.log(`[Diagnosis] Initialized with ${this.rules.length} default rules.`);
    }

    /**
     * Run all applicable rules against the server state
     */
    public async diagnose(server: ServerConfig, recentLogs: string[], env: SystemStats): Promise<DiagnosisResult[]> {
        const results: DiagnosisResult[] = [];
        
        // 1. Fetch deep crash report if available
        const crashReport = await CrashReportReader.getRecentCrashReport(server.workingDirectory);
        
        console.log(`[Diagnosis] Analyzing server ${server.id} with ${this.rules.length} rules${crashReport ? ' + Crash Report' : ''}...`);

        for (const rule of this.rules) {
            try {
                // Optimization: Only run analyze if logs match triggers (if triggers exist)
                // If we have a crash report, we might want to be more aggressive with rules
                const shouldRun = rule.triggers.length === 0 
                    || rule.triggers.some(t => recentLogs.some(l => t.test(l)))
                    || (crashReport && rule.triggers.some(t => t.test(crashReport.content)));
                
                if (shouldRun) {
                    const result = await rule.analyze(server, recentLogs, env, crashReport || undefined);
                    if (result) {
                        results.push(result);
                    }
                }
            } catch (error) {
                console.error(`[Diagnosis] Rule ${rule.id} failed to execute:`, error);
            }
        }

        return results;
    }
}

export const diagnosisService = new DiagnosisService();
