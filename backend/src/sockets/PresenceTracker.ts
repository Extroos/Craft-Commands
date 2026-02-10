import { PresenceEntry, UserRole } from '../../../shared/types';

/**
 * In-memory tracker for which users are viewing which servers.
 * Supports role-aware filtering so the OWNER can control who sees presence.
 */
class PresenceTracker {
    // Map<serverId, Map<userId, PresenceEntry>>
    private presence: Map<string, Map<string, PresenceEntry>> = new Map();
    // Map<socketId, { serverId, userId }> — for cleanup on disconnect
    private socketMap: Map<string, { serverId: string; userId: string }[]> = new Map();

    /**
     * User joins a server room.
     */
    join(serverId: string, user: { id: string; username: string; role: UserRole; avatar?: string }, socketId: string, activeView: string = 'dashboard') {
        if (!this.presence.has(serverId)) {
            this.presence.set(serverId, new Map());
        }

        const entry: PresenceEntry = {
            userId: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            joinedAt: Date.now(),
            activeView
        };

        this.presence.get(serverId)!.set(user.id, entry);

        // Track socket -> server mapping for disconnect cleanup
        if (!this.socketMap.has(socketId)) {
            this.socketMap.set(socketId, []);
        }
        this.socketMap.get(socketId)!.push({ serverId, userId: user.id });
    }

    /**
     * User leaves a server room.
     */
    leave(serverId: string, userId: string) {
        const serverPresence = this.presence.get(serverId);
        if (serverPresence) {
            serverPresence.delete(userId);
            if (serverPresence.size === 0) {
                this.presence.delete(serverId);
            }
        }
    }

    /**
     * Update user's active view (e.g., switching from Console to Files).
     */
    updateView(serverId: string, userId: string, activeView: string) {
        const entry = this.presence.get(serverId)?.get(userId);
        if (entry) {
            entry.activeView = activeView;
        }
    }

    /**
     * Get all present users for a server, filtered by minimum role if needed.
     */
    getPresence(serverId: string, minRole?: UserRole): PresenceEntry[] {
        const serverPresence = this.presence.get(serverId);
        if (!serverPresence) return [];

        const entries = Array.from(serverPresence.values());
        if (!minRole) return entries;

        // Role hierarchy for filtering
        const roleRank: Record<UserRole, number> = {
            'VIEWER': 0,
            'MANAGER': 1,
            'ADMIN': 2,
            'OWNER': 3
        };

        const minRank = roleRank[minRole] ?? 0;
        return entries.filter(e => roleRank[e.role] >= minRank);
    }

    /**
     * Clean up all presence entries for a disconnected socket.
     * Returns the list of serverIds affected so we can push updates.
     */
    disconnectSocket(socketId: string): string[] {
        const mappings = this.socketMap.get(socketId);
        if (!mappings) return [];

        const affectedServers: string[] = [];
        for (const { serverId, userId } of mappings) {
            this.leave(serverId, userId);
            if (!affectedServers.includes(serverId)) {
                affectedServers.push(serverId);
            }
        }

        this.socketMap.delete(socketId);
        return affectedServers;
    }

    /**
     * Get count of active viewers per server (for dashboard overview).
     */
    getServerCounts(): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const [serverId, users] of this.presence) {
            counts[serverId] = users.size;
        }
        return counts;
    }
}

export const presenceTracker = new PresenceTracker();
