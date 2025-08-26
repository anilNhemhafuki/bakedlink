export interface OrderNotification {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  deliveryDate: string;
  itemCount: number;
}

export interface LowStockNotification {
  itemName: string;
  currentStock: number;
  minLevel: number;
  unit: string;
  supplier?: string;
}

export interface ProductionNotification {
  productName: string;
  scheduledDate: string;
  targetAmount: number;
  unit: string;
  priority: string;
  assignedTo?: string;
}

// In-memory notification storage (in production, use database)
const notificationSubscriptions = new Map<string, any>();
const notificationSettings = new Map<string, any>();

export async function notifyNewPublicOrder(orderData: {
  orderNumber: string;
  orderId?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  deliveryDate: string;
  itemCount: number;
  attachmentCount?: number;
  source?: string;
  submissionTime?: string;
}): Promise<void> {
  try {
    console.log("📧 Sending enhanced notifications for new public order:", orderData.orderNumber);

    // Enhanced notification details
    const notificationData = {
      orderNumber: orderData.orderNumber,
      orderId: orderData.orderId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      totalAmount: orderData.totalAmount,
      deliveryDate: orderData.deliveryDate,
      itemCount: orderData.itemCount,
      attachmentCount: orderData.attachmentCount || 0,
      source: orderData.source || 'Website',
      submissionTime: orderData.submissionTime || new Date().toISOString(),
      priority: orderData.totalAmount > 500 ? 'high' : 'medium',
      requiresReview: orderData.attachmentCount > 0 || orderData.totalAmount > 1000
    };

    console.log("🚨 NEW PUBLIC ORDER ALERT 🚨");
    console.log("================================");
    console.log(`📋 Order: ${notificationData.orderNumber}`);
    console.log(`👤 Customer: ${notificationData.customerName}`);
    console.log(`📧 Email: ${notificationData.customerEmail}`);
    console.log(`📱 Phone: ${notificationData.customerPhone}`);
    console.log(`💰 Total: $${notificationData.totalAmount}`);
    console.log(`🛍️ Items: ${notificationData.itemCount}`);
    console.log(`📎 Attachments: ${notificationData.attachmentCount}`);
    console.log(`🚚 Delivery: ${notificationData.deliveryDate}`);
    console.log(`🌐 Source: ${notificationData.source}`);
    console.log(`⏰ Submitted: ${notificationData.submissionTime}`);
    console.log(`⚡ Priority: ${notificationData.priority.toUpperCase()}`);
    if (notificationData.requiresReview) {
      console.log(`⚠️ REQUIRES MANUAL REVIEW`);
    }
    console.log("================================");

    // In production, integrate with your notification services:
    // - Email service (SendGrid, Mailgun, AWS SES)
    // - SMS service (Twilio, AWS SNS)
    // - Slack/Discord webhooks
    // - Push notifications
    // - WhatsApp Business API

    // Simulate notification sending with different priorities
    await new Promise(resolve => setTimeout(resolve, 100));

    return Promise.resolve({
      success: true,
      notificationsSent: [
        'email_to_admin',
        'sms_to_manager',
        'slack_to_sales_team',
        'dashboard_notification'
      ],
      orderData: notificationData
    });

  } catch (error) {
    console.error('Error sending order notifications:', error);
  }
}

export async function notifyLowStock(stockData: LowStockNotification): Promise<void> {
  try {
    console.log('⚠️ LOW STOCK ALERT');
    console.log('==================');
    console.log(`Item: ${stockData.itemName}`);
    console.log(`Current Stock: ${stockData.currentStock} ${stockData.unit}`);
    console.log(`Minimum Level: ${stockData.minLevel} ${stockData.unit}`);
    console.log(`Supplier: ${stockData.supplier || 'Not specified'}`);
    console.log('==================');

    await sendBrowserNotification('low_stock', {
      title: `Low Stock Alert: ${stockData.itemName}`,
      message: `Only ${stockData.currentStock} ${stockData.unit} remaining (Min: ${stockData.minLevel})`,
      icon: '⚠️',
      data: stockData
    });

  } catch (error) {
    console.error('Error sending low stock notifications:', error);
  }
}

export async function notifyProductionSchedule(productionData: ProductionNotification): Promise<void> {
  try {
    console.log('📅 PRODUCTION SCHEDULE NOTIFICATION');
    console.log('===================================');
    console.log(`Product: ${productionData.productName}`);
    console.log(`Scheduled: ${productionData.scheduledDate}`);
    console.log(`Target: ${productionData.targetAmount} ${productionData.unit}`);
    console.log(`Priority: ${productionData.priority}`);
    console.log(`Assigned To: ${productionData.assignedTo || 'Unassigned'}`);
    console.log('===================================');

    await sendBrowserNotification('production_reminder', {
      title: `Production Scheduled: ${productionData.productName}`,
      message: `${productionData.targetAmount} ${productionData.unit} scheduled for ${new Date(productionData.scheduledDate).toLocaleDateString()}`,
      icon: '🏭',
      data: productionData
    });

  } catch (error) {
    console.error('Error sending production notifications:', error);
  }
}

async function sendBrowserNotification(type: string, notification: any): Promise<void> {
  try {
    // Get all subscribed users with permission for this notification type
    const recipients = await getNotificationRecipients();

    for (const recipient of recipients) {
      const subscription = notificationSubscriptions.get(recipient.id);
      const settings = notificationSettings.get(recipient.id) || getDefaultSettings();

      // Check if user has this notification type enabled
      const typeEnabled = getNotificationTypeEnabled(settings, type);

      if (subscription && typeEnabled) {
        // In a real implementation, you would use web-push library here
        console.log(`📱 Sending ${type} notification to user ${recipient.id}:`, notification.title);

        // Simulate browser notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          new Notification(notification.title, {
            body: notification.message,
            icon: notification.icon,
            data: notification.data
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending browser notifications:', error);
  }
}

function getDefaultSettings() {
  return {
    low_stock: { enabled: true, dailyLimit: true },
    new_order: { enabled: true, dailyLimit: false },
    production_reminder: { enabled: true, dailyLimit: true }
  };
}

function getNotificationTypeEnabled(settings: any, type: string): boolean {
  return settings[type]?.enabled !== false;
}

// Function to get admin users for notifications
export async function getNotificationRecipients(): Promise<any[]> {
  try {
    // This would typically query the database for admin/manager users
    // For now, return a mock list
    return [
      { id: 'admin_default', role: 'admin' },
      { id: 'manager_default', role: 'manager' }
    ];
  } catch (error) {
    console.error('Error getting notification recipients:', error);
    return [];
  }
}

// Storage functions for notification preferences
export function saveNotificationSubscription(userId: string, subscription: any): void {
  notificationSubscriptions.set(userId, subscription);
}

export function removeNotificationSubscription(userId: string): void {
  notificationSubscriptions.delete(userId);
}

export function saveNotificationSettings(userId: string, settings: any): void {
  notificationSettings.set(userId, settings);
}

export function getNotificationSettings(userId: string): any {
  return notificationSettings.get(userId) || getDefaultSettings();
}

// Check for low stock items periodically
export async function checkLowStockItems(storage: any): Promise<void> {
  try {
    const lowStockItems = await storage.getLowStockItems();

    for (const item of lowStockItems) {
      await notifyLowStock({
        itemName: item.name,
        currentStock: parseFloat(item.currentStock || 0),
        minLevel: parseFloat(item.minLevel || 0),
        unit: item.unit,
        supplier: item.supplier
      });
    }
  } catch (error) {
    console.error('Error checking low stock items:', error);
  }
}