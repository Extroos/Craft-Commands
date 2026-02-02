import net from 'net';
import si from 'systeminformation';
import { logger } from './logger';

export class NetUtils {

    /**
     * Checks if a specific port is currently in use.
     * @param port Although usually an integer, we support strings.
     * @param host Defaults to '127.0.0.1'
     * @returns True if port is busy, False if free.
     */
    static async checkPort(port: number, host = '127.0.0.1'): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(200); // Fast timeout for responsiveness
            socket.on('connect', () => { 
                socket.destroy(); 
                resolve(true); 
            });
            socket.on('error', (err: any) => { 
                socket.destroy(); 
                // ECONNREFUSED means nothing is listening, so it's free.
                // EADDRINUSE (rare on client connect) means it's busy.
                if (err.code === 'ECONNREFUSED') resolve(false);
                else resolve(false); // Assume free on other errors to avoid blocking excessively
            });
            socket.on('timeout', () => { 
                socket.destroy(); 
                resolve(false); // Timeout usually means firewall or free (no ACK)
            });
            socket.connect(port, host);
        });
    }

    /**
     * Advanced check that tries to bind a server to the port.
     * This is more reliable for checking "Can I start a server here?"
     */
    static async checkPortBind(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', (err: any) => {
                if (err.code === 'EADDRINUSE') return resolve(true);
                resolve(false);
            });
            server.once('listening', () => {
                server.close(() => resolve(false));
            });
            server.listen(port);
        });
    }

    /**
     * Attempts to find and kill the process listening on a specific port.
     * SAFELY: Only kills known server processes (java, bedrock, etc).
     * @returns True if a process was found and killed, False otherwise.
     */
    static async killProcessOnPort(port: number): Promise<boolean> {
        try {
            const connections = await si.networkConnections();
            const listener = connections.find(c => (c.localPort === port.toString()) && (c.state === 'LISTEN'));
            
            if (listener && listener.pid) {
                // SAFETY CHECK: What is this process?
                const processes = await si.processes();
                const proc = processes.list.find(p => p.pid === listener.pid);
                
                if (proc) {
                    const name = proc.name.toLowerCase();
                    const cmd = proc.command.toLowerCase();
                    const SAFE_TO_KILL = ['java', 'javaw', 'bedrock_server', 'server', 'screen', 'tmux'];
                    
                    const isSafe = SAFE_TO_KILL.some(safe => name.includes(safe) || cmd.includes(safe));

                    if (!isSafe) {
                        logger.warn(`[NetUtils] Refusing to kill UNKNOWN process '${name}' (PID: ${listener.pid}) on port ${port}.`);
                        return false;
                    }

                    logger.warn(`[NetUtils] Killing ghost process '${name}' (PID: ${listener.pid}) on port ${port}`);
                    process.kill(listener.pid, 'SIGKILL');
                    return true;
                }
            }
        } catch (e) {
            logger.error(`[NetUtils] Failed to kill process on port ${port}: ${e}`);
        }
        return false;
    }

    /**
     * Identifies the name of the process running on a specific port.
     */
    static async identifyProcess(port: number): Promise<string | null> {
        try {
            const connections = await si.networkConnections();
            const listener = connections.find(c => (c.localPort === port.toString()) && (c.state === 'LISTEN'));
            if (listener && listener.pid) {
                const processes = await si.processes();
                const proc = processes.list.find(p => p.pid === listener.pid);
                return proc ? proc.name : null;
            }
        } catch (e) { return null; }
        return null;
    }

    /**
     * Active Health Check: Connects to the port to see if the service is responsive.
     * Different from checkPort (which checks if ANY process holds the port).
     * This checks if the service accepts connections.
     */
    static async checkServiceHealth(port: number, timeout = 2500): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(timeout);
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('error', () => { socket.destroy(); resolve(false); });
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
            socket.connect(port, '127.0.0.1');
        });
    }
}
