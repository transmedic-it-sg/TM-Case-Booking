import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission } from '../data/permissionMatrixData';
import { NotificationPreferences } from '../components/NotificationSettings';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  urgent?: boolean;
  userId: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>, notificationType?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('case-booking-notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old notifications without userId - assign to current user or remove
        const currentUser = getCurrentUser();
        const migratedNotifications = parsed.map((notification: any) => {
          if (!notification.userId && currentUser) {
            return { ...notification, userId: currentUser.id };
          }
          return notification;
        }).filter((notification: any) => notification.userId); // Remove notifications without userId
        
        setAllNotifications(migratedNotifications);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }
  }, []);

  // Filter notifications for current user whenever allNotifications or user changes
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      const userNotifications = allNotifications
        .filter(notification => notification.userId === currentUser.id)
        .slice(0, 10); // Limit to 10 notifications
      setNotifications(userNotifications);
    } else {
      setNotifications([]);
    }
  }, [allNotifications]);

  // Save all notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('case-booking-notifications', JSON.stringify(allNotifications));
  }, [allNotifications]);

  // Helper function to get user notification preferences
  const getUserNotificationPreferences = (userId: string): NotificationPreferences => {
    const savedPreferences = localStorage.getItem(`notificationPreferences_${userId}`);
    if (savedPreferences) {
      try {
        return JSON.parse(savedPreferences);
      } catch (error) {
        console.error('Error parsing notification preferences:', error);
      }
    }
    // Default preferences
    return {
      statusUpdates: true,
      caseCreated: true,
      caseAmended: true,
      orderProcessed: true,
      orderDelivered: true,
      orderReceived: true,
      caseCompleted: true,
      toBeBilled: true,
      systemAlerts: true,
      reminderNotifications: true,
      sound: true,
      desktop: false
    };
  };

  // Helper function to check if notification should be sent based on type and preferences
  const shouldSendNotification = (notificationType: string, preferences: NotificationPreferences): boolean => {
    const typeMapping: { [key: string]: keyof NotificationPreferences } = {
      'status-update': 'statusUpdates',
      'case-created': 'caseCreated',
      'case-amended': 'caseAmended',
      'order-processed': 'orderProcessed',
      'order-delivered': 'orderDelivered',
      'order-received': 'orderReceived',
      'case-completed': 'caseCompleted',
      'to-be-billed': 'toBeBilled',
      'system-alert': 'systemAlerts',
      'reminder': 'reminderNotifications'
    };

    const preferenceKey = typeMapping[notificationType];
    return preferenceKey ? preferences[preferenceKey] : true; // Default to true for unknown types
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>, notificationType?: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Check if user has permission to receive notifications
    if (!hasPermission(currentUser.role, 'view-notification-settings')) {
      return;
    }

    // Check user notification preferences
    const userPreferences = getUserNotificationPreferences(currentUser.id);
    if (notificationType && !shouldSendNotification(notificationType, userPreferences)) {
      return;
    }

    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
      userId: currentUser.id,
    };

    setAllNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the latest 10 notifications per user
      const userNotifications = updated.filter(n => n.userId === currentUser.id);
      const otherNotifications = updated.filter(n => n.userId !== currentUser.id);
      const limitedUserNotifications = userNotifications.slice(0, 10);
      return [...limitedUserNotifications, ...otherNotifications];
    });
  };

  const markAsRead = (id: string) => {
    setAllNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    setAllNotifications(prev =>
      prev.map(notification =>
        notification.userId === currentUser.id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearNotification = (id: string) => {
    setAllNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    setAllNotifications(prev =>
      prev.filter(notification => notification.userId !== currentUser.id)
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;