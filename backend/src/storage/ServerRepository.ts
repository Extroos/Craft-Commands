import { StorageProvider } from './StorageProvider';
import { StorageFactory } from './StorageFactory';
import { ServerConfig } from '../../../shared/types';
// import { systemSettingsService } from '../services/system/SystemSettingsService'; // No longer needed directly here

export class ServerRepository implements StorageProvider<ServerConfig> {
    private provider: StorageProvider<ServerConfig>;

    constructor() {
        this.provider = StorageFactory.get<ServerConfig>('servers');
        this.init(); // Auto-initialize for SQLite migration/tables
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
