import path from 'path';

export const DATA_DIR = path.join(__dirname, '../data');
export const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');
export const SERVERS_ROOT = path.join(process.cwd(), 'minecraft_servers');
export const JAVA_DIR = path.join(process.cwd(), 'data', 'java');
export const TEMP_UPLOADS_DIR = path.join(process.cwd(), 'data', 'temp_uploads');

export const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
export const BACKGROUNDS_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'backgrounds');

export const DATA_PATHS = {
    DATA_DIR,
    SERVERS_FILE,
    AUDIT_FILE,
    SERVERS_ROOT,
    JAVA_DIR,
    TEMP_UPLOADS_DIR,
    UPLOADS_ROOT,
    BACKGROUNDS_UPLOADS_DIR
};
