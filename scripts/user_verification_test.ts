import os from 'os';
import net from 'net';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const ROOT_DIR = process.cwd();
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

async function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(800);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, '127.0.0.1');
    });
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const netInterface = interfaces[name];
        if (netInterface) {
            for (const iface of netInterface) {
                if (iface.family === 'IPv4' && !iface.internal) return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

async function runAudit() {
    console.clear();
    console.log("\x1b[36m%s\x1b[0m", "====================================================================");
    console.log("\x1b[36m%s\x1b[0m", "   CRAFTCOMMAND DEEP STABILITY AUDIT - INTEGRATED SYSTEM ANALYSIS");
    console.log("\x1b[36m%s\x1b[0m", "====================================================================");
    console.log("");

    const issues: string[] = [];

    // --- 1. ENVIRONMENT & RESOURCES ---
    console.log("\x1b[37m[1] SYSTEM RESOURCES\x1b[0m");
    const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(1);
    const freeMem = (os.freemem() / (1024 ** 3)).toFixed(1);
    const memUsage = (100 - (os.freemem() / os.totalmem() * 100)).toFixed(0);
    
    console.log(`  - OS: ${os.type()} ${os.release()} (${os.arch()})`);
    console.log(`  - Local IP: ${getLocalIP()}`);
    console.log(`  - RAM: ${freeMem}GB free of ${totalMem}GB [${memUsage}% Used]`);
    
    if (parseInt(memUsage) > 90) issues.push("CRITICAL: RAM usage is very high (>90%). Servers may crash.");
    console.log("");

    // --- 2. DEPENDENCY LAYER AUDIT ---
    console.log("\x1b[37m[2] DEPENDENCY INTEGRITY\x1b[0m");
    const checkNodeModules = (dir: string, label: string) => {
        const exists = fs.existsSync(path.join(dir, 'node_modules'));
        console.log(`  - ${label.padEnd(10)}: [${exists ? '\x1b[32mOK\x1b[0m' : '\x1b[31mMISSING\x1b[0m'}]`);
        if (!exists) issues.push(`ACTION REQUIRED: Run 'npm install' in the ${label.toLowerCase()} folder.`);
    };
    checkNodeModules(ROOT_DIR, "Root");
    checkNodeModules(BACKEND_DIR, "Backend");
    checkNodeModules(FRONTEND_DIR, "Frontend");
    console.log("");

    // --- 3. DATA & DIRECTORY HEALTH ---
    console.log("\x1b[37m[3] DATA & STORAGE HEALTH\x1b[0m");
    const dirsToCheck = [
        { path: path.join(BACKEND_DIR, 'data'), name: "Data Registry" },
        { path: path.join(ROOT_DIR, 'minecraft_servers'), name: "Server Files" },
        { path: path.join(ROOT_DIR, 'uploads'), name: "Uploads Store" }
    ];
    for (const d of dirsToCheck) {
        const exists = fs.existsSync(d.path);
        console.log(`  - ${d.name.padEnd(15)}: [${exists ? '\x1b[32mOK\x1b[0m' : '\x1b[31mMISSING\x1b[0m'}]`);
        if (!exists) issues.push(`WARNING: Directory '${d.name}' is missing. Features may malfunction.`);
    }

    // Server Count Check
    const serversFile = path.join(BACKEND_DIR, 'data', 'servers.json');
    if (fs.existsSync(serversFile)) {
        try {
            const servers = fs.readJsonSync(serversFile);
            console.log(`  - Managed Servers: ${Array.isArray(servers) ? servers.length : 0} configured`);
        } catch (e) {
            console.log("  - Managed Servers: [\x1b[31mDATA CORRUPTED\x1b[0m]");
            issues.push("CRITICAL: servers.json is malformed.");
        }
    }
    console.log("");

    // --- 4. NETWORK & SECURITY ---
    console.log("\x1b[37m[4] NETWORK & PROTOCOL\x1b[0m");
    const ports = [
        { port: 3000, name: "Frontend" },
        { port: 3001, name: "Backend API" }
    ];
    for (const p of ports) {
        const inUse = await checkPort(p.port);
        console.log(`  - Port ${p.port} (${p.name}): [${inUse ? '\x1b[33mACTIVE\x1b[0m' : '\x1b[90mIDLE\x1b[0m'}]`);
    }

    // HTTPS Check
    const settingsFile = path.join(BACKEND_DIR, 'data', 'settings.json');
    if (fs.existsSync(settingsFile)) {
        const settings = fs.readJsonSync(settingsFile);
        const httpsEnabled = settings.app?.https?.enabled;
        console.log(`  - Secure Mode (HTTPS): [${httpsEnabled ? '\x1b[32mENABLED\x1b[0m' : '\x1b[90mDISABLED\x1b[0m'}]`);
        if (httpsEnabled) {
            const keyExists = fs.existsSync(settings.app.https.keyPath);
            const certExists = fs.existsSync(settings.app.https.certPath);
            if (!keyExists || !certExists) issues.push("SECURITY: HTTPS is enabled but certificate files are missing or inaccessible.");
        }
    }
    console.log("");

    // --- SUMMARY ---
    console.log("\x1b[36m%s\x1b[0m", "====================================================================");
    if (issues.length === 0) {
        console.log("\x1b[32m%s\x1b[0m", "   RESULT: SYSTEM IS STABLE");
        console.log("   No critical issues detected.");
    } else {
        console.log("\x1b[33m%s\x1b[0m", `   RESULT: ${issues.length} ISSUE(S) DETECTED`);
        console.log("");
        issues.forEach(msg => console.log(`   [!] ${msg}`));
    }
    console.log("\x1b[36m%s\x1b[0m", "====================================================================");
    console.log("");
    console.log("Press any key to return to menu...");
    
    // Keep open (handled by batch 'pause', but good practice)
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(0));
}

runAudit().catch(e => {
    console.error("Audit failed:", e);
    process.exit(1);
});
