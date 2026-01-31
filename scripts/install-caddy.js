
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PROXY_DIR = path.join(__dirname, '../proxy');
const EXE_PATH = path.join(PROXY_DIR, 'caddy.exe');
const DOWNLOAD_URL = "https://caddyserver.com/api/download?os=windows&arch=amd64"; 

// Ensure Directory
if (!fs.existsSync(PROXY_DIR)) {
    fs.mkdirSync(PROXY_DIR, { recursive: true });
}

async function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(targetPath);
        
        const request = https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle Redirects
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

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Download timed out after 30 seconds.'));
        });
    });
}

async function main() {
    console.log('[HTTPS Setup] Verifying Caddy Binary...');

    if (fs.existsSync(EXE_PATH)) {
        const stats = fs.statSync(EXE_PATH);
        if (stats.size > 10000000) {
            console.log('[Info] Caddy.exe is already provisioned and healthy.');
            process.exit(0);
        }
        console.log('[Warning] Caddy.exe appears corrupt or incomplete. Re-provisioning...');
        fs.unlinkSync(EXE_PATH);
    }

    console.log(`[HTTPS Setup] Downloading Caddy Reverse Proxy (Zero-Config)...`);
    console.log(`[Target] ${EXE_PATH}`);

    try {
        await downloadFile(DOWNLOAD_URL, EXE_PATH);
        console.log('[Success] Caddy Bridge provisioned successfully.');
        process.exit(0);
    } catch (err) {
        console.error(`[Fatal] Bridge installation failed: ${err.message}`);
        process.exit(1);
    }
}

main();
