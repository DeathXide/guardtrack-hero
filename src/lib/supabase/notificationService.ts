import { supabase } from './client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  data?: any;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  attendanceAlerts: boolean;
  shiftReminders: boolean;
  paymentNotifications: boolean;
}

export class NotificationService {
  // Create a new notification
  async createNotification(notification: Partial<Notification>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit = 50, unreadOnly = false) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }

  // Delete notification
  async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Send attendance reminder
  async sendAttendanceReminder(guardId: string, shiftId: string, shiftDate: string) {
    return this.createNotification({
      userId: guardId,
      title: 'Shift Reminder',
      message: `You have a shift scheduled for ${shiftDate}. Please mark your attendance on time.`,
      type: 'info',
      data: { shiftId, type: 'attendance_reminder' }
    });
  }

  // Send missed shift alert
  async sendMissedShiftAlert(guardId: string, shiftId: string, siteId: string) {
    return this.createNotification({
      userId: guardId,
      title: 'Missed Shift Alert',
      message: 'You missed your scheduled shift. Please contact your supervisor.',
      type: 'warning',
      data: { shiftId, siteId, type: 'missed_shift' }
    });
  }

  // Send payment notification
  async sendPaymentNotification(guardId: string, amount: number, month: string) {
    return this.createNotification({
      userId: guardId,
      title: 'Payment Processed',
      message: `Your payment of $${amount} for ${month} has been processed.`,
      type: 'success',
      data: { amount, month, type: 'payment' }
    });
  }

  // Send late arrival warning
  async sendLateArrivalWarning(guardId: string, shiftId: string, minutesLate: number) {
    return this.createNotification({
      userId: guardId,
      title: 'Late Arrival',
      message: `You arrived ${minutesLate} minutes late for your shift. Please arrive on time.`,
      type: 'warning',
      data: { shiftId, minutesLate, type: 'late_arrival' }
    });
  }

  // Send shift allocation notification
  async sendShiftAllocationNotification(guardId: string, siteId: string, shiftDate: string) {
    return this.createNotification({
      userId: guardId,
      title: 'New Shift Assigned',
      message: `You have been assigned a new shift on ${shiftDate}.`,
      type: 'info',
      data: { siteId, shiftDate, type: 'shift_allocation' }
    });
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      attendanceAlerts: true,
      shiftReminders: true,
      paymentNotifications: true
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => callback(payload.new as Notification)
      )
      .subscribe();
  }

  // Unsubscribe from notifications
  unsubscribeFromNotifications(userId: string) {
    const channel = supabase.getChannels().find(ch => ch.topic === `notifications_${userId}`);
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
}

export const notificationService = new NotificationService();