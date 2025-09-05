import { storage } from "./lib/storage";
import { db } from "./db";
import { loginLogs, auditLogs } from "../shared/schema";
import { eq, gte, count, desc, sql } from "drizzle-orm";

export interface SecurityAlert {
  id: string;
  type: 'BRUTE_FORCE' | 'SUSPICIOUS_LOGIN' | 'ROLE_ESCALATION' | 'BULK_OPERATION' | 'API_ABUSE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  timestamp: Date;
  metadata: any;
}

export interface SecurityMetrics {
  failedLogins24h: number;
  suspiciousActivities24h: number;
  activeThreats: SecurityAlert[];
  riskScore: number;
  recentAlerts: SecurityAlert[];
}

class SecurityMonitorService {
  private alerts: SecurityAlert[] = [];
  private monitoringEnabled = true;
  private alertCallbacks: ((alert: SecurityAlert) => void)[] = [];

  // Configure alert thresholds
  private readonly config = {
    BRUTE_FORCE_THRESHOLD: 5, // Failed logins from same IP
    BRUTE_FORCE_WINDOW: 15 * 60 * 1000, // 15 minutes
    SUSPICIOUS_LOGIN_THRESHOLD: 3, // Logins from different locations
    BULK_OPERATION_THRESHOLD: 20, // Operations in short time
    API_ABUSE_THRESHOLD: 100, // API calls per minute
    RISK_CALCULATION_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  };

  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring() {
    console.log("🛡️ Security Monitor started");
    
    // Check for threats every minute
    setInterval(() => {
      this.checkForThreats();
    }, 60 * 1000);

    // Clean old alerts every hour
    setInterval(() => {
      this.cleanOldAlerts();
    }, 60 * 60 * 1000);
  }

  private async checkForThreats() {
    if (!this.monitoringEnabled) return;

    try {
      await Promise.all([
        this.detectBruteForceAttacks(),
        this.detectSuspiciousLogins(),
        this.detectBulkOperations(),
        this.detectAPIAbuse(),
        this.detectRoleEscalationAttempts(),
      ]);
    } catch (error) {
      console.error("Security monitoring error:", error);
    }
  }

  // Detect brute force attacks
  private async detectBruteForceAttacks() {
    const threshold = new Date(Date.now() - this.config.BRUTE_FORCE_WINDOW);
    
    const suspiciousIPs = await db
      .select({
        ipAddress: loginLogs.ipAddress,
        failedCount: count(),
      })
      .from(loginLogs)
      .where(
        sql`${loginLogs.status} = 'failed' AND ${loginLogs.loginTime} >= ${threshold.toISOString()}`
      )
      .groupBy(loginLogs.ipAddress)
      .having(sql`COUNT(*) >= ${this.config.BRUTE_FORCE_THRESHOLD}`);

    for (const suspiciousIP of suspiciousIPs) {
      await this.createAlert({
        type: 'BRUTE_FORCE',
        severity: 'HIGH',
        title: 'Brute Force Attack Detected',
        description: `${suspiciousIP.failedCount} failed login attempts from IP ${suspiciousIP.ipAddress} in the last 15 minutes`,
        userId: 'system',
        userEmail: 'system',
        ipAddress: suspiciousIP.ipAddress,
        metadata: {
          attemptCount: suspiciousIP.failedCount,
          timeWindow: '15 minutes',
        },
      });
    }
  }

  // Detect suspicious login patterns
  private async detectSuspiciousLogins() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const suspiciousUsers = await db
      .select({
        userId: loginLogs.userId,
        email: loginLogs.email,
        locationCount: sql<number>`COUNT(DISTINCT ${loginLogs.location})`,
        ipCount: sql<number>`COUNT(DISTINCT ${loginLogs.ipAddress})`,
      })
      .from(loginLogs)
      .where(
        sql`${loginLogs.status} = 'success' AND ${loginLogs.loginTime} >= ${last24Hours.toISOString()}`
      )
      .groupBy(loginLogs.userId, loginLogs.email)
      .having(sql`COUNT(DISTINCT ${loginLogs.location}) >= ${this.config.SUSPICIOUS_LOGIN_THRESHOLD}`);

    for (const suspiciousUser of suspiciousUsers) {
      await this.createAlert({
        type: 'SUSPICIOUS_LOGIN',
        severity: 'MEDIUM',
        title: 'Suspicious Login Pattern',
        description: `User ${suspiciousUser.email} logged in from ${suspiciousUser.locationCount} different locations in 24 hours`,
        userId: suspiciousUser.userId,
        userEmail: suspiciousUser.email,
        ipAddress: 'multiple',
        metadata: {
          locationCount: suspiciousUser.locationCount,
          ipCount: suspiciousUser.ipCount,
        },
      });
    }
  }

  // Detect bulk operations
  private async detectBulkOperations() {
    const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);

    const bulkOperators = await db
      .select({
        userId: auditLogs.userId,
        userEmail: auditLogs.userEmail,
        operationCount: count(),
      })
      .from(auditLogs)
      .where(
        sql`${auditLogs.timestamp} >= ${last10Minutes.toISOString()} AND ${auditLogs.action} IN ('CREATE', 'UPDATE', 'DELETE')`
      )
      .groupBy(auditLogs.userId, auditLogs.userEmail)
      .having(sql`COUNT(*) >= ${this.config.BULK_OPERATION_THRESHOLD}`);

    for (const operator of bulkOperators) {
      await this.createAlert({
        type: 'BULK_OPERATION',
        severity: 'MEDIUM',
        title: 'Bulk Operations Detected',
        description: `User ${operator.userEmail} performed ${operator.operationCount} operations in 10 minutes`,
        userId: operator.userId,
        userEmail: operator.userEmail,
        ipAddress: 'unknown',
        metadata: {
          operationCount: operator.operationCount,
          timeWindow: '10 minutes',
        },
      });
    }
  }

  // Detect API abuse
  private async detectAPIAbuse() {
    const lastMinute = new Date(Date.now() - 60 * 1000);

    const apiAbusers = await db
      .select({
        ipAddress: auditLogs.ipAddress,
        requestCount: count(),
      })
      .from(auditLogs)
      .where(sql`${auditLogs.timestamp} >= ${lastMinute.toISOString()}`)
      .groupBy(auditLogs.ipAddress)
      .having(sql`COUNT(*) >= ${this.config.API_ABUSE_THRESHOLD}`);

    for (const abuser of apiAbusers) {
      await this.createAlert({
        type: 'API_ABUSE',
        severity: 'HIGH',
        title: 'API Abuse Detected',
        description: `Excessive API requests (${abuser.requestCount}) from IP ${abuser.ipAddress} in 1 minute`,
        userId: 'system',
        userEmail: 'system',
        ipAddress: abuser.ipAddress,
        metadata: {
          requestCount: abuser.requestCount,
          timeWindow: '1 minute',
        },
      });
    }
  }

  // Detect role escalation attempts
  private async detectRoleEscalationAttempts() {
    const last30Minutes = new Date(Date.now() - 30 * 60 * 1000);

    const roleChanges = await db
      .select()
      .from(auditLogs)
      .where(
        sql`${auditLogs.timestamp} >= ${last30Minutes.toISOString()} AND ${auditLogs.resource} = 'users' AND ${auditLogs.action} = 'UPDATE' AND ${auditLogs.newValues}::text LIKE '%"role":%'`
      )
      .orderBy(desc(auditLogs.timestamp));

    for (const roleChange of roleChanges) {
      const oldRole = (roleChange.oldValues as any)?.role;
      const newRole = (roleChange.newValues as any)?.role;
      
      if (oldRole && newRole && this.isRoleEscalation(oldRole, newRole)) {
        await this.createAlert({
          type: 'ROLE_ESCALATION',
          severity: 'CRITICAL',
          title: 'Unauthorized Role Escalation',
          description: `User ${roleChange.userEmail} changed user role from ${oldRole} to ${newRole}`,
          userId: roleChange.userId,
          userEmail: roleChange.userEmail,
          ipAddress: roleChange.ipAddress,
          metadata: {
            oldRole,
            newRole,
            targetUser: roleChange.resourceId,
          },
        });
      }
    }
  }

  private isRoleEscalation(oldRole: string, newRole: string): boolean {
    const roleHierarchy = ['staff', 'supervisor', 'marketer', 'manager', 'admin', 'super_admin'];
    const oldIndex = roleHierarchy.indexOf(oldRole);
    const newIndex = roleHierarchy.indexOf(newRole);
    return newIndex > oldIndex;
  }

  private async createAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp'>) {
    const alert: SecurityAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.alerts.push(alert);

    // Trigger alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error("Alert callback error:", error);
      }
    });

    console.warn(`🚨 SECURITY ALERT [${alert.severity}]: ${alert.title}`);
    console.warn(`   Description: ${alert.description}`);
    console.warn(`   User: ${alert.userEmail} (${alert.userId})`);
    console.warn(`   IP: ${alert.ipAddress}`);
    console.warn(`   Time: ${alert.timestamp.toISOString()}`);

    return alert;
  }

  private cleanOldAlerts() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneDayAgo);
  }

  public async getSecurityMetrics(): Promise<SecurityMetrics> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [failedLoginsResult, suspiciousActivitiesResult] = await Promise.all([
      db.select({ count: count() }).from(loginLogs)
        .where(sql`${loginLogs.status} = 'failed' AND ${loginLogs.loginTime} >= ${last24Hours.toISOString()}`),
      db.select({ count: count() }).from(auditLogs)
        .where(sql`${auditLogs.status} = 'failed' AND ${auditLogs.timestamp} >= ${last24Hours.toISOString()}`)
    ]);

    const failedLogins24h = failedLoginsResult[0]?.count || 0;
    const suspiciousActivities24h = suspiciousActivitiesResult[0]?.count || 0;
    const activeThreats = this.alerts.filter(alert => 
      alert.timestamp > new Date(Date.now() - 60 * 60 * 1000) && 
      ['HIGH', 'CRITICAL'].includes(alert.severity)
    );
    const recentAlerts = this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Calculate risk score based on various factors
    const riskScore = this.calculateRiskScore(failedLogins24h, suspiciousActivities24h, activeThreats.length);

    return {
      failedLogins24h,
      suspiciousActivities24h,
      activeThreats,
      riskScore,
      recentAlerts,
    };
  }

  private calculateRiskScore(failedLogins: number, suspiciousActivities: number, activeThreats: number): number {
    let score = 0;

    // Failed logins contribute to risk
    score += Math.min(failedLogins * 2, 30);

    // Suspicious activities contribute to risk
    score += Math.min(suspiciousActivities * 3, 40);

    // Active threats significantly increase risk
    score += activeThreats * 10;

    return Math.min(score, 100);
  }

  public onAlert(callback: (alert: SecurityAlert) => void) {
    this.alertCallbacks.push(callback);
  }

  public getActiveAlerts(): SecurityAlert[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  public getAllAlerts(): SecurityAlert[] {
    return [...this.alerts];
  }

  public enableMonitoring() {
    this.monitoringEnabled = true;
    console.log("🛡️ Security monitoring enabled");
  }

  public disableMonitoring() {
    this.monitoringEnabled = false;
    console.log("🛡️ Security monitoring disabled");
  }
}

export const securityMonitor = new SecurityMonitorService();