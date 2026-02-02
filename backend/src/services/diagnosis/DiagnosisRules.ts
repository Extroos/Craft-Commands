
import { DiagnosisRule, SystemStats } from './DiagnosisService';
import { CrashReport } from './CrashReportReader';
import { ServerConfig, DiagnosisResult } from '../../../../shared/types';
import { ConfigReader } from '../../utils/ConfigReader';
import { NetUtils } from '../../utils/NetUtils';
import { serverConfigService } from '../servers/ServerConfigService';
import path from 'path';

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
        const isAgreed = await ConfigReader.checkEula(server.workingDirectory);
        
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
        /UnsupportedClassVersionError/i,
        /has been compiled by a more recent version of the Java Runtime/i,
        /Java 17 is required/i,
        /Java 21 is required/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
        const hasError = logs.some(l => /UnsupportedClassVersionError/i.test(l) || /compiled by a more recent version/i.test(l));
        if (!hasError) return null;

        const currentJava = server.javaVersion;
        let requiredJava = 'Java 17'; // Guess default

        // Try to parse what was needed from logs
        const logContent = logs.join(' ');
        if (logContent.includes('class file version 61.0')) requiredJava = 'Java 17';
        if (logContent.includes('class file version 65.0')) requiredJava = 'Java 21';
        if (logContent.includes('class file version 60.0')) requiredJava = 'Java 16';

        // Check against actual installed Java
        // (env.javaVersion is passed in but might be from system default, we want server specific)
        // Ideally we check what the server is configured to use.
        
        return {
            id: `java-${server.id}-${Date.now()}`,
            ruleId: 'java_version',
            severity: 'CRITICAL',
            title: 'Incompatible Java Version',
            explanation: `Your server requires ${requiredJava} or newer, but it tried to start with ${currentJava} (or an older system default).`,
            recommendation: `Switch the server's Java Version to ${requiredJava} in the settings tab.`,
            action: {
                type: 'SWITCH_JAVA',
                payload: { serverId: server.id, version: requiredJava },
                autoHeal: true
            },
            timestamp: Date.now()
        };
    }
};

export const MemoryRule: DiagnosisRule = {
    id: 'memory_oom',
    name: 'Out of Memory',
    description: 'Checks for OutOfMemoryErrors',
    triggers: [
        /OutOfMemoryError/i,
        /Java heap space/i
    ],
    isHealable: true,
    analyze: async (server: ServerConfig, logs: string[], env: SystemStats, crashReport?: CrashReport): Promise<DiagnosisResult | null> => {
         const hasError = logs.some(l => /OutOfMemoryError/i.test(l) || /Java heap space/i.test(l));
         if (!hasError) return null;

         const currentRam = server.ram;
         const recommendation = currentRam < 8 ? `Increase RAM from ${currentRam}GB to ${currentRam + 2}GB.` : `Optimize your server with Spark or reduce the number of mods.`;

         return {
            id: `oom-${server.id}-${Date.now()}`,
            ruleId: 'memory_oom',
            severity: 'CRITICAL',
            title: 'Out Of Memory (OOM)',
            explanation: `The server ran out of specific memory (RAM) allocated to it (${currentRam}GB).`,
            recommendation: recommendation,
            action: {
                type: 'UPDATE_CONFIG',
                payload: { serverId: server.id, ram: currentRam + 1 },
                autoHeal: true
            },
            timestamp: Date.now()
         };
    }
};

import fs from 'fs-extra'; // Added import

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

export const CoreRules = [
    EulaRule, PortConflictRule, JavaVersionRule, MemoryRule, 
    MissingJarRule, BadConfigRule, PermissionRule, InvalidIpRule,
    DependencyMissingRule, DuplicateModRule, MixinConflictRule, TickingEntityRule,
    WatchdogRule, WorldCorruptionRule, AikarsFlagsRule, TelemetryRule, NetworkOfflineRule,
    ConfigSyncRule, NativeCrashRule, NetworkProtocolRule, PacketTooBigRule
];
