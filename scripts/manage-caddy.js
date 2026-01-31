
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROXY_DIR = path.join(__dirname, '../proxy');
const CADDYFILE_PATH = path.join(PROXY_DIR, 'Caddyfile');
const SETTINGS_FILE = path.join(__dirname, '../backend/data/settings.json');

const args = process.argv.slice(2);
const command = args[0];

if (command === 'setup') {
    const domain = args[1] || 'localhost';
    const isLocal = !domain.includes('.') || domain === 'localhost' || domain.endsWith('.local');
    const tlsConfig = isLocal ? '    tls internal' : '';

    const caddyContent = `${domain} {
${tlsConfig}
    # Secure Proxy for Vite Dev Server & API
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
    }

    # Advanced Security Headers [PRO]
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        # Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: https:;"
    }

    # Optimization
    encode zstd gzip
}`;

    if (!fs.existsSync(PROXY_DIR)) {
        fs.mkdirSync(PROXY_DIR, { recursive: true });
    }

    try {
        fs.writeFileSync(CADDYFILE_PATH, caddyContent);
        updateSettings(true, domain);
        console.log(`[Success] Caddy Bridge configured for: ${domain}`);
        console.log(`[Security] 6 standard HSTS/XSS security headers injected.`);
    } catch (err) {
        console.error(`[Error] Failed to write Caddyfile: ${err.message}`);
        process.exit(1);
    }

} else if (command === 'disable') {
    updateSettings(false);
    console.log('[Success] HTTPS Bridge disabled in configuration.');
}

function updateSettings(enabled, domain = undefined) {
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
            const settings = JSON.parse(content);
            
            if (!settings.app) settings.app = {};
            if (!settings.app.https) settings.app.https = {};
            
            settings.app.https.enabled = enabled;
            settings.app.https.mode = enabled ? 'bridge' : 'native';
            if (domain) settings.app.https.domain = domain;

            // Atomic sync for Remote Access
            if (enabled) {
                if (!settings.app.remoteAccess) settings.app.remoteAccess = {};
                settings.app.remoteAccess.enabled = true;
                settings.app.remoteAccess.method = 'direct';
            }

            const tempPath = `${SETTINGS_FILE}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(settings, null, 4));
            fs.renameSync(tempPath, SETTINGS_FILE);
        } catch (e) {
            console.error('[Error] Atomic update of settings.json failed:', e.message);
        }
    }
}
