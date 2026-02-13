import { StorageProvider } from './StorageProvider';
import { GenericJsonProvider } from './JsonRepository';
import { SqliteProvider } from './SqliteProvider';
import { systemSettingsService } from '../features/system/SystemSettingsService';
import path from 'path';

export class StorageFactory {
    
    /**
     * Creates a storage provider based on global system settings.
     * @param name The base name for the storage (e.g., 'servers', 'users').
     * @param tableName Optional override for SQL table name. Defaults to `name`.
     * @returns A StorageProvider instance.
     */
    public static get<T extends { id: string }>(name: string, tableName?: string): StorageProvider<T> {
        // We need to defer accessing settings until runtime to ensure config is loaded
        const settings = systemSettingsService.getSettings();
        const providerType = settings.app.storageProvider || 'json';
        
        const finalTableName = tableName || name;
        const jsonFileName = `${name}.json`;
        const dbFileName = `${name}.db`; // Or we could use a single 'data.db'

        if (providerType === 'sqlite') {
            console.log(`[StorageFactory] Creating SQLite provider for ${name}`);
            // We use a shared DB file 'storage.db' for all entities usually, or separate DBs?
            // The existing SqliteProvider takes a filename.
            // Let's use a single 'craftcommand.db' for everything if we want, or keeping separate is fine too.
            // Given the existing pattern in ServerRepository was 'servers.db', let's stick to separate DBs for now to minimize risk,
            // OR better, use a single 'data.db' for all to allow joins later?
            // "servers.db" implies separate. Let's stick to separate or name-based for safety.
            
            // However, SqliteProvider implementation:
            // constructor(fileName: string, tableName: string = 'store', private migrationJsonPath?: string)
            
            // Should we use one big DB? 
            // If I use 'data.db' for all, I pass 'data.db' as filename.
            // Let's try to unify into 'system.db' for non-blob data.
            // But to avoid breaking existing 'servers.db' manually created in ServerRep, let's keep using `${name}.db` for now?
            // Actually, for "Enterprise" feel, a single DB file is better.
            // Let's use 'core.db'.
            
            return new SqliteProvider<T>('core.db', finalTableName, jsonFileName);
        } else {
            console.log(`[StorageFactory] Creating JSON provider for ${name}`);
            return new GenericJsonProvider<T>(jsonFileName);
        }
    }
}
