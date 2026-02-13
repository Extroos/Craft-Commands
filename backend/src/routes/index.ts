
import { Express } from 'express';
import authRoutes from '../features/auth/auth.routes';
import profileRoutes from '../features/auth/profiles.routes';
import serverRoutes from '../features/servers/servers.routes';
import pluginRoutes from '../features/servers/plugins.routes';
import systemRoutes from '../features/system/system.routes';
import settingsRoutes from '../features/system/settings.routes';
import assetsRoutes from '../features/system/assets.routes';
import { notificationRoutes } from '../features/system/notifications.routes';
import modpackRoutes from '../features/installer/modpacks.routes';
import templateRoutes from '../features/installer/templates.routes';
import importRoutes from '../features/installer/import.routes';
import installRoutes from '../features/installer/install.routes';
import nodesRoutes from '../features/nodes/nodes.routes';



export const setupRoutes = (app: Express) => {
    console.log('[Routes] Registering /api/auth');
    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profileRoutes);

    console.log('[Routes] Registering /api/servers');
    app.use('/api/servers', serverRoutes);
    app.use('/api/plugins', pluginRoutes);

    console.log('[Routes] Registering /api/system');
    app.use('/api/system', systemRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/assets', assetsRoutes);
    app.use('/api/notifications', notificationRoutes);

    console.log('[Routes] Registering /api/installer');
    app.use('/api/modpacks', modpackRoutes);
    app.use('/api/templates', templateRoutes);
    app.use('/api/import', importRoutes);
    app.use('/api/install', installRoutes);

    console.log('[Routes] Registering /api/nodes');
    app.use('/api/nodes', nodesRoutes);
    
    // Status Route
    app.get('/api/status', (req, res) => {
        const { protocol, sslStatus } = require('../features/system/SystemStatusState');
        res.json({ 
            status: 'online', 
            version: '1.9.1', 
            app: 'CraftCommand',
            protocol,
            sslStatus
        });
    });
};


