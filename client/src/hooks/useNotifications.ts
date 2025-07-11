import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface NotificationRule {
  id: string;
  type: 'low_stock' | 'new_order' | 'production_reminder';
  enabled: boolean;
  threshold?: number;
  dailyLimit: boolean;
  lastSent?: Date;
}

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | null;
  subscription: PushSubscription | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  rules: NotificationRule[];
  updateRule: (id: string, rule: Partial<NotificationRule>) => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

const defaultRules: NotificationRule[] = [
  {
    id: 'low_stock',
    type: 'low_stock',
    enabled: true,
    threshold: 10,
    dailyLimit: true,
  },
  {
    id: 'new_order',
    type: 'new_order',
    enabled: true,
    dailyLimit: false,
  },
  {
    id: 'production_reminder',
    type: 'production_reminder',
    enabled: true,
    dailyLimit: true,
  },
];

export function useNotifications(): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [rules, setRules] = useState<NotificationRule[]>(defaultRules);
  const { user } = useAuth();

  // Check if user has admin, supervisor, or manager role
  const hasNotificationAccess = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'manager';

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          return registration.pushManager.getSubscription();
        })
        .then((sub) => {
          setSubscription(sub);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Load saved rules from localStorage
      const savedRules = localStorage.getItem('notificationRules');
      if (savedRules) {
        setRules(JSON.parse(savedRules));
      }
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported || !hasNotificationAccess) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted' || !hasNotificationAccess) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // This would be your VAPID public key - you'll need to generate one
          'BEl62iUYgUivxIkv69yViEuiBIa0aEOkOyK2u6M4jFm8u2J7sCvk1fOY1PzTF8yHrFH3o8yl-F3K_mzRYhR1QQs'
        ),
      });

      setSubscription(subscription);

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription,
          userId: user?.id,
        }),
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // Remove subscription from server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  };

  const updateRule = async (id: string, updatedRule: Partial<NotificationRule>): Promise<void> => {
    const newRules = rules.map(rule => 
      rule.id === id ? { ...rule, ...updatedRule } : rule
    );
    setRules(newRules);
    localStorage.setItem('notificationRules', JSON.stringify(newRules));

    // Send updated rules to server
    await fetch('/api/notifications/rules', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId: user?.id,
        rules: newRules,
      }),
    });
  };

  const sendTestNotification = async (): Promise<void> => {
    if (!hasNotificationAccess) return;

    await fetch('/api/notifications/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId: user?.id,
      }),
    });
  };

  return {
    isSupported: isSupported && hasNotificationAccess,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    rules,
    updateRule,
    sendTestNotification,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
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