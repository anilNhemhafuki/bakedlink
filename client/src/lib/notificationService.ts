
// Notification service for triggering business notifications
export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async triggerNotification(event: string, data: any): Promise<void> {
    try {
      await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ event, data }),
      });
    } catch (error) {
      console.error('Failed to trigger notification:', error);
    }
  }

  // Order notifications
  async notifyOrderCreated(orderData: any): Promise<void> {
    await this.triggerNotification('order_created', orderData);
  }

  async notifyPaymentReceived(paymentData: any): Promise<void> {
    await this.triggerNotification('payment_received', paymentData);
  }

  async notifyOrderDelayed(orderData: any): Promise<void> {
    await this.triggerNotification('order_delayed', orderData);
  }

  // Production notifications
  async notifyProductionCompleted(productionData: any): Promise<void> {
    await this.triggerNotification('production_completed', productionData);
  }

  async notifyProductionDelayed(productionData: any): Promise<void> {
    await this.triggerNotification('production_delayed', productionData);
  }

  async notifyQualityCheckFailed(qcData: any): Promise<void> {
    await this.triggerNotification('qc_failed', qcData);
  }

  // Inventory notifications
  async notifyLowStock(stockData: any): Promise<void> {
    await this.triggerNotification('low_stock', stockData);
  }

  async notifyOutOfStock(stockData: any): Promise<void> {
    await this.triggerNotification('out_of_stock', stockData);
  }

  async notifyRestockAlert(stockData: any): Promise<void> {
    await this.triggerNotification('restock_alert', stockData);
  }

  // Shipping notifications
  async notifyShipmentDispatched(shipmentData: any): Promise<void> {
    await this.triggerNotification('shipment_dispatched', shipmentData);
  }

  async notifyDeliveryFailed(deliveryData: any): Promise<void> {
    await this.triggerNotification('delivery_failed', deliveryData);
  }

  async notifyDeliveryCompleted(deliveryData: any): Promise<void> {
    await this.triggerNotification('delivery_completed', deliveryData);
  }

  // System notifications
  async notifySystemAlert(alertData: any): Promise<void> {
    await this.triggerNotification('system_alert', alertData);
  }

  async notifyFailedSync(syncData: any): Promise<void> {
    await this.triggerNotification('failed_sync', syncData);
  }

  async notifyNewDeviceLogin(loginData: any): Promise<void> {
    await this.triggerNotification('new_device_login', loginData);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
