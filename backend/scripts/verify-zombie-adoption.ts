import { spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const PANEL_URL = 'http://localhost:3008';
const API_URL = `${PANEL_URL}/api`;
const BACKEND_DIR = path.resolve(__dirname, '..');
const AGENT_DIR = path.resolve(__dirname, '../../agent');
const TEST_NODE_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SECRET = 'e2e-secret-bypass';

async function log(msg: string) {
    console.log(`[Zombie-Test] ${msg}`);
}

async function start() {
    log("🚀 Starting Zombie Adoption Verification...");

    // 1. Setup Backend
    log("  Preparing backend...");
    const bLog = fs.createWriteStream(path.join(__dirname, 'zombie-backend.log'));
    const backend = spawn('npm.cmd', ['run', 'start'], {
        cwd: BACKEND_DIR,
        shell: true,
        env: { ...process.env, BACKEND_PORT: '3008', NODE_ENV: 'test', TS_NODE_CACHE: '0' }
    });
    backend.stdout.pipe(bLog);
    backend.stderr.pipe(bLog);

    await new Promise(r => setTimeout(r, 8000)); // Wait for backend

    // 2. Start Agent
    log("  Starting Node Agent...");
    const agent1 = spawn('npx.cmd', ['ts-node', 'src/index.ts', 
        '--panel-url', PANEL_URL, 
        '--node-id', TEST_NODE_ID, 
        '--secret', TEST_SECRET 
    ], {
        cwd: AGENT_DIR,
        shell: true,
        env: { ...process.env }
    });

    await new Promise(r => setTimeout(r, 5000));

    // 3. Prepare a Zombie Server manually
    const serverId = 'test-server-adoption';
    const serverDir = path.join(AGENT_DIR, 'servers', serverId);
    fs.ensureDirSync(serverDir);

    log("  Starting a persistent mock process (ping)...");
    const mockProc = spawn('ping', ['-t', '127.0.0.1'], {
        cwd: serverDir,
        detached: true,
        stdio: 'ignore'
    });
    mockProc.unref();

    if (mockProc.pid) {
        log(`  Mock process started (PID: ${mockProc.pid}). Writing PID file...`);
        fs.writeFileSync(path.join(serverDir, 'server.pid'), String(mockProc.pid));
    } else {
        throw new Error("Failed to get PID for mock process.");
    }

    // 4. Kill the first agent (if it was even running)
    if (agent1.pid) spawn('taskkill', ['/pid', String(agent1.pid), '/f', '/t']);
    await new Promise(r => setTimeout(r, 2000));

    // 5. Restart Agent
    log("  Restarting Agent...");
    const aLog = fs.createWriteStream(path.join(__dirname, 'zombie-agent.log'));
    const agent2 = spawn('npx.cmd', ['ts-node', 'src/index.ts', 
        '--panel-url', PANEL_URL, 
        '--node-id', TEST_NODE_ID, 
        '--secret', TEST_SECRET 
    ], {
        cwd: AGENT_DIR,
        shell: true,
        env: { ...process.env }
    });
    agent2.stdout.pipe(aLog);
    agent2.stderr.pipe(aLog);

    // 6. Verify Adoption
    log("  Monitoring adoption (polling logs)...");
    let adopted = false;
    const checkInterval = setInterval(() => {
        const content = fs.readFileSync(path.join(__dirname, 'zombie-agent.log'), 'utf8');
        if (content.includes('Adopting existing server')) {
            log("  ✅ SUCCESS: Agent discovered and adopted the zombie!");
            adopted = true;
            clearInterval(checkInterval);
        }
    }, 1000);

    await new Promise(r => setTimeout(r, 15000));

    if (!adopted) {
        log("  ❌ FAILED: Agent did not adopt the zombie.");
    }

    // Cleanup
    log("Cleaning up...");
    if (backend.pid) spawn('taskkill', ['/pid', String(backend.pid), '/f', '/t']);
    if (agent2.pid) spawn('taskkill', ['/pid', String(agent2.pid), '/f', '/t']);
    
    if (adopted) {
        log("🏆 Zombie Adoption Verification Passed!");
        process.exit(0);
    } else {
        process.exit(1);
    }
}

start().catch(e => {
    log(`FATAL: ${e.message}`);
    process.exit(1);
});
