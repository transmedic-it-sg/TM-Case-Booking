import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser } from '../utils/authCompat';
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
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>, notificationType?: string, targetCountry?: string, targetDepartment?: string) => Promise<void>;
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

  // Load notifications from secure storage on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { SafeStorage } = await import('../utils/secureDataManager');
        const { STORAGE_KEYS } = await import('../constants/secureStorage');

        const saved = await SafeStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        if (saved) {
          // Ensure all notifications have userId for user isolation
          const validNotifications = saved.filter((notification: any) =>
            notification.userId && typeof notification.userId === 'string'
          );

          setAllNotifications(validNotifications);
        }
      } catch (error) {
        // // console.error('Failed to load notifications from secure storage:', error);
        // Don't fallback to localStorage to prevent conflicts
        setAllNotifications([]);
      }
    };

    loadNotifications();
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

  // Save all notifications to secure storage whenever they change
  useEffect(() => {
    const saveNotifications = async () => {
      try {
        const { SafeStorage } = await import('../utils/secureDataManager');
        const { STORAGE_KEYS } = await import('../constants/secureStorage');

        await SafeStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, allNotifications);
      } catch (error) {
        // // console.error('Failed to save notifications to secure storage:', error);
      }
    };

    if (allNotifications.length > 0) {
      saveNotifications();
    }
  }, [allNotifications]);

  // Helper function to get user notification preferences using secure storage
  const getUserNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
    try {
      const { SafeStorage } = await import('../utils/secureDataManager');
      const { STORAGE_KEYS } = await import('../constants/secureStorage');

      const savedPreferences = await SafeStorage.getItem(`${STORAGE_KEYS.USER_PREFERENCES}_notifications_${userId}`);
      if (savedPreferences) {
        return savedPreferences;
      }
    } catch (error) {
      // // console.error('Error loading notification preferences from secure storage:', error);
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

  const addNotification = async (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>,
    notificationType?: string,
    targetCountry?: string,
    targetDepartment?: string
  ) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Check if notification is relevant to user's country and department
    if (targetCountry && currentUser.selectedCountry && currentUser.selectedCountry !== targetCountry) {
      return; // Skip notification if not for user's country
    }

    if (targetDepartment && currentUser.departments && !currentUser.departments.includes(targetDepartment)) {
      return; // Skip notification if not for user's department
    }

    // Check user notification preferences asynchronously
    if (notificationType) {
      try {
        const userPreferences = await getUserNotificationPreferences(currentUser.id);
        if (!shouldSendNotification(notificationType, userPreferences)) {
          return;
        }
      } catch (error) {
        // // console.error('Failed to check notification preferences, allowing notification:', error);
        // Continue to send notification if preferences can't be loaded
      }
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
      // Keep only the latest 50 notifications per user (increased from 10)
      const userNotifications = updated.filter(n => n.userId === currentUser.id);
      const otherNotifications = updated.filter(n => n.userId !== currentUser.id);
      const limitedUserNotifications = userNotifications.slice(0, 50);
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