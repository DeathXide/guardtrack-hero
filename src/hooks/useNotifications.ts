import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

interface NotificationPreferences {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  // Mock data for demo
  useEffect(() => {
    if (user) {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Guard Absent',
          message: 'Mike Johnson is absent for Downtown Office day shift.',
          type: 'warning',
          read: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
        {
          id: '2',
          title: 'Shift Replacement',
          message: 'Lisa Chen was assigned as replacement at Tech Park.',
          type: 'success',
          read: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      ];
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    }
  }, [user]);

  const loadNotifications = async (unreadOnly = false) => {
    // Mock implementation
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    const deletedNotification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    if (deletedNotification && !deletedNotification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    toast({
      title: 'Preferences updated',
      description: 'Your notification preferences have been saved.',
    });
  };

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
  };
};