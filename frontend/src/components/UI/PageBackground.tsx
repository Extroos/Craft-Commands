import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackgroundSettings } from '@shared/types';

interface PageBackgroundProps {
    settings?: BackgroundSettings;
}

import { useUser } from '../../context/UserContext';

const PageBackground: React.FC<PageBackgroundProps> = ({ settings }) => {
    const { user } = useUser();
    const [loadedUrl, setLoadedUrl] = React.useState<string | null>(null);
    const [activeSettings, setActiveSettings] = React.useState<BackgroundSettings | null>(null);

    React.useEffect(() => {
        if (!settings || !settings.enabled || !settings.url) {
            setLoadedUrl(null);
            setActiveSettings(null);
            return;
        }

        // If it's the same URL, just update the settings (opacity/blur)
        if (settings.url === loadedUrl) {
            setActiveSettings(settings);
            return;
        }

        // Preload logic
        const img = new Image();
        img.src = settings.url;
        img.onload = () => {
            setLoadedUrl(settings.url!);
            setActiveSettings(settings);
        };
        img.onerror = () => {
            console.warn('[PageBackground] Preload failed, showing anyway:', settings.url);
            setLoadedUrl(settings.url!);
            setActiveSettings(settings);
        };
    }, [settings?.url, settings?.enabled]);

    // Performance Mode: Render nothing if Reduced Motion is enabled
    // Must be AFTER hooks to comply with React rules
    if (user?.preferences.reducedMotion) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-zinc-950">
            <AnimatePresence>
                {loadedUrl && activeSettings && (
                    <motion.div
                        key={loadedUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: activeSettings.opacity }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="absolute inset-0 page-background-image"
                    >
                        <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: `url(${loadedUrl})`,
                                filter: `blur(${activeSettings.blur}px)`,
                                transform: 'scale(1.05)', // Prevent edge blur artifacts
                            }}
                        />
                        {/* Dark overlay for UI consistency */}
                        <div className="absolute inset-0 bg-black/25" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PageBackground;
