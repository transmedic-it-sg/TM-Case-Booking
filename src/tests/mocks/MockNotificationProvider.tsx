/**
 * Mock Notification Provider for Testing
 * Provides a simplified notification context for test environments
 */

import React, { createContext, useContext, ReactNode } from 'react';

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

const MockNotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface MockNotificationProviderProps {
  children: ReactNode;
}

export const MockNotificationProvider: React.FC<MockNotificationProviderProps> = ({ children }) => {
  const mockContext: NotificationContextType = {
    notifications: [],
    unreadCount: 0,
    addNotification: async (notification) => {
      console.log('Mock notification added:', notification);
    },
    markAsRead: (id: string) => {
      console.log('Mock notification marked as read:', id);
    },
    markAllAsRead: () => {
      console.log('Mock all notifications marked as read');
    },
    clearNotification: (id: string) => {
      console.log('Mock notification cleared:', id);
    },
    clearAllNotifications: () => {
      console.log('Mock all notifications cleared');
    }
  };

  return (
    <MockNotificationContext.Provider value={mockContext}>
      {children}
    </MockNotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(MockNotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a MockNotificationProvider');
  }
  return context;
};