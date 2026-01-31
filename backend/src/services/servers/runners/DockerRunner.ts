import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import { IServerRunner, RunnerStats } from './IServerRunner';
import util from 'util';
import os from 'os';

const execAsync = util.promisify(exec);

export class DockerRunner extends EventEmitter implements IServerRunner {
    private containers: Map<string, string> = new Map(); // serverId -> containerName/Id
    private cpuHistory: Map<string, number> = new Map(); // serverId -> lastCpuValue
    private readonly CPU_CORES = os.cpus().length;
    private readonly SMOOTHING_FACTOR = 0.3; // EMA factor (lower = smoother)

    async start(id: string, runCommand: string, cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
        const containerName = `craftcommand-server-${id}`;
        
        // 1. Verify Docker Daemon is accessible
        try {
            await execAsync('docker ps');
        } catch (e) {
            throw new Error('Docker Daemon is unreachable. Please ensure Docker Desktop is running.');
        }

        const image = env.dockerImage || env.DOCKER_IMAGE || 'eclipse-temurin:17-jre'; 
        console.log(`[DockerRunner] Pulling image ${image} (if missing)...`);
        
        try {
            await execAsync(`docker pull ${image}`);
        } catch (e) {
            console.warn(`[DockerRunner] Pull failed or image local: ${e.message}`);
        }

        console.log(`[DockerRunner] Starting container ${containerName} for ${id}...`);

        // 2. Ensure previous container is gone
        try {
            await execAsync(`docker rm -f ${containerName}`);
        } catch (e) {}

        // 3. Build Docker Run Command
        const port = env.SERVER_PORT || '25565';
        
        // Use -i for stdin support without -t (prevent TTY issues in logs)
        const dockerCmd = `docker run --name ${containerName} -v "${cwd}":/data -w /data -p ${port}:${port} -i ${image} ${runCommand}`;

        const child = spawn(dockerCmd, {
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.containers.set(id, containerName);
        
        // Store child to allow direct stdin writing if needed
        // (Will be attached to a more complex session manager in Phase 2)

        child.stdout?.on('data', (data) => this.emit('log', { id, line: data.toString(), type: 'stdout' }));
        child.stderr?.on('data', (data) => this.emit('log', { id, line: data.toString(), type: 'stderr' }));

        child.on('error', (err) => {
            console.error(`[DockerRunner:${id}] Child process error:`, err);
            this.emit('close', { id, code: 1, error: err.message });
        });

        child.on('close', (code) => {
            this.containers.delete(id);
            this.cpuHistory.delete(id);
            this.emit('close', { id, code });
        });
    }

    async stop(id: string, force: boolean = false): Promise<void> {
        const containerName = this.containers.get(id);
        if (containerName) {
            try {
                if (force) {
                    await execAsync(`docker kill ${containerName}`);
                } else {
                    // Minecraft servers appreciate a "stop" command, but docker stop sends SIGTERM
                    // which most modern jars handle gracefully.
                    await execAsync(`docker stop -t 30 ${containerName}`);
                }
            } catch (e) {
                console.error(`[DockerRunner:${id}] Stop failed:`, e.message);
                // Last resort kill
                await execAsync(`docker rm -f ${containerName}`).catch(() => {});
            }
        }
    }

    async sendCommand(id: string, command: string): Promise<void> {
        const containerName = this.containers.get(id);
        if (containerName) {
            try {
                // More robust way to pipe into interactive container
                // We use sh -c to ensure the command is sent correctly to the process's stdin
                await execAsync(`echo "${command}" | docker exec -i ${containerName} sh -c "cat >> /proc/1/fd/0"`);
            } catch (e) {
                console.warn(`[DockerRunner:${id}] Direct FD injection failed, trying standard exec: ${e.message}`);
                // Fallback for non-sh images
                await execAsync(`docker exec -i ${containerName} ${command}`).catch(err => {
                    console.error(`[DockerRunner:${id}] SendCommand failed completely.`);
                });
            }
        }
    }

    async getStats(id: string): Promise<RunnerStats> {
        const containerName = this.containers.get(id);
        if (!containerName) return { cpu: 0, memory: 0 };

        try {
            const { stdout } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemUsage}}"`);
            const [cpu, mem] = stdout.split(',');
            
            // 1. Parse CPU (e.g., "0.50%")
            let cpuVal = parseFloat(cpu.replace('%', ''));

            // 2. Normalize CPU by core count (docker stats returns sum of all cores)
            // This brings 500% down to ~41% on 12 cores.
            cpuVal = cpuVal / this.CPU_CORES;

            // 3. Apply Smoothing (Exponential Moving Average)
            const lastCpu = this.cpuHistory.get(id) || cpuVal;
            const smoothedCpu = (cpuVal * this.SMOOTHING_FACTOR) + (lastCpu * (1 - this.SMOOTHING_FACTOR));
            this.cpuHistory.set(id, smoothedCpu);

            // 4. Parse Memory Usage (e.g., "1.2MiB / 4GiB")
            const memPart = mem.split('/')[0].trim().toLowerCase();
            let memVal = parseFloat(memPart);
            
            if (memPart.includes('g')) { // Handles GiB, GB, g
                memVal *= 1024;
            } else if (memPart.includes('k')) { // Handles KiB, kB, k
                memVal /= 1024;
            } else if (memPart.includes('b') && !memPart.includes('m')) {
                // Raw bytes (B), not MB or MiB
                memVal /= (1024 * 1024);
            }
            // Default is MiB/MB

            return {
                cpu: parseFloat(smoothedCpu.toFixed(2)),
                memory: memVal,
                containerId: containerName
            };
        } catch (e) {
            return { cpu: 0, memory: 0 };
        }
    }

    isRunning(id: string): boolean {
        return this.containers.has(id);
    }
}
