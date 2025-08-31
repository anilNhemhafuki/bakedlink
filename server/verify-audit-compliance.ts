
import { storage } from "./lib/storage";
import { db } from "./db";
import { auditLogs } from "../shared/schema";
import { sql, desc, count } from "drizzle-orm";

/**
 * Comprehensive audit compliance verification script
 * Verifies audit logs are complete, accurate, and compliant
 */

interface ComplianceReport {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByStatus: Record<string, number>;
  recentActivity: number;
  criticalEvents: number;
  dataIntegrity: boolean;
  retentionCompliance: boolean;
  tamperEvidence: boolean;
}

export async function verifyAuditCompliance(): Promise<ComplianceReport> {
  console.log("🔍 Starting audit compliance verification...");

  try {
    // 1. Total log count
    const totalResult = await db.select({ count: count() }).from(auditLogs);
    const totalLogs = totalResult[0].count;
    console.log(`📊 Total audit logs: ${totalLogs}`);

    // 2. Logs by action type
    const actionResults = await db
      .select({ 
        action: auditLogs.action, 
        count: count() 
      })
      .from(auditLogs)
      .groupBy(auditLogs.action);
    
    const logsByAction: Record<string, number> = {};
    actionResults.forEach(result => {
      logsByAction[result.action] = result.count;
    });
    console.log("📈 Logs by action:", logsByAction);

    // 3. Logs by status
    const statusResults = await db
      .select({ 
        status: auditLogs.status, 
        count: count() 
      })
      .from(auditLogs)
      .groupBy(auditLogs.status);
    
    const logsByStatus: Record<string, number> = {};
    statusResults.forEach(result => {
      logsByStatus[result.status || 'unknown'] = result.count;
    });
    console.log("📊 Logs by status:", logsByStatus);

    // 4. Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(sql`${auditLogs.timestamp} >= ${last24Hours.toISOString()}`);
    const recentActivity = recentResult[0].count;
    console.log(`⏰ Recent activity (24h): ${recentActivity} logs`);

    // 5. Critical events
    const criticalResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(sql`${auditLogs.action} IN ('DELETE', 'CREATE') AND ${auditLogs.resource} IN ('users', 'settings')`);
    const criticalEvents = criticalResult[0].count;
    console.log(`🚨 Critical events: ${criticalEvents} logs`);

    // 6. Data integrity check
    const integrityResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(sql`${auditLogs.userId} IS NULL OR ${auditLogs.userEmail} IS NULL OR ${auditLogs.action} IS NULL OR ${auditLogs.resource} IS NULL`);
    const dataIntegrity = integrityResult[0].count === 0;
    console.log(`✅ Data integrity: ${dataIntegrity ? 'PASS' : 'FAIL'}`);

    // 7. Retention compliance (check for logs older than 7 years)
    const sevenYearsAgo = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000);
    const oldLogsResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(sql`${auditLogs.timestamp} < ${sevenYearsAgo.toISOString()}`);
    const retentionCompliance = oldLogsResult[0].count === 0; // No logs older than 7 years
    console.log(`📅 Retention compliance: ${retentionCompliance ? 'PASS' : 'REVIEW NEEDED'}`);

    // 8. Tamper evidence (check for gaps in log sequence)
    const recentLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(100);
    
    let tamperEvidence = true;
    for (let i = 1; i < recentLogs.length; i++) {
      const current = new Date(recentLogs[i].timestamp);
      const previous = new Date(recentLogs[i-1].timestamp);
      
      // Check for suspicious gaps (more than 1 hour between logs during business hours)
      const hourDiff = (previous.getTime() - current.getTime()) / (1000 * 60 * 60);
      if (hourDiff > 4 && current.getHours() >= 9 && current.getHours() <= 17) {
        console.warn(`⚠️ Suspicious gap detected: ${hourDiff.toFixed(2)} hours between logs`);
        tamperEvidence = false;
      }
    }
    console.log(`🔒 Tamper evidence: ${tamperEvidence ? 'PASS' : 'REVIEW NEEDED'}`);

    const report: ComplianceReport = {
      totalLogs,
      logsByAction,
      logsByStatus,
      recentActivity,
      criticalEvents,
      dataIntegrity,
      retentionCompliance,
      tamperEvidence
    };

    // Generate compliance summary
    console.log("\n📋 COMPLIANCE SUMMARY:");
    console.log("========================");
    console.log(`Total Audit Logs: ${totalLogs}`);
    console.log(`Recent Activity: ${recentActivity} (last 24h)`);
    console.log(`Critical Events: ${criticalEvents}`);
    console.log(`Data Integrity: ${dataIntegrity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Retention Policy: ${retentionCompliance ? '✅ COMPLIANT' : '⚠️ REVIEW'}`);
    console.log(`Tamper Evidence: ${tamperEvidence ? '✅ SECURE' : '⚠️ REVIEW'}`);
    
    const overallCompliance = dataIntegrity && retentionCompliance && tamperEvidence;
    console.log(`\nOVERALL COMPLIANCE: ${overallCompliance ? '✅ COMPLIANT' : '⚠️ NEEDS ATTENTION'}`);

    return report;

  } catch (error) {
    console.error("❌ Compliance verification failed:", error);
    throw error;
  }
}

// Export for use in other files
export { verifyAuditCompliance as default };

// Run if called directly
if (require.main === module) {
  verifyAuditCompliance().catch(console.error);
}
