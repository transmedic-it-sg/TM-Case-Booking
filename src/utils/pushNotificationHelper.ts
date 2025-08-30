/**
 * Push Notification Helper
 * Utility functions to send push notifications for case updates
 */

import { CaseBooking, CaseStatus } from '../types';
import { getCurrentUser } from './auth';

/**
 * Send a case status update notification
 */
export const sendCaseStatusNotification = async (
  caseItem: CaseBooking,
  newStatus: CaseStatus,
  oldStatus?: CaseStatus
): Promise<void> => {
  // In a real implementation, this would send to your push notification server
  // For now, we'll simulate the notification payload
  
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const notificationPayload = {
    title: 'Case Status Updated',
    body: `Case ${caseItem.caseReferenceNumber} changed from ${oldStatus || 'Unknown'} to ${newStatus}`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `case-${caseItem.id}`,
    data: {
      caseId: caseItem.id,
      type: 'case-status',
      url: `/?highlight=${caseItem.id}`,
      newStatus,
      oldStatus,
      caseReference: caseItem.caseReferenceNumber,
      hospital: caseItem.hospital,
      department: caseItem.department
    },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  // Log the notification (in production, send to push service)
  console.log('📱 Would send push notification:', notificationPayload);
  
  // Store notification for simulation
  storeSimulatedNotification(notificationPayload);
};

/**
 * Send a new case assignment notification
 */
export const sendNewCaseNotification = async (caseItem: CaseBooking): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const notificationPayload = {
    title: 'New Case Assignment',
    body: `New case ${caseItem.caseReferenceNumber} assigned at ${caseItem.hospital}`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `new-case-${caseItem.id}`,
    data: {
      caseId: caseItem.id,
      type: 'new-case',
      url: `/?highlight=${caseItem.id}`,
      caseReference: caseItem.caseReferenceNumber,
      hospital: caseItem.hospital,
      department: caseItem.department,
      dateOfSurgery: caseItem.dateOfSurgery
    },
    requireInteraction: true, // New cases might need immediate attention
    vibrate: [300, 100, 300, 100, 300]
  };

  console.log('📱 Would send new case notification:', notificationPayload);
  storeSimulatedNotification(notificationPayload);
};

/**
 * Send a delivery confirmation notification
 */
export const sendDeliveryNotification = async (caseItem: CaseBooking): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const notificationPayload = {
    title: 'Delivery Confirmed',
    body: `Case ${caseItem.caseReferenceNumber} has been delivered to ${caseItem.hospital}`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `delivery-${caseItem.id}`,
    data: {
      caseId: caseItem.id,
      type: 'delivery',
      url: `/?highlight=${caseItem.id}`,
      caseReference: caseItem.caseReferenceNumber,
      hospital: caseItem.hospital,
      department: caseItem.department
    },
    requireInteraction: false,
    vibrate: [100, 50, 100]
  };

  console.log('📱 Would send delivery notification:', notificationPayload);
  storeSimulatedNotification(notificationPayload);
};

/**
 * Send urgent case notification (for high priority cases)
 */
export const sendUrgentCaseNotification = async (
  caseItem: CaseBooking, 
  message: string
): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const notificationPayload = {
    title: '🚨 Urgent Case Alert',
    body: `${caseItem.caseReferenceNumber}: ${message}`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `urgent-${caseItem.id}`,
    data: {
      caseId: caseItem.id,
      type: 'urgent',
      url: `/?highlight=${caseItem.id}`,
      caseReference: caseItem.caseReferenceNumber,
      hospital: caseItem.hospital,
      department: caseItem.department,
      message
    },
    requireInteraction: true, // Urgent cases need immediate attention
    vibrate: [500, 200, 500, 200, 500, 200, 500] // Longer vibration for urgent
  };

  console.log('📱 Would send urgent notification:', notificationPayload);
  storeSimulatedNotification(notificationPayload);
};

/**
 * Send daily summary notification
 */
export const sendDailySummaryNotification = async (summary: {
  newCases: number;
  pendingCases: number;
  completedCases: number;
}): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const { newCases, pendingCases, completedCases } = summary;
  
  if (newCases === 0 && pendingCases === 0 && completedCases === 0) {
    return; // Don't send empty summaries
  }

  const parts = [];
  if (newCases > 0) parts.push(`${newCases} new`);
  if (pendingCases > 0) parts.push(`${pendingCases} pending`);
  if (completedCases > 0) parts.push(`${completedCases} completed`);

  const notificationPayload = {
    title: 'Daily Case Summary',
    body: `Today: ${parts.join(', ')} cases`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'daily-summary',
    data: {
      type: 'daily-summary',
      url: '/',
      summary
    },
    requireInteraction: false,
    vibrate: [100, 50, 100]
  };

  console.log('📱 Would send daily summary:', notificationPayload);
  storeSimulatedNotification(notificationPayload);
};

/**
 * Store simulated notification for demo purposes
 * In production, this would be sent to your push notification server
 */
const storeSimulatedNotification = (payload: any): void => {
  const stored = getStoredNotifications();
  stored.push({
    ...payload,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    sent: false // Would be true when actually sent via push service
  });
  
  // Keep only last 50 notifications
  if (stored.length > 50) {
    stored.splice(0, stored.length - 50);
  }
  
  localStorage.setItem('simulated-notifications', JSON.stringify(stored));
};

/**
 * Get stored simulated notifications
 */
export const getStoredNotifications = (): any[] => {
  try {
    const stored = localStorage.getItem('simulated-notifications');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Clear stored notifications
 */
export const clearStoredNotifications = (): void => {
  localStorage.removeItem('simulated-notifications');
};

/**
 * Send test push notification using the service worker
 */
export const sendTestPushNotification = async (): Promise<void> => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Simulate a push event with test data
      const testPayload = {
        title: 'TM Case Booking Test',
        body: 'This is a test push notification',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'test-notification',
        data: {
          type: 'test',
          url: '/',
          timestamp: Date.now()
        }
      };

      // Show notification directly (simulating push)
      await registration.showNotification(testPayload.title, {
        body: testPayload.body,
        icon: testPayload.icon,
        badge: testPayload.badge,
        tag: testPayload.tag,
        data: testPayload.data,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'open-app',
            title: 'Open App',
            icon: '/logo192.png'
          }
        ]
      });

      console.log('📱 Test notification sent');
      
    } catch (error) {
      console.error('📱 Failed to send test notification:', error);
      throw error;
    }
  } else {
    throw new Error('Push notifications not supported');
  }
};

/**
 * Check if user should receive notifications for a case
 * Based on user role, assigned departments, etc.
 */
export const shouldReceiveNotification = (
  caseItem: CaseBooking, 
  notificationType: string
): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  // Admin and IT users get all notifications
  if (currentUser.role === 'admin' || currentUser.role === 'it') {
    return true;
  }

  // Check if user is in the same country
  if (caseItem.country !== currentUser.selectedCountry) {
    return false;
  }

  // Check if user has access to the department
  const userDepartments = currentUser.departments || [];
  if (userDepartments.length > 0 && !userDepartments.includes(caseItem.department)) {
    return false;
  }

  // Role-specific notification rules
  switch (currentUser.role) {
    case 'user':
      // Regular users only get notifications for cases they submitted
      return caseItem.submittedBy === currentUser.name;
    
    case 'manager':
      // Managers get notifications for their country and departments
      return true;
    
    default:
      return false;
  }
};

/**
 * Get notification preferences from user settings
 * In production, this would come from user profile/settings
 */
export const getNotificationPreferences = () => {
  try {
    const stored = localStorage.getItem('notification-preferences');
    return stored ? JSON.parse(stored) : {
      caseStatus: true,
      newCases: true,
      deliveries: true,
      urgent: true,
      dailySummary: false
    };
  } catch {
    return {
      caseStatus: true,
      newCases: true,
      deliveries: true,
      urgent: true,
      dailySummary: false
    };
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = (preferences: any): void => {
  localStorage.setItem('notification-preferences', JSON.stringify(preferences));
};