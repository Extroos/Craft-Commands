import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middleware/authMiddleware';
import { registerBroadcasters } from './broadcasters';
import { handleCommand } from './handlers/commandHandler';

export let io: Server;

export const setupSocket = (socketIo: Server) => {
    io = socketIo;
    
    // 1. Setup Global Broadcasters (Service -> IO)
    registerBroadcasters(io);

    // 2. Authentication Middleware
    io.use(socketAuthMiddleware);

    // 3. Connection Handling
    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user;
        if (user) {
            socket.join(`user:${user.id}`);
            console.log(`[Socket] Client connected: ${socket.id} (User: ${user.id}) -> Joined room user:${user.id}`);
        } else {
            console.log(`[Socket] Client connected: ${socket.id} (User: Anonymous)`);
        }

        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });

        // Command handling - Secure
        socket.on('command', (data) => handleCommand(socket, data));
    });
};
