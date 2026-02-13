
import path from 'path';
import fs from 'fs-extra';
import { processManager } from '../processes/ProcessManager';
import { javaManager } from '../processes/JavaManager';
import net from 'net';
import si from 'systeminformation';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

import { safetyService, SafetyError } from '../system/SafetyService';
import { systemSettingsService } from '../system/SystemSettingsService';
import { NetUtils } from '../../utils/NetUtils';

export class StartupManager {

    /**
     * Orchestrates the entire startup process
     */
    async startServer(server: any, saveServerCallback: (s: any) => void, force: boolean = false): Promise<void> {
        const id = server.id;

        // 0. Smart Auto-Correction (Velocity) - Run BEFORE Safety Checks


        // 0.1 Safety Checks (Skip if forced)
        if (!force) {
            await safetyService.validateServer(server);
        }

        // 1. Double-Start Check: Is the port already in use?
        // Note: SafetyService checks Pre-flight, but we check again here for race conditions.
        const isPortInUse = await NetUtils.checkPort(server.port);
        if (isPortInUse) {
            if (force) {
                console.warn(`[StartupManager:${id}] Port ${server.port} is busy. Force mode active: purging ghost process...`);
                const killed = await processManager.killProcessOnPort(server.port);
                if (killed) {
                    console.log(`[StartupManager:${id}] Ghost purged. Waiting for handle release...`);
                    await new Promise(r => setTimeout(r, 1500)); 
                }
            } else {
                throw new SafetyError(
                    `Port ${server.port} is already in use by another process. Stop any external instances if you want the panel to manage this server.`,
                    'PORT_BUSY_GHOST',
                    { port: server.port }
                );
            }
        }

        // 2. Prepare Environment (Create folders, etc.)
        await this.prepareEnvironment(server);

        // 3. Resolve Java (Skip for Bedrock)
        let javaPath = '';
        if (server.software !== 'Bedrock') {
            javaPath = await javaManager.ensureJava(server.javaVersion || 'Java 17');
        }

        // 4. Build Command
        // Enforce Properties for Backend Servers (Trust No One)
        await this.enforceBackendProperties(server);

        // GLOBAL DOCKER ENFORCEMENT
        const settings = systemSettingsService.getSettings();
        let engine = server.executionEngine || 'native';
        if (engine === 'docker' && !settings.app.dockerEnabled) {
            console.warn(`[StartupManager:${id}] Docker is disabled globally. Overriding execution engine to 'native' for safety.`);
            engine = 'native';
        }

        const { cmd, cwd, env } = await this.buildStartCommand(server, javaPath, engine);
        
        // 5. Launch
        let dockerImage = server.dockerImage;
        const autoImage = javaManager.getDockerImageForJava(server.javaVersion);

        // Smart Override: If no image set, OR if it's common default/stale, use auto-mapped
        if (!dockerImage || dockerImage.includes('eclipse-temurin')) {
             // simplified logic: trust the java manager if it's undefined or a standard image
             if (!dockerImage) dockerImage = autoImage;
        }

        console.log(`[StartupManager:${id}] Selected Docker image: ${dockerImage}`);
        
        // PERSISTENT DEBUG TRACE
        try {
            fs.writeFileSync(path.join(process.cwd(), 'data', 'last_docker_start.json'), JSON.stringify({
                timestamp: new Date().toISOString(),
                id,
                dockerImage,
                javaVersion: server.javaVersion,
                autoImage
            }, null, 2));
        } catch (e) {}

        processManager.startServer(id, cmd, cwd, { 
            ...env, 
            executionEngine: engine,
            dockerImage,
            SERVER_PORT: server.port
        });

        // 6. Clear Restart Flag (Hardening)
        saveServerCallback({ ...server, needsRestart: false });
    }



    private async prepareEnvironment(server: any) {
        const cwd = server.workingDirectory;
        const id = server.id;
        
        // 1. Loader/Folder Checks (Auto-Creation)
        const software = server.software?.toLowerCase() || '';
        if (software.includes('forge') || software.includes('fabric') || software.includes('neoforge')) {
            const modsDir = path.join(cwd, 'mods');
            if (!(await fs.pathExists(modsDir))) {
                 console.warn(`[StartupManager:${id}] Modded server (${server.software}) detected but 'mods' folder is missing.`);
                 await fs.ensureDir(modsDir);
                 console.log(`[StartupManager:${id}] Created empty 'mods' directory.`);
            }
        } else if (software.includes('paper') || software.includes('spigot') || software.includes('purpur')) {
             const pluginsDir = path.join(cwd, 'plugins');
             if (!(await fs.pathExists(pluginsDir))) {
                 await fs.ensureDir(pluginsDir);
             }
        } else if (software === 'bedrock') {
             const worldsDir = path.join(cwd, 'worlds');
             if (!(await fs.pathExists(worldsDir))) {
                 await fs.ensureDir(worldsDir);
             }
        }

        // 2. Forge Specific Checks (Warning only)
        const exe = server.executable || 'server.jar';
        if (exe.endsWith('.bat') || server.software === 'Forge') {
             const argsFile = path.join(cwd, 'user_jvm_args.txt');
             if (await fs.pathExists(argsFile)) {
                 // Good, it exists.
             } else {
                 console.warn(`[StartupManager] user_jvm_args.txt missing for Forge/Bat server. This might cause startup failure.`);
             }
        }
    }

    private async buildStartCommand(server: any, javaPath: string, engine: 'native' | 'docker' = 'native'): Promise<{ cmd: string, cwd: string, env: NodeJS.ProcessEnv }> {
        const cwd = server.workingDirectory;
        const isWin = process.platform === 'win32';
        
        // 0. Bedrock Support (Direct Binary Execution)
        if (server.software === 'Bedrock') {
            const exe = isWin ? 'bedrock_server.exe' : './bedrock_server';
            const cmd = isWin ? exe : `LD_LIBRARY_PATH=. ${exe}`;
            return { cmd, cwd, env: {} };
        }

        const jarFile = server.executable || 'server.jar';
        
        // Use generic java for Docker, absolute for Native
        const actualJava = engine === 'docker' ? 'java' : `"${javaPath}"`;

        // Prepend Java Bin to PATH (Keep this as backup)
        const javaBin = path.dirname(javaPath);
        const env: NodeJS.ProcessEnv = {};
        const currentPath = process.env.PATH || process.env.Path || '';
        const separator = isWin ? ';' : ':';
        env['PATH'] = `${javaBin}${separator}${currentPath}`;
        env['Path'] = `${javaBin}${separator}${currentPath}`;

        // Construct JVM Arguments
        const AIKAR_FLAGS = "-XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=true -Daikars.new.flags=true";
        
        let jvmArgs = `-Xmx${server.ram}G`;

        // 1. GC Engine Selection
        const gcEngine = server.advancedFlags?.gcEngine || 'G1GC';
        if (gcEngine === 'ZGC') {
            jvmArgs += " -XX:+UseZGC -XX:+ZGenerational";
        } else if (gcEngine === 'Shenandoah') {
            jvmArgs += " -XX:+UseShenandoahGC -XX:+UnlockExperimentalVMOptions";
        } else if (gcEngine === 'Parallel') {
            jvmArgs += " -XX:+UseParallelGC";
        } else {
            // Default: G1GC
            jvmArgs += " -XX:+UseG1GC";
            if (server.advancedFlags?.aikarFlags) {
                console.log(`[StartupManager] Injecting Aikar's Optimization Suite for ${server.name}`);
                jvmArgs += ` ${AIKAR_FLAGS}`;
            }
        }

        // 2. Network Fabric Tuning
        if (server.advancedFlags?.socketBuffer) {
            const bufferSize = server.advancedFlags.socketBuffer;
            jvmArgs += ` -Dnetwork.socket.sendBuffer=${bufferSize} -Dnetwork.socket.receiveBuffer=${bufferSize} -Dsun.net.maxDatagramSockets=${bufferSize / 1024}`;
        }

        // 3. GraalVM Native JIT Optimization
        if (server.advancedFlags?.useGraalVM) {
            jvmArgs += " -XX:+UnlockExperimentalVMOptions -XX:+EnableJVMCI -XX:+UseJVMCICompiler";
        }

        // 4. Thread Priority Policy
        if (server.advancedFlags?.threadPriority === 'ultra') {
            jvmArgs += " -XX:+UseCriticalJavaThreadPriority -XX:ThreadPriorityPolicy=1";
        }
        
        
        // Suppress "Advanced terminal features not available" warning (JLine 2 & 3 / Paper)
        // JLine 2
        jvmArgs += ' -DTerminal.jline=false -Dorg.bukkit.craftbukkit.libs.jline.Terminal=jline.UnsupportedTerminal';
        // JLine 3 (Modern Paper / 1.19+)
        jvmArgs += ' -Dorg.jline.terminal.dumb=true -Dorg.jline.terminal.backend=jline.terminal.impl.DumbTerminalProvider';
        
        // Suppress Paper "You've not updated in a while" warning
        jvmArgs += ' -Dpaper.disableUpdateCheck=true';

        let cmd = '';
        // Removed duplicate isWin

        let runPrefix = '';
        if (isWin) {
            let priorityFlag = '/NORMAL';
            if (server.cpuPriority === 'high') priorityFlag = '/HIGH';
            if (server.cpuPriority === 'realtime') priorityFlag = '/REALTIME';
            
            if (priorityFlag !== '/NORMAL') {
                 runPrefix = `start /B ${priorityFlag} "MinecraftServer" `;
            }
        } else {
             // Linux Logic
             if (server.cpuPriority === 'high') runPrefix = 'nice -n -5 '; 
             if (server.cpuPriority === 'realtime') runPrefix = 'nice -n -10 ';
        }

        if (jarFile.endsWith('.bat')) {
            // Smart Forge Handler: Parse the bat to bypass PATH issues
            try {
                const batPath = path.join(cwd, jarFile);
                const batContent = await fs.readFile(batPath, 'utf8');
                
                // Look for the standard Forge line: "java @user_jvm_args.txt ..."
                const match = batContent.match(/^java\s+(@user_jvm_args\.txt.*)$/m);
                if (match) {
                    const forgeArgs = match[1].replace('%*', '').trim(); // Remove %* placeholder
                    console.log(`[StartupManager] Parsed Forge run.bat args: ${forgeArgs}`);
                    
                    cmd = `${runPrefix}${actualJava} ${jvmArgs} ${forgeArgs} nogui`;
                    
                } else {
                    console.log('[StartupManager] Could not parse run.bat args, falling back to execution via cmd.');
                    // Fallback to executing bat
                    if (isWin) {
                        cmd = `${runPrefix}cmd /c "cd /d "${cwd}" && "${jarFile}" ${jvmArgs} nogui"`;
                    } else {
                        cmd = `${runPrefix}"${path.join(cwd, jarFile)}"`; 
                    }
                }
            } catch (e) {
                console.error('[StartupManager] Error reading run.bat:', e);
                 // Fallback
                 if (isWin) {
                    cmd = `${runPrefix}cmd /c "cd /d "${cwd}" && "${jarFile}" ${jvmArgs} nogui"`;
                } else {
                    cmd = `${runPrefix}"${path.join(cwd, jarFile)}"`; 
                }
            }
        } else if (jarFile.endsWith('.sh')) {
             // Linux Shell Script
             cmd = `${runPrefix}sh "${path.join(cwd, jarFile)}" ${jvmArgs} nogui`;
        } else {
            // Standard JAR
            cmd = `${runPrefix}${actualJava} ${jvmArgs} -jar "${jarFile}" nogui`;
        }

        return { cmd, cwd, env };
    }

    // Removed autoCorrectVelocity


    public async enforceBackendProperties(server: any) {
        try {
            // --- STANDALONE / BACKEND LOGIC ---
            const propsPath = path.join(server.workingDirectory, 'server.properties');
            if (await fs.pathExists(propsPath)) {
                 let content = await fs.readFile(propsPath, 'utf8');

                // 1. STRICT PORT SYNC
                if (server.port) {
                    const portStr = `server-port=${server.port}`;
                    const ipv6PortStr = `server-port-v6=${server.port}`; // Bedrock specific, but harmless for Java
                    
                    if (content.match(/^server-port\s*=/m)) {
                        content = content.replace(/^server-port\s*=.*$/m, portStr);
                    } else {
                        content += `\n${portStr}`;
                    }

                    if (server.software === 'Bedrock') {
                        if (content.match(/^server-port-v6\s*=/m)) {
                            content = content.replace(/^server-port-v6\s*=.*$/m, ipv6PortStr);
                        } else {
                            content += `\n${ipv6PortStr}`;
                        }
                    }
                }

                // 2. NETWORK COMPRESSION THRESHOLD SYNC
                if (server.advancedFlags?.compressionThreshold !== undefined) {
                    const threshold = server.advancedFlags.compressionThreshold;
                    const thresholdStr = `network-compression-threshold=${threshold}`;
                    if (content.match(/^network-compression-threshold\s*=/m)) {
                        content = content.replace(/^network-compression-threshold\s*=.*$/m, thresholdStr);
                    } else {
                        content += `\n${thresholdStr}`;
                    }
                }

                await fs.writeFile(propsPath, content);
            }

        } catch (err) {
             console.error(`[StartupManager] Failed to enforce properties:`, err);
        }
    }
}

export const startupManager = new StartupManager();
