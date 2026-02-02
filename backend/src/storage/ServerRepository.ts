import { StorageProvider } from './StorageProvider';
import { GenericJsonProvider } from './JsonRepository';
import { SqliteProvider } from './SqliteProvider';
import { ServerConfig } from '../../../shared/types';
import { systemSettingsService } from '../services/system/SystemSettingsService';

export class ServerRepository implements StorageProvider<ServerConfig> {
    private provider: StorageProvider<ServerConfig>;

    constructor() {
        const settings = systemSettingsService.getSettings();
        // Check for provider setting, default to JSON if not present or 'json'
        // We might need to add 'storageProvider' to SystemSettings first, or read generic 'app' config.
        // For now, let's look for a flag or default to JSON.
        const useSqlite = (settings.app as any).storageProvider === 'sqlite';

        if (useSqlite) {
            console.log('[ServerRepository] Using SQLite Storage');
            this.provider = new SqliteProvider<ServerConfig>('servers.db', 'servers', 'servers.json');
        } else {
            console.log('[ServerRepository] Using JSON Storage');
            this.provider = new GenericJsonProvider<ServerConfig>('servers.json');
        }
    }

    init() { return this.provider.init(); }
    
    public findAll(): ServerConfig[] {
        const data = this.provider.findAll();
        return data.map(s => this.sanitizeServerConfig(s));
    }

    public findById(id: string): ServerConfig | undefined {
        const item = this.provider.findById(id);
        if (!item) return undefined;
        return this.sanitizeServerConfig(item);
    }

    findOne(criteria: Partial<ServerConfig>) { 
        const item = this.provider.findOne(criteria); 
        if (!item) return undefined;
        return this.sanitizeServerConfig(item);
    }

    create(item: ServerConfig) { 
        const sanitized = this.sanitizeServerConfig(item);
        return this.provider.create(sanitized); 
    }

    update(id: string, updates: Partial<ServerConfig>) { 
        return this.provider.update(id, updates); 
    }

    delete(id: string) { return this.provider.delete(id); }

    /**
     * Data Healing Layer (v1.7.11)
     * Automatically repairs missing or corrupted field defaults.
     */
    private sanitizeServerConfig(server: ServerConfig): ServerConfig {
        const sanitized = { ...server };

        // 1. Executable Fallback
        if (!sanitized.executable || sanitized.executable === 'undefined' || sanitized.executable === 'null') {
            sanitized.executable = 'server.jar';
        }

        // 2. Resource Defaults
        if (sanitized.ram === undefined || sanitized.ram === null || isNaN(sanitized.ram)) {
            sanitized.ram = 4;
        }

        // 3. Command Regeneration (If missing or empty)
        if (!sanitized.executionCommand || sanitized.executionCommand.trim().length === 0) {
            sanitized.executionCommand = `java -Xmx${sanitized.ram}G -jar ${sanitized.executable} nogui`;
        }

        // 4. Critical Navigation Fields
        if (!sanitized.workingDirectory) {
            sanitized.workingDirectory = `C:/servers/${sanitized.id}`;
        }

        return sanitized;
    }

    // Specific queries
    public findByPort(port: number): ServerConfig | undefined {
        return this.findOne({ port });
    }
}

export const serverRepository = new ServerRepository();
