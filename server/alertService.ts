import { SecurityAlert } from "./securityMonitor";

export interface AlertChannel {
  name: string;
  enabled: boolean;
  config: any;
}

export interface EmailConfig {
  enabled: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail?: string;
  adminEmails: string[];
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl?: string;
  channel?: string;
}

export interface DashboardConfig {
  enabled: boolean;
  showInUI: boolean;
  maxAlerts: number;
}

class AlertService {
  private emailConfig: EmailConfig = {
    enabled: false,
    adminEmails: ['admin@bakesewa.com'],
  };

  private slackConfig: SlackConfig = {
    enabled: false,
  };

  private dashboardConfig: DashboardConfig = {
    enabled: true,
    showInUI: true,
    maxAlerts: 50,
  };

  private dashboardAlerts: SecurityAlert[] = [];

  constructor() {
    console.log("📢 Alert Service initialized");
  }

  public async sendAlert(alert: SecurityAlert): Promise<void> {
    console.log(`📢 Processing alert: ${alert.title}`);

    const promises: Promise<void>[] = [];

    // Send email alerts
    if (this.emailConfig.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }

    // Send Slack alerts
    if (this.slackConfig.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }

    // Add to dashboard
    if (this.dashboardConfig.enabled) {
      promises.push(this.addToDashboard(alert));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Error sending alerts:", error);
    }
  }

  private async sendEmailAlert(alert: SecurityAlert): Promise<void> {
    try {
      // In production, this would use a real email service like SendGrid, SES, etc.
      console.log(`📧 EMAIL ALERT [${alert.severity}]: ${alert.title}`);
      console.log(`   To: ${this.emailConfig.adminEmails.join(', ')}`);
      console.log(`   Description: ${alert.description}`);
      console.log(`   User: ${alert.userEmail}`);
      console.log(`   IP: ${alert.ipAddress}`);
      console.log(`   Time: ${alert.timestamp.toISOString()}`);
      
      // Mock implementation - In production, replace with actual email sending
      const emailBody = this.generateEmailBody(alert);
      
      // Here you would integrate with your email service:
      // await emailService.send({
      //   to: this.emailConfig.adminEmails,
      //   subject: `[SECURITY ALERT] ${alert.title}`,
      //   html: emailBody
      // });

    } catch (error) {
      console.error("Failed to send email alert:", error);
    }
  }

  private async sendSlackAlert(alert: SecurityAlert): Promise<void> {
    try {
      if (!this.slackConfig.webhookUrl) {
        console.warn("Slack webhook URL not configured");
        return;
      }

      const slackMessage = {
        text: `🚨 Security Alert: ${alert.title}`,
        attachments: [
          {
            color: this.getAlertColor(alert.severity),
            fields: [
              {
                title: "Severity",
                value: alert.severity,
                short: true
              },
              {
                title: "User",
                value: alert.userEmail,
                short: true
              },
              {
                title: "IP Address",
                value: alert.ipAddress,
                short: true
              },
              {
                title: "Time",
                value: alert.timestamp.toISOString(),
                short: true
              },
              {
                title: "Description",
                value: alert.description,
                short: false
              }
            ],
            footer: "Bakery Security Monitor",
            ts: Math.floor(alert.timestamp.getTime() / 1000)
          }
        ]
      };

      // In production, send to Slack webhook
      console.log(`📱 SLACK ALERT [${alert.severity}]: ${alert.title}`);
      console.log(`   Channel: ${this.slackConfig.channel || 'default'}`);
      console.log(`   Message:`, JSON.stringify(slackMessage, null, 2));

      // Mock implementation - In production, replace with actual Slack API call
      // const response = await fetch(this.slackConfig.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(slackMessage)
      // });

    } catch (error) {
      console.error("Failed to send Slack alert:", error);
    }
  }

  private async addToDashboard(alert: SecurityAlert): Promise<void> {
    try {
      this.dashboardAlerts.unshift(alert);
      
      // Keep only the most recent alerts
      if (this.dashboardAlerts.length > this.dashboardConfig.maxAlerts) {
        this.dashboardAlerts = this.dashboardAlerts.slice(0, this.dashboardConfig.maxAlerts);
      }

      console.log(`📊 Dashboard alert added: ${alert.title}`);
    } catch (error) {
      console.error("Failed to add alert to dashboard:", error);
    }
  }

  private generateEmailBody(alert: SecurityAlert): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { color: ${this.getAlertColorHex(alert.severity)}; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .severity { display: inline-block; padding: 8px 16px; border-radius: 4px; color: white; font-weight: bold; background-color: ${this.getAlertColorHex(alert.severity)}; }
            .details { margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #333; }
            .value { color: #666; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🚨 Security Alert</div>
            <div class="severity">${alert.severity}</div>
            <h2>${alert.title}</h2>
            <p>${alert.description}</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">User:</span>
                <span class="value">${alert.userEmail} (${alert.userId})</span>
              </div>
              <div class="detail-row">
                <span class="label">IP Address:</span>
                <span class="value">${alert.ipAddress}</span>
              </div>
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${alert.timestamp.toISOString()}</span>
              </div>
              ${alert.metadata ? `
                <div class="detail-row">
                  <span class="label">Additional Details:</span>
                  <span class="value">${JSON.stringify(alert.metadata, null, 2)}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="footer">
              This alert was generated by the Bakery Management System Security Monitor.
              Please investigate this incident immediately.
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getAlertColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return '#ff9500';
      case 'LOW': return 'good';
      default: return '#cccccc';
    }
  }

  private getAlertColorHex(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '#dc3545';
      case 'HIGH': return '#fd7e14';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  }

  // Configuration methods
  public configureEmail(config: EmailConfig) {
    this.emailConfig = { ...this.emailConfig, ...config };
    console.log(`📧 Email alerts ${config.enabled ? 'enabled' : 'disabled'}`);
  }

  public configureSlack(config: SlackConfig) {
    this.slackConfig = { ...this.slackConfig, ...config };
    console.log(`📱 Slack alerts ${config.enabled ? 'enabled' : 'disabled'}`);
  }

  public configureDashboard(config: DashboardConfig) {
    this.dashboardConfig = { ...this.dashboardConfig, ...config };
    console.log(`📊 Dashboard alerts ${config.enabled ? 'enabled' : 'disabled'}`);
  }

  // Get dashboard alerts for UI
  public getDashboardAlerts(): SecurityAlert[] {
    return [...this.dashboardAlerts];
  }

  // Clear dashboard alerts
  public clearDashboardAlerts() {
    this.dashboardAlerts = [];
    console.log("📊 Dashboard alerts cleared");
  }

  // Test alert functionality
  public async sendTestAlert(): Promise<void> {
    const testAlert: SecurityAlert = {
      id: 'test_' + Date.now(),
      type: 'API_ABUSE',
      severity: 'MEDIUM',
      title: 'Test Alert',
      description: 'This is a test alert to verify the alert system is working correctly.',
      userId: 'test_user',
      userEmail: 'test@example.com',
      ipAddress: '192.168.1.100',
      timestamp: new Date(),
      metadata: {
        test: true,
        component: 'Alert Service'
      }
    };

    await this.sendAlert(testAlert);
    console.log("✅ Test alert sent successfully");
  }
}

export const alertService = new AlertService();