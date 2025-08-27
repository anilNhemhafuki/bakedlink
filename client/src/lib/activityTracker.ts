
/**
 * Client-side activity tracker for comprehensive audit logging
 * Tracks user interactions and sends them to the server for audit purposes
 */

interface ActivityEvent {
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  timestamp: string;
}

class ActivityTracker {
  private static instance: ActivityTracker;
  private pendingEvents: ActivityEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private isEnabled = true;

  static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  constructor() {
    this.setupPeriodicFlush();
    this.setupPageUnloadHandler();
    this.setupNavigationTracking();
  }

  /**
   * Track a user activity
   */
  track(action: string, resource: string, resourceId?: string, details?: any): void {
    if (!this.isEnabled) return;

    const event: ActivityEvent = {
      action,
      resource,
      resourceId,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
    };

    this.pendingEvents.push(event);

    // Flush immediately for critical actions
    if (this.isCriticalAction(action)) {
      this.flush();
    } else if (this.pendingEvents.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track page views
   */
  trackPageView(pageName: string): void {
    this.track('VIEW', 'page', pageName, {
      url: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * Track form submissions
   */
  trackFormSubmission(formName: string, formData?: any): void {
    this.track('SUBMIT', 'form', formName, {
      formData: this.sanitizeFormData(formData),
      url: window.location.pathname,
    });
  }

  /**
   * Track button clicks
   */
  trackButtonClick(buttonName: string, context?: string): void {
    this.track('CLICK', 'button', buttonName, {
      context,
      url: window.location.pathname,
    });
  }

  /**
   * Track data operations
   */
  trackDataOperation(operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ', resource: string, resourceId?: string): void {
    this.track(operation, resource, resourceId, {
      url: window.location.pathname,
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: string): void {
    this.track('ERROR', 'application', undefined, {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.pathname,
    });
  }

  /**
   * Flush pending events to server
   */
  private async flush(): Promise<void> {
    if (this.pendingEvents.length === 0) return;

    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    try {
      await fetch('/api/audit/client-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Failed to send activity events:', error);
      // Re-add events to pending if they failed to send
      this.pendingEvents = [...events, ...this.pendingEvents];
    }
  }

  /**
   * Setup periodic flushing
   */
  private setupPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Setup page unload handler to flush remaining events
   */
  private setupPageUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      if (this.pendingEvents.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        const blob = new Blob([JSON.stringify({ events: this.pendingEvents })], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/audit/client-activities', blob);
      }
    });
  }

  /**
   * Setup navigation tracking
   */
  private setupNavigationTracking(): void {
    // Track initial page load
    this.trackPageView(document.title);

    // Track navigation changes (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      ActivityTracker.getInstance().trackPageView(document.title);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      ActivityTracker.getInstance().trackPageView(document.title);
    };

    window.addEventListener('popstate', () => {
      this.trackPageView(document.title);
    });
  }

  /**
   * Check if action is critical and should be flushed immediately
   */
  private isCriticalAction(action: string): boolean {
    return ['DELETE', 'CREATE', 'ERROR', 'LOGIN', 'LOGOUT'].includes(action);
  }

  /**
   * Sanitize details to remove sensitive information
   */
  private sanitizeDetails(details: any): any {
    if (!details || typeof details !== 'object') return details;

    const sanitized = { ...details };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'ssn', 'creditCard'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize form data
   */
  private sanitizeFormData(formData: any): any {
    if (!formData) return null;

    if (formData instanceof FormData) {
      const result: any = {};
      for (const [key, value] of Array.from(formData.entries())) {
        result[key] = this.isSensitiveField(key) ? '[REDACTED]' : value;
      }
      return result;
    }

    return this.sanitizeDetails(formData);
  }

  /**
   * Check if field is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'ssn', 'creditcard'];
    return sensitiveFields.some(field => fieldName.toLowerCase().includes(field));
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

export const activityTracker = ActivityTracker.getInstance();

// Auto-track common interactions
export function setupAutoTracking(): void {
  // Track form submissions
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    const formName = form.name || form.id || 'unknown-form';
    activityTracker.trackFormSubmission(formName);
  });

  // Track button clicks
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.role === 'button') {
      const buttonName = target.textContent?.trim() || target.id || 'unknown-button';
      activityTracker.trackButtonClick(buttonName);
    }
  });

  // Track errors
  window.addEventListener('error', (event) => {
    activityTracker.trackError(event.error, 'Global error handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    activityTracker.trackError(new Error(event.reason), 'Unhandled promise rejection');
  });
}
