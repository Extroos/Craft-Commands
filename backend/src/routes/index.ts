
import { Express } from 'express';
import authRoutes from './auth';
import serverRoutes from './servers';
import systemRoutes from './system';
import modpackRoutes from './modpacks';
import templateRoutes from './templates';
import settingsRoutes from './settings';
import assetsRoutes from './assets';
import { notificationRoutes } from './notifications';
import pluginRoutes from './plugins';



export const setupRoutes = (app: Express) => {
    console.log('[Routes] Registering /api/auth');
    app.use('/api/auth', authRoutes);
    console.log('[Routes] Registering /api/servers');
    app.use('/api/servers', serverRoutes);
    console.log('[Routes] Registering /api/system');
    app.use('/api/system', systemRoutes);
    console.log('[Routes] Registering /api/modpacks');
    app.use('/api/modpacks', modpackRoutes);
    console.log('[Routes] Registering /api/templates');
    app.use('/api/templates', templateRoutes);
    console.log('[Routes] Registering /api/settings');
    app.use('/api/settings', settingsRoutes);
    console.log('[Routes] Registering /api/assets (V2)');
    app.use('/api/assets', assetsRoutes);
    console.log('[Routes] Registering /api/notifications');
    app.use('/api/notifications', notificationRoutes);
    console.log('[Routes] Registering /api/plugins');
    app.use('/api/plugins', pluginRoutes);
    
    // Status Route
    app.get('/api/status', (req, res) => {
        res.json({ status: 'online', version: '1.9.1', app: 'CraftCommand' });
    });
};


