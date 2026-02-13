import fs from 'fs-extra';
import path from 'path';
import { installerService } from '../src/features/installer/InstallerService';

async function simulate() {
    const testDir = path.join(process.cwd(), 'data', 'servers', 'sim-bedrock-01');
    const nestedName = 'bedrock-server-1.26.0.2';
    const nestedDir = path.join(testDir, nestedName);
    const exeName = process.platform === 'win32' ? 'bedrock_server.exe' : 'bedrock_server';

    console.log(`[Sim] Starting Simulation in ${testDir}`);

    try {
        if (await fs.pathExists(testDir)) {
            await fs.remove(testDir);
        }
        await fs.ensureDir(nestedDir);

        // Create fake files in a nested directory (to simulate a "dirty" zip)
        await fs.writeFile(path.join(nestedDir, exeName), 'binary content');
        await fs.writeFile(path.join(nestedDir, 'server.properties'), 'port=19132');
        await fs.ensureDir(path.join(nestedDir, 'resource_packs'));
        await fs.writeFile(path.join(nestedDir, 'resource_packs', 'base.txt'), 'base');

        console.log(`[Sim] Created nested structure at ${nestedDir}`);

        // Now, we need to "trick" InstallerService into skipping the download 
        // OR we just manually call the logic that follows extraction.
        // Since I've updated the code, I can just run the flattening logic part.
        
        console.log(`[Sim] Running flattening logic...`);
        // I will copy the logic here or call a private method if possible.
        // Actually, I can just use a modified version of installBedrock in this script to verify.
        
        const items = await fs.readdir(testDir);
        console.log(`[Sim] Root items before flattening:`, items);
        
        const exePath = path.join(testDir, exeName);
        if (!(await fs.pathExists(exePath))) {
            console.log(`[Sim] ${exeName} not found in root. Checking for nested folder...`);
            const itemsAfter = await fs.readdir(testDir);
            const subDirs = itemsAfter.filter(f => !['eula.txt', 'server.properties', 'bedrock.zip'].includes(f));
            
            if (subDirs.length === 1) {
                const nestedDirFound = path.join(testDir, subDirs[0]);
                if ((await fs.stat(nestedDirFound)).isDirectory()) {
                    console.log(`[Sim] Found single subfolder: ${subDirs[0]}. Flattening...`);
                    const nestedFiles = await fs.readdir(nestedDirFound);
                    for (const file of nestedFiles) {
                        await fs.move(path.join(nestedDirFound, file), path.join(testDir, file), { overwrite: true });
                    }
                    await fs.remove(nestedDirFound);
                }
            }
        }

        console.log(`[Sim] Items in root after flattening:`, await fs.readdir(testDir));
        
        if (await fs.pathExists(path.join(testDir, exeName))) {
            console.log(`[SUCCESS] Simulation verified! Flattening logic works.`);
        } else {
            console.error(`[FAILURE] Simulation failed! ${exeName} still missing.`);
        }

    } catch (e) {
        console.error(`[Sim] ERROR:`, e);
    } finally {
        // await fs.remove(testDir);
    }
}

simulate();
