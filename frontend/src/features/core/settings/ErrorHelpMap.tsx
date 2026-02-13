import React from 'react';

export interface ErrorHelp {
    title: string;
    description: string;
    docsUrl?: string; 
    faqId?: string;
}

export const ERROR_HELP_MAP: Record<string, ErrorHelp> = {
    // Operations
    'E_SERVER_ALREADY_EXISTS': {
        title: 'Name Taken',
        description: 'A server with this name already exists. Please choose a unique name.',
    },
    'E_SERVER_BUSY': {
        title: 'Server Busy',
        description: 'Another operation is currently in progress on this server. Please wait a moment.',
    },
    'E_SERVER_OFFLINE': {
        title: 'Server Offline',
        description: 'You cannot perform this action while the server is offline.',
    },

    // Resources
    'E_PORT_IN_USE': {
        title: 'Port Conflict',
        description: 'The selected port is already in use by another application. Try changing the port in Settings.',
        docsUrl: 'https://github.com/Start-Craft-Commands/Craft-Commands/wiki/Troubleshooting#port-conflicts'
    },
    'E_JAVA_MISSING': {
        title: 'Java Not Found',
        description: 'Compatible Java runtime was not detected. Please install Java or use the "Install Java" tool in Settings.',
        docsUrl: 'https://github.com/Start-Craft-Commands/Craft-Commands/wiki/Java-Guide'
    },
    'E_JAVA_INCOMPATIBLE': {
        title: 'Incompatible Java',
        description: 'The installed Java version does not support this server software.',
        docsUrl: 'https://github.com/Start-Craft-Commands/Craft-Commands/wiki/Java-Guide'
    },
    'E_EULA_NOT_ACCEPTED': {
        title: 'EULA Required',
        description: 'You must accept the Minecraft EULA to start the server. Check your server settings or console.',
    },

    // Files / Nodes
    'E_FILE_NOT_FOUND': {
        title: 'File Missing',
        description: 'The requested file or directory could not be found.',
    },
    'E_NODE_OFFLINE': {
        title: 'Node Offline',
        description: 'The remote node cannot be reached. Check if the "Craft-Commands Node" app is running on the other machine.',
    },
    'E_NODE_UNREACHABLE': {
        title: 'Connection Failed',
        description: 'Could not establish a connection to the remote node. Check your network/VPN settings.',
    }
};

export const getErrorHelp = (code?: string): ErrorHelp | null => {
    if (!code) return null;
    return ERROR_HELP_MAP[code] || null;
};
