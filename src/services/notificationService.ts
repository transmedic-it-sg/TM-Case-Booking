/**
 * Notification Service - Centralized notification management
 * Replaces useNotifications context for better performance
 */

import { Notification } from '../types';

type NotificationListener = (notifications: Notification[]) => void;

class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private readonly MAX_NOTIFICATIONS = 100;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.loadNotifications();
  }

  /**
   * Load notifications from localStorage
   */
  private loadNotifications(): void {
    try {
      const notificationsData = localStorage.getItem('notifications');
      if (notificationsData) {
        this.notifications = JSON.parse(notificationsData);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotifications(): void {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.notifications]);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  /**
   * Subscribe to notification updates
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current notifications
    listener([...this.notifications]);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add new notification
   */
  addNotification(notification: Omit<Notification, 'id'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: notification.timestamp || new Date().toISOString()
    };

    this.notifications.unshift(newNotification);
    
    // Limit notifications to prevent memory bloat
    if (this.notifications.length > this.MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, this.MAX_NOTIFICATIONS);
    }

    this.saveNotifications();
    this.notifyListeners();
  }

  /**
   * Remove notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveNotifications();
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Get notifications (current state)
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: 'success' | 'error' | 'warning' | 'info'): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add success notification
   */
  success(title: string, message: string): void {
    this.addNotification({
      title,
      message,
      type: 'success',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add error notification
   */
  error(title: string, message: string): void {
    this.addNotification({
      title,
      message,
      type: 'error',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add warning notification
   */
  warning(title: string, message: string): void {
    this.addNotification({
      title,
      message,
      type: 'warning',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add info notification
   */
  info(title: string, message: string): void {
    this.addNotification({
      title,
      message,
      type: 'info',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  cleanupOldNotifications(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredNotifications = this.notifications.filter(notification => {
      const notificationDate = new Date(notification.timestamp);
      return notificationDate > thirtyDaysAgo;
    });

    if (filteredNotifications.length !== this.notifications.length) {
      this.notifications = filteredNotifications;
      this.saveNotifications();
      this.notifyListeners();
    }
  }
}

export default NotificationService.getInstance();