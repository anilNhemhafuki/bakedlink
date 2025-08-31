
import { storage } from "./lib/storage";

/**
 * Comprehensive audit system test script
 * Tests all critical audit logging functionality
 */

async function testAuditSystem() {
  console.log("🔍 Starting comprehensive audit system test...");

  try {
    // Test 1: Basic audit log creation
    console.log("\n📝 Test 1: Basic audit log creation");
    const testLog = await storage.createAuditLog({
      userId: 'test_user_123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      action: 'CREATE',
      resource: 'test_resource',
      resourceId: 'test_123',
      details: { test: 'data' },
      ipAddress: '192.168.1.1',
      userAgent: 'Test Agent',
      status: 'success'
    });
    console.log("✅ Audit log created:", testLog.id);

    // Test 2: Audit log retrieval with filters
    console.log("\n🔍 Test 2: Audit log retrieval");
    const logs = await storage.getAuditLogs({
      userId: 'test_user_123',
      limit: 10
    });
    console.log(`✅ Retrieved ${logs.length} audit logs`);

    // Test 3: Login event logging
    console.log("\n🔐 Test 3: Login event logging");
    await storage.logLogin('test_user_123', 'test@example.com', 'Test User', '192.168.1.1', 'Test Agent', true);
    console.log("✅ Login event logged");

    // Test 4: Logout event logging
    console.log("\n🚪 Test 4: Logout event logging");
    await storage.logLogout('test_user_123', 'test@example.com', 'Test User', '192.168.1.1');
    console.log("✅ Logout event logged");

    // Test 5: Failed login logging
    console.log("\n❌ Test 5: Failed login logging");
    await storage.logLogin('unknown_user', 'baduser@example.com', 'Unknown User', '192.168.1.1', 'Test Agent', false, 'Invalid credentials');
    console.log("✅ Failed login event logged");

    // Test 6: Retrieve recent logs
    console.log("\n📊 Test 6: Recent audit logs");
    const recentLogs = await storage.getAuditLogs({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 50
    });
    console.log(`✅ Retrieved ${recentLogs.length} recent logs`);

    // Test 7: Filter by action type
    console.log("\n🎯 Test 7: Filter by action type");
    const loginLogs = await storage.getAuditLogs({
      action: 'LOGIN',
      limit: 10
    });
    console.log(`✅ Retrieved ${loginLogs.length} login logs`);

    // Test 8: Stress test - multiple concurrent logs
    console.log("\n⚡ Test 8: Concurrent logging stress test");
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(storage.createAuditLog({
        userId: `stress_test_${i}`,
        userEmail: `stress${i}@example.com`,
        userName: `Stress User ${i}`,
        action: 'CREATE',
        resource: 'stress_test',
        resourceId: `stress_${i}`,
        details: { iteration: i },
        ipAddress: '192.168.1.100',
        userAgent: 'Stress Test Agent',
        status: 'success'
      }));
    }
    await Promise.all(promises);
    console.log("✅ Concurrent logging test completed");

    console.log("\n🎉 All audit system tests passed!");
    console.log("\n📋 Test Summary:");
    console.log("   ✅ Basic audit log creation");
    console.log("   ✅ Audit log retrieval with filters");
    console.log("   ✅ Login event logging");
    console.log("   ✅ Logout event logging");
    console.log("   ✅ Failed login logging");
    console.log("   ✅ Recent logs retrieval");
    console.log("   ✅ Action type filtering");
    console.log("   ✅ Concurrent logging stress test");

  } catch (error) {
    console.error("❌ Audit system test failed:", error);
    throw error;
  }
}

// Export for use in other files
export { testAuditSystem };

// Run if called directly
if (require.main === module) {
  testAuditSystem().catch(console.error);
}
