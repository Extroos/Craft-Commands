import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Mail, Lock, ArrowRight, Loader2, Info, Globe } from 'lucide-react';


import { useToast } from '../ui/Toast';
import { useUser } from '@features/auth/context/UserContext';


interface LoginProps {
    onLogin: () => void;
    onViewStatus?: () => void; // Optional prop for the status page navigation
}

const Login: React.FC<LoginProps> = ({ onLogin, onViewStatus }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useUser();
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const success = await login(email, password);
            if (success) {
                addToast('success', 'Welcome', 'Access granted.');
                onLogin();
            } else {
                addToast('error', 'Access Denied', 'Invalid email or password.');
            }
        } catch (e) {
            addToast('error', 'Error', 'Connection failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6 font-sans bg-[#09090b]">
            
            {/* Minimalist Background Particles/Soft Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/[0.01] rounded-full blur-[120px] pointer-events-none"></div>
            
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.05
                        }
                    }
                }}
                className="w-full max-w-[380px] relative z-10 flex flex-col gap-8"
            >
                {/* Brand Header: Pure & Authoritative */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0, scale: 0.98 },
                        visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    className="flex flex-col items-center justify-center text-center space-y-4 group/header"
                >
                    <img 
                        src="/website-icon.png" 
                        alt="CraftCommand" 
                        className="w-24 h-24 object-contain" 
                    />
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-white tracking-tight cursor-default flex justify-center overflow-hidden">
                            {"CraftCommand".split("").map((char, i) => (
                                <motion.span
                                    key={i}
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { 
                                            opacity: 1, 
                                            y: 0, 
                                            transition: { 
                                                duration: 0.8, 
                                                ease: [0.16, 1, 0.3, 1],
                                                delay: i * 0.04 
                                            } 
                                        }
                                    }}
                                    whileHover={{ 
                                        color: ["#ffffff", "#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#ffffff"],
                                    }}
                                    whileTap={{ 
                                        color: ["#ffffff", "#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#ffffff"],
                                        scale: 1.1
                                    }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity,
                                        delay: i * 0.05
                                    }}
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[#a1a1aa] font-medium">Enterprise Management Suite</p>
                    </div>
                </motion.div>

                {/* Main Card: Sleek Professional Surface */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0, y: 15 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    className="bg-[#111111] border border-white/[0.08] rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] p-8 relative overflow-hidden"
                >
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest ml-1">Account Identifier</label>
                            <div className="relative group/input">
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#18181b] border border-white/[0.05] rounded-xl py-3 px-4 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all duration-300"
                                    placeholder="user@localhost"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest">Access Key</label>
                            </div>
                            <div className="relative group/input">
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#18181b] border border-white/[0.05] rounded-xl py-3 px-4 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all duration-300"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-white text-black font-bold uppercase text-[11px] tracking-[0.2em] py-4 rounded-xl hover:bg-[#e4e4e7] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-xl shadow-black/40 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                                <>
                                    Establish Connection <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Footer: Subtle & Clean */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { delay: 0.5 } }
                    }}
                    className="flex flex-col items-center gap-6"
                >
                    {onViewStatus && (
                        <button 
                            onClick={onViewStatus}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa] hover:text-white transition-colors py-1 border-b border-transparent hover:border-white/20"
                        >
                            Monitor System Node Status
                        </button>
                    )}
                    
                    <div className="flex items-center gap-3 opacity-20">
                        <div className="h-[1px] w-8 bg-white"></div>
                        <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-white">v1.10.0</span>
                        <div className="h-[1px] w-8 bg-white"></div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Login;
