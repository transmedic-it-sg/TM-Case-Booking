/**
 * Push Notification Service - Modern notification management
 * Handles browser push notifications with proper error handling
 */

export interface PushNotificationConfig {
  enabled: boolean;
  permission: NotificationPermission;
  subscription?: PushSubscription | null;
}

class PushNotificationService {
  private config: PushNotificationConfig = {
    enabled: false,
    permission: 'default'
  };

  async initialize(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    this.config.permission = Notification.permission;
    this.config.enabled = this.config.permission === 'granted';

    return this.config.enabled;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.config.permission = permission;
      this.config.enabled = permission === 'granted';

      return this.config.enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  getConfig(): PushNotificationConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async disable(): Promise<void> {
    this.config.enabled = false;
    // Note: Cannot revoke browser permission programmatically
    // User must manually disable in browser settings
  }

  getSubscriptionStatus(): boolean {
    return this.config.enabled;
  }

  async subscribeToPush(): Promise<boolean> {
    try {
      const permission = await this.requestPermission();
      if (permission) {
        // In a real implementation, you'd register a service worker and create subscriptionreturn true;
      }
      return false;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    try {
      this.config.enabled = false;
      // In a real implementation, you'd unsubscribe from push service
      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  async sendTestNotification(): Promise<boolean> {
    return this.showNotification('Test Notification', {
      body: 'This is a test notification to verify the system is working correctly.',
      icon: '/favicon.ico'
    });
  }
}

// Export individual functions for backward compatibility
const service = new PushNotificationService();

export const pushNotificationService = service;
export const isPushNotificationSupported = () => 'Notification' in window;
export const getNotificationPermission = () => Notification.permission;

export default service;