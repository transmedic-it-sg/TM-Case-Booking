// Browser notification utility functions

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

// Check if notifications are supported and enabled
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Check if user has enabled notifications in settings
export const areNotificationsEnabled = (): boolean => {
  if (!isNotificationSupported()) return false;
  
  const enabled = localStorage.getItem('notifications-enabled');
  return enabled === 'true' && Notification.permission === 'granted';
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported');
  }
  
  return await Notification.requestPermission();
};

// Send a browser notification
export const sendNotification = (options: NotificationOptions): Notification | null => {
  if (!areNotificationsEnabled()) {
    console.log('Notifications are disabled or not supported');
    return null;
  }
  
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false
    });
    
    // Auto-close notification after 5 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return null;
  }
};

// Predefined notification types for common use cases
export const NotificationTypes = {
  caseSubmitted: (caseId: string) => sendNotification({
    title: 'Case Submitted Successfully',
    body: `Case ${caseId} has been submitted and is now being processed`,
    tag: 'case-submitted'
  }),
  
  statusUpdated: (caseId: string, newStatus: string) => sendNotification({
    title: 'Case Status Updated',
    body: `Case ${caseId} status changed to: ${newStatus}`,
    tag: 'status-update'
  }),
  
  orderReady: (caseId: string) => sendNotification({
    title: 'Order Ready for Delivery',
    body: `Order for case ${caseId} is prepared and ready for delivery`,
    tag: 'order-ready',
    requireInteraction: true
  }),
  
  deliveryComplete: (caseId: string) => sendNotification({
    title: 'Delivery Completed',
    body: `Case ${caseId} has been successfully delivered`,
    tag: 'delivery-complete'
  }),
  
  userAction: (message: string) => sendNotification({
    title: 'Action Required',
    body: message,
    tag: 'user-action',
    requireInteraction: true
  }),
  
  systemAlert: (message: string) => sendNotification({
    title: 'System Alert',
    body: message,
    tag: 'system-alert',
    requireInteraction: true
  })
};