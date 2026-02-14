
import { Router } from 'express';
import { verifyToken, requireRole } from '../../middleware/authMiddleware';
import { networkService } from './NetworkService';

const router = Router();

// Debug middleware
router.use((req, res, next) => {
    console.log(`[NetworkRoutes] ${req.method} ${req.path}`);
    next();
});

// Dashboard-level status (Basic view)
router.get('/status', verifyToken, async (req, res) => {
    const { serverId } = req.query;
    const globalState = networkService.getState();
    
    if (serverId && typeof serverId === 'string') {
        const { getServer } = require('../servers/ServerService');
        const server = getServer(serverId);
        
        if (server && server.network?.hostname) {
            // Return cached status if available for instant UI
            const cached = networkService.getState().serverDdns?.[serverId];
            
            // If we have no cache or it's older than 1 minute, trigger a background refresh
            // This satisfies the "instant load" while keeping data fresh
            if (!cached || (Date.now() - (cached.lastVerifiedAt || 0) > 60000)) {
                // Background refresh
                networkService.verifyDdns(server.network.hostname).then(status => {
                    const state = networkService.getState();
                    if (!state.serverDdns) state.serverDdns = {};
                    state.serverDdns[serverId] = status;
                });
            }

            if (cached) {
                return res.json({
                    ...globalState,
                    ddns: cached
                });
            }

            // Fallback for first-time load
            const ddns = await networkService.verifyDdns(server.network.hostname);
            return res.json({
                ...globalState,
                ddns
            });
        }
    }
    
    res.json(globalState);
});

// Detailed Public IP Info
router.get('/public-ip', verifyToken, async (req, res) => {
    const ip = await networkService.getPublicIp();
    res.json({ ip });
});

router.get('/public-ip/history', verifyToken, requireRole(['OWNER', 'ADMIN']), (req, res) => {
    res.json(networkService.getState().publicIp.history);
});

// Diagnostics
router.post('/ddns/verify', verifyToken, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
    const { hostname } = req.body;
    if (!hostname) {
        return res.status(400).json({ error: 'Hostname is required' });
    }
    const status = await networkService.verifyDdns(hostname);
    res.json(status);
});

router.post('/ddns/update', verifyToken, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
    const { serverId } = req.body;
    if (!serverId) {
        return res.status(400).json({ error: 'Server ID is required' });
    }
    try {
        const status = await networkService.updateDdns(serverId);
        res.json(status);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// GET version for easy debugging/manual trigger
router.get('/ddns/update', verifyToken, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
    const { serverId } = req.query;
    if (!serverId || typeof serverId !== 'string') {
        return res.status(400).json({ error: 'Server ID is required' });
    }
    try {
        const status = await networkService.updateDdns(serverId);
        res.json(status);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/port-check', verifyToken, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
    const { port } = req.body;
    if (!port) {
        return res.status(400).json({ error: 'Port is required' });
    }
    const status = await networkService.checkPort(port);
    res.json(status);
});

export default router;
