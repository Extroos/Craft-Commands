import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CelebrationEffectProps {
    active: boolean;
    onComplete?: () => void;
}

export const CelebrationEffect: React.FC<CelebrationEffectProps> = ({ active, onComplete }) => {
    useEffect(() => {
        if (active && onComplete) {
            const timer = setTimeout(onComplete, 5000);
            return () => clearTimeout(timer);
        }
    }, [active, onComplete]);

    if (!active) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
            <AnimatePresence>
                {active && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        {/* Minimal Confetti/Particle approximation for stability */}
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ 
                                    x: 0, 
                                    y: 0, 
                                    rotate: 0,
                                    opacity: 1
                                }}
                                animate={{ 
                                    x: (Math.random() - 0.5) * 800, 
                                    y: (Math.random() - 0.5) * 800,
                                    rotate: Math.random() * 360,
                                    opacity: 0
                                }}
                                transition={{ duration: 2, ease: "easeOut", delay: Math.random() * 0.5 }}
                                className="absolute w-2 h-2 rounded-sm"
                                style={{ 
                                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][i % 5] 
                                }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
