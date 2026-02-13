export const ERROR_CODES = {
    // System / Generic
    E_UNKNOWN: { code: 'E_UNKNOWN', message: 'An unknown error occurred.' },
    E_VALIDATION: { code: 'E_VALIDATION', message: 'Invalid request data.' },
    E_UNAUTHORIZED: { code: 'E_UNAUTHORIZED', message: 'Authentication required.' },
    E_FORBIDDEN: { code: 'E_FORBIDDEN', message: 'Access denied.' },
    E_NOT_FOUND: { code: 'E_NOT_FOUND', message: 'Resource not found.' },
    
    // Server Operations
    E_SERVER_ALREADY_EXISTS: { code: 'E_SERVER_ALREADY_EXISTS', message: 'A server with this name already exists.' },
    E_SERVER_OFFLINE: { code: 'E_SERVER_OFFLINE', message: 'Server is offline.' },
    E_SERVER_BUSY: { code: 'E_SERVER_BUSY', message: 'Server is currently busy.' },
    
    // Environment / Resources
    E_PORT_IN_USE: { code: 'E_PORT_IN_USE', message: 'The specified port is already in use.' },
    E_JAVA_MISSING: { code: 'E_JAVA_MISSING', message: 'Java runtime not found.' },
    E_JAVA_INCOMPATIBLE: { code: 'E_JAVA_INCOMPATIBLE', message: 'Java version incompatible with this software.' },
    E_EULA_NOT_ACCEPTED: { code: 'E_EULA_NOT_ACCEPTED', message: 'EULA must be accepted to start.' },
    
    // Files
    E_FILE_ACCESS: { code: 'E_FILE_ACCESS', message: 'Access to file denied.' },
    E_FILE_NOT_FOUND: { code: 'E_FILE_NOT_FOUND', message: 'File not found.' },
    
    // Nodes
    E_NODE_OFFLINE: { code: 'E_NODE_OFFLINE', message: 'Target node is offline.' },
    E_NODE_UNREACHABLE: { code: 'E_NODE_UNREACHABLE', message: 'Cannot reach node.' },
};
