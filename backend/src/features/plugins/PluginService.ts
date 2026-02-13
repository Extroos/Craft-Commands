import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import {  InstalledPlugin, PluginSource, PluginSearchQuery, PluginSearchResult, PluginUpdateInfo, PluginPlatform  } from '@shared/types';
import { marketplaceRegistry, getTargetDir, supportsPlugins } from './MarketplaceRegistry';
import { installerService } from '../installer/InstallerService';
import { serverRepository } from '../../storage/ServerRepository';
import { pluginRepository } from '../../storage/PluginRepository';
import { logger } from '../../utils/logger';

export class PluginService {

    /**
     * Search the marketplace for plugins compatible with a server's software.
     */
    async search(query: PluginSearchQuery, serverId: string): Promise<PluginSearchResult> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');
        
        if (!supportsPlugins(server.software)) {
            return { plugins: [], total: 0, page: 1, pages: 0 };
        }

        return marketplaceRegistry.search(query, server.software);
    }

    /**
     * Get all installed plugins for a server.
     */
    getInstalled(serverId: string): InstalledPlugin[] {
        return pluginRepository.findByServer(serverId);
    }

    /**
     * Install a plugin from a marketplace source.
     */
    async install(serverId: string, sourceId: string, source: PluginSource): Promise<InstalledPlugin> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');

        if (!supportsPlugins(server.software)) {
            throw new Error(`${server.software} servers do not support plugins.`);
        }

        // Validate working directory
        if (!server.workingDirectory || !(await fs.pathExists(server.workingDirectory))) {
            throw new Error('Server directory does not exist. Please install or configure the server first.');
        }

        // Check if already installed (return existing instead of erroring)
        const existing = pluginRepository.findBySourceId(sourceId, serverId);
        if (existing) {
            logger.warn(`[PluginService] Plugin already installed: ${existing.name}. Returning existing record.`);
            return existing;
        }

        // Resolve download URL with clear error handling
        let downloadInfo;
        try {
            downloadInfo = await marketplaceRegistry.getDownloadUrl(sourceId, source, server.version);
        } catch (err: any) {
            logger.error(`[PluginService] Failed to resolve download URL for ${sourceId} (${source}): ${err.message}`);
            throw new Error(`Could not find a compatible download for this plugin from ${source}. ${err.message}`);
        }

        // Determine target directory
        const targetDir = path.join(server.workingDirectory, getTargetDir(server.software));
        await fs.ensureDir(targetDir);

        const destPath = path.join(targetDir, downloadInfo.fileName);

        // --- Conflict Management (Hardening) ---
        if (await fs.pathExists(destPath)) {
            const existingInDb = pluginRepository.findByFileName(downloadInfo.fileName, serverId);
            if (!existingInDb) {
                const bakPath = `${destPath}.bak_${Date.now()}`;
                logger.warn(`[PluginService] Untracked file conflict at ${destPath}. Moving to ${bakPath}`);
                await fs.move(destPath, bakPath);
            }
        }

        // Download with error recovery — clean up partial file on failure
        logger.info(`[PluginService] Downloading ${downloadInfo.fileName} to ${destPath}...`);
        try {
            await installerService.downloadFile(downloadInfo.url, destPath);
        } catch (err: any) {
            // Clean up partial/corrupted download
            try { await fs.remove(destPath); } catch (_) {}
            logger.error(`[PluginService] Download failed for ${downloadInfo.fileName}: ${err.message}`);
            throw new Error(`Failed to download plugin. The marketplace may be temporarily unavailable. (${err.message})`);
        }

        // Validate downloaded file (basic sanity check — must be > 1KB)
        try {
            const stat = await fs.stat(destPath);
            if (stat.size < 1024) {
                await fs.remove(destPath);
                throw new Error('Downloaded file is suspiciously small (< 1KB). It may be a broken link or HTML error page.');
            }
        } catch (err: any) {
            if (err.message.includes('suspiciously small')) throw err;
            // stat failed, file doesn't exist
            throw new Error('Download completed but the file is missing. Please try again.');
        }

        logger.success(`[PluginService] Downloaded ${downloadInfo.fileName}`);

        // Create record in DB
        const plugin = pluginRepository.create({
            id: crypto.randomUUID(),
            serverId,
            sourceId,
            source,
            name: downloadInfo.fileName.replace('.jar', ''),
            fileName: downloadInfo.fileName,
            version: downloadInfo.version,
            installedAt: Date.now(),
            autoUpdate: false,
            enabled: true
        });

        // Mark server as needing restart
        serverRepository.update(serverId, { needsRestart: true } as any);
        
        if (server.status === 'ONLINE' || server.status === 'STARTING') {
            logger.info(`[PluginService] Plugin ${plugin.name} installed while server is ${server.status}. It will load on the next restart.`);
        } else {
            logger.info(`[PluginService] Plugin ${plugin.name} installed for server ${serverId}. Restart required.`);
        }
        
        return plugin;
    }

    /**
     * Uninstall a plugin from a server.
     */
    async uninstall(serverId: string, pluginId: string): Promise<void> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');

        const plugin = pluginRepository.findById(pluginId);
        if (!plugin || plugin.serverId !== serverId) {
            throw new Error('Plugin not found on this server');
        }

        // Delete the JAR file
        const targetDir = path.join(server.workingDirectory, getTargetDir(server.software));
        const jarPath = path.join(targetDir, plugin.fileName);
        const disabledPath = path.join(targetDir, `${plugin.fileName}.disabled`);

        if (await fs.pathExists(jarPath)) {
            await fs.remove(jarPath);
        } else if (await fs.pathExists(disabledPath)) {
            await fs.remove(disabledPath);
        }

        // Remove DB record
        pluginRepository.delete(pluginId);
        
        // Mark server as needing restart
        serverRepository.update(serverId, { needsRestart: true } as any);
        
        logger.info(`[PluginService] Uninstalled ${plugin.name} from server ${serverId}. Restart required.`);
    }

    /**
     * Toggle a plugin (enable/disable by renaming .jar <-> .jar.disabled).
     */
    async toggle(serverId: string, pluginId: string): Promise<InstalledPlugin> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');

        const plugin = pluginRepository.findById(pluginId);
        if (!plugin || plugin.serverId !== serverId) {
            throw new Error('Plugin not found on this server');
        }

        const targetDir = path.join(server.workingDirectory, getTargetDir(server.software));
        const jarPath = path.join(targetDir, plugin.fileName);
        const disabledName = `${plugin.fileName}.disabled`;
        const disabledPath = path.join(targetDir, disabledName);

        if (plugin.enabled) {
            // Disable: rename .jar -> .jar.disabled
            if (await fs.pathExists(jarPath)) {
                await fs.rename(jarPath, disabledPath);
            }
            pluginRepository.update(pluginId, { enabled: false, fileName: disabledName });
            logger.info(`[PluginService] Disabled ${plugin.name} on server ${serverId}`);
        } else {
            // Enable: rename .jar.disabled -> .jar
            const enabledName = plugin.fileName.replace(/\.disabled$/, '');
            const enabledPath = path.join(targetDir, enabledName);
            if (await fs.pathExists(disabledPath)) {
                await fs.rename(disabledPath, enabledPath);
            }
            pluginRepository.update(pluginId, { enabled: true, fileName: enabledName });
            logger.info(`[PluginService] Enabled ${plugin.name} on server ${serverId}`);
        }

        // Mark server as needing restart
        serverRepository.update(serverId, { needsRestart: true } as any);

        return pluginRepository.findById(pluginId)!;
    }

    /**
     * Check for available updates across all installed plugins.
     */
    async checkUpdates(serverId: string): Promise<PluginUpdateInfo[]> {
        const installed = pluginRepository.findByServer(serverId);
        const updates: PluginUpdateInfo[] = [];

        for (const plugin of installed) {
            if (!plugin.sourceId || plugin.source === 'manual') continue;

            try {
                const downloadInfo = await marketplaceRegistry.getDownloadUrl(plugin.sourceId, plugin.source);
                
                if (downloadInfo.version !== plugin.version) {
                    updates.push({
                        pluginId: plugin.id,
                        name: plugin.name,
                        currentVersion: plugin.version,
                        latestVersion: downloadInfo.version,
                        source: plugin.source,
                        sourceId: plugin.sourceId,
                    });
                }
            } catch (err: any) {
                logger.warn(`[PluginService] Update check failed for ${plugin.name}: ${err.message}`);
            }
        }

        return updates;
    }

    /**
     * Update a plugin to the latest version.
     */
    async update(serverId: string, pluginId: string): Promise<InstalledPlugin> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');

        const plugin = pluginRepository.findById(pluginId);
        if (!plugin || plugin.serverId !== serverId) {
            throw new Error('Plugin not found on this server');
        }

        if (!plugin.sourceId || plugin.source === 'manual') {
            throw new Error('Cannot update manually installed plugins');
        }

        // Resolve new download
        const downloadInfo = await marketplaceRegistry.getDownloadUrl(plugin.sourceId, plugin.source, server.version);

        const targetDir = path.join(server.workingDirectory, getTargetDir(server.software));
        
        // Remove old JAR
        const oldPath = path.join(targetDir, plugin.fileName);
        const oldDisabledPath = path.join(targetDir, `${plugin.fileName}.disabled`);
        if (await fs.pathExists(oldPath)) await fs.remove(oldPath);
        if (await fs.pathExists(oldDisabledPath)) await fs.remove(oldDisabledPath);

        // Download new version
        const destPath = path.join(targetDir, downloadInfo.fileName);
        await installerService.downloadFile(downloadInfo.url, destPath);

        // Update record
        const newFileName = plugin.enabled ? downloadInfo.fileName : `${downloadInfo.fileName}.disabled`;
        
        // Rename if disabled
        if (!plugin.enabled) {
            await fs.rename(destPath, path.join(targetDir, newFileName));
        }

        pluginRepository.update(pluginId, {
            fileName: newFileName,
            version: downloadInfo.version,
            updatedAt: Date.now(),
        });

        // Mark server as needing restart
        serverRepository.update(serverId, { needsRestart: true } as any);

        logger.success(`[PluginService] Updated ${plugin.name} from ${plugin.version} to ${downloadInfo.version}. Restart required.`);
        return pluginRepository.findById(pluginId)!;
    }

    /**
     * Scan the plugins/mods directory and reconcile with DB records.
     * Discovers manually installed plugins.
     */
    async scanInstalled(serverId: string): Promise<InstalledPlugin[]> {
        const server = serverRepository.findById(serverId);
        if (!server) throw new Error('Server not found');

        if (!supportsPlugins(server.software)) return [];

        const targetDir = path.join(server.workingDirectory, getTargetDir(server.software));
        if (!(await fs.pathExists(targetDir))) return [];

        const files = await fs.readdir(targetDir);
        const jarFiles = files.filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'));

        const discovered: InstalledPlugin[] = [];

        for (const file of jarFiles) {
            const existing = pluginRepository.findByFileName(file, serverId);
            if (existing) continue; // Already tracked

            // Discover this as a manual plugin
            const isDisabled = file.endsWith('.disabled');
            const cleanName = file
                .replace(/\.jar(\.disabled)?$/, '')
                .replace(/[-_]\d+.*$/, '')
                .replace(/[._-]/g, ' ')
                .trim();

            const plugin: InstalledPlugin = {
                id: crypto.randomUUID(),
                serverId,
                source: 'manual',
                name: cleanName || file,
                fileName: file,
                version: 'Unknown',
                installedAt: Date.now(),
                autoUpdate: false,
                enabled: !isDisabled,
            };

            pluginRepository.create(plugin);
            discovered.push(plugin);
        }

        // Also remove records where the JAR no longer exists
        const existing = pluginRepository.findByServer(serverId);
        for (const plugin of existing) {
            const jarPath = path.join(targetDir, plugin.fileName);
            const altPath = plugin.enabled 
                ? path.join(targetDir, `${plugin.fileName}.disabled`)
                : path.join(targetDir, plugin.fileName.replace(/\.disabled$/, ''));
            
            if (!(await fs.pathExists(jarPath)) && !(await fs.pathExists(altPath))) {
                pluginRepository.delete(plugin.id);
            }
        }

        return pluginRepository.findByServer(serverId);
    }
}

export const pluginService = new PluginService();
