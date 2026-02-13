import fs from 'fs-extra';
import path from 'path';
import { installerService } from '../src/features/installer/InstallerService';

async function reproduce() {
    const testDir = path.join(__dirname, 'test_bedrock_install');
    const version = '1.21.11.01'; // Use a known version
    const isWin = process.platform === 'win32';
    const exeName = isWin ? 'bedrock_server.exe' : 'bedrock_server';

    console.log(`[Repro] Starting reproduction in ${testDir}`);
    console.log(`[Repro] Platform: ${process.platform}, Expected EXE: ${exeName}`);

    try {
        if (await fs.pathExists(testDir)) {
            await fs.remove(testDir);
        }
        await fs.ensureDir(testDir);

        console.log(`[Repro] Installing Bedrock ${version}...`);
        await installerService.installBedrock(testDir, version);

        console.log(`[Repro] Installation complete. Listing files:`);
        const files = await fs.readdir(testDir);
        console.log(files.join(', '));

        const exePath = path.join(testDir, exeName);
        if (await fs.pathExists(exePath)) {
            console.log(`[SUCCESS] Found ${exeName}!`);
        } else {
            console.error(`[FAILURE] ${exeName} IS MISSING!`);
            
            // Check for subdirectories
            for (const file of files) {
                const fullPath = path.join(testDir, file);
                if ((await fs.stat(fullPath)).isDirectory()) {
                    const subFiles = await fs.readdir(fullPath);
                    console.log(`[Repro] Content of subfolder '${file}':`, subFiles.join(', '));
                    if (subFiles.includes(exeName)) {
                        console.log(`[Repro] Found EXE in subfolder! This confirms a nesting issue.`);
                    }
                }
            }
        }

    } catch (e) {
        console.error(`[Repro] ERROR:`, e);
    } finally {
        console.log(`[Repro] Cleanup...`);
        // await fs.remove(testDir);
    }
}

reproduce();
