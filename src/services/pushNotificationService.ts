/**
 * Push Notification Service
 * Handles web push notifications for mobile devices
 */

import { getCurrentUser } from '../utils/auth';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    caseId?: string;
    type?: string;
    url?: string;
    [key: string]: any;
  };
  requireInteraction?: boolean;
  vibrate?: number[];
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  
  // VAPID public key - This should be moved to environment variables in production
  private vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI2BqsESB8C0L7ZE_JFoJ8_j4j5rG_1vvN0Q4DJE-zAFWj1kOA_l4jWF0s';

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private constructor() {
    this.initializeServiceWorker();
  }

  /**
   * Initialize service worker for push notifications
   */
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('📱 Service Worker not supported');
      return;
    }

    if (!('PushManager' in window)) {
      console.warn('📱 Push messaging not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('📱 Service Worker registered successfully');
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });
      
      // Check if we already have a subscription
      await this.checkExistingSubscription();
      
    } catch (error) {
      console.error('📱 Service Worker registration failed:', error);
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    console.log('📱 Message from Service Worker:', event.data);
    
    if (event.data.type === 'NOTIFICATION_CLICK') {
      // Handle notification click - navigate to specific case if provided
      const { data, action } = event.data;
      
      if (action === 'view-case' && data.caseId) {
        // Navigate to specific case (implement based on your routing)
        console.log('📱 Navigate to case:', data.caseId);
        this.highlightCase(data.caseId);
      }
    }
  }

  /**
   * Highlight a specific case in the UI
   */
  private highlightCase(caseId: string): void {
    // This would need to integrate with your app's navigation/state management
    // For now, we'll just dispatch a custom event
    const event = new CustomEvent('highlightCase', { 
      detail: { caseId } 
    });
    window.dispatchEvent(event);
  }

  /**
   * Check for existing push subscription
   */
  private async checkExistingSubscription(): Promise<void> {
    if (!this.registration) return;

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      if (this.subscription) {
        console.log('📱 Existing push subscription found');
        // Optionally sync with server
        await this.syncSubscriptionWithServer(this.subscription);
      }
    } catch (error) {
      console.error('📱 Error checking existing subscription:', error);
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('📱 Notifications not supported');
      return 'denied';
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log('📱 Notification permission:', permission);
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('📱 Service Worker not registered');
      return null;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.warn('📱 Notification permission denied');
      return null;
    }

    try {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('📱 Push subscription created');
      
      // Store subscription on server
      await this.syncSubscriptionWithServer(this.subscription);
      
      return this.subscription;
      
    } catch (error) {
      console.error('📱 Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      console.log('📱 No active subscription to unsubscribe from');
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      
      console.log('📱 Successfully unsubscribed from push notifications');
      
      // Remove subscription from server
      await this.removeSubscriptionFromServer();
      
      return true;
    } catch (error) {
      console.error('📱 Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  } {
    return {
      supported: 'serviceWorker' in navigator && 'PushManager' in window,
      permission: 'Notification' in window ? Notification.permission : 'denied',
      subscribed: this.subscription !== null
    };
  }

  /**
   * Send subscription to server
   */
  private async syncSubscriptionWithServer(subscription: PushSubscription): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn('📱 No current user - cannot sync subscription');
      return;
    }

    try {
      // Helper function to convert ArrayBuffer to base64
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const uint8Array = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
      };

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      // Store in localStorage as fallback (in production, send to server)
      const subscriptions = this.getStoredSubscriptions();
      subscriptions[currentUser.id] = {
        ...subscriptionData,
        userId: currentUser.id,
        userName: currentUser.name,
        country: currentUser.selectedCountry,
        role: currentUser.role,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('push-subscriptions', JSON.stringify(subscriptions));
      console.log('📱 Subscription stored locally');

      // TODO: In production, send to your push notification server
      // await fetch('/api/push/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ subscription: subscriptionData, user: currentUser })
      // });

    } catch (error) {
      console.error('📱 Failed to sync subscription with server:', error);
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      // Remove from localStorage
      const subscriptions = this.getStoredSubscriptions();
      delete subscriptions[currentUser.id];
      localStorage.setItem('push-subscriptions', JSON.stringify(subscriptions));

      // TODO: In production, remove from your push notification server
      // await fetch('/api/push/unsubscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: currentUser.id })
      // });

    } catch (error) {
      console.error('📱 Failed to remove subscription from server:', error);
    }
  }

  /**
   * Get stored subscriptions from localStorage
   */
  private getStoredSubscriptions(): Record<string, any> {
    try {
      const stored = localStorage.getItem('push-subscriptions');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Send a local test notification (for testing)
   */
  async sendTestNotification(): Promise<void> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') return;

    if (this.registration) {
      await this.registration.showNotification('TM Case Booking Test', {
        body: 'This is a test notification',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        data: {
          type: 'test',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'open-app',
            title: 'Open App',
            icon: '/logo192.png'
          }
        ]
      });
    }
  }

  /**
   * Send case notification based on Email Configuration settings
   */
  async sendCaseNotification(
    title: string,
    body: string,
    caseData: {
      caseId: string;
      caseReferenceNumber: string;
      status: string;
      type: 'new-case' | 'status-change' | 'general';
    }
  ): Promise<void> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.log('📱 Push notification permission not granted');
      return;
    }

    if (!this.registration) {
      console.warn('📱 Service Worker not registered');
      return;
    }

    try {
      await this.registration.showNotification(title, {
        body: body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: `case-${caseData.caseId}`,
        renotify: true,
        requireInteraction: caseData.type === 'new-case',
        data: {
          type: caseData.type,
          caseId: caseData.caseId,
          caseRef: caseData.caseReferenceNumber,
          status: caseData.status,
          timestamp: Date.now(),
          url: `/?highlight=${caseData.caseId}`
        },
        actions: [
          {
            action: 'view-case',
            title: 'View Case',
            icon: '/logo192.png'
          },
          {
            action: 'open-app',
            title: 'Open App',
            icon: '/logo192.png'
          }
        ]
      });

      console.log('📱 Case notification sent:', title);
    } catch (error) {
      console.error('📱 Failed to send case notification:', error);
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Utility function to check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
};

// Utility function to check notification permission
export const getNotificationPermission = (): NotificationPermission => {
  return 'Notification' in window ? Notification.permission : 'denied';
};