/**
 * useNotifications Hook - Reactive notification management
 * Replaces NotificationContext for better performance
 */

import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { notificationService } from '../services';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to notification updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    notificationService.addNotification(notification);
  }, []);

  const removeNotification = useCallback((id: string) => {
    notificationService.removeNotification(id);
  }, []);

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const clearAll = useCallback(() => {
    notificationService.clearAll();
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message: string) => {
    notificationService.success(title, message);
  }, []);

  const error = useCallback((title: string, message: string) => {
    notificationService.error(title, message);
  }, []);

  const warning = useCallback((title: string, message: string) => {
    notificationService.warning(title, message);
  }, []);

  const info = useCallback((title: string, message: string) => {
    notificationService.info(title, message);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    success,
    error,
    warning,
    info
  };
};