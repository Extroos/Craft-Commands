import React from 'react';
import { Stethoscope, Wrench, CheckCircle, Zap } from 'lucide-react';
import { API } from '../../services/api';
import { DiagnosisResult } from '@shared/types';

interface DiagnosisCardProps {
    result: DiagnosisResult | null;
    serverId: string;
    onFix: () => void;
    onDismiss: () => void;
    onViewCrash?: (reportId: string) => void;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ result, serverId, onFix, onDismiss, onViewCrash }) => {
    const [fixing, setFixing] = React.useState(false);
    const [fixed, setFixed] = React.useState(false);

    if (!result) return null;

    const handleAutoFix = async () => {
        if (!result.action) return;
        setFixing(true);
        try {
            if (result.action.type === 'UPDATE_CONFIG') {
                await API.updateServer(serverId, result.action.payload);
            } else if (result.action.type === 'SWITCH_JAVA') {
                 await API.updateServer(serverId, { javaVersion: result.action.payload.version });
            } else if (result.action.type === 'AGREE_EULA') {
                 await API.saveFileContent(serverId, 'eula.txt', 'eula=true');
            }

            setFixed(true);
            setTimeout(() => {
                onFix();
            }, 1000);
        } catch (e) {
            console.error('Fix failed', e);
            setFixing(false);
        }
    };

    const severityColor = result.severity === 'CRITICAL' ? 'border-rose-500' : 'border-amber-500';
    const severityBg = result.severity === 'CRITICAL' ? 'bg-rose-500/5' : 'bg-amber-500/5';
    const severityText = result.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500';

    return (
        <div className={`bg-card border-y border-r ${severityColor} border-l-4 rounded-r-lg p-6 mb-8 shadow-sm relative transition-all`}>
            <div className="flex items-start gap-6">
                <div className={`p-3 ${severityBg} ${severityText} rounded border ${severityColor}/20`}>
                    <Stethoscope size={24} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${severityColor}/30 ${severityBg} ${severityText}`}>
                                {result.severity} DIAGNOSIS
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded tracking-tight">
                                ID: {result.ruleId?.toUpperCase()}
                            </span>
                        </div>
                        
                        {result.action?.autoHeal && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded border border-emerald-500/20 uppercase tracking-tighter">
                                <Zap size={10} className="fill-emerald-500" />
                                Proactive Auto-Healing Available
                            </div>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                         {result.title}
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                            <span className="text-foreground font-semibold">Incident:</span> {result.explanation}
                        </div>
                        
                        <div className="bg-muted/40 rounded border border-border/50 p-4">
                            <div className="flex items-start gap-3">
                                <Wrench size={16} className="text-primary mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Recommended Action</h4>
                                    <p className="text-sm text-foreground/90 font-medium">
                                        {result.recommendation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {result.action && !fixed && (
                                <button 
                                    onClick={handleAutoFix}
                                    disabled={fixing}
                                    className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                                >
                                    {fixing ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                                            Executing Protocol...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={14} />
                                            Apply Automatic Fix
                                        </>
                                    )}
                                </button>
                            )}

                            {fixed && (
                                <div className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded text-xs font-bold shadow-sm">
                                    <CheckCircle size={14} />
                                    Resolved
                                </div>
                            )}

                            {!fixing && (
                                <button 
                                    onClick={onDismiss}
                                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                                >
                                    Ignore
                                </button>
                            )}

                            {result.connectedCrashReport && (
                                <button
                                    onClick={() => onViewCrash && onViewCrash(result.connectedCrashReport?.id || '')}
                                    className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline decoration-rose-500/30 transition-all uppercase tracking-widest ml-auto"
                                >
                                    View Crash Report
                                </button>
                            )}
                        </div>
                        
                        <div className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                            Management Terminal // {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
