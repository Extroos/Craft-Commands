
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROXY_DIR = path.join(__dirname, '../proxy');
const CADDYFILE_PATH = path.join(PROXY_DIR, 'Caddyfile');
const SETTINGS_FILE = path.join(__dirname, '../backend/data/settings.json');
const ENV_FILE = path.join(__dirname, '../.env');

const args = process.argv.slice(2);
const command = args[0];

// Helper to detect ports from .env
function getPorts() {
    let ports = { front: 3000, back: 3001 };
    if (fs.existsSync(ENV_FILE)) {
        try {
            const content = fs.readFileSync(ENV_FILE, 'utf8');
            const frontMatch = content.match(/FRONTEND_PORT=(\d+)/);
            const backMatch = content.match(/BACKEND_PORT=(\d+)/);
            if (frontMatch) ports.front = parseInt(frontMatch[1]);
            if (backMatch) ports.back = parseInt(backMatch[1]);
        } catch (e) {
            console.warn('[Caddy] Failed to parse .env, using default ports.');
        }
    }
    return ports;
}

if (command === 'setup') {
    const domain = args[1] || 'localhost';
    const isLocal = !domain.includes('.') || domain === 'localhost' || domain.endsWith('.local');
    const tlsConfig = isLocal ? '    tls internal' : '';
    const { front, back } = getPorts();

    const caddyContent = `${domain} {
${tlsConfig}

    # API & WebSocket (Direct to Backend)
    handle /api* {
        reverse_proxy 127.0.0.1:${back} {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
        }
    }
    handle /socket.io* {
        reverse_proxy 127.0.0.1:${back} {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
        }
    }

    # Everything else (to Frontend - Vite)
    handle {
        reverse_proxy 127.0.0.1:${front} {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
        }
    }

    # Pro-Grade Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
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
        console.log(`[Success] v1.7.3 Direct-Link Bridge configured for: ${domain}`);
        console.log(`[Routing] UI -> ${front}, API -> ${back}`);
    } catch (err) {
        console.error(`[Fatal] Caddy configuration failed: ${err.message}`);
        process.exit(1);
    }

} else if (command === 'disable') {
    updateSettings(false);
    console.log('[Success] HTTPS Bridge disabled.');
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

            if (enabled) {
                if (!settings.app.remoteAccess) settings.app.remoteAccess = {};
                settings.app.remoteAccess.enabled = true;
                settings.app.remoteAccess.method = 'direct';
            }

            const tempPath = `${SETTINGS_FILE}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(settings, null, 4));
            fs.renameSync(tempPath, SETTINGS_FILE);
        } catch (e) {
            console.error('[Error] Settings update failed:', e.message);
        }
    }
}
