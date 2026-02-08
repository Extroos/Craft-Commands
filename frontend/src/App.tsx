// CraftCommand Management App
import React, { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import Header from './components/Layout/Header';
import Dashboard from './components/Views/Dashboard';
import Console from './components/Views/Console';
import Architect from './components/Views/Architect';
import FileManager from './components/Views/FileManager';
import PlayerManager from './components/Views/PlayerManager';
import PluginManager from './components/Views/PluginManager';
import BackupManager from './components/Views/BackupManager';
import ScheduleManager from './components/Views/ScheduleManager';
import SettingsManager from './components/Views/SettingsManager';
import Integrations from './components/Views/Integrations';
import AccessControl from './components/Views/AccessControl';
import UserProfileView from './components/Views/UserProfile';
import UsersPage from './components/Views/UsersPage';
import GlobalSettingsView from './components/Views/GlobalSettings';
import AuditLog from './components/Views/AuditLog';
import Login from './components/Auth/Login';
import ServerSelection from './components/Server/ServerSelection';
import CreateServer from './components/Server/CreateServer';
import PageBackground from './components/UI/PageBackground';

import StatusPage from './components/Public/StatusPage';
import { TabView, AppState, ServerConfig } from '@shared/types';
import { ToastProvider } from './components/UI/Toast';
import ErrorBoundary from './components/UI/ErrorBoundary';
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';

import { ServerProvider, useServers } from './context/ServerContext';

const AppContent: React.FC = () => {
    const { user, isAuthenticated, logout: authLogout, isLoading: authLoading } = useUser();
    const { servers, currentServer, setCurrentServerById, isLoading: serversLoading } = useServers();
    
    // Initialize State - ALWAYS start at LOGIN for fresh console starts
    const [appState, setAppState] = useState<AppState>('LOGIN');
    const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
    const [isRestoring, setIsRestoring] = useState(true);

    // Unified Navigation Handler (Fixes navigation regression v1.7.7)
    const handleNavigateView = (tab: TabView) => {
        setActiveTab(tab);
        const globalViews: AppState[] = ['USER_PROFILE', 'GLOBAL_SETTINGS', 'USER_MANAGEMENT', 'AUDIT_LOG'];
        if (globalViews.includes(appState) && currentServer) {
            setAppState('MANAGE_SERVER');
        }
    };

    // Persist AppState to localStorage (but don't load from it on mount)
    React.useEffect(() => {
        if (appState !== 'LOGIN') {
            localStorage.setItem('cc_appState', appState);
        }
    }, [appState]);

    // Auto-navigate authenticated users away from login screen
    React.useEffect(() => {
        if (!authLoading && isAuthenticated && appState === 'LOGIN') {
            console.log('[App] User is authenticated, navigating to server selection');
            setAppState('SERVER_SELECTION');
        }
    }, [authLoading, isAuthenticated, appState]);

    // Smart Auto-Recovery: If we are managing a server but context is lost (null),
    // try to find it in the servers list and restore it.
    React.useEffect(() => {
        const savedServerId = localStorage.getItem('cc_serverId');
        if (appState === 'MANAGE_SERVER' && savedServerId && !currentServer && servers.length > 0) {
            console.log('[App] Smart Recovery: Found lost server context, restoring...');
            setCurrentServerById(savedServerId);
        }
    }, [servers, currentServer, appState, setCurrentServerById]);

    // Restore Server Context on Mount (Initial)
    React.useEffect(() => {
        if (!serversLoading) {
            const savedServerId = localStorage.getItem('cc_serverId');
            if (appState === 'MANAGE_SERVER' && savedServerId && !currentServer) {
                setCurrentServerById(savedServerId);
            }
            setIsRestoring(false);
        }
    }, [serversLoading, appState, setCurrentServerById]);

    const handleLogin = () => {
        setAppState('SERVER_SELECTION');
    };

    const handleBackToServerList = () => {
        setCurrentServerById(null);
        localStorage.removeItem('cc_serverId');
        setAppState('SERVER_SELECTION');
    };

    const handleSelectServer = (server: ServerConfig) => {
        setCurrentServerById(server.id);
        localStorage.setItem('cc_serverId', server.id);
        setAppState('MANAGE_SERVER');
        setActiveTab('DASHBOARD'); 
    };

    const handleDeploy = () => {
        setAppState('SERVER_SELECTION');
    };

    const handleLogout = () => {
        authLogout(); // Call UserContext logout to clear token & state
        setCurrentServerById(null); // Clear server state on logout
        localStorage.removeItem('cc_serverId');
        localStorage.removeItem('cc_appState');
        setAppState('LOGIN');
    };
    
    // Background Mapping Logic (High Performance)
    const getActiveBackground = () => {
        const cachedStr = localStorage.getItem('cc_backgrounds');
        const cached = cachedStr ? JSON.parse(cachedStr) : null;
        
        // Quality Mode Check: Backgrounds require High Quality mode
        const qualityEnabled = user ? user.preferences.visualQuality : true; // Default to allow on login if we don't know yet? 
        // Actually, let's check cached preferences for quality mode too if we want to be perfect
        if (user && !user.preferences.visualQuality) return undefined;

        if (!user || !user.preferences.backgrounds) {
            // Pre-auth fallback for personal branding
            if (appState === 'LOGIN' && cached) return cached.login;
            
            // DEFAULT FALLBACK: If Quality Mode is on but no backgrounds set, show the default
            return '/backgrounds/default.png';
        }
        
        const b = user.preferences.backgrounds;

        // Try mapping by state name or lowercased tab name
        if (appState === 'LOGIN') return b.login;
        if (appState === 'SERVER_SELECTION') return b.serverSelection;
        if (appState === 'USER_MANAGEMENT') return b.users;
        if (appState === 'USER_PROFILE') return b.dashboard; 
        if (appState === 'GLOBAL_SETTINGS') return b.globalSettings;
        if (appState === 'AUDIT_LOG') return b.auditLog;
        
        if (appState === 'MANAGE_SERVER') {
            const tabKey = activeTab.toLowerCase();
            return (b as any)[tabKey] || b.dashboard;
        }
        return undefined;
    };

    // Show global initialization splash ONLY on first load or when authenticated & data is missing
    const showSplash = isRestoring || (isAuthenticated && serversLoading && servers.length === 0) || (isAuthenticated && authLoading);

    if (showSplash) {
         return <div className="min-h-screen bg-black flex items-center justify-center text-emerald-500 font-mono">INITIALIZING CONTROL PANEL...</div>;
    }


    const pageVariants = {
        initial: { opacity: 0, y: 10 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -10 }
    };

    const pageTransition = {
        type: 'spring',
        stiffness: user?.preferences.visualQuality ? 200 : 300,
        damping: user?.preferences.visualQuality ? 25 : 30,
        mass: 1,
        duration: user?.preferences.visualQuality ? 0.6 : 0.3
    };

    // Render Logic wrapped in MotionConfig
    const renderContent = () => {
        if (appState === 'LOGIN') {
            return (
                <Login 
                    onLogin={handleLogin} 
                    onViewStatus={() => setAppState('PUBLIC_STATUS')}
                />
            );
        }

        if (appState === 'PUBLIC_STATUS') {
            return <StatusPage onNavigateLogin={() => setAppState('LOGIN')} />;
        }

        if (appState === 'SERVER_SELECTION') {
            return (
                <ServerSelection 
                    onSelectServer={handleSelectServer} 
                    onCreateNew={() => setAppState('CREATE_SERVER')} 
                    onLogout={handleLogout}
                    onNavigateProfile={() => setAppState('USER_PROFILE')}
                    onNavigateUsers={() => setAppState('USER_MANAGEMENT')}
                    onNavigateGlobalSettings={() => setAppState('GLOBAL_SETTINGS')}
                    onNavigateAuditLog={() => setAppState('AUDIT_LOG')}
                />
            );
        }

        if (appState === 'CREATE_SERVER') {
            return (
                <CreateServer 
                    onBack={() => setAppState('SERVER_SELECTION')}
                    onDeploy={handleDeploy}
                />
            );
        }
        
        if (appState === 'USER_MANAGEMENT') {
             return (
                <div className="min-h-screen text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overflow-hidden">
                     <Header 
                        activeTab={activeTab} 
                        setActiveTab={handleNavigateView} 
                        onBackToServerList={handleBackToServerList}
                        onLogout={handleLogout}
                        onNavigateProfile={() => setAppState('USER_PROFILE')}
                        onNavigateUsers={() => setAppState('USER_MANAGEMENT')}
                        onNavigateGlobalSettings={() => setAppState('GLOBAL_SETTINGS')}
                        onNavigateAuditLog={() => setAppState('AUDIT_LOG')}
                        currentServer={currentServer}
                    />
                    <main className="flex-1 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto py-8">
                        <UsersPage />
                    </main>
                </div>
            );
        }

        if (appState === 'USER_PROFILE') {
            return (
                <div className="min-h-screen text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overflow-hidden">
                     <Header 
                        activeTab={activeTab} 
                        setActiveTab={handleNavigateView} 
                        onBackToServerList={handleBackToServerList}
                        onLogout={handleLogout}
                        onNavigateProfile={() => setAppState('USER_PROFILE')}
                        onNavigateUsers={() => setAppState('USER_MANAGEMENT')}
                        onNavigateGlobalSettings={() => setAppState('GLOBAL_SETTINGS')}
                        currentServer={currentServer}
                    />
                    <main className="flex-1 px-4 sm:px-6 lg:px-8 w-full">
                        <UserProfileView />
                    </main>
                </div>
            );
        }

        if (appState === 'GLOBAL_SETTINGS') {
            return (
                <div className="min-h-screen text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overflow-hidden">
                     <Header 
                        activeTab={activeTab} 
                        setActiveTab={handleNavigateView} 
                        onBackToServerList={handleBackToServerList}
                        onLogout={handleLogout}
                        onNavigateProfile={() => setAppState('USER_PROFILE')}
                        onNavigateUsers={() => setAppState('USER_MANAGEMENT')}
                        onNavigateGlobalSettings={() => setAppState('GLOBAL_SETTINGS')}
                        onNavigateAuditLog={() => setAppState('AUDIT_LOG')}
                        currentServer={currentServer}
                    />
                    <main className="flex-1 px-4 sm:px-6 lg:px-8 w-full py-8">
                        <GlobalSettingsView />
                    </main>
                </div>
            );
        }

        if (appState === 'AUDIT_LOG') {
            return (
                <div className="min-h-screen text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overflow-hidden">
                     <Header 
                        activeTab={activeTab} 
                        setActiveTab={handleNavigateView} 
                        onBackToServerList={handleBackToServerList}
                        onLogout={handleLogout}
                        onNavigateProfile={() => setAppState('USER_PROFILE')}
                        onNavigateUsers={() => setAppState('USER_MANAGEMENT')}
                        onNavigateGlobalSettings={() => setAppState('GLOBAL_SETTINGS')}
                        onNavigateAuditLog={() => setAppState('AUDIT_LOG')}
                        currentServer={currentServer}
                    />
                    <main className="flex-1 px-4 sm:px-6 lg:px-8 w-full py-8">
                        <AuditLog />
                    </main>
                </div>
            );
        }

        return (
            <div className="min-h-screen text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overflow-hidden">
                <Header 
                    activeTab={activeTab} 
                    setActiveTab={handleNavigateView} 
                    onBackToServerList={handleBackToServerList}
                    onLogout={handleLogout}
                    onNavigateProfile={() => setAppState('USER_PROFILE')}
                    onNavigateUsers={() => setAppState('USER_MANAGEMENT')}
                    onNavigateGlobalSettings={() => setAppState('GLOBAL_SETTINGS')}
                    onNavigateAuditLog={() => setAppState('AUDIT_LOG')}
                    currentServer={currentServer}
                />
                
                <main className="flex-1 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    {currentServer ? (
                        <ErrorBoundary key={currentServer.id}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial="initial"
                                    animate="in"
                                    exit="out"
                                    variants={pageVariants}
                                    transition={pageTransition}
                                    className="h-full"
                                >

                                    {activeTab === 'DASHBOARD' && (
                                        <Dashboard serverId={currentServer.id} />
                                    )}
                                    {activeTab === 'CONSOLE' && <Console serverId={currentServer.id} />}
                                    {activeTab === 'FILES' && <FileManager serverId={currentServer.id} />}
                                    {activeTab === 'PLUGINS' && <PluginManager />}
                                    {activeTab === 'SCHEDULES' && <ScheduleManager serverId={currentServer.id} />}
                                    {activeTab === 'BACKUPS' && <BackupManager serverId={currentServer.id} />}
                                    {activeTab === 'PLAYERS' && <PlayerManager serverId={currentServer.id} />}
                                    {activeTab === 'ACCESS' && <AccessControl serverId={currentServer.id} />}
                                    {activeTab === 'SETTINGS' && (
                                        <SettingsManager serverId={currentServer.id} />
                                    )}
                                    {activeTab === 'ARCHITECT' && <Architect />}
                                    {activeTab === 'INTEGRATIONS' && <Integrations serverId={currentServer.id} />}
                                </motion.div>
                            </AnimatePresence>
                        </ErrorBoundary>
                    ) : (
                        <div className="text-center py-20 flex flex-col items-center justify-center h-full">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                             <p className="mt-4 text-muted-foreground">Synchronizing Server Context...</p>
                        </div>
                    )}
                </main>

                <footer className="py-6 border-t border-border/40 mt-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-[11px] font-medium tracking-tight text-muted-foreground/30">
                        <div className="flex items-center gap-2 italic">
                            CraftCommand Protocol v1.8.0
                        </div>
                        <div>Licensed under MIT &copy; 2026 Extroos</div>
                    </div>
                </footer>
            </div>
        );
    };

    return (
        /* MotionConfig globally controls all framer-motion components */
        <MotionConfig transition={user?.preferences.reducedMotion ? { duration: 0 } : undefined}>
            <div className="relative min-h-screen">
                <PageBackground settings={getActiveBackground()} />
                <div className="relative z-10 min-h-screen">
                    {renderContent()}
                </div>
            </div>
        </MotionConfig>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <UserProvider>
                <ThemeProvider>
                    <ServerProvider>
                        <ToastProvider>
                            <AppContent />
                        </ToastProvider>
                    </ServerProvider>
                </ThemeProvider>
            </UserProvider>
        </ErrorBoundary>
    );
};

export default App;
