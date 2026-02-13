import { ServerCapabilities } from '../types';

export const getServerCapabilities = (software: string): ServerCapabilities => {
    const sw = software.toLowerCase();
    
    if (sw === 'bedrock') {
        return {
            softwareCategory: 'BEDROCK',
            supportsPlugins: false,
            supportsModpacks: false,
            supportsJava: false,
            supportsJvmFlags: false,
            useUdpPort: true,
            supportsSpark: false,
            supportsSchedules: true,
            recommendedPort: 19132,
            binaryName: process.platform === 'win32' ? 'bedrock_server.exe' : 'bedrock_server',
            termMod: 'Behavior Packs',
            termPlugin: 'Add-ons'
        };
    }

    // Default Java Server (Paper, Spigot, Forge, etc.)
    return {
        softwareCategory: 'JAVA',
        supportsPlugins: sw === 'paper' || sw === 'spigot' || sw === 'purpur',
        supportsModpacks: sw === 'forge' || sw === 'fabric' || sw === 'neoforge' || sw === 'modpack',
        supportsJava: true,
        supportsJvmFlags: true,
        useUdpPort: false,
        supportsSpark: true,
        supportsSchedules: true,
        recommendedPort: 25565,
        binaryName: 'server.jar',
        termMod: 'Mods',
        termPlugin: 'Plugins'
    };
};
