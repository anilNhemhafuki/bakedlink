
import { db } from "./db";
import { eq, desc, and, lt, gte } from "drizzle-orm";
import { inventoryItems, products, orders, sales, purchases, productionSchedule, staff, customers, parties } from "@shared/schema";

export interface NotificationRule {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'new_order' | 'production_due' | 'payment_overdue' | 'staff_attendance' | 'system_alert';
  enabled: boolean;
  threshold?: number;
  conditions?: any;
  recipients: string[];
  lastTriggered?: Date;
}

export interface Notification {
  id: string;
  type: 'order' | 'production' | 'inventory' | 'shipping' | 'system';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  data?: any;
}

// In-memory notification storage (replace with database in production)
const notifications: Notification[] = [];
const notificationRules: NotificationRule[] = [
  {
    id: 'low_stock',
    type: 'low_stock',
    enabled: true,
    threshold: 10,
    recipients: ['admin', 'manager'],
  },
  {
    id: 'out_of_stock',
    type: 'out_of_stock',
    enabled: true,
    threshold: 0,
    recipients: ['admin', 'manager'],
  },
  {
    id: 'new_order',
    type: 'new_order',
    enabled: true,
    recipients: ['admin', 'manager', 'staff'],
  },
  {
    id: 'production_due',
    type: 'production_due',
    enabled: true,
    recipients: ['admin', 'manager'],
  },
];

function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createNotification(
  type: Notification['type'],
  title: string,
  description: string,
  priority: Notification['priority'] = 'medium',
  actionUrl?: string,
  data?: any
): void {
  const notification: Notification = {
    id: generateNotificationId(),
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
    read: false,
    priority,
    actionUrl,
    data,
  };

  notifications.unshift(notification);
  
  // Keep only last 100 notifications
  if (notifications.length > 100) {
    notifications.splice(100);
  }

  console.log(`📢 NEW NOTIFICATION [${priority.toUpperCase()}]: ${title}`);
}

// Real notification triggers based on actual system events

export async function checkLowStockAlerts(): Promise<void> {
  try {
    const rule = notificationRules.find(r => r.type === 'low_stock' && r.enabled);
    if (!rule) return;

    const lowStockItems = await db
      .select()
      .from(inventoryItems)
      .where(lt(inventoryItems.currentStock, inventoryItems.minLevel));

    for (const item of lowStockItems) {
      const currentStock = parseFloat(item.currentStock?.toString() || '0');
      const minLevel = parseFloat(item.minLevel?.toString() || '0');
      
      if (currentStock <= rule.threshold!) {
        createNotification(
          'inventory',
          `Low Stock Alert: ${item.name}`,
          `Only ${currentStock} ${item.unit} remaining. Minimum level: ${minLevel} ${item.unit}`,
          currentStock === 0 ? 'critical' : 'high',
          '/inventory',
          { itemId: item.id, currentStock, minLevel }
        );
      }
    }
  } catch (error) {
    console.error('Error checking low stock alerts:', error);
  }
}

export async function notifyNewOrder(orderData: any): Promise<void> {
  try {
    const rule = notificationRules.find(r => r.type === 'new_order' && r.enabled);
    if (!rule) return;

    createNotification(
      'order',
      `New Order Received`,
      `Order from ${orderData.customerName} for $${orderData.totalAmount}`,
      orderData.totalAmount > 500 ? 'high' : 'medium',
      `/orders`,
      orderData
    );
  } catch (error) {
    console.error('Error creating new order notification:', error);
  }
}

export async function checkProductionScheduleAlerts(): Promise<void> {
  try {
    const rule = notificationRules.find(r => r.type === 'production_due' && r.enabled);
    if (!rule) return;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingProduction = await db
      .select()
      .from(productionSchedule)
      .where(
        and(
          gte(productionSchedule.scheduleDate, today.toISOString().split('T')[0]),
          lt(productionSchedule.scheduleDate, tomorrow.toISOString().split('T')[0])
        )
      );

    for (const schedule of upcomingProduction) {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, schedule.productId))
        .limit(1);

      if (product.length > 0) {
        createNotification(
          'production',
          `Production Due Today`,
          `${product[0].name} - ${schedule.quantity} ${schedule.unitType} scheduled`,
          'medium',
          '/production',
          { scheduleId: schedule.id, productName: product[0].name }
        );
      }
    }
  } catch (error) {
    console.error('Error checking production schedule alerts:', error);
  }
}

export async function notifyPaymentReceived(paymentData: any): Promise<void> {
  try {
    createNotification(
      'system',
      `Payment Received`,
      `Payment of $${paymentData.amount} received from ${paymentData.customerName}`,
      'low',
      '/sales',
      paymentData
    );
  } catch (error) {
    console.error('Error creating payment notification:', error);
  }
}

export async function notifySystemAlert(alertData: any): Promise<void> {
  try {
    createNotification(
      'system',
      alertData.title,
      alertData.description,
      alertData.priority || 'medium',
      alertData.actionUrl,
      alertData
    );
  } catch (error) {
    console.error('Error creating system alert:', error);
  }
}

// API functions for frontend
export function getNotifications(): Notification[] {
  return [...notifications].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function markNotificationAsRead(notificationId: string): boolean {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

export function markAllNotificationsAsRead(): void {
  notifications.forEach(n => n.read = true);
}

export function clearNotification(notificationId: string): boolean {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications.splice(index, 1);
    return true;
  }
  return false;
}

export function sendTestNotification(): void {
  createNotification(
    'system',
    'Test Notification',
    'This is a test notification to verify the system is working correctly.',
    'low',
    '/notifications',
    { test: true }
  );
}

// Periodic checks (call these from your scheduler)
export async function runPeriodicChecks(): Promise<void> {
  await checkLowStockAlerts();
  await checkProductionScheduleAlerts();
}

// Initialize with some sample notifications for testing
setTimeout(() => {
  createNotification(
    'system',
    'System Initialized',
    'Notification system is now active and monitoring your bakery operations.',
    'low'
  );
}, 1000);
