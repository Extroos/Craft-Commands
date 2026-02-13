import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Server, Plus, Trash2, RefreshCw, Wifi, WifiOff, 
    Activity, HardDrive, Cpu, MemoryStick, Clock, Tag, AlertTriangle, X,
    Coffee, Box, Wand2, Monitor, Globe, ChevronRight, Copy, Check, Download,
    Shield, Terminal
} from 'lucide-react';
import { socketService } from '@core/services/socket';
import { API } from '@core/services/api';
import { useToast } from '../ui/Toast';
import { NodeInfo } from '@shared/types';
import { AddNodeWizard } from './wizard/AddNodeWizard';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * NodesManager — Distributed Nodes management panel
 * 
 * Embedded within GlobalSettings when the feature is enabled.
 * Shows enrolled nodes with live status, health metrics, and enrollment UI.
 */

const STATUS_COLORS: Record<string, string> = {
    'ONLINE': 'bg-emerald-500',
    'OFFLINE': 'bg-zinc-500',
    'DEGRADED': 'bg-amber-500',
    'ENROLLING': 'bg-blue-500'
};

const STATUS_TEXT_COLORS: Record<string, string> = {
    'ONLINE': 'text-emerald-500',
    'OFFLINE': 'text-zinc-500',
    'DEGRADED': 'text-amber-500',
    'ENROLLING': 'text-blue-500'
};

const NodesManager: React.FC = () => {
    const [nodes, setNodes] = useState<NodeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [enrolling, setEnrolling] = useState(false);
    const [fixingIds, setFixingIds] = useState<Record<string, string>>({}); // nodeId:capability
    const [copied, setCopied] = useState(false);
    const { addToast } = useToast();

    // Enroll form state (Legacy flow - used for Manual/VPS mode)
    const [enrollForm, setEnrollForm] = useState({
        name: '', host: '', port: 9090, labels: ''
    });

    const fetchNodes = useCallback(async () => {
        try {
            setLoading(true);
            const data = await API.getNodes();
            setNodes(data.nodes || []);
        } catch (err: any) {
            if (!err.message?.includes('Distributed Nodes is disabled')) {
                addToast('error', 'Error', err.message || 'Failed to load nodes');
            }
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchNodes();
        // Poll every 15s for status updates
        const interval = setInterval(fetchNodes, 15000);
        return () => clearInterval(interval);
    }, [fetchNodes]);

    // Handle real-time node status events
    useEffect(() => {
        const handleNodeStatus = (data: { nodeId: string, status: string, node: NodeInfo }) => {
            // Update local nodes list
            setNodes(prev => {
                const index = prev.findIndex(n => n.id === data.nodeId);
                if (index >= 0) {
                    const next = [...prev];
                    next[index] = data.node;
                    return next;
                }
                return [...prev, data.node];
            });

            // If we are waiting for this node in the global state, we would handle successes here,
            // but for now the AddNodeWizard handles its own successes via local polling or socket events.
            addToast('success', 'Node Connected', `Node "${data.node.name}" is now online!`);
        };

        const unsub = socketService.onNodeStatus(handleNodeStatus);
        return () => { unsub(); };
    }, [addToast]);

    const handleEnroll = async () => {
        if (!enrollForm.name.trim() || !enrollForm.host.trim()) {
            addToast('error', 'Validation', 'Name and host are required.');
            return;
        }

        setEnrolling(true);
        try {
            const labels = enrollForm.labels
                .split(',')
                .map(l => l.trim())
                .filter(Boolean);

            const node = await API.enrollNode({
                name: enrollForm.name.trim(),
                host: enrollForm.host.trim(),
                port: enrollForm.port,
                labels
            });

            setNodes(prev => [...prev, node]);
            setEnrollForm({ name: '', host: '', port: 9090, labels: '' });
            addToast('success', 'Enrolled', `Node "${node.name}" enrolled successfully.`);
        } catch (err: any) {
            addToast('error', 'Enrollment Failed', err.message || 'Enrollment failed');
        } finally {
            // Loading is handled by local state or caller
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        addToast('success', 'Copied', 'Connection details copied to clipboard.');
    };

    const handleRemove = async (nodeId: string, nodeName: string) => {
        if (!confirm(`Remove node "${nodeName}"? This cannot be undone.`)) return;

        setRemovingId(nodeId);
        try {
            await API.removeNode(nodeId);
            setNodes(prev => prev.filter(n => n.id !== nodeId));
            addToast('success', 'Removed', `Node "${nodeName}" removed.`);
        } catch (err: any) {
            addToast('error', 'Error', err.message || 'Failed to remove node');
        } finally {
            setRemovingId(null);
        }
    };

    const handleFix = async (nodeId: string, nodeName: string, capability: string) => {
        if (fixingIds[nodeId]) return;
        
        setFixingIds(prev => ({ ...prev, [nodeId]: capability }));
        addToast('info', 'Fixing', `Applying fix for ${capability} on node "${nodeName}"...`);
        
        try {
            const res = await API.fixNodeCapability(nodeId, capability);
            if (res.ok) {
                addToast('success', 'Fixed', `Successfully applied fix for ${capability} on node "${nodeName}".`);
                await fetchNodes(); // Refresh capabilities
            }
        } catch (err: any) {
            addToast('error', 'Fix Failed', err.message || `Failed to fix ${capability}`);
        } finally {
            setFixingIds(prev => {
                const updated = { ...prev };
                delete updated[nodeId];
                return updated;
            });
        }
    };

    const formatLastSeen = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 10) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m ago`;
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg border border-border/50">
                        <Server size={14} className="text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Total Nodes: <span className="text-foreground font-bold">{nodes.length}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600">
                            Online: <span className="font-bold">{nodes.filter(n => n.status === 'ONLINE').length}</span>
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchNodes}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-lg text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Node
                    </button>
                </div>
            </div>

            {/* Nodes Table Header */}
            {nodes.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                    <div className="col-span-3">Node Name</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Connection</div>
                    <div className="col-span-3">Resources</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
            )}

            {/* Node List */}
            {loading && nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <RefreshCw size={24} className="animate-spin mb-3 opacity-50" />
                    <span className="text-sm">Syncing infrastructure...</span>
                </div>
            ) : nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/30 rounded-xl bg-secondary/5">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                        <Server size={32} className="opacity-40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No Nodes Connected</h3>
                    <p className="text-sm max-w-sm text-center mb-6 text-muted-foreground">
                        Enroll remote machines to distribute your Minecraft servers across multiple hosts for better performance.
                    </p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
                    >
                        <Plus size={16} />
                        Enroll First Node
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {nodes.map(node => (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className={`group grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all ${
                                    node.status === 'ONLINE' 
                                    ? 'bg-card border-border/50 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5' 
                                    : 'bg-secondary/20 border-border/30 opacity-70 grayscale-[0.5]'
                                }`}
                            >
                                {/* Name & ID */}
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                        node.status === 'ONLINE' ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10' : 'bg-transparent'
                                    }`}>
                                        <Server size={18} className={node.status === 'ONLINE' ? 'text-cyan-500' : 'text-zinc-500'} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm truncate" title={node.name}>{node.name}</span>
                                            {node.id === 'local' && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-secondary border border-border text-muted-foreground uppercase tracking-wider font-bold">
                                                    Local
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono truncate opacity-60">
                                            {node.id.substring(0, 8)}...
                                        </div>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="col-span-2">
                                    <div className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                        node.status === 'ONLINE' 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[node.status] || 'bg-zinc-500'} ${node.status === 'ONLINE' ? 'animate-pulse' : ''}`} />
                                        {node.status}
                                    </div>
                                </div>

                                {/* Connection Info */}
                                <div className="col-span-2">
                                    <div className="text-xs font-mono text-muted-foreground/80 mb-0.5">
                                        {node.host}:{node.port}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-70">
                                        <Clock size={10} />
                                        {formatLastSeen(node.lastHeartbeat)}
                                    </div>
                                </div>

                                {/* Health Metrics */}
                                <div className="col-span-3">
                                    {node.status === 'ONLINE' && node.health ? (
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                                                    <Cpu size={10} /> CPU
                                                </div>
                                                <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                                    <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${node.health.cpu}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                                                    <MemoryStick size={10} /> RAM
                                                </div>
                                                <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-violet-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${node.health.memoryTotal ? (node.health.memoryUsed / node.health.memoryTotal) * 100 : 0}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground/50 italic">Metrics unavailable</span>
                                    )}
                                </div>

                                {/* Actions & Capabilities */}
                                <div className="col-span-2 flex items-center justify-end gap-2">
                                    {node.status === 'ONLINE' && node.capabilities && (
                                        <div className="flex -space-x-1 mr-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-background text-[10px] ${
                                                    node.capabilities.docker ? 'bg-blue-500/20 text-blue-600' : 'bg-secondary text-muted-foreground/30'
                                                }`} title={node.capabilities.docker ? 'Docker Ready' : 'Docker Missing'}>
                                                <Box size={12} />
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-background text-[10px] ${
                                                    node.capabilities.java ? 'bg-orange-500/20 text-orange-600' : 'bg-red-500/20 text-red-500'
                                                }`} title={node.capabilities.java ? `Java: ${node.capabilities.java}` : 'Java Missing'}>
                                                <Coffee size={12} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Fix Button (Contextual) */}
                                    {node.status === 'ONLINE' && !node.capabilities?.java && node.capabilities?.os?.toLowerCase().includes('windows') && (
                                         <button 
                                            onClick={() => handleFix(node.id, node.name, 'java')}
                                            disabled={!!fixingIds[node.id]}
                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                            title="Auto-Fix Java"
                                        >
                                            <Wand2 size={14} className={fixingIds[node.id] === 'java' ? 'animate-spin' : ''} />
                                        </button>
                                    )}

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleRemove(node.id, node.name)}
                                        disabled={removingId === node.id || node.id === 'local'}
                                        className={`p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ${
                                            node.id === 'local' ? 'hidden' : ''
                                        }`}
                                        title="Remove Node"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Node Add Wizard Overlay */}
            {showWizard && (
                <AddNodeWizard 
                    onClose={() => setShowWizard(false)} 
                    onComplete={() => {
                        fetchNodes();
                        setShowWizard(false);
                    }}
                />
            )}
        </div>
    );
};

export default NodesManager;
