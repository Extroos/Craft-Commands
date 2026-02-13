import { installerService } from '../src/features/installer/InstallerService';

async function testFetch() {
    console.log('[Test] Fetching Bedrock versions...');
    try {
        const result = await installerService.fetchBedrockVersions();
        console.log('[Test] Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('[Test] Fetch failed:', e);
    }
}

testFetch();
