import React, { useState, useEffect, useMemo } from 'react';
import { API } from '@core/services/api';
import { AuditLog } from '@shared/types';
import { StabilityMarker } from '@shared/types/health';
import { format } from 'date-fns';
import { Activity, ShieldCheck, AlertTriangle, CheckCircle, Cpu, HardDrive, Database, Zap, ArrowUpRight, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthStats {
    cpuLoad: number;
    memoryPressure: number;
    diskIO: number;
    isOverloaded: boolean;
    stabilityMarkers: StabilityMarker[];
    timestamp: number;
}

const TelemetryLine = ({ data, color, height = 40 }: { data: number[], color: string, height?: number }) => {
    if (data.length < 2) return <div className="h-[40px]" />;
    const max = Math.max(...data, 10);
    const width = 200;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / max) * height}`).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id={`glow-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={`M 0,${height} ${points} L ${width},${height} Z`}
                fill={`url(#glow-${color})`}
            />
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-[0_0_8px_rgba(var(--color-rgb),0.5)]"
            />
        </svg>
    );
};

export const SelfHealingAudit: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [health, setHealth] = useState<HealthStats | null>(null);
    const [cpuHistory, setCpuHistory] = useState<number[]>([]);
    const [ramHistory, setRamHistory] = useState<number[]>([]);
    const [ioHistory, setIoHistory] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [logData, healthData] = await Promise.all([
                    API.getAuditLogs({ action: 'AUTO_HEAL', limit: 30 }),
                    API.getSystemHealth()
                ]);
                
                setLogs(logData.logs);
                setHealth(healthData);
                
                setCpuHistory(prev => [...prev.slice(-15), healthData.cpuLoad]);
                setRamHistory(prev => [...prev.slice(-15), healthData.memoryPressure]);
                setIoHistory(prev => [...prev.slice(-15), healthData.diskIO / 1024 / 1024]);

                setError(null);
            } catch (err: any) {
                console.error('Audit Fetch Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0 && !health) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 opacity-50">
                <Activity size={18} className="text-primary animate-spin" />
                <p className="text-[11px] font-bold tracking-tight">Synchronizing System Telemetry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* --- TOP PERFORMANCE ANALYTICS --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-4">
                    <div className="border border-border/80 bg-card rounded-md shadow-sm overflow-hidden">
                        <div className="h-10 bg-muted/20 border-b border-border/60 flex items-center justify-between px-4 text-primary">
                            <div className="flex items-center gap-2">
                                <Cpu size={14} className="opacity-70" />
                                <span className="text-[11px] font-bold tracking-tight uppercase">Host Performance Core</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                    <span className="text-[10px] font-mono font-bold text-emerald-500/80">SENTINEL_OK</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'CPU LOAD', val: `${Math.round(health?.cpuLoad || 0)}%`, history: cpuHistory, color: '#10b981' },
                                { label: 'MEMORY', val: `${Math.round(health?.memoryPressure || 0)}%`, history: ramHistory, color: '#8b5cf6' },
                                { label: 'DISK I/O', val: `${Math.round((health?.diskIO || 0) / 1024 / 1024)} MB/s`, history: ioHistory, color: '#3b82f6' }
                            ].map((stat, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-muted-foreground/50 tracking-widest">{stat.label}</span>
                                        <span className="text-sm font-mono font-bold tabular-nums text-foreground/90">{stat.val}</span>
                                    </div>
                                    <div className="h-10 bg-muted/5 rounded p-1 border border-border/20">
                                        <TelemetryLine data={stat.history} color={stat.color} height={32} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stability Indices */}
                    <div className="border border-border/80 bg-card rounded-md shadow-sm overflow-hidden">
                         <div className="h-10 bg-muted/20 border-b border-border/60 flex items-center justify-between px-4 text-primary">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="opacity-70" />
                                <span className="text-[11px] font-bold tracking-tight uppercase">Stability Matrix Indices</span>
                            </div>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-muted/10 border-b border-border/40">
                                    <tr>
                                        <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider">Node ID</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider">Health Score</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider text-right">Protection</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {health?.stabilityMarkers?.map((marker) => (
                                        <tr key={marker.serverId} className="hover:bg-muted/5 transition-colors group">
                                            <td className="px-4 py-2.5">
                                                <span className="text-[10px] font-mono font-bold text-primary/60">{marker.serverId.slice(0, 8)}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${marker.score > 80 ? 'bg-emerald-500' : marker.score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                            style={{ width: `${marker.score}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold tabular-nums w-4">{marker.score}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${marker.score > 50 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                                                    <span className="text-[10px] font-bold text-muted-foreground">{marker.score > 50 ? 'NOMINAL' : 'DEGRADED'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border inline-block ${marker.isSafeMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                                    {marker.isSafeMode ? 'SAFE_MODE' : 'ACTIVE'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!health?.stabilityMarkers || health.stabilityMarkers.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-[10px] font-bold text-muted-foreground/30 italic">
                                                No active stability markers registered.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Integrated Transcript */}
                <div className="xl:col-span-1 border border-border/80 bg-card rounded-md shadow-sm overflow-hidden flex flex-col">
                    <div className="h-10 bg-muted/20 border-b border-border/60 flex items-center justify-between px-4 shrink-0 text-primary">
                        <div className="flex items-center gap-2">
                            <History size={14} className="opacity-70" />
                            <span className="text-[11px] font-bold tracking-tight uppercase">System Logs</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    
                    <div className="flex-1 p-4 bg-black/5 font-mono text-[11px] space-y-4">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-20 py-12">
                                <CheckCircle size={24} strokeWidth={1} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-center">Protocol Idle</span>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="group relative border-l-2 border-border/40 pl-3 py-1 hover:border-primary/40 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-muted-foreground/40 font-bold tabular-nums">[{format(log.timestamp, 'HH:mm:ss')}]</span>
                                        <span className={`font-black uppercase tracking-tighter text-[9px] ${
                                            log.metadata?.action === 'RECOVERY' ? 'text-emerald-500' : 'text-amber-500'
                                        }`}>{log.metadata?.action || 'SENTINEL'}</span>
                                    </div>
                                    <p className="text-foreground/80 leading-relaxed font-medium">
                                        {log.metadata?.title || 'Stability hygiene event logEntry.'}
                                    </p>
                                    {log.metadata?.details && (
                                        <div className="mt-1.5 p-2 bg-muted/20 rounded border border-border/20 text-[10px] text-muted-foreground/70 overflow-hidden leading-snug">
                                            {log.metadata.details}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .custom-cc-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-cc-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-cc-scroll::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary-rgb), 0.1);
                    border-radius: 10px;
                }
                .custom-cc-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--primary-rgb), 0.2);
                }
            `}</style>
        </div>
    );
};
