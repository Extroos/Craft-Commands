import React, { useState } from 'react';
import { useCollaboration } from '../../context/CollaborationContext';
import { useServers } from '../../context/ServerContext';
import { useUser } from '../../context/UserContext';
import { ActivityEvent, UserRole } from '@shared/types';
import { 
    Activity, Play, Square, RotateCcw, Terminal, Puzzle, 
    Archive, FileEdit, Users, Shield, Clock, Filter, ChevronDown, ChevronUp
} from 'lucide-react';

const ROLE_RANK: Record<UserRole, number> = { 'VIEWER': 0, 'MANAGER': 1, 'ADMIN': 2, 'OWNER': 3 };

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'SERVER_START':      { icon: <Play size={12} />,        color: 'text-emerald-400', label: 'Started' },
    'SERVER_STOP':       { icon: <Square size={12} />,      color: 'text-rose-400',    label: 'Stopped' },
    'SERVER_RESTART':    { icon: <RotateCcw size={12} />,   color: 'text-amber-400',   label: 'Restarted' },
    'COMMAND_SENT':      { icon: <Terminal size={12} />,    color: 'text-blue-400',    label: 'Command' },
    'PLUGIN_INSTALLED':  { icon: <Puzzle size={12} />,      color: 'text-purple-400',  label: 'Plugin' },
    'PLUGIN_REMOVED':    { icon: <Puzzle size={12} />,      color: 'text-rose-400',    label: 'Plugin' },
    'PLUGIN_TOGGLED':    { icon: <Puzzle size={12} />,      color: 'text-amber-400',   label: 'Plugin' },
    'BACKUP_CREATED':    { icon: <Archive size={12} />,     color: 'text-cyan-400',    label: 'Backup' },
    'BACKUP_RESTORED':   { icon: <Archive size={12} />,     color: 'text-amber-400',   label: 'Restored' },
    'CONFIG_CHANGED':    { icon: <FileEdit size={12} />,    color: 'text-orange-400',  label: 'Config' },
    'FILE_EDITED':       { icon: <FileEdit size={12} />,    color: 'text-zinc-400',    label: 'File' },
    'USER_JOINED_PANEL': { icon: <Users size={12} />,       color: 'text-emerald-400', label: 'Joined' },
    'USER_LEFT_PANEL':   { icon: <Users size={12} />,       color: 'text-zinc-500',    label: 'Left' },
    'PLAYER_KICKED':     { icon: <Shield size={12} />,      color: 'text-rose-400',    label: 'Kicked' },
    'PLAYER_BANNED':     { icon: <Shield size={12} />,      color: 'text-rose-500',    label: 'Banned' },
    'SCHEDULE_CREATED':  { icon: <Clock size={12} />,       color: 'text-blue-400',    label: 'Schedule' },
    'SCHEDULE_DELETED':  { icon: <Clock size={12} />,       color: 'text-rose-400',    label: 'Schedule' },
};

const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
};

const ActivityFeed: React.FC<{ serverId?: string; compact?: boolean }> = ({ serverId, compact = false }) => {
    const { currentServer } = useServers();
    const { user } = useUser();
    const { activities } = useCollaboration();
    const [filterAction, setFilterAction] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(!compact);

    const id = serverId || currentServer?.id;
    if (!id) return null;

    // Role check
    const collab = currentServer?.collabSettings;
    const minRole = collab?.activityFeed?.minRole || 'VIEWER';
    if (!user?.role || ROLE_RANK[user.role] < ROLE_RANK[minRole]) return null;

    const events = (activities[id] || [])
        .filter(e => ROLE_RANK[user?.role || 'VIEWER'] >= ROLE_RANK[e.visibility])
        .filter(e => !filterAction || e.action === filterAction);

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            {/* Header */}
            <div 
                className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">Activity Feed</span>
                    {events.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {events.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isExpanded && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setFilterAction(filterAction ? null : 'COMMAND_SENT'); }}
                            className={`p-1 rounded transition-colors ${
                                filterAction ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Filter actions"
                        >
                            <Filter size={12} />
                        </button>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
            </div>

            {/* Timeline */}
            {isExpanded && (
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                    {events.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground/50">
                            No activity yet.
                        </div>
                    ) : (
                        <div className="p-2 space-y-0.5">
                            {events.map((event: ActivityEvent) => {
                                const config = ACTION_CONFIG[event.action] || { 
                                    icon: <Activity size={12} />, color: 'text-zinc-400', label: event.action 
                                };
                                return (
                                    <div 
                                        key={event.id}
                                        className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group"
                                    >
                                        <div className={`mt-0.5 p-1 rounded ${config.color} bg-secondary/50`}>
                                            {config.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-semibold text-foreground truncate">
                                                    {event.username}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {event.detail}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {formatTime(event.timestamp)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityFeed;
