import { DiagnosisRule, SystemStats, ServerConfig, DiagnosisResult } from './types';
import { CoreRules } from './DiagnosisRules';
import { CrashReportReader, CrashReport } from './CrashReportReader';

export class DiagnosisService {
    private rules: Map<string, DiagnosisRule> = new Map();

    constructor() {
        // Automatically register all core rules
        CoreRules.forEach(rule => this.registerRule(rule));
    }

    public registerRule(rule: DiagnosisRule) {
        this.rules.set(rule.id, rule);
        console.log(`[Diagnosis] Registered rule: ${rule.name} (${rule.id})`);
    }

    private registerDefaultRules() {
        CoreRules.forEach(rule => this.registerRule(rule));
        console.log(`[Diagnosis] Initialized with ${this.rules.size} default rules.`);
    }

    /**
     * Run all applicable rules against the server state
     */
    public async diagnose(server: ServerConfig, recentLogs: string[], env: SystemStats): Promise<DiagnosisResult[]> {
        const results: DiagnosisResult[] = [];
        
        // 1. Fetch deep crash report if available
        const crashReport = await CrashReportReader.getRecentCrashReport(server.workingDirectory);
        
        console.log(`[Diagnosis] Analyzing server ${server.id} with ${this.rules.size} rules${crashReport ? ' + Crash Report' : ''}...`);

        for (const rule of this.rules.values()) {
            try {
                // Optimization: Only run analyze if logs match triggers (if triggers exist)
                // If we have a crash report, we might want to be more aggressive with rules
                const hasLogMatch = rule.triggers.some(t => t.test(recentLogs.join('\n')));
                const hasCrashMatch = crashReport && rule.triggers.some(t => t.test(crashReport.content));
                const isOfflineRule = env.nodeStatus === 'OFFLINE' && rule.id === 'node_health';
                
                // Rules with NO triggers are "always-on" (probing stats or periodic)
                const shouldRun = rule.triggers.length === 0 || hasLogMatch || hasCrashMatch || isOfflineRule;
                
                if (shouldRun) {
                    const result = await rule.analyze(server, recentLogs, env, crashReport || undefined);
                    if (result) results.push(result);
                }
            } catch (error) {
                console.error(`[Diagnosis] Rule ${rule.id} failed:`, error);
            }
        }

        return results;
    }
}

export const diagnosisService = new DiagnosisService();
