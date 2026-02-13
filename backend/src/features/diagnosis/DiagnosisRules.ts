import { DiagnosisRule, SystemStats, ServerConfig, DiagnosisResult } from './types';
import { CrashReport } from './CrashReportReader';
import { ConfigReader } from '../../utils/ConfigReader';
import { NetUtils } from '../../utils/NetUtils';
import { serverConfigService } from '../servers/ServerConfigService';
import path from 'path';
import fs from 'fs-extra';
import { PluginRules } from './PluginDiagnosisRules';
import { BedrockRules } from './BedrockDiagnosisRules';

export const EulaRule: DiagnosisRule = {
    id: 'eula_check',
    name: 'EULA Agreement Check',
    description: 'Checks if the user has agreed to the Minecraft EULA',
    triggers: [
        /You need to agree to the EULA/i,
        /eula.txt/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const hasLog = logs.some(l => l.includes('agree to the EULA'));
        
        // Universal Check: Logs OR Direct Filesystem check
        const eulaPath = path.join(server.workingDirectory, 'eula.txt');
        const exists = await fs.pathExists(eulaPath);
        let isAgreed = false;
        
        if (exists) {
            const content = await fs.readFile(eulaPath, 'utf8');
            isAgreed = content.includes('eula=true');
        }
        
        if (hasLog || !isAgreed) {
            return {
                id: `eula-${server.id}-${Date.now()}`,
                ruleId: 'eula_check',
                severity: 'CRITICAL',
                title: 'EULA Not Accepted',
                explanation: 'The server cannot start because the End User License Agreement (EULA) has not been accepted.',
                recommendation: 'You must agree to the Minecraft EULA to run this server.',
                action: {
                    type: 'AGREE_EULA',
                    payload: { serverId: server.id },
                    autoHeal: true
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const MissingDirectoryRule: DiagnosisRule = {
    id: 'missing_directory',
    name: 'Missing Server Directory',
    description: 'Checks if the server working directory exists',
    triggers: [], // Run periodically/pre-flight
    analyze: async (server: ServerConfig): Promise<DiagnosisResult | null> => {
        if (!await fs.pathExists(server.workingDirectory)) {
            return {
                id: `missing-dir-${server.id}-${Date.now()}`,
                ruleId: 'missing_directory',
                severity: 'CRITICAL',
                title: 'Server Directory Missing',
                explanation: `The server directory ${server.workingDirectory} does not exist.`,
                recommendation: 'The server may have been moved or deleted. Check the file system.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const InsufficientRamRule: DiagnosisRule = {
    id: 'insufficient_ram',
    name: 'System RAM Check',
    description: 'Checks if the system has enough RAM to allocate to the server',
    triggers: [], // Run periodically/pre-flight
    analyze: async (server: ServerConfig): Promise<DiagnosisResult | null> => {
        const si = require('systeminformation');
        try {
            const mem = await si.mem();
            const totalGb = mem.total / 1024 / 1024 / 1024;
            const allocatedGb = server.ram || 2;
            
            if (allocatedGb > totalGb) {
                return {
                    id: `low-ram-${server.id}-${Date.now()}`,
                    ruleId: 'insufficient_ram',
                    severity: 'CRITICAL',
                    title: 'Insufficient System RAM',
                    explanation: `Allocating ${allocatedGb}GB RAM but the system only has ${totalGb.toFixed(1)}GB total.`,
                    recommendation: 'Lower the RAM allocation in Server Settings or upgrade the system memory.',
                    timestamp: Date.now()
                };
            }
        } catch (e) {
            // SI failed, skip check
        }
        return null;
    }
};

export const PortConflictRule: DiagnosisRule = {
    id: 'port_binding',
    name: 'Port Binding Check',
    description: 'Checks if the server port is already in use',
    triggers: [
        /FAILED TO BIND TO PORT/i,
        /Address already in use/i,
        /BindException/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        // Universal Check: Logs OR Direct Network check
        const hasError = logs.some(l => /FAILED TO BIND|Address already in use|BindException/i.test(l));
        
        let isPortBusy = false;
        let blockingProcessName: string | null = null;

        if (logs.length === 0 || hasError) {
            // Pre-flight check or verification
            isPortBusy = await NetUtils.checkPort(server.port);
            if (isPortBusy) {
                blockingProcessName = await NetUtils.identifyProcess(server.port);
            }
        }

        if (hasError || isPortBusy) {
            // Context Awareness: Is another MANAGED server using this port?
            const { getServers } = require('../servers/ServerService');
            const otherOnline = getServers().find((s: ServerConfig) => s.id !== server.id && s.port === server.port && (s.status === 'ONLINE' || s.status === 'STARTING'));

            // Smart Identification
            const isManagedConflict = !!otherOnline;
            const isKillableGhost = !isManagedConflict && blockingProcessName && 
                ['java', 'javaw', 'bedrock_server', 'server'].some(safe => blockingProcessName!.toLowerCase().includes(safe));
            
            const isExternalApp = !isManagedConflict && !isKillableGhost;

            if (isExternalApp) {
                 return {
                    id: `port-ext-${server.id}-${Date.now()}`,
                    ruleId: 'port_binding',
                    severity: 'CRITICAL',
                    title: 'Port Conflict (External App)',
                    explanation: `Port ${server.port} is blocked by an external application (${blockingProcessName || 'Unknown'}). We will not kill it to avoid data loss.`,
                    recommendation: 'Change the server port in Settings to an available port.',
                    action: {
                        type: 'UPDATE_CONFIG',
                        payload: { serverId: server.id, action: 'RESOLVE_PORT_CONFLICT' },
                        autoHeal: true
                    },
                    timestamp: Date.now()
                };
            }

            return {
                id: `port-${server.id}-${Date.now()}`,
                ruleId: 'port_binding',
                severity: 'CRITICAL',
                title: isManagedConflict ? 'Port Conflict Detected' : 'Ghost Process Detected',
                explanation: isManagedConflict 
                    ? `Port ${server.port} is already being used by ${otherOnline?.name || 'another process'}.`
                    : `Port ${server.port} is blocked by a stray background Java process.`,
                recommendation: isManagedConflict
                    ? 'Change the server port in Settings to resolve the conflict.'
                    : 'We can safely purge this ghost process to start your server.',
                action: isManagedConflict ? {
                    type: 'UPDATE_CONFIG',
                    payload: { serverId: server.id, action: 'RESOLVE_PORT_CONFLICT' },
                    autoHeal: true
                } : {
                    type: 'PURGE_GHOST', // Only offer purge if it's safe!
                    payload: { serverId: server.id },
                    autoHeal: true
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const JavaVersionRule: DiagnosisRule = {
    id: 'java_version',
    name: 'Java Version Mismatch',
    description: 'Checks if the Java version matches the mod loader requirements',
    triggers: [
        /java/i,
        /version/i,
        /unsupported/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const logContent = logs.join('\n').toLowerCase();
        const hasError = /unsupportedclassversionerror|compiled by a more recent version|unsupported java version|java \d+ is required/i.test(logContent);
        if (!hasError) return null;

        const currentJava = server.javaVersion;
        let requiredJava = 'Java 17'; // Guess default

        const javaLogContent = logs.join('\n').toLowerCase();
        if (javaLogContent.includes('class file version 61.0')) requiredJava = 'Java 17';
        if (javaLogContent.includes('class file version 65.0')) requiredJava = 'Java 21';
        if (javaLogContent.includes('class file version 60.0')) requiredJava = 'Java 16';
        
        const isWarningOnly = javaLogContent.includes('unsupported java version') && !javaLogContent.includes('unsupportedclassversionerror');

        return {
            id: `java-${server.id}-${Date.now()}`,
            ruleId: 'java_version',
            severity: isWarningOnly ? 'WARNING' : 'CRITICAL',
            title: isWarningOnly ? 'Unsupported Java Version' : 'Incompatible Java Version',
            explanation: isWarningOnly 
                ? `The server software warns that '${currentJava}' is not officially supported and may cause issues.`
                : `Your server requires ${requiredJava} or newer, but it tried to start with ${currentJava} (or an older system default).`,
            recommendation: `Switch the server's Java Version in the settings tab.`,
            action: {
                type: 'SWITCH_JAVA',
                payload: { serverId: server.id, version: requiredJava },
                autoHeal: !isWarningOnly // Only auto-heal if it's a fatal error
            },
            timestamp: Date.now()
        };
    }
};


export const MemoryRule: DiagnosisRule = {
    id: 'memory_oom',
    name: 'Out of Memory',
    description: 'Checks for OutOfMemoryErrors and severe memory pressure',
    triggers: [
        /memory/i,
        /heap/i,
        /oom/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
         const memoryLogContent = logs.join('\n').toLowerCase();
         const hasError = /outofmemoryerror|java heap space|gc overhead limit exceeded/i.test(memoryLogContent);
         
         // 1. Critical OOM Error
         if (hasError) {
             const currentRam = server.ram;
             return {
                id: `oom-${server.id}-${Date.now()}`,
                ruleId: 'memory_oom',
                severity: 'CRITICAL',
                title: 'Out Of Memory (OOM)',
                explanation: `The server ran out of memory (RAM) allocated to it (${currentRam}GB).`,
                recommendation: currentRam < 8 ? `Increase RAM from ${currentRam}GB to ${currentRam + 1}GB.` : `Optimize your server with Spark or reduce the number of mods.`,
                action: {
                    type: 'UPDATE_CONFIG',
                    payload: { serverId: server.id, ram: currentRam + 1 },
                    autoHeal: true
                },
                timestamp: Date.now()
             };
         }

         // 2. Resource Exhaustion (Pressure) - Only if online
         if (env.memoryUsed && env.memoryTotal) {
             const memPercent = (env.memoryUsed / env.memoryTotal) * 100;
             if (memPercent > 95) {
                 return {
                    id: `mem-pressure-${server.id}-${Date.now()}`,
                    ruleId: 'memory_oom',
                    severity: 'CRITICAL',
                    title: 'Critical Memory Pressure',
                    explanation: `System RAM usage is at ${Math.round(memPercent)}%. The server is likely swapping or experiencing GC thrashing.`,
                    recommendation: 'Allocate more RAM if possible, or close other background applications.',
                    timestamp: Date.now()
                 };
             }
         }

         return null;
    }
};

export const MissingJarRule: DiagnosisRule = {
    id: 'missing_jar',
    name: 'Missing Server Jar',
    description: 'Checks if the server JAR file exists and is accessible',
    triggers: [
        /Error: Unable to access jarfile/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        // Universal Check: Logs OR Direct Filesystem check
        const logMatch = logs.some(l => /Unable to access jarfile/i.test(l));
        
        const execFile = server.executable || 'server.jar';
        const jarPath = path.isAbsolute(execFile) ? execFile : path.join(server.workingDirectory, execFile);
        const exists = await fs.pathExists(jarPath);
 
        if (logMatch || !exists) {
            return {
                id: `missing-jar-${server.id}-${Date.now()}`,
                ruleId: 'missing_jar',
                severity: 'CRITICAL',
                title: 'Server Executable Missing',
                explanation: `The server file '${execFile}' could not be found or accessed.`,
                recommendation: 'Ensure the server JAR file exists in the server directory or update your settings to point to the correct file.',
                action: {
                    type: 'UPDATE_CONFIG',
                    payload: { serverId: server.id } 
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const BadConfigRule: DiagnosisRule = {
    id: 'bad_config',
    name: 'Corrupted Server Config',
    description: 'Checks for invalid server.properties',
    triggers: [
        /Failed to load properties/i,
        /Exception handling console input/i // Sometimes happens when properties fail
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (logs.some(l => /Failed to load properties/i.test(l))) {
             return {
                id: `bad-config-${server.id}-${Date.now()}`,
                ruleId: 'bad_config',
                severity: 'CRITICAL',
                title: 'Corrupted Configuration',
                explanation: 'The server.properties file is malformed or corrupted.',
                recommendation: 'Delete server.properties to let the server regenerate it, or fix the syntax errors.',
                action: {
                    type: 'REPAIR_PROPERTIES',
                    payload: { serverId: server.id },
                    autoHeal: true
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const PermissionRule: DiagnosisRule = {
    id: 'permission_denied',
    name: 'FileSystem Permission Error',
    description: 'Checks for Access Denied / Permission Denied errors',
    triggers: [
        /Permission denied/i,
        /Access is denied/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const match = logs.find(l => /Permission denied|Access is denied/i.test(l));
        if (match) {
             return {
                id: `perm-${server.id}-${Date.now()}`,
                ruleId: 'permission_denied',
                severity: 'CRITICAL',
                title: 'Permission Denied',
                explanation: `The server failed to access a file due to permissions: "${match.trim()}"`,
                recommendation: 'Run the application as Administrator (Windows) or check chown/chmod (Linux).',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const InvalidIpRule: DiagnosisRule = {
    id: 'invalid_ip',
    name: 'Invalid Server IP Binding',
    description: 'Checks if server-ip is set to an address this machine usually does not own',
    triggers: [
        /Cannot assign requested address/i,
        /start on .* failed/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (logs.some(l => /Cannot assign requested address/i.test(l))) {
             return {
                id: `inv-ip-${server.id}-${Date.now()}`,
                ruleId: 'invalid_ip',
                severity: 'CRITICAL',
                title: 'Invalid IP Binding',
                explanation: 'The "server-ip" setting in server.properties is set to an IP address that does not belong to this machine.',
                recommendation: 'Open server.properties and set "server-ip" to empty (blank) to allow binding to all addresses.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const DependencyMissingRule: DiagnosisRule = {
    id: 'mod_dependency',
    name: 'Missing Mod Dependency',
    description: 'Checks for missing mod or plugin dependencies',
    triggers: [
        /requires .* but none is available/i,
        /Missing dependencies/i,
        /Unknown dependency/i,
        /Caused by: .*ClassNotFoundException/i, // Crash report pattern
        /Caused by: .*NoClassDefFoundError/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        // 1. Crash Report Analysis (High Precision)
        if (crashReport) {
             const missingClassMatch = crashReport.content.match(/Caused by: .*NoClassDefFoundError: ([\w\/\.]+)/);
             if (missingClassMatch) {
                 const missingClass = missingClassMatch[1].replace(/\//g, '.');
                 return {
                    id: `dep-crash-${server.id}-${Date.now()}`,
                    ruleId: 'mod_dependency',
                    severity: 'CRITICAL',
                    title: 'Missing Library or Dependency',
                    explanation: `The server crashed because a required class was not found: '${missingClass}'. This usually means a library mod (like Fabric API, Mantle, or Citadel) is missing.`,
                    recommendation: 'Install the missing library mod matching your game version.',
                    connectedCrashReport: {
                        id: crashReport.filename,
                        analysis: `Missing Dependency: ${missingClass}`
                    },
                    timestamp: Date.now()
                };
             }
        }

        // 2. Standard Log Analysis
        const errorLine = logs.find(l => /requires \S+ but none is available/i.test(l) || /Missing dependencies/i.test(l));
        if (errorLine) {
             return {
                id: `dep-${server.id}-${Date.now()}`,
                ruleId: 'mod_dependency',
                severity: 'CRITICAL',
                title: 'Missing Mod Dependency',
                explanation: `The server failed to load because a mod dependency is missing. Error trace: "${errorLine.substring(0, 100)}..."`,
                recommendation: 'Check the logs for the specific missing mod name and install it.',
                timestamp: Date.now()
             };
        }
        return null;
    }
};

export const DuplicateModRule: DiagnosisRule = {
    id: 'duplicate_mod',
    name: 'Duplicate Mods Detected',
    description: 'Checks for duplicate mod entries which crash the loader',
    triggers: [
        /Duplicate mods found/i,
        /Found a duplicate mod/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (logs.some(l => /Duplicate mods found/i.test(l) || /Found a duplicate mod/i.test(l))) {
             return {
                id: `dup-mod-${server.id}-${Date.now()}`,
                ruleId: 'duplicate_mod',
                severity: 'CRITICAL',
                title: 'Duplicate Mods Detected',
                explanation: 'Multiple versions of the same mod are installed, causing a conflict.',
                recommendation: 'Check your mods folder and delete older/duplicate execution of the same mod.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const MixinConflictRule: DiagnosisRule = {
    id: 'mixin_conflict',
    name: 'Mixin Conflict',
    description: 'Checks for Sponge/Mixin injection failures',
    triggers: [
        /Mixin apply failed/i,
        /org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
         if (logs.some(l => /Mixin apply failed/i.test(l) || /MixinTransformerError/i.test(l))) {
             return {
                id: `mixin-${server.id}-${Date.now()}`,
                ruleId: 'mixin_conflict',
                severity: 'CRITICAL',
                title: 'Mod Incompatibility (Mixin)',
                explanation: 'A mod is failing to inject code into the game (Mixin Error). This usually means two mods are incompatible.',
                recommendation: 'Try removing recently added mods or check mod compatibility lists.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const TickingEntityRule: DiagnosisRule = {
    id: 'ticking_entity',
    name: 'Ticking Entity Crash',
    description: 'Checks for crashes caused by a specific entity',
    triggers: [
        /Ticking entity/i,
        /Entity being ticked/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const errorLine = logs.find(l => /Ticking entity/i.test(l));
        if (errorLine) {
             return {
                id: `tick-ent-${server.id}-${Date.now()}`,
                ruleId: 'ticking_entity',
                severity: 'CRITICAL',
                title: 'Ticking Entity Crash',
                explanation: 'The server crashed while processing a specific entity (mob/item).',
                recommendation: 'You may need to use a tool like NBTExplorer to remove the entity, or set remove-erroring-entities=true in config (Forge).',
                timestamp: Date.now()
            };
        }
        return null;
    }
};


// ... DependencyMissing, DuplicateMod, MixinConflict, TickingEntity ...

export const WatchdogRule: DiagnosisRule = {
    id: 'watchdog_crash',
    name: 'Server Watchdog Crash',
    description: 'Checks if the server was killed by the Watchdog due to lag',
    triggers: [
        /The server has stopped responding!/i,
        /Paper Watchdog Thread/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (logs.some(l => /The server has stopped responding!/i.test(l))) {
             return {
                id: `watchdog-${server.id}-${Date.now()}`,
                ruleId: 'watchdog_crash',
                severity: 'CRITICAL',
                title: 'Watchdog Timeout (Lag Crash)',
                explanation: 'The server froze for too long (60s+) and was forcefully stopped by the Watchdog to prevent data loss.',
                recommendation: 'This is usually caused by heavy plugins, too many entities, or insufficient CPU/RAM. Try reducing view-distance in server.properties.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const WorldCorruptionRule: DiagnosisRule = {
    id: 'world_corruption',
    name: 'World Corruption Detected',
    description: 'Checks for level.dat or region file corruption',
    triggers: [
        /Exception reading .*level.dat/i,
        /Chunk file at .* is in the wrong location/i,
        /Corrupted chunk mismatch/i,
        /RegionFile/i // Crash report
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        // 1. Crash Report Analysis
        if (crashReport) {
            if (crashReport.content.includes('RegionFile') || crashReport.content.includes('Chunk file at') || crashReport.content.includes('Corrupted chunk')) {
                return {
                    id: `world-crash-${server.id}-${Date.now()}`,
                    ruleId: 'world_corruption',
                    severity: 'CRITICAL',
                    title: 'World Data Corruption (Deep Scan)',
                    explanation: 'The crash report indicates severe corruption in the world save files (Region/Chunk corruption).',
                    recommendation: 'Restore the world from a backup immediately. Do not keep running the server.',
                    connectedCrashReport: {
                        id: crashReport.filename,
                        analysis: 'World Corruption Detected'
                    },
                    timestamp: Date.now()
                };
            }
        }

        // 2. Log Analysis
        if (logs.some(l => /Exception reading .*level.dat/i.test(l) || /Corrupted chunk/i.test(l))) {
             return {
                id: `world-corrupt-${server.id}-${Date.now()}`,
                ruleId: 'world_corruption',
                severity: 'CRITICAL',
                title: 'World Data Corruption',
                explanation: 'The server detected corrupted world files (level.dat or chunks). This often happens after a power outage or crash.',
                recommendation: 'Restore the world from a backup immediately. Do not keep running the server as it may cause further damage.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const NativeCrashRule: DiagnosisRule = {
    id: 'native_jvm_crash',
    name: 'JVM/Native Crash',
    description: 'Detects Java Virtual Machine crashes (hs_err_pid)',
    triggers: [
        /hs_err_pid/i,
        /EXCEPTION_ACCESS_VIOLATION/i,
        /SIGSEGV/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (crashReport && crashReport.filename.startsWith('hs_err_pid')) {
             return {
                id: `jvm-crash-${server.id}-${Date.now()}`,
                ruleId: 'native_jvm_crash',
                severity: 'CRITICAL',
                title: 'Java Virtual Machine Crash',
                explanation: 'The Java process crashed completely. This is usually caused by outdated Graphics Drivers, incompatible Java versions, or bad hardware (RAM).',
                recommendation: 'Update your Graphics Drivers (NVIDIA/AMD) and ensure you are using the correct Java version for your server software.',
                connectedCrashReport: {
                    id: crashReport.filename,
                    analysis: 'Native JVM Crash'
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const AikarsFlagsRule: DiagnosisRule = {
    id: 'aikars_flags',
    name: 'Missing Performance Flags',
    description: 'Recommends Aikars Flags for servers with sufficient RAM',
    triggers: [], // Run always (or conditionally on startup)
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (server.ram >= 4 && !server.advancedFlags?.aikarFlags) {
            return {
                id: `aikar-tip-${server.id}-${Date.now()}`,
                ruleId: 'aikars_flags',
                severity: 'INFO',
                title: 'Optimization Recommendation',
                explanation: `Your server has ${server.ram}GB RAM but isn't using Aikar's Flags. These start-up flags can significantly reduce lag spikes.`,
                recommendation: 'Go to Settings > Advanced and enable "Aikar\'s Flags".',
                action: {
                    type: 'OPTIMIZE_ARGUMENTS',
                    payload: { serverId: server.id, optimized: true },
                    autoHeal: true
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const TelemetryRule: DiagnosisRule = {
    id: 'telemetry_cleanup',
    name: 'Massive Telemetry Logs',
    description: 'Detects if log files are becoming too large',
    triggers: [
        /Stopping!/i,
        /Saving chunks/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        // Triggered by specific log patterns that imply a long session or frequent restarts
        if (logs.length > 500) {
            return {
                id: `telemetry-${server.id}-${Date.now()}`,
                ruleId: 'telemetry_cleanup',
                severity: 'INFO',
                title: 'Log Management Needed',
                explanation: 'The server has generated a large amount of telemetry data in this session.',
                recommendation: 'Cleanup log files and temporary locks to ensure smooth startup next time.',
                action: {
                    type: 'CLEANUP_TELEMETRY',
                    payload: { serverId: server.id },
                    autoHeal: true
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const NetworkProtocolRule: DiagnosisRule = {
    id: 'network_protocol',
    name: 'Protocol/Mod Mismatch',
    description: 'Checks for connection failures due to version or mod variations',
    triggers: [
        /DecoderException/i,
        /Bad Packet/i,
        /Outdated server/i,
        /Outdated client/i,
        /Incompatible FML modded server/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const mismatch = logs.find(l => /Outdated/i.test(l) || /Incompatible/i.test(l));
        if (mismatch) {
            return {
                id: `proto-${server.id}-${Date.now()}`,
                ruleId: 'network_protocol',
                severity: 'WARNING',
                title: 'Client/Server Version Mismatch',
                explanation: 'A player tried to join with an incompatible Minecraft version or Mod Client.',
                recommendation: 'Ensure all players are using the exact same Minecraft version and Modpack version as the server.',
                timestamp: Date.now()
            };
        }

        if (logs.some(l => /DecoderException/i.test(l) || /Bad Packet/i.test(l))) {
             return {
                id: `proto-bad-${server.id}-${Date.now()}`,
                ruleId: 'network_protocol',
                severity: 'WARNING',
                title: 'Mod Packet Error (DecoderException)',
                explanation: 'The server received a packet it could not understand. This usually happens when a player has a different version of a mod than the server.',
                recommendation: 'Check that the client has the EXACT same mods and config as the server. Re-install the modpack on the client.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const PacketTooBigRule: DiagnosisRule = {
    id: 'packet_overflow',
    name: 'Packet Too Big (NBT Overflow)',
    description: 'Checks for PacketTooBigException',
    triggers: [
        /PacketTooBigException/i,
        /Packet was larger than/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (logs.some(l => /PacketTooBig/i.test(l))) {
             return {
                id: `packet-big-${server.id}-${Date.now()}`,
                ruleId: 'packet_overflow',
                severity: 'CRITICAL',
                title: 'NBT Data Overflow (Bad Item)',
                explanation: 'A player tried to send too much data (usually a "Book and Quill" exploit or a massive backpack item). The server kicked them to protect itself.',
                recommendation: 'If this persists, set "max-chained-neighbor-updates" higher in server.properties or delete the player\'s data file.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const NetworkOfflineRule: DiagnosisRule = {
    id: 'network_offline',
    name: 'Authentication/Network Failure',
    description: 'Checks for offline mode or Mojang connection failures',
    triggers: [
        /UnknownHostException/i,
        /authserver.mojang.com/i,
        /sessionserver.mojang.com/i
    ],
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        if (logs.some(l => /UnknownHostException/i.test(l) || /authserver\.mojang\.com/i.test(l))) {
             return {
                id: `net-off-${server.id}-${Date.now()}`,
                ruleId: 'network_offline',
                severity: 'WARNING',
                title: 'Network Connectivity Issue',
                explanation: 'The server cannot connect to Mojang authentication servers. This prevents online-mode players from joining.',
                recommendation: 'Check your internet connection or firewall. If you want to play offline, set online-mode=false in settings (INSECURE).',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const ConfigSyncRule: DiagnosisRule = {
    id: 'config_sync',
    name: 'Configuration Out of Sync',
    description: 'Checks if server.properties matches the configured settings in the dashboard',
    triggers: [], // Run periodically/manually
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const sync = await serverConfigService.verifyConfig(server);
        if (!sync.synchronized && sync.mismatches.length > 0) {
            const mismatchList = sync.mismatches.map(m => `${m.setting} (${m.diskValue} vs ${m.dbValue})`).join(', ');
            return {
                id: `sync-${server.id}-${Date.now()}`,
                ruleId: 'config_sync',
                severity: sync.mismatches.some(m => m.severity === 'high') ? 'CRITICAL' : 'WARNING',
                title: 'Configuration Mismatch',
                explanation: `The following settings in server.properties do not match the dashboard: ${mismatchList}`,
                recommendation: 'Synchronize your configuration to ensure the server starts with the correct settings.',
                action: {
                    type: 'UPDATE_CONFIG',
                    payload: { serverId: server.id, sync: true } // Trigger enforcement
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const MemoryMonitorRule: DiagnosisRule = {
    id: 'memory_leak',
    name: 'Memory Leak Detection',
    description: 'Monitors the process heap usage for potential leaks',
    triggers: [], // Run periodically
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats): Promise<DiagnosisResult | null> => {
        const mem = process.memoryUsage();
        const heapUsedGb = mem.heapUsed / 1024 / 1024 / 1024;
        const heapTotalGb = mem.heapTotal / 1024 / 1024 / 1024;
        
        // Threshold: 85% of total heap used
        if (heapUsedGb / heapTotalGb > 0.85 && heapTotalGb > 0.5) {
            return {
                id: `mem-leak-${Date.now()}`,
                ruleId: 'memory_leak',
                severity: 'WARNING',
                title: 'High Memory Usage (Potential Leak)',
                explanation: `The panel process is using ${Math.round(heapUsedGb * 1024)}MB of heap memory (${Math.round((heapUsedGb/heapTotalGb)*100)}%). This may indicate a memory leak.`,
                recommendation: 'Take a heap snapshot to analyze the leak. We can automate this for you.',
                action: {
                    type: 'TAKE_HEAP_SNAPSHOT',
                    payload: { reason: 'high_memory' },
                    autoHeal: true
                },
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const DataIntegrityRule: DiagnosisRule = {
    id: 'data_integrity',
    name: 'Database Integrity Check',
    description: 'Verifies the integrity of core JSON storage files',
    triggers: [], // Run periodically
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats): Promise<DiagnosisResult | null> => {
        const { DATA_DIR } = require('../../constants');
        const filesToTask = ['servers.json', 'users.json', 'audit.json'];
        
        for (const filename of filesToTask) {
            const filePath = path.join(DATA_DIR, filename);
            if (await fs.pathExists(filePath)) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    JSON.parse(content);
                } catch (e) {
                    return {
                        id: `corrupt-${filename}-${Date.now()}`,
                        ruleId: 'data_integrity',
                        severity: 'CRITICAL',
                        title: `Database Corruption: ${filename}`,
                        explanation: `The file '${filename}' is corrupted or contains invalid JSON and cannot be read.`,
                        recommendation: 'Restore the file from its last successful backup (.bak).',
                        action: {
                            type: 'RESTORE_DATA_BACKUP',
                            payload: { filename },
                            autoHeal: true
                        },
                        timestamp: Date.now()
                    };
                }
            }
        }
        return null;
    }
};

export const TpsLagRule: DiagnosisRule = {
    id: 'tps_lag',
    name: 'Server TPS Performance',
    description: 'Monitors Ticks Per Second and "Can\'t keep up" warnings',
    triggers: [], // Metrics and logs
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats): Promise<DiagnosisResult | null> => {
        const lagLines = logs.filter(l => l.includes("Can't keep up!"));
        
        if (lagLines.length > 0) {
            return {
                id: `lag-logs-${server.id}-${Date.now()}`,
                ruleId: 'tps_lag',
                severity: 'WARNING',
                title: 'Server Ticking Behind',
                explanation: `The server is frequently reporting "Can't keep up!". This means the CPU is unable to process game ticks fast enough.`,
                recommendation: 'Reduce the server simulation distance or remove resource-heavy mods/plugins.',
                timestamp: Date.now()
            };
        }

        if (env.tps !== undefined && env.tps < 10 && env.tps > 0) {
            return {
                id: `lag-tps-${server.id}-${Date.now()}`,
                ruleId: 'tps_lag',
                severity: 'CRITICAL',
                title: 'Severe Checkpoint Lag',
                explanation: `Current TPS is ${env.tps.toFixed(2)}, which is critically low (Standard is 20.0). Players will experience significant delay.`,
                recommendation: 'Perform a /spark profiler run to identify the cause of the lag.',
                timestamp: Date.now()
            };
        }

        return null;
    }
};

export const ResourceExhaustionRule: DiagnosisRule = {
    id: 'cpu_exhaustion',
    name: 'Resource Exhaustion',
    description: 'Detects CPU starvation and thread locking',
    triggers: [], // Metrics and logs
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats): Promise<DiagnosisResult | null> => {
        if (env.cpu !== undefined && env.cpu > 90 && (env.tps || 20) < 18) {
            return {
                id: `cpu-exhaust-${server.id}-${Date.now()}`,
                ruleId: 'cpu_exhaustion',
                severity: 'CRITICAL',
                title: 'CPU Overload (Thread Starvation)',
                explanation: `System CPU usage is at ${Math.round(env.cpu)}% and TPS has dropped. The server is starving for processing time.`,
                recommendation: 'Check for other processes using CPU or upgrade the host CPU.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

const NodeHealthRule: DiagnosisRule = {
    id: 'node_health',
    name: 'Node Health Check',
    description: 'Checks if the server\'s assigned node is offline',
    triggers: [], // Metrics-based trigger
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats): Promise<DiagnosisResult | null> => {
        if (env.nodeStatus === 'OFFLINE') {
            return {
                id: `node-offline-${server.id}-${Date.now()}`,
                ruleId: 'node_health',
                severity: 'CRITICAL',
                title: 'Node Connection Lost',
                explanation: `The node hosting this server ("${server.nodeId}") has not sent a heartbeat recently. The server may still be running but is unreachable for management.`,
                recommendation: 'Check if the node agent is running and has internet access.',
                timestamp: Date.now()
            };
        }
        return null;
    }
};

export const CoreRules: DiagnosisRule[] = [
    ResourceExhaustionRule, // Moved to top for debug
    EulaRule,
    MissingDirectoryRule,
    InsufficientRamRule,
    PortConflictRule,
    JavaVersionRule,
    MemoryRule,
    MissingJarRule,
    BadConfigRule,
    PermissionRule,
    InvalidIpRule,
    DependencyMissingRule,
    DuplicateModRule,
    MixinConflictRule,
    TickingEntityRule,
    WatchdogRule,
    WorldCorruptionRule,
    NativeCrashRule,
    AikarsFlagsRule,
    TelemetryRule,
    NetworkProtocolRule,
    PacketTooBigRule,
    NetworkOfflineRule,
    ConfigSyncRule,
    MemoryMonitorRule,
    DataIntegrityRule,
    TpsLagRule,
    NodeHealthRule,
    ...PluginRules,
    ...BedrockRules
];
