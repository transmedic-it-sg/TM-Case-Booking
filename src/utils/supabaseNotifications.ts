// Supabase Notifications Utilities
import { supabase } from '../lib/supabase'
import { Notification } from '../types'

// Get notifications for current user
export const getNotifications = async (limit = 50): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data.map(transformNotificationFromDB)
  } catch (error) {
    console.error('Get notifications error:', error)
    return []
  }
}

// Add notification for user
export const addNotification = async (
  userId: string,
  notification: Omit<Notification, 'id' | 'timestamp'>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read || false,
        duration: notification.duration || 5000
      })

    if (error) throw error
  } catch (error) {
    console.error('Add notification error:', error)
    throw error
  }
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error
  } catch (error) {
    console.error('Mark notification as read error:', error)
    throw error
  }
}

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)

    if (error) throw error
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    throw error
  }
}

// Delete notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  } catch (error) {
    console.error('Delete notification error:', error)
    throw error
  }
}

// Get unread count
export const getUnreadCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Get unread count error:', error)
    return 0
  }
}

// Set up real-time notifications subscription
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void
) => {
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const notification = transformNotificationFromDB(payload.new)
        onNotification(notification)
      }
    )
    .subscribe()

  return subscription
}

// Send notification to multiple users
export const sendNotificationToUsers = async (
  userIds: string[],
  notification: Omit<Notification, 'id' | 'timestamp'>
): Promise<void> => {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      duration: notification.duration || 5000
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) throw error
  } catch (error) {
    console.error('Send notifications to users error:', error)
    throw error
  }
}

// Send notification to users with specific roles
export const sendNotificationToRoles = async (
  roles: string[],
  countries: string[],
  notification: Omit<Notification, 'id' | 'timestamp'>
): Promise<void> => {
  try {
    // Get users with specified roles in specified countries
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', roles)
      .filter('countries', 'ov', countries)
      .eq('enabled', true)

    if (profilesError) throw profilesError

    const userIds = profiles.map(profile => profile.id)
    
    if (userIds.length > 0) {
      await sendNotificationToUsers(userIds, notification)
    }
  } catch (error) {
    console.error('Send notifications to roles error:', error)
    throw error
  }
}

// Transform notification from database format
const transformNotificationFromDB = (dbNotification: any): Notification => {
  return {
    id: dbNotification.id,
    type: dbNotification.type,
    title: dbNotification.title,
    message: dbNotification.message,
    timestamp: dbNotification.created_at,
    read: dbNotification.read,
    duration: dbNotification.duration
  }
}

// Context provider for real-time notifications
export class SupabaseNotificationManager {
  private subscription: any = null
  private userId: string | null = null
  private onNotificationCallback: ((notification: Notification) => void) | null = null

  constructor(userId: string, onNotification: (notification: Notification) => void) {
    this.userId = userId
    this.onNotificationCallback = onNotification
    this.subscribe()
  }

  private subscribe() {
    if (!this.userId || !this.onNotificationCallback) return

    this.subscription = subscribeToNotifications(this.userId, this.onNotificationCallback)
  }

  public unsubscribe() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription)
      this.subscription = null
    }
  }

  public updateUserId(userId: string) {
    this.unsubscribe()
    this.userId = userId
    this.subscribe()
  }
}