
import { processManager } from '../src/features/processes/ProcessManager';

async function testBedrockPlayerTracking() {
    console.log('=== Bedrock Player Tracking Verification ===');

    const serverId = 'test-bedrock-server';
    
    // Initialize mock state
    processManager['statusCache'].set(serverId, { online: true, status: 'ONLINE', players: 0, playerList: [] });
    processManager['players'].set(serverId, new Set());

    const testLogs = [
        '[2024-03-24 12:34:56:789 INFO] Player connected: BedrockTester, xuid: 1234567890123456',
        '[2024-03-24 12:35:00:123 INFO] Player connected: Explorer_User, xuid: 9876543210987654',
        '[2024-03-24 12:40:00:123 INFO] Player disconnected: BedrockTester, xuid: 1234567890123456, reason: user quit'
    ];

    let success = true;

    console.log('\nSTEP 1: Simulating first player join...');
    processManager['handleServerLog'](serverId, testLogs[0], 'stdout');
    let status = processManager.getCachedStatus(serverId);
    console.log(`Players: ${status.players} | List: [${status.playerList.join(', ')}]`);
    if (status.players === 1 && status.playerList.includes('BedrockTester')) {
        console.log('✅ PASS');
    } else {
        console.error('❌ FAIL: Player 1 not detected');
        success = false;
    }

    console.log('\nSTEP 2: Simulating second player join...');
    processManager['handleServerLog'](serverId, testLogs[1], 'stdout');
    status = processManager.getCachedStatus(serverId);
    console.log(`Players: ${status.players} | List: [${status.playerList.join(', ')}]`);
    if (status.players === 2 && status.playerList.includes('Explorer_User')) {
        console.log('✅ PASS');
    } else {
        console.error('❌ FAIL: Player 2 not detected');
        success = false;
    }

    console.log('\nSTEP 3: Simulating first player leave...');
    processManager['handleServerLog'](serverId, testLogs[2], 'stdout');
    status = processManager.getCachedStatus(serverId);
    console.log(`Players: ${status.players} | List: [${status.playerList.join(', ')}]`);
    if (status.players === 1 && !status.playerList.includes('BedrockTester') && status.playerList.includes('Explorer_User')) {
        console.log('✅ PASS');
    } else {
        console.error('❌ FAIL: Player leave not handled correctly');
        success = false;
    }

    console.log('\n=== FINAL RESULT ===');
    if (success) {
        console.log('🚀 BEDROCK PLAYER TRACKING IS FULLY FUNCTIONAL');
        process.exit(0);
    } else {
        console.error('💀 BEDROCK PLAYER TRACKING HAS ISSUES');
        process.exit(1);
    }
}

testBedrockPlayerTracking().catch(err => {
    console.error('Verification crashed:', err);
    process.exit(1);
});
