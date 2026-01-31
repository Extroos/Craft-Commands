
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
    reverse_proxy localhost:3000 {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
    }

    # Security Headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}`;

    if (!fs.existsSync(PROXY_DIR)) {
        fs.mkdirSync(PROXY_DIR, { recursive: true });
    }

    fs.writeFileSync(CADDYFILE_PATH, caddyContent);
    updateSettings(true, domain);
    console.log(`[Success] Caddyfile generated for: ${domain}`);
} else if (command === 'disable') {
    updateSettings(false);
    console.log('[Success] HTTPS Bridge disabled in configuration.');
}

function updateSettings(enabled, domain = undefined) {
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            if (!settings.app) settings.app = {};
            if (!settings.app.https) settings.app.https = {};
            
            settings.app.https.enabled = enabled;
            settings.app.https.mode = enabled ? 'bridge' : undefined;
            if (domain) settings.app.https.domain = domain;

            // Also enable remote access if we are using HTTPS
            if (enabled) {
                if (!settings.app.remoteAccess) settings.app.remoteAccess = {};
                settings.app.remoteAccess.enabled = true;
                settings.app.remoteAccess.method = 'direct';
            }

            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4));
        } catch (e) {
            console.error('[Error] Failed to update settings.json:', e.message);
        }
    }
}
