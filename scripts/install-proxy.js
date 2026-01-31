
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PROXY_DIR = path.join(__dirname, '../proxy');
const EXE_PATH = path.join(PROXY_DIR, 'playit.exe');
const DOWNLOAD_URL = "https://github.com/playit-cloud/playit-agent/releases/download/v0.17.1/playit-windows-x86_64-signed.exe"; 

// Ensure Directory
if (!fs.existsSync(PROXY_DIR)) {
    fs.mkdirSync(PROXY_DIR, { recursive: true });
}

async function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(targetPath);
        
        const request = https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle Redirects (GitHub always redirects releases)
                file.close();
                downloadFile(response.headers.location, targetPath).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Download Failed. Status: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });
        });

        request.on('error', (err) => {
            fs.unlink(targetPath, () => {});
            reject(err);
        });

        request.setTimeout(45000, () => {
            request.destroy();
            reject(new Error('Download timed out after 45 seconds.'));
        });
    });
}

async function main() {
    console.log('[Proxy Setup] Verifying Playit Agent...');

    if (fs.existsSync(EXE_PATH)) {
        const stats = fs.statSync(EXE_PATH);
        // Playit signed is ~15MB
        if (stats.size > 14000000) {
            console.log('[Info] Playit.exe is already provisioned and healthy.');
            process.exit(0);
        }
        console.log('[Warning] Playit.exe appears corrupt or truncated. Re-provisioning...');
        fs.unlinkSync(EXE_PATH);
    }

    console.log(`[Proxy Setup] Downloading Playit.gg Agent (Zero-Config)...`);
    console.log(`[Source] github.com/playit-cloud/playit-agent`);

    try {
        await downloadFile(DOWNLOAD_URL, EXE_PATH);
        console.log('[Success] Playit.gg Agent provisioned successfully.');
        process.exit(0);
    } catch (err) {
        console.error(`[Fatal] Agent installation failed: ${err.message}`);
        process.exit(1);
    }
}

main();
