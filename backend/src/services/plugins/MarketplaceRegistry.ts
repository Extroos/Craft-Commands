import axios from 'axios';
import { MarketplacePlugin, PluginSearchQuery, PluginSearchResult, PluginSource, PluginPlatform } from '../../../../shared/types';
import { logger } from '../../utils/logger';

// --- Response Cache ---
interface CacheEntry {
    data: PluginSearchResult;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CacheEntry>();

function getCacheKey(query: PluginSearchQuery, source: PluginSource): string {
    return `${source}:${query.query}:${query.category || ''}:${query.platform || ''}:${query.gameVersion || ''}:${query.page || 0}:${query.sort || 'downloads'}`;
}

function getCached(key: string): PluginSearchResult | null {
    const entry = searchCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
    }
    searchCache.delete(key);
    return null;
}

function setCache(key: string, data: PluginSearchResult): void {
    searchCache.set(key, { data, timestamp: Date.now() });
}

// --- Platform Mapping ---
const SOFTWARE_TO_PLATFORMS: Record<string, PluginPlatform[]> = {
    'Paper': ['bukkit', 'spigot', 'paper'],
    'Purpur': ['bukkit', 'spigot', 'paper', 'purpur'],
    'Spigot': ['bukkit', 'spigot'],
    'Forge': ['forge'],
    'Fabric': ['fabric'],
    'Vanilla': [],
};

const SOFTWARE_TO_SEARCH_ORDER: Record<string, PluginSource[]> = {
    'Paper': ['hangar', 'modrinth', 'spiget'],
    'Purpur': ['hangar', 'modrinth', 'spiget'],
    'Spigot': ['spiget', 'modrinth'],
    'Forge': ['modrinth'],
    'Fabric': ['modrinth'],
    'Vanilla': [],
};

export function getTargetDir(software: string): string {
    if (software === 'Forge' || software === 'Fabric') return 'mods';
    return 'plugins';
}

export function supportsPlugins(software: string): boolean {
    return software !== 'Vanilla';
}

// --- Modrinth Adapter ---
async function searchModrinth(query: PluginSearchQuery, software: string): Promise<PluginSearchResult> {
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;
    
    // Build facets based on server software
    const facets: string[][] = [];
    if (software === 'Forge') {
        facets.push(['categories:forge']);
        facets.push(['project_type:mod']);
    } else if (software === 'Fabric') {
        facets.push(['categories:fabric']);
        facets.push(['project_type:mod']);
    } else {
        // Bukkit-family: search for plugins
        facets.push(['project_type:plugin']);
        // Add paper/spigot/bukkit as category facets (OR within group)
        facets.push(['categories:paper', 'categories:spigot', 'categories:bukkit']);
    }

    if (query.gameVersion) {
        facets.push([`versions:${query.gameVersion}`]);
    }

    if (query.category && query.category !== 'All') {
        facets.push([`categories:${query.category.toLowerCase()}`]);
    }

    const sortMap: Record<string, string> = {
        'downloads': 'downloads',
        'updated': 'updated',
        'name': 'relevance',
        'rating': 'follows',
    };

    const params: Record<string, any> = {
        query: query.query,
        limit,
        offset,
        index: sortMap[query.sort || 'downloads'] || 'downloads',
        facets: JSON.stringify(facets),
    };

    const response = await axios.get('https://api.modrinth.com/v2/search', {
        params,
        headers: { 'User-Agent': 'CraftCommand/1.8.0 (contact@craftcommand.io)' },
        timeout: 10000,
    });

    const data = response.data;
    const plugins: MarketplacePlugin[] = data.hits.map((hit: any) => ({
        sourceId: hit.project_id,
        source: 'modrinth' as PluginSource,
        name: hit.title,
        slug: hit.slug,
        description: hit.description || '',
        author: hit.author || 'Unknown',
        iconUrl: hit.icon_url,
        downloads: hit.downloads || 0,
        rating: hit.follows || 0,
        category: hit.categories?.[0] || 'General',
        platforms: hit.categories?.filter((c: string) => 
            ['bukkit', 'spigot', 'paper', 'purpur', 'forge', 'fabric'].includes(c)
        ) as PluginPlatform[] || [],
        latestVersion: hit.latest_version || 'Unknown',
        latestGameVersions: hit.versions || [],
        externalUrl: `https://modrinth.com/plugin/${hit.slug}`,
        updatedAt: new Date(hit.date_modified).getTime(),
    }));

    return {
        plugins,
        total: data.total_hits,
        page: query.page || 1,
        pages: Math.ceil(data.total_hits / limit),
    };
}

// --- Modrinth Download URL Resolution ---
export async function getModrinthDownloadUrl(projectId: string, gameVersion?: string): Promise<{ url: string; fileName: string; version: string }> {
    const response = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, {
        headers: { 'User-Agent': 'CraftCommand/1.8.0 (contact@craftcommand.io)' },
        timeout: 10000,
    });

    let versions = response.data;

    // Filter by game version if specified
    if (gameVersion) {
        const filtered = versions.filter((v: any) => v.game_versions?.includes(gameVersion));
        if (filtered.length > 0) versions = filtered;
    }

    if (!versions.length) throw new Error('No versions found for this plugin');

    const latest = versions[0];
    const primaryFile = latest.files.find((f: any) => f.primary) || latest.files[0];
    
    if (!primaryFile?.url) throw new Error('No download URL found');

    return {
        url: primaryFile.url,
        fileName: primaryFile.filename,
        version: latest.version_number,
    };
}

// --- Spiget Adapter ---
async function searchSpiget(query: PluginSearchQuery): Promise<PluginSearchResult> {
    const limit = query.limit || 20;
    const page = query.page || 1;

    const sortMap: Record<string, string> = {
        'downloads': '-downloads',
        'updated': '-updateDate',
        'name': 'name',
        'rating': '-rating.average',
    };

    const response = await axios.get(`https://api.spiget.org/v2/search/resources/${encodeURIComponent(query.query)}`, {
        params: {
            size: limit,
            page,
            sort: sortMap[query.sort || 'downloads'] || '-downloads',
        },
        timeout: 10000,
    });

    const data = response.data;
    const plugins: MarketplacePlugin[] = (Array.isArray(data) ? data : []).map((resource: any) => ({
        sourceId: String(resource.id),
        source: 'spiget' as PluginSource,
        name: resource.name || 'Unknown',
        slug: resource.name?.toLowerCase().replace(/\s+/g, '-') || String(resource.id),
        description: resource.tag || '',
        author: resource.author?.name || 'Unknown',
        iconUrl: resource.icon?.url ? `https://www.spigotmc.org/${resource.icon.url}` : undefined,
        downloads: resource.downloads || 0,
        rating: resource.rating?.average || 0,
        category: resource.category?.name || 'General',
        platforms: ['bukkit', 'spigot'] as PluginPlatform[],
        latestVersion: resource.version?.id ? String(resource.version.id) : 'Unknown',
        latestGameVersions: resource.testedVersions || [],
        externalUrl: `https://www.spigotmc.org/resources/${resource.id}/`,
        updatedAt: (resource.updateDate || 0) * 1000,
    }));

    return {
        plugins,
        total: plugins.length < limit ? (page - 1) * limit + plugins.length : page * limit + 1,
        page,
        pages: plugins.length < limit ? page : page + 1,
    };
}

// --- Spiget Download URL ---
export async function getSpigetDownloadUrl(resourceId: string): Promise<{ url: string; fileName: string; version: string }> {
    // Get resource details for the filename
    const detailRes = await axios.get(`https://api.spiget.org/v2/resources/${resourceId}`, { timeout: 10000 });
    const resource = detailRes.data;
    const name = resource.name || 'plugin';
    const version = resource.version?.id ? String(resource.version.id) : 'latest';
    
    return {
        url: `https://api.spiget.org/v2/resources/${resourceId}/download`,
        fileName: `${name.replace(/[^a-zA-Z0-9.-]/g, '_')}-${version}.jar`,
        version,
    };
}

// --- Hangar Adapter ---
async function searchHangar(query: PluginSearchQuery): Promise<PluginSearchResult> {
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const sortMap: Record<string, string> = {
        'downloads': '-downloads',
        'updated': '-updated',
        'name': 'name',
        'rating': '-stars',
    };

    const params: Record<string, any> = {
        q: query.query,
        limit,
        offset,
        sort: sortMap[query.sort || 'downloads'] || '-downloads',
    };

    if (query.gameVersion) {
        params.version = query.gameVersion;
    }

    if (query.category && query.category !== 'All') {
        params.category = query.category.toUpperCase();
    }

    const response = await axios.get('https://hangar.papermc.io/api/v1/projects', {
        params,
        timeout: 10000,
    });

    const data = response.data;
    const plugins: MarketplacePlugin[] = (data.result || []).map((project: any) => ({
        sourceId: project.namespace?.slug || project.name,
        source: 'hangar' as PluginSource,
        name: project.name || 'Unknown',
        slug: project.namespace?.slug || project.name?.toLowerCase().replace(/\s+/g, '-'),
        description: project.description || '',
        author: project.namespace?.owner || 'Unknown',
        iconUrl: project.avatarUrl,
        downloads: project.stats?.downloads || 0,
        rating: project.stats?.stars || 0,
        category: project.category || 'General',
        platforms: ['paper', 'purpur'] as PluginPlatform[],
        latestVersion: project.lastUpdated || 'Unknown',
        latestGameVersions: [],
        externalUrl: `https://hangar.papermc.io/${project.namespace?.owner}/${project.namespace?.slug}`,
        updatedAt: new Date(project.lastUpdated).getTime() || 0,
    }));

    return {
        plugins,
        total: data.pagination?.count || plugins.length,
        page: query.page || 1,
        pages: Math.ceil((data.pagination?.count || 1) / limit),
    };
}

// --- Hangar Download URL ---
export async function getHangarDownloadUrl(slug: string, gameVersion?: string): Promise<{ url: string; fileName: string; version: string }> {
    // First get versions list
    const params: any = { limit: 1, offset: 0 };
    if (gameVersion) params.version = gameVersion;

    const versionsRes = await axios.get(`https://hangar.papermc.io/api/v1/projects/${slug}/versions`, {
        params,
        timeout: 10000,
    });

    const versions = versionsRes.data.result;
    if (!versions?.length) throw new Error(`No versions found for this plugin${gameVersion ? ' matching ' + gameVersion : ''}`);

    const latest = versions[0];
    const versionName = latest.name;
    const platform = 'PAPER'; // Default to Paper for Hangar downloads

    return {
        url: `https://hangar.papermc.io/api/v1/projects/${slug}/versions/${versionName}/${platform}/download`,
        fileName: `${slug}-${versionName}.jar`,
        version: versionName,
    };
}

// --- Main Registry ---

export class MarketplaceRegistry {

    /**
     * Search across all relevant APIs for a given server software type.
     * Results are merged and deduplicated by name.
     */
    async search(query: PluginSearchQuery, software: string): Promise<PluginSearchResult> {
        if (!supportsPlugins(software)) {
            return { plugins: [], total: 0, page: 1, pages: 0 };
        }

        // If user specified a specific source, only search that one
        const sources = query.source 
            ? [query.source] 
            : SOFTWARE_TO_SEARCH_ORDER[software] || ['modrinth'];

        const allPlugins: MarketplacePlugin[] = [];
        let totalHits = 0;

        for (const source of sources) {
            const cacheKey = getCacheKey(query, source);
            const cached = getCached(cacheKey);

            if (cached) {
                allPlugins.push(...cached.plugins);
                totalHits += cached.total;
                continue;
            }

            try {
                let result: PluginSearchResult;
                
                switch (source) {
                    case 'modrinth':
                        result = await searchModrinth(query, software);
                        break;
                    case 'spiget':
                        result = await searchSpiget(query);
                        break;
                    case 'hangar':
                        result = await searchHangar(query);
                        break;
                    default:
                        continue;
                }

                setCache(cacheKey, result);
                allPlugins.push(...result.plugins);
                totalHits += result.total;
            } catch (err: any) {
                logger.warn(`[Marketplace] ${source} search failed: ${err.message}`);
            }
        }

        // Deduplicate by name (keep the first occurrence which is from the highest-priority source)
        const seen = new Set<string>();
        const deduped = allPlugins.filter(p => {
            const key = p.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const limit = query.limit || 20;
        return {
            plugins: deduped.slice(0, limit),
            total: totalHits,
            page: query.page || 1,
            pages: Math.ceil(totalHits / limit),
        };
    }

    /**
     * Resolve the direct download URL for a plugin from a given source.
     */
    async getDownloadUrl(sourceId: string, source: PluginSource, gameVersion?: string): Promise<{ url: string; fileName: string; version: string }> {
        switch (source) {
            case 'modrinth':
                return getModrinthDownloadUrl(sourceId, gameVersion);
            case 'spiget':
                return getSpigetDownloadUrl(sourceId);
            case 'hangar':
                return getHangarDownloadUrl(sourceId, gameVersion);
            default:
                throw new Error(`Unsupported source: ${source}`);
        }
    }
}

export const marketplaceRegistry = new MarketplaceRegistry();
