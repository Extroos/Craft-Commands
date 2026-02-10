import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';
import { API } from '../services/api';
import { socketService } from '../services/socket'; // Assuming this service exists and wraps socket.io-client
import { Notification } from '@shared/types';
import { useToast } from '../components/UI/Toast';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // We need to add this method to API service first, but assuming it exists or using fetch directly for now if needed.
            // Better to update API service. For now let's type-cast or assume we updated API.ts
            // Actually I should update API.ts first. But I can implement this and then update API.ts.
            const data = await API.getNotifications(); 
            setNotifications(data);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Initial Fetch
    useEffect(() => {
        if (user) {
            fetchNotifications();
        } else {
            setNotifications([]);
        }
    }, [user, fetchNotifications]);

    // Socket Listener
    useEffect(() => {
        if (!user) return;

        const handleNewNotification = (notification: Notification) => {
            setNotifications(prev => [notification, ...prev]);
            // Optional: Show a toast for urgent things
            if (notification.type === 'ERROR' || notification.type === 'WARNING') {
                addToast(notification.type.toLowerCase() as any, notification.title, notification.message);
            } else {
                 // Play sound if enabled in prefs (can add logic later)
            }
        };

        const socket = socketService.socket;
        if (socket) {
            socket.on('notification:new', handleNewNotification);
        }

        return () => {
            if (socket) {
                socket.off('notification:new', handleNewNotification);
            }
        };
    }, [user, addToast]);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await API.markNotificationRead(id);
        } catch (e) {
            // Revert if failed
            console.error('Failed to mark read', e);
            fetchNotifications(); 
        }
    };

    const markAllAsRead = async () => {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await API.markAllNotificationsRead();
        } catch (e) {
            console.error('Failed to mark all read', e);
            fetchNotifications();
        }
    };

    const deleteNotification = async (id: string) => {
        // Optimistic
        setNotifications(prev => prev.filter(n => n.id !== id));
        try {
            await API.deleteNotification(id);
        } catch (e) {
             console.error('Failed to delete', e);
            fetchNotifications();
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
            isLoading,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
