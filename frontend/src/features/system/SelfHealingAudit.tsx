import React, { useState, useEffect } from 'react';
import { API } from '@core/services/api';
import { AuditLog } from '@shared/types';
import { format } from 'date-fns';
import { Activity, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';

export const SelfHealingAudit: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const data = await API.getAuditLogs({ action: 'AUTO_HEAL', limit: 50 });
                setLogs(data.logs);
                setError(null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Activity className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <AlertTriangle className="w-5 h-5 mb-2" />
                <p>Failed to load audit logs: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        Self-Healing Audit
                    </h2>
                    <p className="text-gray-400 text-sm">Real-time log of automated system recoveries and health checks.</p>
                </div>
                <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-400 font-medium">
                    {logs.length} EVENTS TRACKED
                </div>
            </div>

            <div className="space-y-3">
                {logs.length === 0 ? (
                    <div className="p-12 text-center bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl">
                        <CheckCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500">No self-healing events recorded yet. System is healthy.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white uppercase tracking-wider text-xs">RECOVERY EVENT</span>
                                            <span className="text-gray-600">•</span>
                                            <span className="text-gray-400 text-xs">{format(log.timestamp, 'HH:mm:ss')}</span>
                                        </div>
                                        <p className="text-white mt-1">{log.metadata?.title || log.metadata?.action || 'Automated Recovery'}</p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                                                log.resourceId === 'system' 
                                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                                            }`}>
                                                {log.resourceId === 'system' ? 'Panel Core' : `Server: ${log.resourceId}`}
                                            </span>
                                            {log.metadata?.nodeName && (
                                                <span className="text-xs text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Activity size={10} />
                                                    Node: {log.metadata.nodeName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-600 font-mono uppercase">{log.id}</span>
                                </div>
                            </div>
                            {log.metadata?.details && (
                                <div className="mt-3 p-3 bg-black/40 rounded-lg border border-gray-800/50">
                                    <p className="text-xs text-emerald-400/80 font-mono leading-relaxed">
                                        {log.metadata.details}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
