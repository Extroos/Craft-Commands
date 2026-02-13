import { serverRepository } from '../src/storage/ServerRepository';
import { logger } from '../src/utils/logger';

async function testHealing() {
    console.log('[Test] Starting Bedrock Healing Verification...');
    
    // 1. Simulate an orphaned/misconfigured Bedrock server config (from user's logs)
    const misconfiguredServer: any = {
        id: 'test-bedrock-healing',
        name: 'Healing Test',
        software: 'Bedrock',
        version: '1.26.0.2',
        executable: 'server.jar', // WRONG
        executionCommand: 'server.jar', // WRONG
        workingDirectory: 'C:\\fake\\path'
    };

    console.log('[Test] Initial State:', JSON.stringify({
        software: misconfiguredServer.software,
        executable: misconfiguredServer.executable,
        executionCommand: misconfiguredServer.executionCommand
    }, null, 2));

    // 2. Pass through the repository's sanitization (implicitly called by findAll/findById/create)
    // We'll call the private sanitizeServerConfig if we could, but we'll use findAll output simulation
    const healed = (serverRepository as any).sanitizeServerConfig(misconfiguredServer);

    console.log('[Test] Healed State:', JSON.stringify({
        software: healed.software,
        executable: healed.executable,
        executionCommand: healed.executionCommand
    }, null, 2));

    // 3. Assertions
    const isWin = process.platform === 'win32';
    const expectedExe = isWin ? 'bedrock_server.exe' : 'bedrock_server';
    const expectedCmd = isWin ? expectedExe : `LD_LIBRARY_PATH=. ./${expectedExe}`;

    if (healed.executable === expectedExe && healed.executionCommand === expectedCmd) {
        console.log('\n✅ SUCCESS: Bedrock metadata correctly healed!');
    } else {
        console.error('\n❌ FAILURE: Healing logic did not produce expected results.');
        process.exit(1);
    }
}

testHealing().catch(err => {
    console.error(err);
    process.exit(1);
});
