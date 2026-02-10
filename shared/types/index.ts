
// --- Shared / Backend Types ---

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';

export type Permission = 
    | 'server.view'
    | 'server.start'
    | 'server.stop'
    | 'server.restart'
    | 'server.console.read'
    | 'server.console.write'
    | 'server.files.read'
    | 'server.files.write'
    | 'server.settings'
    | 'server.players.manage'
    | 'server.backups.manage'
    | 'server.create'
    | 'server.delete'
    | 'users.manage'
    | 'system.remote_access.manage';

export interface ResourceConfig {
    cpuPriority: 'normal' | 'high' | 'realtime';
    maxRam: number; // in MB
}

export interface ServerTemplate {
    id: string;
    name: string;
    type: 'Paper' | 'Fabric' | 'Forge' | 'NeoForge' | 'Modpack' | 'Vanilla' | 'Spigot';
    version: string; // Minecraft version
    build?: string; // Specific build/loader version
    icon?: string;
    recommendedRam: number;
    description: string;
    javaVersion: number;
    startupFlags?: string[]; // Recommended Aikar flags etc.
    downloadUrl?: string; // If static
}

export interface BackgroundSettings {
    enabled: boolean;
    url: string;
    opacity: number; // 0.0 to 1.0
    blur: number; // pixels
}

export interface CustomBackgrounds {
    login?: BackgroundSettings;
    serverSelection?: BackgroundSettings;
    dashboard?: BackgroundSettings;
    console?: BackgroundSettings;
    files?: BackgroundSettings;
    plugins?: BackgroundSettings;
    schedules?: BackgroundSettings;
    backups?: BackgroundSettings;
    players?: BackgroundSettings;
    access?: BackgroundSettings;
    settings?: BackgroundSettings;
    architect?: BackgroundSettings;
    integrations?: BackgroundSettings;
    users?: BackgroundSettings;
    globalSettings?: BackgroundSettings;
    auditLog?: BackgroundSettings;
}

export interface UserProfile {
    id: string; // UUID
    email: string;
    username: string;
    passwordHash?: string; // Hashed with bcrypt
    role: UserRole;
    schemaVersion?: number; // Added for Phase 5 Migration Check
    permissions?: Partial<Record<string, Permission[]>>; // Deprecated: Migration target
    serverAcl?: Record<string, { allow: Permission[], deny: Permission[] }>; // Phase 5 ACL
    avatarUrl?: string;
    customRoleName?: string; // Phase 6: Flexible Role Labels
    preferences: {
        accentColor: string;
        reducedMotion: boolean;
        visualQuality: boolean;
        theme?: 'dark' | 'light' | 'system';  // Theme preference
        backgrounds?: CustomBackgrounds;
        dashboardLayout?: any; // Stores react-grid-layout state
        notifications: {
            browser: boolean;
            sound: boolean;
            events: {
                onJoin: boolean;
                onCrash: boolean;
            }
        };
        terminal: {
            fontSize: number;
            fontFamily: string;
        };
        updates?: {
            check: boolean;
        };
    };
    lastLogin?: number;
    minecraftIgn?: string;
    apiKey?: string;
    password?: string; // For updates only
}

export interface ServerAdvancedFlags {
    aikarFlags?: boolean;
    installSpark?: boolean;
    useGraalVM?: boolean;
    antiDdos?: boolean;
    debugMode?: boolean;
    // Pro-Grade Technical
    gcEngine?: 'G1GC' | 'ZGC' | 'Shenandoah' | 'Parallel';
    socketBuffer?: number;
    compressionThreshold?: number;
    autoHealing?: boolean;
    healthCheckInterval?: number;
    retryPattern?: string;
    threadPriority?: 'low' | 'normal' | 'high' | 'ultra';
    startDelay?: number;
    killTimeout?: number;
}

export interface ServerConfig {
    id: string;
    name: string;
    folderName?: string; // Optional custom folder name
    loaderBuild?: string; // Specific build version
    version: string; // Minecraft Version
    software: 'Paper' | 'Spigot' | 'Forge' | 'Fabric' | 'Vanilla' | 'Purpur';
    port: number;
    ram: number; // GB
    cpuPriority?: 'normal' | 'high' | 'realtime';
    javaVersion: 'Java 8' | 'Java 11' | 'Java 17' | 'Java 21';
    autoStart?: boolean;
    status: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'STOPPING' | 'RESTARTING' | 'CRASHED' | 'UNMANAGED' | 'INSTALLING';
    iconUrl?: string; // Data URI
    workingDirectory: string;
    executable?: string; // Custom JAR or start script
    startTime?: number; // Timestamp
    advancedFlags?: ServerAdvancedFlags;
    onlineMode?: boolean;
    maxPlayers?: number;
    ip?: string;
    motd?: string;
    discordConfig?: DiscordConfig;
    securityConfig?: SecurityConfig;
    logLocation?: string;
    executionCommand?: string;
    stopCommand?: string;
    autostartDelay?: number;
    updateUrl?: string;
    shutdownTimeout?: number;
    crashExitCodes?: string;
    logRetention?: number;
    gamemode?: string;
    difficulty?: string;
    pvp?: boolean;
    hardcore?: boolean;
    allowFlight?: boolean;
    spawnMonsters?: boolean;
    spawnAnimals?: boolean;
    levelSeed?: string;
    viewDistance?: number;
    crashDetection?: boolean;
    includeInTotal?: boolean;
    publicStatus?: boolean;
    executionEngine?: 'native' | 'docker';
    dockerImage?: string;
    backupConfig?: {
        worldOnly: boolean; // Default: false (backup everything)
        customWorldPaths?: string[]; // Optional: specify custom world folder names
    };
    needsRestart?: boolean; // Track if plugin/config changes require a reboot
}

// --- Frontend Specific Types ---

export type TabView = 'DASHBOARD' | 'CONSOLE' | 'FILES' | 'PLUGINS' | 'SCHEDULES' | 'BACKUPS' | 'PLAYERS' | 'ACCESS' | 'SETTINGS' | 'ARCHITECT' | 'INTEGRATIONS';

export type AppState = 'LOGIN' | 'PUBLIC_STATUS' | 'SERVER_SELECTION' | 'CREATE_SERVER' | 'MANAGE_SERVER' | 'USER_MANAGEMENT' | 'USER_PROFILE' | 'GLOBAL_SETTINGS' | 'AUDIT_LOG';

export type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: string;
    message: string;
}

export enum ServerStatus {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    STARTING = 'STARTING',
    STOPPING = 'STOPPING',
    RESTARTING = 'RESTARTING',
    CRASHED = 'CRASHED',
    UNMANAGED = 'UNMANAGED',
    INSTALLING = 'INSTALLING'
}

export interface GlobalSettings {
    app: {
        hostMode: boolean;
        autoUpdate: boolean;
        theme: 'dark' | 'light' | 'system';
        storageProvider?: 'json' | 'sqlite';
        https?: {
            enabled: boolean;
            keyPath: string;
            certPath: string;
            passphrase?: string;
        };
        remoteAccess?: {
            enabled: boolean;
            method?: 'vpn' | 'proxy' | 'direct' | 'cloudflare';
            externalIP?: string;
        };
        dockerEnabled?: boolean;
    };
    discordBot?: DiscordBotConfig;
}

export interface Player {
    name: string;
    uuid?: string;
    online?: boolean;
    isOp?: boolean;
    ip?: string;
    ping?: number;
    lastSeen?: number;
    skinUrl?: string;
}

export interface Backup {
    id: string;
    name: string;
    date: number;
    size: number;
    locked?: boolean;
    description?: string;
    createdAt?: number;
    type?: 'Manual' | 'Scheduled' | 'Auto';
    filename?: string;
    scope?: 'full' | 'world'; // Track if this was a world-only backup
}

export interface ScheduleTask {
    id: string;
    name: string;
    command: string;
    cron: string;
    isActive: boolean;
    lastRun?: number | string;
    nextRun?: string;
}


export interface FileNode {
    id?: string;
    name: string;
    path: string;
    isDirectory: boolean;
    type?: string;
    size: number | string;
    lastModified?: number;
    modified?: any;
    isProtected?: boolean;
    children?: FileNode[];
}

export interface DiscordConfig {
    enabled: boolean;
    webhookUrl?: string;
    botToken?: string;
    channelId?: string;
    botName?: string;
    guildId?: string;
    avatarUrl?: string;
    events?: {
        serverStart?: boolean;
        serverStop?: boolean;
        playerJoin?: boolean;
        playerLeave?: boolean;
        onStart?: boolean;
        onStop?: boolean;
        onJoin?: boolean;
        onLeave?: boolean;
        onCrash?: boolean;
    };
}

export interface DiscordBotConfig {
    token: string;
    clientId: string;
    guildId?: string;
    enabled?: boolean;
    commandRoles?: any;
    notificationChannel?: string;
}

export interface SecurityConfig {
    firewallEnabled: boolean;
    allowedIps: string[];
    ddosProtection: boolean;
    requireOp2fa: boolean;
    forceSsl: boolean;
    regionLock: string[];
}

export interface Plugin {
    id: string;
    name: string;
    version: string;
    enabled?: boolean;
    installed?: boolean;
    category?: string;
    icon?: string;
    description?: string;
    author?: string;
    authors?: string[];
    downloads?: string;
    website?: string;
}


// --- Audit Logging Types ---

export type AuditAction = 
    | 'LOGIN_SUCCESS' | 'LOGIN_FAIL' 
    | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE'
    | 'SERVER_CREATE' | 'SERVER_DELETE' | 'SERVER_START' | 'SERVER_STOP' | 'SERVER_RESTART' | 'SERVER_UPDATE'
    | 'SERVER_IMPORT_LOCAL' | 'SERVER_IMPORT_ARCHIVE'
    | 'TEMPLATE_INSTALL' | 'FILE_EDIT' | 'EULA_ACCEPT' | 'PERMISSION_DENIED'
    | 'SYSTEM_SETTINGS_UPDATE' | 'SYSTEM_CACHE_CLEAR' | 'DISCORD_RECONNECT' | 'DISCORD_SYNC'
    | 'ASSET_UPLOAD';

export interface AuditLog {
    id: string;
    timestamp: number;
    userId: string;
    userEmail?: string;
    action: AuditAction;
    resourceId?: string;
    metadata?: any;
    ip?: string;
}

export interface ImportAnalysis {
    software: 'Paper' | 'Spigot' | 'Forge' | 'Fabric' | 'Vanilla' | 'Purpur';
    version: string;
    executable: string;
    port: number;
    ram: number;
    javaVersion: 'Java 8' | 'Java 11' | 'Java 17' | 'Java 21';
    isModded: boolean;
}

// --- Diagnosis Types (Synced) ---

export interface DiagnosisResult {
    id: string; // Unique ID for this specific diagnosis instance
    ruleId: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    explanation: string;
    recommendation: string;
    action?: {
        type: 'UPDATE_CONFIG' | 'SWITCH_JAVA' | 'AGREE_EULA' | 'INSTALL_DEPENDENCY' | 'REPAIR_PROPERTIES' | 'CLEANUP_TELEMETRY' | 'OPTIMIZE_ARGUMENTS' | 'PURGE_GHOST' | 'RESOLVE_PORT_CONFLICT' | 'REMOVE_DUPLICATE_PLUGIN' | 'CREATE_PLUGIN_FOLDER';
        payload: any;
        autoHeal?: boolean; // If true, AutoHealingService can execute this automatically
    };
    connectedCrashReport?: {
        id: string;
        analysis: string;
    };
    timestamp: number;
}

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
    id: string;
    userId: string; // 'ALL', 'ADMIN', or UUID
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    createdAt: number;
    metadata?: any;
    link?: string;
    dismissible?: boolean; // If false, cannot be deleted by user
}

export type ConnectivityMethod = 'vpn' | 'proxy' | 'direct' | 'cloudflare';

export interface ConnectionStatus {
    enabled: boolean;
    method?: ConnectivityMethod;
    externalIP?: string;
    bindAddress: string;
    error?: string;
    details?: any; // Provider specific details (e.g. tunnel URL)
}

// --- Plugin Marketplace Types ---

export type PluginSource = 'spiget' | 'modrinth' | 'hangar' | 'manual';
export type PluginPlatform = 'bukkit' | 'spigot' | 'paper' | 'purpur' | 'forge' | 'fabric';

export interface MarketplacePlugin {
    sourceId: string;       // ID on the external platform
    source: PluginSource;
    name: string;
    slug: string;
    description: string;
    author: string;
    iconUrl?: string;
    downloads: number;
    rating?: number;
    category: string;
    platforms: PluginPlatform[];
    latestVersion: string;
    latestGameVersions: string[];
    externalUrl?: string;
    updatedAt: number;
}

export interface InstalledPlugin {
    id: string;             // Internal UUID
    serverId: string;
    sourceId?: string;
    source: PluginSource;
    name: string;
    fileName: string;       // e.g. "EssentialsX-2.20.1.jar"
    version: string;
    installedAt: number;
    updatedAt?: number;
    autoUpdate: boolean;    // Opt-in only, never forced
    enabled: boolean;       // false = renamed to .jar.disabled
}

export interface PluginSearchQuery {
    query: string;
    category?: string;
    platform?: PluginPlatform;
    gameVersion?: string;
    source?: PluginSource;
    page?: number;
    limit?: number;
    sort?: 'downloads' | 'updated' | 'name' | 'rating';
}

export interface PluginSearchResult {
    plugins: MarketplacePlugin[];
    total: number;
    page: number;
    pages: number;
}

export interface PluginUpdateInfo {
    pluginId: string;
    name: string;
    currentVersion: string;
    latestVersion: string;
    source: PluginSource;
    sourceId: string;
}
