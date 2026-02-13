import { EventEmitter } from 'events';
import si from 'systeminformation';
import net from 'net';
import { runnerFactory } from './runners/RunnerFactory';
import { IServerRunner } from './runners/IServerRunner';
import { NetUtils } from '../../utils/NetUtils';

class ProcessManager extends EventEmitter {
    private activeRunners: Map<string, IServerRunner> = new Map();
    private logHistory: Map<string, string[]> = new Map();
    private startTimes: Map<string, number> = new Map();
    private statusCache: Map<string, any> = new Map();
    private stoppingServers: Set<string> = new Set();
    private updatingStatuses: Set<string> = new Set();
    private startupLocks: Set<string> = new Set();
    private players: Map<string, Set<string>> = new Map();
    private readonly MAX_LOGS = 1000;
    private lastEmittedStatus: Map<string, string> = new Map();

    constructor() {
        super();
        this.startStatsLoop();
        this.startSyncLoop();
    }

    private startSyncLoop() {
        // Periodic sync to detect external/unmanaged processes every 15s
        setInterval(async () => {
             try {
                const { getServers } = await import('../servers/ServerService');
                const servers = getServers();
                
                for (const server of servers) {
                    const id = server.id;
                    const isManaged = this.activeRunners.has(id);
                    const cached = this.statusCache.get(id);
                    const currentStatus = cached?.status || server.status;

                    if (!isManaged) {
                        const isPortBound = await NetUtils.checkPort(server.port);
                        
                        if (isPortBound) {
                            if (currentStatus !== 'UNMANAGED' && currentStatus !== 'STARTING') {
                                console.warn(`[ProcessManager:${id}] Unmanaged process detected on port ${server.port}.`);
                                this.updateCachedStatus(id, { 
                                    online: true, 
                                    status: 'UNMANAGED', 
                                    unmanaged: true,
                                    message: 'Running without panel control'
                                });
                            }
                        } else {
                            // If we thought it was online but port is dead, it's offline
                            if (cached?.online || server.status === 'ONLINE' || server.status === 'UNMANAGED') {
                                if (!this.startupLocks.has(id)) {
                                    console.log(`[ProcessManager:${id}] External/Unmanaged process lost. Syncing to OFFLINE.`);
                                    this.handleServerClose(id, 0);
                                }
                            }
                        }
                    }
                }
             } catch (err) {
                 // Prevent interval crash
             }
        }, 15000);
    }



    private startStatsLoop() {
        setInterval(async () => {
            const tasks = Array.from(this.activeRunners.entries()).map(async ([id, runner]) => {
                try {
                    const stats = await runner.getStats(id);
                    const tps = this.getTPS(id);
                    const uptime = this.getUptime(id);
                    
                    if (stats.cpu > 0 || stats.memory > 0) {
                        console.log(`[ProcessManager:${id}] Stats: CPU ${stats.cpu}%, Memory ${stats.memory}MB, PID ${stats.pid}`);
                    } else {
                        // Log every 10th failure to avoid spam
                        if (Math.random() < 0.1) {
                            console.warn(`[ProcessManager:${id}] Stats report zero. Runner: ${runner.constructor.name}`);
                        }
                    }

                    this.emit('stats', { id, ...stats, tps, uptime });
                    this.updateCachedStatus(id, { 
                        cpu: stats.cpu,
                        memory: stats.memory,
                        uptime,
                        tps
                    });
                } catch (e) {
                    console.error(`[ProcessManager] Stats failed for ${id}:`, e);
                }
            });

            await Promise.all(tasks);
        }, 3000);
    }

    async startServer(id: string, runCommand: string, cwd: string, env: any = {}) {
        if (this.activeRunners.has(id)) {
            throw new Error(`Server ${id} is already running.`);
        }
        
        // --- PORT PROTECTION ENGINE ---
        const port = env.SERVER_PORT;
        if (port) {
            console.log(`[ProcessManager] Integrity Check: Verifying port ${port} availability...`);
            const killed = await this.killProcessOnPort(port);
            if (killed) {
                console.warn(`[ProcessManager] Ghost process detected on port ${port}. Forcefully purged.`);
                await new Promise(r => setTimeout(r, 1000)); // Grace period for OS to release handle
            }
        }
        
        const engine = env.executionEngine || 'native';
        const runner = runnerFactory.getRunner(engine);
        
        this.stoppingServers.delete(id);
        this.startupLocks.add(id);
        console.log(`[ProcessManager] Initializing server ${id} using ${engine} engine.`);

        // Setup Event Handlers for this specific server/runner combo
        const logHandler = (data: { id: string, line: string, type: 'stdout' | 'stderr' }) => {
            if (data.id !== id) return;
            this.handleServerLog(id, data.line, data.type);
        };

        const closeHandler = (data: { id: string, code: number }) => {
            if (data.id !== id) return;
            this.handleServerClose(id, data.code);
            runner.off('log', logHandler);
            runner.off('close', closeHandler);
        };

        runner.on('log', logHandler);
        runner.on('close', closeHandler);

        await runner.start(id, runCommand, cwd, env);
        
        this.activeRunners.set(id, runner);
        this.startTimes.set(id, Date.now());
        this.statusCache.set(id, { online: false, status: 'STARTING', players: 0, playerList: [], uptime: 0, tps: "0.00" });
        this.logHistory.set(id, []);
        this.players.set(id, new Set());

        this.maybeEmitStatus(id, 'STARTING');

        // Startup Timeout Watchdog
        setTimeout(() => {
            if (this.startupLocks.has(id)) {
                console.error(`[ProcessManager] ${id} Startup timed out.`);
                this.startupLocks.delete(id);
                this.maybeEmitStatus(id, 'OFFLINE');
            }
        }, 180000);
    }

    private handleServerLog(id: string, line: string, type: 'stdout' | 'stderr') {
        const history = this.logHistory.get(id) || [];
        history.push(line);
        if (history.length > this.MAX_LOGS) history.shift();
        this.logHistory.set(id, history);
        
        this.emit('log', { id, line, type });

        if (this.startupLocks.has(id)) {
            if (line.includes('Done (') || line.includes('Listening on')) {
                this.startupLocks.delete(id);
                this.updateCachedStatus(id, { online: true, status: 'ONLINE' });
            }
        }

        // Player Tracking (Unified & Software-Aware)
        let joinName: string | null = null;
        let leaveName: string | null = null;

        // 1. Bedrock Patterns (Explicit markers)
        const bJoin = line.match(/Player connected: ([\w\d_ \(\)]{3,24})(?:\s*,\s*xuid:)/i);
        const bLeave = line.match(/Player disconnected: ([\w\d_ \(\)]{3,24})(?:\s*,\s*xuid:)/i);
        
        if (bJoin) joinName = bJoin[1].trim();
        if (bLeave) leaveName = bLeave[1].trim();

        // 2. Java Patterns (Suffix markers)
        if (!joinName && !leaveName) {
            const jJoin = line.match(/(?:\[.*\]:\s+|:\s+|^)([\w\d_]{3,16})\s+joined the game/i);
            const jLeave = line.match(/(?:\[.*\]:\s+|:\s+|^)([\w\d_]{3,16})\s+left the game/i);
            if (jJoin) joinName = jJoin[1].trim();
            if (jLeave) leaveName = jLeave[1].trim();
        }

        if (joinName) {
            const set = this.players.get(id) || new Set();
            set.add(joinName);
            this.players.set(id, set);
            this.updateCachedStatus(id, { players: set.size, playerList: Array.from(set) });
            this.emit('player:join', { serverId: id, name: joinName, onlinePlayers: set.size });
        }
        
        if (leaveName) {
            const set = this.players.get(id);
            if (set) {
                set.delete(leaveName);
                this.updateCachedStatus(id, { players: set.size, playerList: Array.from(set) });
                this.emit('player:leave', { serverId: id, name: leaveName, onlinePlayers: set.size });
            }
        }
    }

    private handleServerClose(id: string, code: number) {
        console.log(`[ProcessManager] Server ${id} closed with code ${code}`);
        this.startupLocks.delete(id);

        const isIntentional = this.stoppingServers.has(id);
        const finalStatus = (!isIntentional && code !== 0 && code !== null) ? 'CRASHED' : 'OFFLINE';

        this.stoppingServers.delete(id);
        this.activeRunners.delete(id);
        this.startTimes.delete(id);
        this.statusCache.delete(id);

        const { getServer, saveServer } = require('../servers/ServerService');
        const server = getServer(id);
        if (server) {
            delete server.startTime;
            server.status = finalStatus;
            saveServer(server);
        }

        this.maybeEmitStatus(id, finalStatus);
    }

    async stopServer(id: string, force: boolean = false) {
        const runner = this.activeRunners.get(id);
        if (runner) {
            if (this.startupLocks.has(id) && !force) {
                throw new Error('Server is initializing. Use force stop if necessary.');
            }
            this.stoppingServers.add(id);

            if (force) {
                await runner.kill?.(id, 'SIGKILL');
                return;
            }

            // Normal Stop: Try stdin first
            await runner.stop(id, false);

            // Bedrock-Specific Smart Shutdown Orchestration
            const { getServer } = require('../servers/ServerService');
            const server = getServer(id);
            if (server?.software === 'Bedrock' && runner.kill) {
                // Wait 10s for stdin 'stop' to work
                setTimeout(async () => {
                    if (this.activeRunners.get(id) === runner) {
                        console.log(`[ProcessManager] ${id} (Bedrock) did not stop via stdin. Escalating to SIGINT...`);
                        await runner.kill?.(id, 'SIGINT');

                        // Wait another 10s for SIGINT
                        setTimeout(async () => {
                            if (this.activeRunners.get(id) === runner) {
                                console.log(`[ProcessManager] ${id} (Bedrock) still alive after SIGINT. Force killing...`);
                                await runner.kill?.(id, 'SIGKILL');
                            }
                        }, 10000);
                    }
                }, 10000);
            }
        }
    }

    async waitForClose(id: string, timeoutMs: number = 30000): Promise<boolean> {
        if (!this.activeRunners.has(id)) return true;
        const start = Date.now();
        while (this.activeRunners.has(id) && Date.now() - start < timeoutMs) {
            await new Promise(r => setTimeout(r, 500));
        }
        return !this.activeRunners.has(id);
    }

    killServer(id: string) {
        this.stopServer(id, true);
    }

    sendCommand(id: string, command: string) {
        const runner = this.activeRunners.get(id);
        if (runner) runner.sendCommand(id, command);
    }

    isRunning(id: string): boolean {
        return this.activeRunners.has(id);
    }

    getLogs(id: string): string[] {
        return this.logHistory.get(id) || [];
    }

    getUptime(id: string): number {
        let startTime = this.startTimes.get(id);
        if (!startTime) {
            const { getServer } = require('../servers/ServerService');
            const server = getServer(id);
            if (server && server.startTime) startTime = server.startTime;
        }
        if (!startTime || (!this.isRunning(id) && !this.statusCache.get(id)?.online)) return 0;
        return Math.floor((Date.now() - startTime) / 1000);
    }

    getTPS(id: string): string {
        const { getServer } = require('../servers/ServerService');
        const server = getServer(id);
        if (server?.software === 'Bedrock') return "N/A";

        const logs = this.logHistory.get(id) || [];
        for (let i = logs.length - 1; i >= Math.max(0, logs.length - 50); i--) {
            const line = logs[i];
            const match = line.match(/TPS from last [\d\w\s]+: ([\d\.]+)/i) || line.match(/TPS: ([\d\.]+)/i);
            if (match) return parseFloat(match[1]).toFixed(2);
        }
        return this.statusCache.get(id)?.online ? "20.00" : "0.00"; 
    }

    updateCachedStatus(id: string, data: any) {
        const current = this.statusCache.get(id) || {};
        
        // --- SMART PLAYER MERGE ---
        if (data.playerList) {
            const currentList: string[] = current.playerList || [];
            const newList: string[] = data.playerList;
            
            // If the new list is empty but we have current players, keep the current ones (Logs are more reliable)
            if (newList.length === 0 && currentList.length > 0 && data.players > 0) {
                 // The query said players are online but didn't give names. Trust our existing list.
                 data.playerList = currentList;
            } else if (newList.length > 0) {
                // If the new list contains generic names like "Anonymous Player" or "Unknown", 
                // and we already have real names, try to preserve them.
                const hasGeneric = newList.some(n => n.toLowerCase().includes('anonymous') || n.toLowerCase().includes('unknown'));
                if (hasGeneric && currentList.length > 0) {
                    // Combine lists and take unique, preferring non-generic
                    const combined = new Set([...currentList, ...newList]);
                    data.playerList = Array.from(combined).filter(name => {
                        const isGeneric = name.toLowerCase().includes('anonymous') || name.toLowerCase().includes('unknown');
                        // Only keep generic if we have nothing else
                        return !isGeneric || combined.size === 1;
                    });
                }
            }
        }

        if (data.online && current.status === 'STARTING') {
            data.status = 'ONLINE';
            this.startupLocks.delete(id);
        }
        if (data.status) this.maybeEmitStatus(id, data.status);
        this.statusCache.set(id, { ...current, ...data, lastUpdate: Date.now() });
    }

    getCachedStatus(id: string) {
        return this.statusCache.get(id) || {
            online: false, players: 0, playerList: [], uptime: this.getUptime(id), tps: this.getTPS(id)
        };
    }

    isUpdatingStatus(id: string): boolean {
        return this.updatingStatuses.has(id);
    }

    setUpdatingStatus(id: string, updating: boolean) {
        if (updating) this.updatingStatuses.add(id);
        else this.updatingStatuses.delete(id);
    }

    async getServerStats(id: string) {
        const runner = this.activeRunners.get(id);
        if (!runner) return { cpu: 0, memory: 0 };
        return runner.getStats(id);
    }

    async killProcessOnPort(port: number): Promise<boolean> {
        return NetUtils.killProcessOnPort(port);
    }

    private maybeEmitStatus(id: string, status: string) {
        if (this.lastEmittedStatus.get(id) === status) return;
        this.lastEmittedStatus.set(id, status);
        this.emit('status', { id, status });
    }
}

export const processManager = new ProcessManager();
