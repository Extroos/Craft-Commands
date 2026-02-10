import React, { useState, useRef, useEffect } from 'react';
import { useCollaboration } from '../../context/CollaborationContext';
import { useServers } from '../../context/ServerContext';
import { useUser } from '../../context/UserContext';
import { ChatMessage, ActivityEvent, UserRole } from '@shared/types';
import { 
    MessageCircle, Send, X, Users, Activity as ActivityIcon,
    Play, Square, RotateCcw, Terminal, Puzzle, Archive, FileEdit, 
    Shield, Clock, Eye, Monitor, FolderOpen, Settings
} from 'lucide-react';

const ROLE_RANK: Record<UserRole, number> = { 'VIEWER': 0, 'MANAGER': 1, 'ADMIN': 2, 'OWNER': 3 };

// --- Role Badges ---
const ROLE_BADGE: Record<UserRole, { bg: string; text: string; label: string }> = {
    'OWNER':   { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'OWNER' },
    'ADMIN':   { bg: 'bg-red-500/15',   text: 'text-red-400',   label: 'ADMIN' },
    'MANAGER': { bg: 'bg-blue-500/15',  text: 'text-blue-400',  label: 'MGR' },
    'VIEWER':  { bg: 'bg-zinc-500/15',  text: 'text-zinc-400',  label: 'VIEW' },
};

const ROLE_DOT: Record<UserRole, string> = {
    'OWNER': 'bg-amber-500', 'ADMIN': 'bg-red-500', 'MANAGER': 'bg-blue-500', 'VIEWER': 'bg-zinc-500'
};

// --- Activity Action Icons ---
const ACTION_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
    'SERVER_START':      { icon: <Play size={11} />,        color: 'text-emerald-400' },
    'SERVER_STOP':       { icon: <Square size={11} />,      color: 'text-rose-400' },
    'SERVER_RESTART':    { icon: <RotateCcw size={11} />,   color: 'text-amber-400' },
    'COMMAND_SENT':      { icon: <Terminal size={11} />,    color: 'text-blue-400' },
    'PLUGIN_INSTALLED':  { icon: <Puzzle size={11} />,      color: 'text-purple-400' },
    'PLUGIN_REMOVED':    { icon: <Puzzle size={11} />,      color: 'text-rose-400' },
    'PLUGIN_TOGGLED':    { icon: <Puzzle size={11} />,      color: 'text-amber-400' },
    'BACKUP_CREATED':    { icon: <Archive size={11} />,     color: 'text-cyan-400' },
    'BACKUP_RESTORED':   { icon: <Archive size={11} />,     color: 'text-amber-400' },
    'CONFIG_CHANGED':    { icon: <FileEdit size={11} />,    color: 'text-orange-400' },
    'FILE_EDITED':       { icon: <FileEdit size={11} />,    color: 'text-zinc-400' },
    'USER_JOINED_PANEL': { icon: <Users size={11} />,       color: 'text-emerald-400' },
    'USER_LEFT_PANEL':   { icon: <Users size={11} />,       color: 'text-zinc-500' },
    'PLAYER_KICKED':     { icon: <Shield size={11} />,      color: 'text-rose-400' },
    'PLAYER_BANNED':     { icon: <Shield size={11} />,      color: 'text-rose-500' },
    'SCHEDULE_CREATED':  { icon: <Clock size={11} />,       color: 'text-blue-400' },
    'SCHEDULE_DELETED':  { icon: <Clock size={11} />,       color: 'text-rose-400' },
};

const VIEW_ICON: Record<string, React.ReactNode> = {
    'dashboard': <Monitor size={10} />,
    'console': <Terminal size={10} />,
    'files': <FolderOpen size={10} />,
    'plugins': <Puzzle size={10} />,
    'settings': <Settings size={10} />,
};

const timeAgo = (ts: number) => {
    const d = Date.now() - ts;
    if (d < 60_000) return 'now';
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
    return new Date(ts).toLocaleDateString();
};

type Tab = 'chat' | 'activity' | 'presence';

const OperatorChat: React.FC<{ serverId?: string }> = ({ serverId }) => {
    // --- Hooks ---
    const { currentServer } = useServers();
    const { user } = useUser();
    const { chatMessages, typingUsers, sendChat, sendTyping, presence, activities } = useCollaboration();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('chat');
    const [message, setMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastTypingEmit = useRef(0);

    const id = serverId || currentServer?.id;
    const messages = id ? (chatMessages[id] || []) : [];

    // Reset unread on server switch
    useEffect(() => {
        setUnreadCount(0);
    }, [id]);

    // Clear unread when viewing chat
    useEffect(() => {
        if (isOpen && activeTab === 'chat' && unreadCount > 0) {
            setUnreadCount(0);
        }
    }, [isOpen, activeTab, unreadCount]);

    // Scroll to bottom
    useEffect(() => {
        const isViewingChat = isOpen && activeTab === 'chat';
        if (isViewingChat && messages.length > 0) {
            // Only auto-scroll if it's our own message or we are already close to bottom
            // For now, keep it simple and always scroll if the tab is active
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, isOpen, activeTab]);

    // Track unread messages
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg) return;

        // Skip if it's our own message
        if (lastMsg.userId === user?.id) return;
        
        // Skip if it's a system message
        if (lastMsg.type === 'system') return;

        // If panel is closed OR user is on another tab, increment unread
        const isViewingChat = isOpen && activeTab === 'chat';
        if (!isViewingChat) {
            setUnreadCount(prev => prev + 1);
        }
    }, [messages.length, user?.id]); // Only run on new messages

    // --- Logic & Returns ---
    if (!id) return null;

    const collab = currentServer?.collabSettings;
    const canReadChat = ROLE_RANK[user?.role || 'VIEWER'] >= ROLE_RANK[collab?.chat?.minRole || 'VIEWER'];
    const canSendChat = ROLE_RANK[user?.role || 'VIEWER'] >= ROLE_RANK[collab?.chat?.minSendRole || 'MANAGER'];
    const chatEnabled = collab?.chat?.enabled !== false;
    const canSeePresence = ROLE_RANK[user?.role || 'VIEWER'] >= ROLE_RANK[collab?.presence?.minRole || 'VIEWER'];
    const canSeeActivity = ROLE_RANK[user?.role || 'VIEWER'] >= ROLE_RANK[collab?.activityFeed?.minRole || 'VIEWER'];

    if (!chatEnabled && !canSeePresence && !canSeeActivity) return null;

    const typing = id ? (typingUsers[id] || []) : [];
    const users = id ? (presence[id] || []) : [];
    const events = id ? (activities[id] || []).filter(e => ROLE_RANK[user?.role || 'VIEWER'] >= ROLE_RANK[e.visibility]) : [];

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !canSendChat) return;
        sendChat(id, message.trim());
        setMessage('');
        setUnreadCount(0); // Clear unread on own message
        inputRef.current?.focus();
        // Force scroll for own message
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleTyping = () => {
        const now = Date.now();
        if (now - lastTypingEmit.current > 2000) {
            sendTyping(id);
            lastTypingEmit.current = now;
        }
    };

    // --- Floating Button (Closed State) ---
    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); setUnreadCount(0); }}
                className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center z-50"
            >
                <MessageCircle size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                {users.length > 0 && (
                    <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 bg-emerald-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border-2 border-background">
                        {users.length}
                    </span>
                )}
            </button>
        );
    }

    // --- Tab Config ---
    const tabs: { key: Tab; icon: React.ReactNode; label: string; count?: number; visible: boolean }[] = [
        { key: 'chat', icon: <MessageCircle size={13} />, label: 'Chat', count: (activeTab !== 'chat' ? unreadCount : 0), visible: canReadChat },
        { key: 'activity', icon: <ActivityIcon size={13} />, label: 'Activity', count: events.length, visible: canSeeActivity },
        { key: 'presence', icon: <Users size={13} />, label: 'Online', count: users.length, visible: canSeePresence },
    ];

    const visibleTabs = tabs.filter(t => t.visible);

    return (
        <div className="fixed bottom-6 right-6 w-[380px] z-50" style={{ height: 'min(520px, calc(100vh - 100px))' }}>
            <div className="flex flex-col h-full rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-foreground tracking-wide">Team Panel</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex gap-0.5 bg-secondary/50 rounded-lg p-0.5">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count != null && tab.count > 0 && (
                                    <span className={`text-[8px] px-1 py-0.5 rounded-full font-bold ${
                                        activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">

                    {/* ========== CHAT TAB ========== */}
                    {activeTab === 'chat' && (
                        <>
                            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-border">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 text-center">
                                        <MessageCircle size={28} className="mb-2 opacity-15" />
                                        <p className="text-[11px]">No messages yet</p>
                                        <p className="text-[9px] mt-0.5 opacity-50">Chat with your team here</p>
                                    </div>
                                ) : messages.map((msg: ChatMessage) => {
                                    const isOwn = msg.userId === user?.id;
                                    const isSystem = msg.type === 'system';
                                    const badge = ROLE_BADGE[msg.role];

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="text-center text-[9px] text-muted-foreground/30 py-0.5">
                                                {msg.content}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                            {/* Avatar */}
                                            <div className="shrink-0 mt-1">
                                                {msg.avatar ? (
                                                    <img src={msg.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                                                ) : (
                                                    <div className={`w-6 h-6 rounded-full ${ROLE_DOT[msg.role]} flex items-center justify-center text-[10px] font-bold text-white`}>
                                                        {msg.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`max-w-[75%]`}>
                                                {!isOwn && (
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <span className="text-[10px] font-semibold text-foreground">{msg.username}</span>
                                                        <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${badge.bg} ${badge.text}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className={`px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed break-words ${
                                                    isOwn
                                                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                        : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[8px] text-muted-foreground/20 mt-0.5 block">
                                                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* New Messages Jump Button (Stabilization) */}
                            {unreadCount > 0 && activeTab === 'chat' && (
                                <button
                                    onClick={() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                        setUnreadCount(0);
                                    }}
                                    className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 z-10"
                                >
                                    <MessageCircle size={12} />
                                    {unreadCount} New Messages
                                </button>
                            )}

                            {/* Typing + Input */}
                            <div className="shrink-0 border-t border-border bg-muted/20">
                                {typing.length > 0 && (
                                    <div className="px-3 py-1 text-[9px] text-muted-foreground/50 animate-pulse">
                                        {typing.map(t => t.username).join(', ')} typing...
                                    </div>
                                )}
                                {canSendChat ? (
                                    <form onSubmit={handleSend} className="p-2">
                                        <div className="flex gap-1.5 items-center bg-background border border-border rounded-lg px-2.5 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={message}
                                                onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                                                placeholder="Type a message..."
                                                maxLength={500}
                                                className="flex-1 bg-transparent border-none text-[11px] text-foreground focus:outline-none placeholder:text-muted-foreground/40"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!message.trim()}
                                                className="p-1 text-primary hover:bg-primary/10 rounded disabled:opacity-0 transition-all"
                                            >
                                                <Send size={13} />
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="p-2 text-center text-[9px] text-muted-foreground/40">
                                        Read-only — your role does not allow sending messages
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ========== ACTIVITY TAB ========== */}
                    {activeTab === 'activity' && (
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                            {events.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 text-center p-6">
                                    <ActivityIcon size={28} className="mb-2 opacity-15" />
                                    <p className="text-[11px]">No activity yet</p>
                                    <p className="text-[9px] mt-0.5 opacity-50">Server events will appear here</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-0.5">
                                    {events.map((event: ActivityEvent) => {
                                        const config = ACTION_ICON[event.action] || { icon: <ActivityIcon size={11} />, color: 'text-zinc-400' };
                                        return (
                                            <div key={event.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors group">
                                                <div className={`mt-0.5 p-1 rounded-md ${config.color} bg-secondary/40`}>
                                                    {config.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-[10px] font-bold text-foreground">{event.username}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate">{event.detail}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {timeAgo(event.timestamp)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========== PRESENCE TAB ========== */}
                    {activeTab === 'presence' && (
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                            {users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 text-center p-6">
                                    <Users size={28} className="mb-2 opacity-15" />
                                    <p className="text-[11px]">No one else is online</p>
                                    <p className="text-[9px] mt-0.5 opacity-50">Team members will appear when they join</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {users.map(entry => {
                                        const dot = ROLE_DOT[entry.role];
                                        const badge = ROLE_BADGE[entry.role];
                                        return (
                                            <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                                                {/* Avatar */}
                                                <div className="relative shrink-0">
                                                    {entry.avatar ? (
                                                        <img src={entry.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded-full ${dot} flex items-center justify-center text-white text-xs font-bold`}>
                                                            {entry.username.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-semibold text-foreground truncate">{entry.username}</span>
                                                        <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${badge.bg} ${badge.text}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground/50">
                                                        {entry.activeView.startsWith('files:') ? <FileEdit size={9} /> : (VIEW_ICON[entry.activeView] || <Eye size={9} />)}
                                                        <span className="capitalize">
                                                            {entry.activeView.startsWith('files:') 
                                                                ? `Editing ${entry.activeView.split(':')[1]}` 
                                                                : entry.activeView
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperatorChat;
