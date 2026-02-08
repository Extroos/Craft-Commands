
import React, { useEffect, useState } from 'react';
import { Plus, Server, Hash, Cpu, ArrowRight, HardDrive, LogOut, Trash2, AlertTriangle, Stethoscope, Zap, Loader2, FileInput } from 'lucide-react';
import { ServerConfig, ServerStatus } from '@shared/types';

import { API } from '../../services/api';
import { useToast } from '../UI/Toast';
import ImportServerModal from './ImportServerModal';

interface ServerSelectionProps {
    onSelectServer: (server: ServerConfig) => void;
    onCreateNew: () => void;
    onLogout: () => void;
    onNavigateProfile: () => void;
    onNavigateUsers: () => void;
    onNavigateGlobalSettings: () => void;
    onNavigateAuditLog: () => void;
}

import { useUser } from '../../context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, User as UserIcon, Shield, Users as UsersIcon } from 'lucide-react';
import { useServers } from '../../context/ServerContext';


const ServerSelection: React.FC<ServerSelectionProps> = ({ 
    onSelectServer, onCreateNew, onLogout, 
    onNavigateProfile, onNavigateUsers, onNavigateGlobalSettings, onNavigateAuditLog 
}) => {
    const { servers, refreshServers, installProgress } = useServers();
    const { user } = useUser();
    const [userDropdown, setUserDropdown] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const userRef = React.useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(event.target as Node)) {
                setUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Redundant fetch removed to prevent initialization loops.
        // ServerContext handles the initial population upon login.
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation(); 
        
        // 1. Status Check (RESTORED FEATURE: v1.7.6)
        const server = servers.find(s => s.id === id);
        if (server && (server.status === ServerStatus.ONLINE || server.status === ServerStatus.STARTING)) {
            addToast('warning', 'Safety Lock', `You cannot delete "${name}" while it is ${server.status}. Stop it first.`);
            return;
        }

        if (window.confirm(`Are you sure you want to delete "${name}"?\nThis action cannot be undone.`)) {
            try {
                await API.deleteServer(id);
                addToast('success', 'Deleted', 'Server has been removed.');
                refreshServers(); // Use global refresh
            } catch (err: any) {
                addToast('error', 'Delete Failed', err.message);
            }
        }
    };


    return (
        <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden ${user?.preferences.visualQuality ? 'quality-animate-in' : ''}`}>
            
            {/* Minimal Background Decoration */}
            <div className="hidden dark:block absolute top-0 left-0 w-full h-full bg-zinc-950/20 pointer-events-none"></div>
            
            <div className="max-w-4xl w-full relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div className="flex items-center gap-5">
                        <img src="/website-icon.png" className="w-20 h-20 object-contain drop-shadow-sm" alt="CraftCommand" />
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Instance Manager</h1>
                            <p className="text-muted-foreground text-sm">Select a deployment to interface with.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative" ref={userRef}>
                            <button 
                                onClick={() => setUserDropdown(!userDropdown)}
                                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-secondary/50 transition-colors border border-transparent hover:border-border group"
                            >
                                <div className="hidden md:block text-right">
                                    <div className="text-xs font-bold text-foreground">{user?.username}</div>
                                    <div className="text-[10px] text-muted-foreground">{user?.role}</div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-secondary border border-border overflow-hidden relative">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                            <UserIcon size={20} />
                                        </div>
                                    )}
                                </div>
                            </button>

                            <AnimatePresence>
                                {userDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-2xl z-50 p-1"
                                    >
                                        <div className="p-2 border-b border-border/50 mb-1">
                                            <p className="text-xs font-semibold text-foreground truncate">{user?.email || 'Guest'}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Signed in</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                onNavigateProfile();
                                                setUserDropdown(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mb-1"
                                        >
                                            <UserIcon size={16} /> User Profile
                                        </button>
                                        
                                        {/* Global Settings (Owner Only) */}
                                        {user?.role === 'OWNER' && (
                                            <button 
                                                onClick={() => {
                                                    onNavigateGlobalSettings();
                                                    setUserDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mb-1"
                                            >
                                                <Settings size={16} /> System Config
                                            </button>
                                        )}

                                        {/* Users Management (Owner/Admin) */}
                                        {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                                            <button 
                                                onClick={() => {
                                                    onNavigateUsers();
                                                    setUserDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mb-1"
                                            >
                                                <UsersIcon size={16} /> Manage Users
                                            </button>
                                        )}

                                        {/* Audit Log (Owner/Admin) */}
                                        {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                                            <button 
                                                onClick={() => {
                                                    onNavigateAuditLog();
                                                    setUserDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mb-1"
                                            >
                                                <Shield size={16} /> Audit Log
                                            </button>
                                        )}

                                        <div className="h-[1px] bg-border/50 my-1 mx-2"></div>
                                        <button 
                                            onClick={onLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowImportModal(true)}
                                className="bg-secondary border border-border text-foreground hover:bg-muted px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                            >
                                <FileInput size={16} />
                                Import Server
                            </button>
                            <button 
                                onClick={onCreateNew}
                                className={`px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${user?.preferences.visualQuality ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95' : 'bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-white/5'}`}
                            >
                                <Plus size={16} />
                                Deploy New Instance
                            </button>
                        </div>
                    </div>
                </div>

                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                    className="space-y-3"
                >
                    {servers.map((server) => (
                        <motion.div 
                            variants={{
                                hidden: { opacity: 0, x: -10 },
                                visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
                            }}
                            key={server.id}
                            onClick={() => onSelectServer(server)}
                            className={`group relative border border-border transition-all cursor-pointer overflow-hidden ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow rounded-xl p-5 hover:scale-[1.01] hover:border-primary/30' : 'bg-card rounded-lg p-4 hover:border-border-strong shadow-sm hover:shadow-md'}`}
                        >
                            <div className="flex items-center gap-6">
                                {/* Icon / Status */}
                                <div className="relative">
                                        <div className={`w-12 h-12 rounded-md flex items-center justify-center border ${
                                            installProgress[server.id] ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 animate-pulse' :
                                            server.status === ServerStatus.ONLINE ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                            server.status === ServerStatus.OFFLINE ? 'bg-secondary border-border text-muted-foreground' :
                                            server.status === ServerStatus.INSTALLING ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' :
                                            'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                        }`}>
                                            {installProgress[server.id] ? <Loader2 size={24} className="animate-spin" /> : <Server size={24} />}
                                        </div>
                                    
                                    {server.status === ServerStatus.ONLINE && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-emerald-500"></div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div>
                                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{server.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-mono">
                                            {installProgress[server.id] ? (
                                                <span className="text-indigo-400 font-bold animate-pulse">{installProgress[server.id].message}</span>
                                            ) : (
                                                <span>{server.id}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden md:flex gap-6 text-xs text-muted-foreground font-mono border-l border-border pl-6">
                                        <div>
                                            <span className="block text-foreground/50 text-[10px] uppercase tracking-wider mb-0.5">Port</span>
                                            <span className="text-foreground">{server.port}</span>
                                        </div>
                                        <div>
                                            <span className="block text-foreground/50 text-[10px] uppercase tracking-wider mb-0.5">Memory</span>
                                            <span className="text-foreground">{server.ram} GB</span>
                                        </div>
                                        <div>
                                            <span className="block text-foreground/50 text-[10px] uppercase tracking-wider mb-0.5">Version</span>
                                            <span className="text-foreground">
                                                {server.version}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Diagnosis Alert - Stabilized Technical Badge */}
                                    {server.status === 'CRASHED' && (
                                        <div className="flex items-center gap-2 px-2 py-1 bg-rose-500/5 text-rose-500 border border-rose-500/20 rounded text-[9px] font-black uppercase tracking-[.15em]">
                                            <Stethoscope size={11} />
                                            <span>Analysis Required</span>
                                            <div className="w-px h-2.5 bg-rose-500/20 mx-0.5"></div>
                                            <Zap size={10} className="fill-rose-500" />
                                        </div>
                                    )}

                                    <div className="flex justify-end items-center gap-3">
                                        {/* Delete Button (Visible on Hover) */}
                                        <button 
                                            disabled={server.status === ServerStatus.ONLINE || server.status === ServerStatus.STARTING || !!installProgress[server.id] || server.status === ServerStatus.INSTALLING}
                                            onClick={(e) => handleDelete(e, server.id, server.name)}
                                            className={`p-2 rounded-md opacity-0 group-hover:opacity-100 transition-all ${
                                                (server.status === ServerStatus.ONLINE || server.status === ServerStatus.STARTING || !!installProgress[server.id] || server.status === ServerStatus.INSTALLING)
                                                ? 'text-muted-foreground/30 cursor-not-allowed'
                                                : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'
                                            }`}
                                            title={ (server.status === ServerStatus.ONLINE || server.status === ServerStatus.STARTING) ? "Stop server to delete" : "Delete Instance"}
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        {installProgress[server.id] ? (
                                            <div className="px-3 py-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 transition-colors text-xs font-bold flex items-center gap-2">
                                                <Loader2 size={12} className="animate-spin" /> Installing...
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded bg-secondary border border-border group-hover:bg-foreground group-hover:text-background transition-colors text-xs font-medium flex items-center gap-2">
                                                Connect <ArrowRight size={12} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Empty State / Create Prompt */}
                    {servers.length === 0 && (
                        <motion.div 
                            variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1 }
                            }}
                            className="text-center py-20 border border-dashed border-border rounded-lg"
                        >
                            <HardDrive className="mx-auto text-muted-foreground mb-4 opacity-50" size={48} />
                            <p className="text-muted-foreground">No local instances found.</p>
                        </motion.div>
                    )}
                </motion.div>

                {/* Import Server Modal */}
                {showImportModal && (
                    <ImportServerModal 
                        onClose={() => setShowImportModal(false)}
                        onSuccess={() => refreshServers()}
                    />
                )}
                
                {/* Footer Info */}
                <div className="mt-8 flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono opacity-50">
                    <span>Craft Commands Pro</span>
                    <span>System Ready</span>
                </div>
            </div>
        </div>
    );
};

export default ServerSelection;
