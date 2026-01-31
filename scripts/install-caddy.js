
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PROXY_DIR = path.join(__dirname, '../proxy');
const EXE_PATH = path.join(PROXY_DIR, 'caddy.exe');
// Latest stable download for Windows amd64
const DOWNLOAD_URL = "https://caddyserver.com/api/download?os=windows&arch=amd64"; 

// Ensure Directory
if (!fs.existsSync(PROXY_DIR)) {
    fs.mkdirSync(PROXY_DIR, { recursive: true });
}

console.log('[HTTPS Setup] Verifying Caddy Binary...');

if (fs.existsSync(EXE_PATH)) {
    const stats = fs.statSync(EXE_PATH);
    if (stats.size > 10000000) {
        console.log('[Info] Caddy.exe is already provisioned.');
        process.exit(0);
    }
    console.log('[Warning] Caddy.exe appears corrupt. Re-downloading...');
    fs.unlinkSync(EXE_PATH);
}

console.log(`[HTTPS Setup] Downloading Caddy Reverse Proxy...`);
console.log(`[Target] ${EXE_PATH}`);

const file = fs.createWriteStream(EXE_PATH);

https.get(DOWNLOAD_URL, (response) => {
    if (response.statusCode !== 200) {
        console.error(`[Error] Download Failed. Status: ${response.statusCode}`);
        process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('[Success] Caddy Bridge provisioned successfully.');
        process.exit(0);
    });
}).on('error', (err) => {
    fs.unlink(EXE_PATH, () => {});
    console.error(`[Fatal] Network Error: ${err.message}`);
    process.exit(1);
});
