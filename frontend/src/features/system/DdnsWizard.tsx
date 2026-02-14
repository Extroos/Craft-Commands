
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Shield, Globe, ExternalLink, Activity, CheckCircle2, AlertTriangle, Link } from 'lucide-react';
import { API } from '@core/services/api';

interface StepProps {
    onNext: () => void;
    onBack?: () => void;
    data: any;
    setData: (data: any) => void;
}

export const DdnsWizard: React.FC<{ serverId: string; onClose: () => void; currentIp: string | null }> = ({ serverId, onClose, currentIp }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        provider: 'duckdns',
        hostname: '',
        token: '',
        updateEnabled: true,
        confirmed: false
    });

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const renderStep = () => {
        switch(step) {
            case 1: return <ProviderStep onNext={nextStep} data={data} setData={setData} />;
            case 2: return <HostnameStep onNext={nextStep} onBack={prevStep} data={data} setData={setData} />;
            case 3: return <VerificationStep serverId={serverId} currentIp={currentIp} onNext={onClose} onBack={prevStep} data={data} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Globe size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Stable Share Wizard</h2>
                            <p className="text-xs text-muted-foreground italic">Setup your persistent hostname</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {renderStep()}
                </div>
            </motion.div>
        </div>
    );
};

const ProviderStep: React.FC<StepProps> = ({ onNext, data, setData }) => {
    const providers = [
        { id: 'duckdns', name: 'DuckDNS', url: 'https://duckdns.org', desc: 'Free, simple, and open source.' },
        { id: 'no-ip', name: 'No-IP', url: 'https://noip.com', desc: 'Popular standard, requires monthly confirm.' },
        { id: 'dynu', name: 'Dynu', url: 'https://dynu.com', desc: 'Robust features, generous free tier.' },
        { id: 'custom', name: 'Custom Domain', url: '', desc: 'Use your own .com or .net domain.' }
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-bold">Choose a Provider</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Dynamic DNS gives you a stable name (hostname) that updates automatically when your internet IP changes.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {providers.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setData({ ...data, provider: p.id })}
                        className={`flex items-start justify-between p-4 rounded-xl border transition-all text-left ${
                            data.provider === p.id ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-secondary/20 border-border/50 hover:bg-secondary/40'
                        }`}
                    >
                        <div>
                            <div className="font-bold text-sm mb-1">{p.name}</div>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>
                        {p.url && (
                            <a 
                                href={p.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </button>
                ))}
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                    onClick={onNext}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm"
                >
                    Continue <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

const HostnameStep: React.FC<StepProps> = ({ onNext, onBack, data, setData }) => {
    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center mb-8">
                <h3 className="text-lg font-bold">Set your Address</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter the domain you created with {data.provider}.
                </p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Target Hostname</label>
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            autoFocus
                            type="text"
                            value={data.hostname}
                            onChange={(e) => setData({ ...data, hostname: e.target.value })}
                            placeholder="my-cool-server.duckdns.org"
                            className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
                        />
                    </div>
                </div>

                {data.provider === 'duckdns' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">DuckDNS Token</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <input 
                                    type="password"
                                    value={data.token}
                                    onChange={(e) => setData({ ...data, token: e.target.value })}
                                    placeholder="your-uuid-token"
                                    className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className="text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Auto-Updater</span>
                            </div>
                            <button 
                                onClick={() => setData({ ...data, updateEnabled: !data.updateEnabled })}
                                className={`w-8 h-4 rounded-full transition-all flex items-center px-1 ${data.updateEnabled ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}
                            >
                                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                    <h4 className="text-xs font-bold text-blue-600 uppercase mb-2">Instructions</h4>
                    <ul className="text-[11px] text-blue-700/80 space-y-2">
                        <li>• Log in to your provider's dashboard.</li>
                        {data.provider === 'duckdns' ? (
                            <li>• Copy your <b>Token</b> from the top of the DuckDNS page.</li>
                        ) : (
                            <li>• Install their "Updater" app or configure your router.</li>
                        )}
                        <li>• Once done, we can verify the connection here.</li>
                    </ul>
                </div>
            </div>

            <div className="pt-8 flex justify-between border-t border-border/50">
                <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-sm px-4">
                    <ArrowLeft size={16} /> Back
                </button>
                <button 
                    onClick={onNext}
                    disabled={!data.hostname || (data.provider === 'duckdns' && !data.token)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50"
                >
                    Verify & Finish <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

const VerificationStep: React.FC<{ serverId: string; currentIp: string | null; onNext: () => void; onBack: () => void; data: any }> = ({ serverId, currentIp, onNext, onBack, data }) => {
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [details, setDetails] = useState<any>(null);

    React.useEffect(() => {
        runCheck();
    }, []);

    const runCheck = async () => {
        setStatus('LOADING');
        try {
            // 1. Save settings first so the backend knows the token/hostname for this server
            await API.updateServer(serverId, {
                network: {
                    hostname: data.hostname,
                    provider: data.provider,
                    token: data.token,
                    updateEnabled: data.updateEnabled,
                    monitoringEnabled: true,
                    updateInterval: 60
                }
            });

            // 2. Trigger an immediate update signal to the provider
            if (data.provider === 'duckdns' && data.token) {
                try {
                    await API.get(`/api/network/ddns/update?serverId=${serverId}`);
                } catch (e) {
                    console.warn('[DdnsWizard] Initial update trigger failed:', e);
                }
            }

            // 3. Verify the resolution
            const res = await API.post('/api/network/ddns/verify', { hostname: data.hostname });
            setDetails(res);
            
            if (res.isMatching) {
                setStatus('SUCCESS');
            } else {
                setStatus('ERROR');
            }
        } catch (e) {
            setStatus('ERROR');
            setDetails({ error: 'Connection to backend failed' });
        }
    };

    return (
        <div className="space-y-6 flex flex-col items-center">
            {status === 'LOADING' ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                    <Activity className="animate-spin text-primary" size={48} />
                    <p className="text-sm font-medium">Resolving DNS records for {data.hostname}...</p>
                </div>
            ) : status === 'SUCCESS' ? (
                <div className="flex flex-col items-center py-8 space-y-4 text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">Verification Successful!</h3>
                        <p className="text-sm text-muted-foreground">{data.hostname} successfully resolves to your public IP.</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center py-8 space-y-4 text-center">
                    <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-1 max-w-sm">
                        <h3 className="text-xl font-bold">Resolution Mismatch</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {data.hostname} resolves to <span className="font-mono bg-secondary px-1 rounded">{details?.resolvedIp || 'None'}</span>, but your public IP is <span className="font-mono bg-secondary px-1 rounded">{currentIp}</span>.
                        </p>
                    </div>
                    <div className="text-xs p-3 bg-secondary/50 rounded-lg border border-border max-w-xs leading-relaxed text-muted-foreground">
                        Wait 5-10 minutes for DNS propagation or check your provider updater settings.
                    </div>
                </div>
            )}

            <div className="w-full pt-8 flex justify-between border-t border-border/50">
                <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-sm px-4">
                    <ArrowLeft size={16} /> Troubleshoot
                </button>
                <div className="flex gap-2">
                     <button onClick={runCheck} className="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-secondary">
                        Retry
                    </button>
                    <button 
                        onClick={onNext}
                        className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-bold text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
