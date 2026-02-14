
import path from 'path';
import fs from 'fs-extra';
import { serverRepository } from '../../storage/ServerRepository';
import { pluginRepository } from '../../storage/PluginRepository';
import { getTargetDir } from './MarketplaceRegistry';
import { logger } from '../../utils/logger';

export interface ConfigFileInfo {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
}

export class PluginConfigService {
    /**
     * List files in a plugin's data directory.
     */
    async listFiles(serverId: string, pluginId: string, subPath: string = ''): Promise<ConfigFileInfo[]> {
        const { targetDir } = await this.getPluginDataDir(serverId, pluginId);
        const fullPath = path.join(targetDir, subPath);

        if (!(await fs.pathExists(fullPath))) {
            return [];
        }

        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        
        return Promise.all(entries.map(async (entry) => {
            const entryPath = path.join(fullPath, entry.name);
            const stats = await fs.stat(entryPath);
            
            return {
                name: entry.name,
                path: path.join(subPath, entry.name),
                isDirectory: entry.isDirectory(),
                size: stats.size
            };
        }));
    }

    /**
     * Read a configuration file.
     */
    async readFile(serverId: string, pluginId: string, filePath: string): Promise<string> {
        const { targetDir } = await this.getPluginDataDir(serverId, pluginId);
        const fullPath = path.join(targetDir, filePath);

        // Security: Prevent path traversal
        if (!fullPath.startsWith(targetDir)) {
            throw new Error('Access denied: Path traversal detected');
        }

        if (!(await fs.pathExists(fullPath))) {
            throw new Error('File not found');
        }

        return fs.readFile(fullPath, 'utf8');
    }

    /**
     * Write a configuration file.
     */
    async saveFile(serverId: string, pluginId: string, filePath: string, content: string): Promise<void> {
        const { targetDir } = await this.getPluginDataDir(serverId, pluginId);
        const fullPath = path.join(targetDir, filePath);

        // Security: Prevent path traversal
        if (!fullPath.startsWith(targetDir)) {
            throw new Error('Access denied: Path traversal detected');
        }

        // Basic YAML validation if applicable
        if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
            try {
                // We don't have a YAML parser handy here, but we could add one.
                // For now, we'll just check if it's "reasonably" valid (non-empty)
                if (!content.trim()) throw new Error('Empty YAML content');
            } catch (err: any) {
                throw new Error(`YAML Validation failed: ${err.message}`);
            }
        }

        await fs.writeFile(fullPath, content, 'utf8');
        logger.info(`[PluginConfigService] Saved ${filePath} for plugin ${pluginId} on server ${serverId}`);
    }

    /**
     * Helper to resolve the data directory for a plugin.
     */
    private async getPluginDataDir(serverId: string, pluginId: string): Promise<{ targetDir: string }> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');

        const plugin = pluginRepository.findById(pluginId);
        if (!plugin || plugin.serverId !== serverId) {
            throw new Error('Plugin not found');
        }

        // Data folder is usually the name of the JAR without .jar
        const dataFolderName = plugin.fileName.replace(/\.jar(\.disabled)?$/, '');
        const targetDir = path.join(server.workingDirectory, getTargetDir(server.software), dataFolderName);

        return { targetDir };
    }
}

export const pluginConfigService = new PluginConfigService();
