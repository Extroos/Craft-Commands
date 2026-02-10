import { JsonRepository } from './JsonRepository';
import { Notification } from '@shared/types';

class NotificationRepository extends JsonRepository<Notification> {
    constructor() {
        super('notifications.json');
    }

    public delete(id: string): boolean {
        const notification = this.findById(id);
        if (notification && notification.dismissible === false) {
            return false; // Cannot delete
        }
        return super.delete(id);
    }

    public getForUser(userId: string, options: { limit?: number, unreadOnly?: boolean } = {}): Notification[] {
        let notifications = this.findAll().filter(n => n.userId === userId || n.userId === 'ALL');
        
        if (options.unreadOnly) {
            notifications = notifications.filter(n => !n.read);
        }

        notifications.sort((a, b) => b.createdAt - a.createdAt);

        if (options.limit) {
            notifications = notifications.slice(0, options.limit);
        }

        return notifications;
    }

    public getUnreadCount(userId: string): number {
        return this.getForUser(userId).filter(n => !n.read).length;
    }

    public markAsRead(id: string): void {
        const notification = this.findById(id);
        if (notification) {
            this.update(id, { read: true });
        }
    }

    public markAllAsRead(userId: string): void {
        const notifications = this.getForUser(userId);
        notifications.forEach(n => {
            if (!n.read) {
                this.update(n.id, { read: true });
            }
        });
    }

    public prune(maxCount: number = 100): void {
        const all = this.findAll().sort((a, b) => b.createdAt - a.createdAt);
        if (all.length > maxCount) {
            const toKeep = all.slice(0, maxCount);
            // This is a bit inefficient in JsonRepository as currently implemented (no bulk replace)
            // But for now we can just rely on the fact that we don't have a specific "overwrite" method exposed easily
            // Actually JsonRepository usually writes the whole file on change, so we might need a distinct method if we want to bulk delete.
            // For now, let's just delete the extras one by one or leave as is.
            // A better approach for JsonRepository is to expose a setAll or similar.
            // Let's assume for now we just delete the oldest ones.
            const toDelete = all.slice(maxCount);
            // Only prune dismissible notifications
            toDelete.forEach(n => {
                if (n.dismissible !== false) {
                    this.delete(n.id);
                }
            });
        }
    }
}

export const notificationRepository = new NotificationRepository();
