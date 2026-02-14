import React from 'react';
import { useCollaboration } from '@features/collaboration/context/CollaborationContext';
import { useServers } from '@features/servers/context/ServerContext';
import { useUser } from '@features/auth/context/UserContext';
import { PresenceEntry, UserRole } from '@shared/types';
import { Eye, Monitor, Terminal, FolderOpen, Puzzle, Settings } from 'lucide-react';

const ROLE_RANK: Record<UserRole, number> = { 'VIEWER': 0, 'MANAGER': 1, 'ADMIN': 2, 'OWNER': 3 };

const VIEW_ICONS: Record<string, React.ReactNode> = {
    'dashboard': <Monitor size={10} />,
    'console': <Terminal size={10} />,
    'files': <FolderOpen size={10} />,
    'plugins': <Puzzle size={10} />,
    'settings': <Settings size={10} />,
};

const ROLE_COLORS: Record<UserRole, string> = {
    'OWNER': 'bg-amber-500',
    'ADMIN': 'bg-red-500',
    'MANAGER': 'bg-blue-500',
    'VIEWER': 'bg-zinc-500'
};

const PresenceBar: React.FC<{ serverId?: string }> = ({ serverId }) => {
    const { currentServer } = useServers();
    const { user } = useUser();
    const { presence } = useCollaboration();

    const id = serverId || currentServer?.id;
    if (!id) return null;

    // Check if the current user meets the minimum role for presence visibility
    const collab = currentServer?.collabSettings;
    const minRole = collab?.presence?.minRole || 'VIEWER';
    if (!user?.role || ROLE_RANK[user.role] < ROLE_RANK[minRole]) return null;

    const users = presence[id] || [];
    if (users.length === 0) return null;

    return (
        <div className="flex items-center gap-1.5">
            <Eye size={12} className="text-muted-foreground/50" />
            <div className="flex items-center -space-x-1.5">
                {users.slice(0, 8).map((entry: PresenceEntry) => (
                    <div
                        key={entry.userId}
                        className="relative group"
                    >
                        {/* Avatar circle */}
                        <div
                            className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white ${ROLE_COLORS[entry.role]} transition-transform hover:scale-110 cursor-default overflow-hidden relative shadow-sm`}
                        >
                            {entry.avatar ? (
                                <img src={entry.avatar} alt={entry.username} className="w-full h-full object-cover" />
                            ) : (
                                entry.username.charAt(0).toUpperCase()
                            )}
                        </div>

                        {/* Active view indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-background rounded-full flex items-center justify-center">
                            <div className="text-muted-foreground">
                                {VIEW_ICONS[entry.activeView] || <Eye size={8} />}
                            </div>
                        </div>

                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-popover text-popover-foreground text-[10px] rounded-lg shadow-2xl border border-border opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-[100] min-w-[100px]">
                            {/* Arrow */}
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-t border-l border-border rotate-45" />
                            
                            <div className="relative">
                                <div className="font-bold flex items-center justify-between gap-2">
                                    {entry.username}
                                    <span className="text-[8px] opacity-70 bg-secondary px-1 rounded uppercase tracking-tighter">{entry.role}</span>
                                </div>
                                <div className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <div className="bg-primary/20 p-0.5 rounded">
                                        {VIEW_ICONS[entry.activeView] || <Eye size={8} />}
                                    </div>
                                    <span className="capitalize">{entry.activeView}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {users.length > 8 && (
                    <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                        +{users.length - 8}
                    </div>
                )}
            </div>
            <span className="text-[10px] text-muted-foreground/50 ml-1">{users.length} viewing</span>
        </div>
    );
};

export default PresenceBar;
