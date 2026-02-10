
import React, { useState, useEffect, useRef } from 'react';
import { Power, RotateCcw, Ban, Activity, Cpu, Network, Users, Copy, Check, Disc, Clock, Terminal, AlertTriangle, Info, X, Download, Zap } from 'lucide-react';
import { ServerStatus, ServerConfig, TabView } from '@shared/types';

import { API } from '../../services/api';
import { socketService } from '../../services/socket';

import { useToast } from '../UI/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DiagnosisCard } from '../Dashboard/DiagnosisCard';


import { Responsive, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const DEFAULT_LAYOUTS = {
    lg: [
        { i: 'hero', x: 0, y: 0, w: 4, h: 3, minW: 1, minH: 1 },
        { i: 'uptime', x: 0, y: 3, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'tps', x: 1, y: 3, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'players', x: 2, y: 3, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'network', x: 3, y: 3, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'cpu', x: 0, y: 5, w: 2, h: 4, minW: 1, minH: 2 },
        { i: 'memory', x: 2, y: 5, w: 2, h: 4, minW: 1, minH: 2 },
        { i: 'terminal', x: 0, y: 9, w: 4, h: 1, minW: 1, minH: 1 }
    ],
    md: [
        { i: 'hero', x: 0, y: 0, w: 2, h: 5, minW: 1, minH: 1 },
        { i: 'uptime', x: 0, y: 5, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'tps', x: 1, y: 5, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'players', x: 0, y: 7, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'network', x: 1, y: 7, w: 1, h: 2, minW: 1, minH: 1 },
        { i: 'cpu', x: 0, y: 9, w: 2, h: 4, minW: 1, minH: 2 },
        { i: 'memory', x: 0, y: 13, w: 2, h: 4, minW: 1, minH: 2 },
        { i: 'terminal', x: 0, y: 17, w: 2, h: 1, minW: 1, minH: 1 }
    ]
};

interface DashboardProps {
    serverId: string;
}

interface AnalysisResult {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    issues: string[];
    environment: {
        java?: string;
        loader?: string;
    };
}

// Technical Sparkline
const Sparkline: React.FC<{ data: number[], color: string, height?: number, max?: number, label?: string, id: string }> = ({ data, color, height = 120, max = 100, label, id }) => {
    if (data.length < 2) return null;

    const width = 200;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (Math.min(val, max) / max) * height;
        return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;

    return (
        <div className="relative w-full h-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Clean Grid Lines */}
                <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="currentColor" strokeOpacity="0.05" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="currentColor" strokeOpacity="0.05" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="currentColor" strokeOpacity="0.05" vectorEffect="non-scaling-stroke" />
                
                {/* Simple Trend Line */}
                <path 
                    d={pathData} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="1.5" 
                    vectorEffect="non-scaling-stroke" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="opacity-90"
                />
            </svg>
            {label && (
                <div className="absolute top-0 right-0 text-[10px] font-bold text-muted-foreground/60 tracking-tight">
                    {label}
                </div>
            )}
        </div>
    );
};

import { useServers } from '../../context/ServerContext';
import { useUser } from '../../context/UserContext';

const Dashboard: React.FC<DashboardProps> = ({ serverId }) => {
    const { servers, stats: allStats, logs, javaDownloadStatus, installProgress: allInstallProgress } = useServers();
    const { user, updatePreferences } = useUser();
    const server = servers.find(s => s.id === serverId);
    
    // Check for active installation for THIS server
    const installProgress = allInstallProgress && allInstallProgress[serverId];
    
    const [hasConflict, setHasConflict] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const [cpuHistory, setCpuHistory] = useState<number[]>(Array(40).fill(0));
    const [memHistory, setMemHistory] = useState<number[]>(Array(40).fill(0));
    const [copied, setCopied] = useState(false);
    const { addToast } = useToast();

    const [crashReport, setCrashReport] = useState<{ analysis: string, logs: string[] } | null>(null);
    const [showCrashModal, setShowCrashModal] = useState(false);
    
    // Update Logic

    // Layout & Container State
    const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
    
    // Force strict minimums on any loaded layout
    const sanitizeLayout = (layouts: any) => {
        const sanitized: any = {};
        Object.keys(layouts).forEach(key => {
            sanitized[key] = layouts[key].map((item: any) => ({
                ...item,
                minW: 1,
                minH: 1
            }));
        });
        return sanitized;
    };

    const [layouts, setLayouts] = useState(() => sanitizeLayout(user?.preferences?.dashboardLayout || DEFAULT_LAYOUTS));

    // Layout reset logic when quality mode is toggled off
    useEffect(() => {
        if (!user?.preferences?.visualQuality) {
            setLayouts(DEFAULT_LAYOUTS);
        }
    }, [user?.preferences?.visualQuality]);

    const onLayoutChange = (currentLayout: any, allLayouts: any) => {
        if (!user?.preferences?.visualQuality) return;
        setLayouts(allLayouts);
        updatePreferences({ dashboardLayout: allLayouts });
    };

    // Diagnosis State
    const [diagnosisResult, setDiagnosisResult] = useState<any>(null);

    // Java Download Status - only consider active download phases
    const isJavaDownloading = javaDownloadStatus && 
        (javaDownloadStatus.phase === 'downloading' || 
         javaDownloadStatus.phase === 'extracting' || 
         javaDownloadStatus.phase === 'installing');

    // Auto-Diagnosis Trigger
    useEffect(() => {
        if (server?.status === 'CRASHED' || (server?.status === 'OFFLINE' && !diagnosisResult)) {
            // Check if we should diagnose (e.g. if it just crashed)
            // For now, we'll run it once if we see CRASHED
            if (server.status === 'CRASHED') {
                runDiagnosis();
            }
        } else if (server?.status === 'ONLINE' || server?.status === 'STARTING') {
            setDiagnosisResult(null); // Clear on start
        }
    }, [server?.status]);

    const runDiagnosis = async () => {
        try {
            const results = await API.runDiagnosis(serverId);
            // API returns array, take first result or null
            const result = Array.isArray(results) && results.length > 0 ? results[0] : null;

            if (result) {
                const ignored = JSON.parse(localStorage.getItem(`ignored_diagnoses_${serverId}`) || '[]');
                if (!ignored.includes(result.ruleId)) {
                    setDiagnosisResult(result);
                }
            } else {
                setDiagnosisResult(null);
            }
        } catch (e) {
            console.error('Diagnosis failed:', e);
        }
    };


    // Java download status is now managed by ServerContext


    // Get current stats from global context
    const stats = allStats[serverId] || { cpu: 0, memory: 0, uptime: 0, latency: 0, players: 0, playerList: [], isRealOnline: false, tps: "0.00", pid: 0 };

    const status = server.status;
    const isOnline = status === ServerStatus.ONLINE || status === ServerStatus.STARTING || status === ServerStatus.UNMANAGED;

    // SMOOTH UPTIME INTERPOLATION
    const [displayUptime, setDisplayUptime] = useState(stats.uptime);

    // Sync from global stats when they arrive (every 3s)
    useEffect(() => {
        // Only sync if the gap is significant (to prevent backward jumps)
        // or if it's the first sync/reset
        if (Math.abs(displayUptime - stats.uptime) > 2 || stats.uptime === 0) {
             setDisplayUptime(stats.uptime);
        }
    }, [stats.uptime]);

    // Local High-Frequency Ticker (1hz)
    useEffect(() => {
        const isProcessActive = stats.isRealOnline || status === ServerStatus.ONLINE || status === ServerStatus.STARTING || status === ServerStatus.UNMANAGED;
        const reducedMotion = user?.preferences?.reducedMotion ?? false;

        if (!isProcessActive || reducedMotion) {
            if (displayUptime !== stats.uptime) setDisplayUptime(stats.uptime);
            return;
        }

        const timer = setInterval(() => {
            setDisplayUptime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [status, stats.isRealOnline, user?.preferences?.reducedMotion, stats.uptime]);

    useEffect(() => {
        if (server) {
            const conflict = servers.some(other => other.id !== server.id && other.port === server.port && (other.status === 'ONLINE' || other.status === 'STARTING'));
            setHasConflict(conflict);
        }
    }, [server, servers]);

    // Debug logging for telemetry
    useEffect(() => {
        if (stats.cpu > 0 || stats.memory > 0) {
            console.log(`[Dashboard:${serverId}] Telemetry Update:`, {
                cpu: stats.cpu,
                memory: stats.memory,
                status: server.status,
                pid: stats.pid
            });
        }
    }, [stats.cpu, stats.memory, server.status]);

    // Update History when global stats change
    useEffect(() => {
        if (stats.cpu !== undefined) {
             setCpuHistory(prev => {
                const last = prev[prev.length - 1];
                // Only update if value changed or it's the first non-zero update
                if (stats.cpu === 0 && last === 0 && prev.some(v => v > 0)) return prev;
                return [...prev.slice(1), stats.cpu];
             });
             setMemHistory(prev => {
                const last = prev[prev.length - 1];
                if (stats.memory === 0 && last === 0 && prev.some(v => v > 0)) return prev;
                return [...prev.slice(1), stats.memory];
             });
        }
    }, [stats.cpu, stats.memory]);

    const handleExplainCrash = async () => {
        try {
            const data = await API.getCrashReport(serverId);
            setCrashReport(data);
            setShowCrashModal(true);
        } catch (e) {
            addToast('error', 'Failed to analyze crash', 'Could not fetch crash report.');
        }
    };
    
    const handleCopyIp = () => {
        navigator.clipboard.writeText(`localhost:${server?.port}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const [showConfirm, setShowConfirm] = useState<{ action: 'stop' | 'restart', isOpen: boolean }>({ action: 'stop', isOpen: false });

    const handlePower = async (action: 'start' | 'restart' | 'stop') => {
        if (action === 'start') {
            try {
                await API.startServer(serverId);
                setDiagnosisResult(null); // Clear any old errors on success
            } catch (e: any) {
                // UNIFIED ERROR REPORTING
                // Instead of a separate safety error modal, we run diagnosis
                // which now includes pre-flight safety rules.
                await runDiagnosis();
                addToast('error', 'Boot Failed', e.message);
            }
        } else {
            // Safety Check for Stop/Restart
            if (stats.players > 0) {
                setShowConfirm({ action, isOpen: true });
                return;
            }
            executePowerAction(action);
        }
    };

    const executePowerAction = async (action: 'stop' | 'restart') => {
        if (action === 'stop') {
            await API.stopServer(serverId);
        } else if (action === 'restart') {
             await API.stopServer(serverId);
            setTimeout(() => API.startServer(serverId), 2000);
        }
        setShowConfirm({ action: 'stop', isOpen: false });
    };

    const handleForceStart = async () => {
        try {
            await API.startServer(serverId, true); // Force = true
            setDiagnosisResult(null);
        } catch (e: any) {
            addToast('error', 'Force Start Failed', e.message);
        }
    };

    const handleAcceptEula = async () => {
        try {
             await API.saveFileContent(serverId, 'eula.txt', 'eula=true');
             addToast('success', 'EULA Accepted', 'You can now start the server.');
             setDiagnosisResult(null); 
        } catch (e: any) {
             addToast('error', 'Failed to accept EULA', e.message);
        }
    };

    const formatUptime = (seconds: number) => {
        const isProcessActive = status === ServerStatus.ONLINE || status === ServerStatus.STARTING || status === ServerStatus.UNMANAGED;
        if (!isProcessActive) return "--:--:--";
        if (!seconds) return "00:00:00";
        
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    if (!server) return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
            Server not found or data is corrupted.
        </div>
    );

    // Calculations
    const ramMax = (server.ram || 1) * 1024;
    const tps = stats.tps; 
    
    // Status Color Logic
    const statusColor = status === ServerStatus.ONLINE ? '#059669' : status === ServerStatus.UNMANAGED ? '#d97706' : status === ServerStatus.OFFLINE ? '#dc2626' : status === ServerStatus.CRASHED ? '#e11d48' : '#d97706';
    const statusText = status === ServerStatus.ONLINE ? 'Online' : status === ServerStatus.UNMANAGED ? 'Unmanaged' : status === ServerStatus.OFFLINE ? 'Offline' : status === ServerStatus.CRASHED ? 'Crashed' : 'Starting...';

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[1600px] mx-auto space-y-8 pb-12 relative ${user?.preferences.visualQuality ? 'quality-animate-in' : ''}`}
        >
             {/* Update Banner */}

             {/* Crash Report Modal */}
             <AnimatePresence>
                {showCrashModal && crashReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 text-left">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border border-rose-500/20 rounded-lg p-0 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-6 border-b border-border bg-rose-500/5">
                                <div className="flex items-center gap-3 mb-1 text-rose-600">
                                    <AlertTriangle size={24} />
                                    <h3 className="text-xl font-bold">Crash Analysis</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">The server stopped unexpectedly. Analysis results below.</p>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-lg p-4 mb-6">
                                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2 uppercase tracking-wider">Likely Cause</h4>
                                    <p className="text-base font-medium text-foreground">"{crashReport.analysis}"</p>
                                </div>

                                <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Recent Logs</h4>
                                <div className="bg-zinc-950 rounded border border-border p-4 font-mono text-xs text-zinc-300 overflow-x-auto space-y-1">
                                    {crashReport.logs.map((line, i) => (
                                        <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-t border-border flex justify-end">
                                <button 
                                    onClick={() => setShowCrashModal(false)}
                                    className="px-6 py-2 rounded text-sm font-bold bg-zinc-800 hover:bg-zinc-900 transition-colors text-white"
                                >
                                    Close Report
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Safety Modal (Existing) */}
            <AnimatePresence>
                {showConfirm.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 text-left">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <AlertTriangle size={28} />
                                <h3 className="text-xl font-bold text-foreground">Active Players Online</h3>
                            </div>
                            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                                There are currently <strong className="text-foreground">{stats.players} players</strong> online. 
                                {showConfirm.action === 'stop' ? ' Stopping' : ' Restarting'} the server will disconnect everyone immediately.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowConfirm({ ...showConfirm, isOpen: false })}
                                    className="px-4 py-2 rounded text-xs font-bold bg-muted hover:bg-muted/80 transition-colors text-foreground"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => executePowerAction(showConfirm.action)}
                                    className="px-4 py-2 rounded text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
                                >
                                    Force {showConfirm.action === 'stop' ? 'Stop' : 'Restart'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Safety Error Modal (REMOVED: Unified into DiagnosisCard) */}



            {/* --- SMART ANALYSIS HINTS (Legacy) --- */}
            <DiagnosisCard 
                result={diagnosisResult} 
                serverId={serverId} 
                onFix={runDiagnosis} // Re-run after fix
                onDismiss={() => {
                    if (diagnosisResult?.ruleId) {
                        const ignored = JSON.parse(localStorage.getItem(`ignored_diagnoses_${serverId}`) || '[]');
                        if (!ignored.includes(diagnosisResult.ruleId)) {
                             ignored.push(diagnosisResult.ruleId);
                             localStorage.setItem(`ignored_diagnoses_${serverId}`, JSON.stringify(ignored));
                        }
                    }
                    setDiagnosisResult(null);
                }}
                onViewCrash={() => handleExplainCrash()}
            />

            {/* --- SMART ANALYSIS HINTS --- */}
            <AnimatePresence>
                {analysis && analysis.issues.length > 0 && isOnline && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className={`border rounded-lg p-4 shadow-sm overflow-hidden ${
                            analysis.status === 'CRITICAL' 
                            ? 'bg-rose-500/5 border-rose-500/20' 
                            : 'bg-amber-500/5 border-amber-500/20'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg shrink-0 ${
                                analysis.status === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-semibold text-sm mb-1 ${
                                    analysis.status === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                                }`}>
                                    Smart Analysis {analysis.status === 'CRITICAL' ? 'Critical' : 'Warning'}
                                </h3>
                                <div className="space-y-1.5">
                                    {analysis.issues.map((issue, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-medium text-muted-foreground/90">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                analysis.status === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'
                                            }`} /> 
                                            {issue}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded">
                                SYSTEM_HEURISTICS
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- CORE METRICS GRID --- */}
            <div ref={containerRef} className="w-full min-h-[600px]">
                {mounted && (
                    <Responsive
                        className="layout"
                        layouts={layouts}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 4, md: 2, sm: 2, xs: 1, xxs: 1 }}
                        rowHeight={70}
                        width={width}
                        onLayoutChange={onLayoutChange}
                        dragConfig={{ 
                            enabled: user?.preferences?.visualQuality, 
                            handle: ".drag-handle" 
                        }}
                        resizeConfig={{ 
                            enabled: user?.preferences?.visualQuality 
                        }}
                        margin={[24, 24]}
                    >
                        {/* Hero Module */}
                        <div key="hero" className="adaptive-card">
                            <div className={`h-full relative border border-border rounded-xl overflow-hidden transition-all duration-500 flex flex-col ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow' : 'bg-card shadow-md'}`}>
                                {/* Top Header Bar */}
                                <div className="drag-handle cursor-move h-12 bg-muted/30 border-b border-border flex items-center justify-between px-6 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${status === ServerStatus.ONLINE ? 'bg-emerald-600' : 'bg-muted-foreground/30'}`}></div>
                                        <span className="text-[11px] font-semibold text-muted-foreground">Server Status: <span className="text-foreground">{server.id}</span></span>
                                    </div>
                                    <div className="hero-header-secondary flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                         <div className="flex items-center gap-2">
                                            <Disc size={12} className={status === ServerStatus.ONLINE ? "animate-spin-slow" : ""} />
                                            <span>{server.software}</span>
                                         </div>
                                         <span className="opacity-30">|</span>
                                         <span>v{server.version}</span>
                                    </div>
                                </div>

                                <div className="hero-grid-body p-8 grid lg:grid-cols-[1fr_auto] gap-8 items-center flex-1">
                                    {/* Primary Info */}
                                    <div className="hero-info-section space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="px-2.5 py-0.5 bg-muted rounded flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }}></div>
                                                <span className="text-[10px] font-bold tracking-tight" style={{ color: statusColor }}>{statusText}</span>
                                            </div>
                                            {status === ServerStatus.UNMANAGED && (
                                                <div className="hero-header-secondary px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-600 text-[10px] font-bold">
                                                    Limited Control
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
                                                {server.name}
                                            </h1>
                                            
                                            <div className="flex flex-wrap items-center gap-4">
                                                <button 
                                                    onClick={handleCopyIp} 
                                                    className="flex items-center gap-2 px-3 py-1 bg-muted/50 hover:bg-muted border border-border rounded transition-colors group/ip"
                                                >
                                                    <Terminal size={14} className="text-muted-foreground" />
                                                    <span className="font-mono text-xs text-foreground">localhost:{server.port}</span>
                                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={12} className="text-muted-foreground" />}
                                                </button>
                                                
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <Cpu size={14} />
                                                    <span>{server.ram}GB RAM Allocation</span>
                                                </div>
                                            </div>
                                        </div>

                                        {hasConflict && (
                                             <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded text-rose-500 text-xs font-medium"
                                             >
                                                <AlertTriangle size={14} />
                                                <span>Port Conflict: {server.port} is already in use.</span>
                                             </motion.div>
                                        )}
                                    </div>

                                    {/* Power Controls */}
                                    <div className="hero-controls-row flex flex-col sm:flex-row gap-2">
                                        <button 
                                            onClick={() => handlePower('start')}
                                            disabled={(status !== ServerStatus.OFFLINE && status !== ServerStatus.CRASHED) || isJavaDownloading || !!installProgress}
                                            className={`px-8 py-3 rounded font-bold text-xs transition-all border flex items-center justify-center gap-2 ${
                                                ((status === ServerStatus.OFFLINE || status === ServerStatus.CRASHED) && !isJavaDownloading && !installProgress)
                                                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-sm' 
                                                : 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                                            }`}
                                        >
                                            {installProgress ? (
                                                <>
                                                    <Download size={18} className="animate-pulse" />
                                                    <span className="hero-btn-text animate-pulse">{installProgress.message || 'Installing...'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Power size={18} /> <span className="hero-btn-text">Start</span>
                                                </>
                                            )}
                                        </button>

                                        <button 
                                            onClick={() => handlePower('restart')}
                                            disabled={status === ServerStatus.OFFLINE || status === ServerStatus.STARTING}
                                            className={`px-4 py-3 rounded border transition-colors flex items-center justify-center ${
                                                status === ServerStatus.ONLINE 
                                                ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700' 
                                                : 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                                            }`}
                                            title="Restart Server"
                                        >
                                            <RotateCcw size={18} />
                                        </button>

                                        <button 
                                            onClick={() => handlePower('stop')}
                                            disabled={status === ServerStatus.OFFLINE || status === ServerStatus.STARTING}
                                            className={`px-6 py-3 rounded font-bold text-xs transition-colors border flex items-center justify-center gap-2 ${
                                                status === ServerStatus.ONLINE 
                                                ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700 shadow-sm' 
                                                : 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                                            }`}
                                        >
                                            <Ban size={16} /> <span className="hero-btn-text">Stop</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Java Progress (Absolute position in grid card) */}
                                <AnimatePresence>
                                    {isJavaDownloading && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-8 pb-8 pt-4 w-full"
                                        >
                                            <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg shadow-sm backdrop-blur-md">
                                                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                                                    <Download size={20} className="animate-bounce" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-end mb-1.5">
                                                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
                                                            Downloading Java Environment ({javaDownloadStatus?.percent}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <motion.div 
                                                            className="h-full bg-primary"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${javaDownloadStatus?.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                {/* Uptime Module */}
                <div key="uptime" className="adaptive-card">
                    <div className={`h-full border border-border rounded-lg p-6 flex flex-col justify-between transition-all duration-300 ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow group hover:scale-[1.01]' : 'bg-card shadow-sm'}`}>
                        <div className="metric-card-body flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start w-full">
                                <div className="drag-handle cursor-move flex items-center gap-2 text-muted-foreground">
                                    <Clock className="adaptive-icon" />
                                    <span className="adaptive-title font-bold uppercase tracking-wider">Uptime</span>
                                </div>
                                {isOnline && (
                                    <div className="hero-header-secondary flex items-center gap-2">
                                        <span className={`text-[10px] font-medium uppercase tracking-wider ${status === ServerStatus.UNMANAGED ? 'text-amber-500' : 'text-emerald-600'}`}>
                                            {status === ServerStatus.UNMANAGED ? 'UNMANAGED' : 'Online'}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${status === ServerStatus.UNMANAGED ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-auto">
                                <div className="adaptive-value font-bold text-foreground tracking-tight tabular-nums line-height-1 leading-none">
                                    {formatUptime(displayUptime)}
                                </div>
                                <p className="adaptive-label text-muted-foreground mt-1 uppercase tracking-widest font-medium">Session Duration</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TPS Module */}
                <div key="tps" className="adaptive-card">
                    <div className={`h-full border border-border rounded-lg p-6 flex flex-col justify-between transition-all duration-300 ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow group hover:scale-[1.01]' : 'bg-card shadow-sm'}`}>
                        <div className="metric-card-body flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start w-full">
                                <div className="drag-handle cursor-move flex items-center gap-2 text-muted-foreground">
                                    <Zap className="adaptive-icon" />
                                    <span className="adaptive-title font-bold uppercase tracking-wider">Tick Rate</span>
                                </div>
                                <div className={`hero-header-secondary text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${Number(tps) > 18 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {Number(tps) > 18 ? 'OPTIMAL' : 'LOW'}
                                </div>
                            </div>
                            
                            <div className="mt-auto">
                                <div className="adaptive-value font-bold text-foreground tracking-tight flex items-baseline gap-1 tabular-nums leading-none">
                                    {tps} <span className="text-[0.4em] text-muted-foreground font-medium">TPS</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-chart-container w-full h-1 bg-muted rounded-full overflow-hidden mt-auto">
                            <motion.div 
                                className={`h-full ${Number(tps) > 18 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                animate={{ width: `${(Number(tps)/20)*100}%` }}
                                transition={user?.preferences?.reducedMotion ? { duration: 0 } : { duration: 0.7 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Player Module */}
                <div key="players" className="adaptive-card">
                    <div className={`h-full border border-border rounded-lg p-6 flex flex-col justify-between transition-all duration-300 ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow group hover:scale-[1.01]' : 'bg-card shadow-sm'}`}>
                        <div className="metric-card-body flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start w-full">
                                <div className="drag-handle cursor-move flex items-center gap-2 text-muted-foreground">
                                    <Users className="adaptive-icon" />
                                    <span className="adaptive-title font-bold uppercase tracking-wider">Players</span>
                                </div>
                            </div>
                            
                            <div className="mt-auto">
                                <div className="adaptive-value font-bold text-foreground tracking-tight flex items-center gap-2 tabular-nums leading-none">
                                    {stats.players} <span className="text-[0.4em] text-muted-foreground font-medium">/ {server.maxPlayers}</span>
                                </div>
                            </div>
                        </div>

                        <div className="player-list-heads flex -space-x-1.5 mt-3">
                            {stats.playerList.length > 0 ? (
                                <>
                                    {stats.playerList.slice(0, 6).map((name, i) => (
                                        <div key={name} className="relative group/head" style={{ zIndex: 10 - i }}>
                                            <img 
                                                src={`https://mc-heads.net/avatar/${name}/64`} 
                                                className="w-7 h-7 rounded border border-card bg-muted shadow-sm transition-transform hover:scale-110"
                                                alt={name} 
                                            />
                                        </div>
                                    ))}
                                    {stats.players > 6 && (
                                        <div className="w-7 h-7 rounded border border-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                            +{stats.players - 6}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="adaptive-label font-medium text-muted-foreground uppercase tracking-wider">No players online</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Network Module */}
                <div key="network" className="adaptive-card">
                    <div className={`h-full border border-border rounded-lg p-6 flex flex-col justify-between transition-all duration-300 ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow group hover:scale-[1.01]' : 'bg-card shadow-sm'}`}>
                        <div className="metric-card-body flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start w-full">
                                <div className="drag-handle cursor-move flex items-center gap-2 text-muted-foreground">
                                    <Activity className="adaptive-icon" />
                                    <span className="adaptive-title font-bold uppercase tracking-wider">Latency</span>
                                </div>
                            </div>
                            
                            <div className="mt-auto">
                                <div className="adaptive-value font-bold text-foreground tracking-tight tabular-nums leading-none">
                                    {stats.latency} <span className="text-[0.4em] text-muted-foreground font-medium">ms</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-chart-container flex items-end gap-1 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
                            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8].map((h, i) => (
                                <div 
                                    key={i} 
                                    className="w-1 bg-primary/30 rounded-full"
                                    style={{ height: `${h * 100}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {/* CPU Graph */}
                <div key="cpu" className="adaptive-card">
                    <div className={`h-full border border-border p-6 relative overflow-hidden transition-all duration-300 ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow rounded-2xl' : 'bg-card rounded-lg shadow-sm'}`}>
                        <div className="metric-card-body flex justify-between items-start mb-6 h-[20%]">
                            <div className="drag-handle cursor-move">
                                <div className="flex items-center gap-2 mb-1">
                                    <Cpu className="adaptive-icon text-primary/70" />
                                    <h3 className="adaptive-title font-bold text-foreground uppercase">Process CPU</h3>
                                </div>
                                <p className="adaptive-label text-muted-foreground font-medium uppercase tracking-wider">Instance Load</p>
                            </div>
                            <div className="text-right">
                                <div className="adaptive-value font-bold text-foreground tracking-tight leading-none">{stats.cpu.toFixed(1)}%</div>
                            </div>
                        </div>
                        
                        <div className="metric-chart-container absolute inset-x-0 bottom-0 h-[70%] w-full px-6 pb-4">
                            {isOnline ? (
                                <Sparkline id="cpu" data={cpuHistory} color="hsl(var(--primary))" label="Real-time Telemetry" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded">
                                    <div className="adaptive-label text-muted-foreground font-medium uppercase tracking-widest text-center">Process Inactive</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Memory Graph */}
                <div key="memory" className="adaptive-card">
                    <div className={`h-full border border-border p-6 relative overflow-hidden transition-all duration-300 ${user?.preferences.visualQuality ? 'glass-morphism quality-shadow rounded-2xl' : 'bg-card rounded-lg shadow-sm'}`}>
                        <div className="metric-card-body flex justify-between items-start mb-6 h-[20%]">
                            <div className="drag-handle cursor-move">
                                <div className="flex items-center gap-2 mb-1">
                                    <Disc className="adaptive-icon text-primary/70" />
                                    <h3 className="adaptive-title font-bold text-foreground uppercase">Memory Usage</h3>
                                </div>
                                <p className="adaptive-label text-muted-foreground font-medium uppercase tracking-wider">RAM Allocation</p>
                            </div>
                            <div className="text-right">
                                <div className="adaptive-value font-bold text-foreground tracking-tight leading-none">{(stats.memory / 1024).toFixed(2)} GB</div>
                            </div>
                        </div>
                        
                        <div className="metric-chart-container absolute inset-x-0 bottom-0 h-[70%] w-full px-6 pb-4">
                            {isOnline ? (
                                <Sparkline id="mem" data={memHistory} color="hsl(var(--primary))" max={ramMax} label="Heap Trend" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded">
                                    <div className="adaptive-label text-muted-foreground font-medium uppercase tracking-widest text-center">No Memory Allocation</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Terminal Preview */}
                <div key="terminal" className="adaptive-card">
                    <div className="h-full bg-zinc-950 border border-border rounded-lg p-4 font-mono relative overflow-hidden shadow-inner group/terminal">
                        {user?.preferences.visualQuality && <div className="terminal-scanline" />}
                        
                        <div className="terminal-container">
                            {/* Single Line Prompt (Visible in micro mode) */}
                            <div className="terminal-prompt select-none">
                                <Terminal className="adaptive-icon" />
                                <span>root@server:~$</span>
                            </div>

                            {/* Full Header (Visible in taller modes) */}
                            <div className="terminal-header">
                                <div className="flex items-center gap-3">
                                    <div className="drag-handle cursor-move shrink-0">
                                        <Terminal className="adaptive-icon text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                    </div>
                                    <span className="adaptive-label text-emerald-500 font-bold hidden sm:inline">root@server:~$</span>
                                </div>
                                <div className="flex gap-1.5 opacity-50 shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                                </div>
                            </div>

                            {/* Single Line Logs (Visible in micro mode) */}
                            <div className="terminal-logs-preview">
                                {isOnline ? (
                                    (logs[serverId] || []).slice(-1).map((log, i) => (
                                        <div key={i} className="flex gap-2 truncate opacity-80">
                                            <span className="text-zinc-600">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                            <span className="text-zinc-300">{log}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-zinc-600 italic">Offline</span>
                                )}
                            </div>

                            {/* Scrollable Content (Visible in taller modes) */}
                            <div 
                                className="terminal-content"
                                ref={(el) => {
                                    if (el) el.scrollTop = el.scrollHeight;
                                }}
                            >
                                {isOnline ? (
                                    (logs[serverId] || []).slice(-15).map((log, i) => (
                                        <div key={i} className="flex gap-2 leading-relaxed animate-in fade-in slide-in-from-left-1 duration-300">
                                            <span className="text-zinc-600 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                            <span className="text-zinc-300 break-all">{log}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex items-center gap-3 text-zinc-600">
                                        <Ban size={20} className="opacity-20 adaptive-icon" />
                                        <span className="adaptive-label font-bold uppercase tracking-widest opacity-40">Service instance is currently inactive.</span>
                                    </div>
                                )}
                                {isOnline && (logs[serverId] || []).length === 0 && (
                                    <div className="text-emerald-500/50 italic animate-pulse">Process initialized...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                    </Responsive>
                )}
            </div>
        </motion.div>
    );
};

export default Dashboard;
