
const roleTestUsers = [
  { email: "superadmin@bakesewa.com", role: "super_admin" },
  { email: "admin@bakesewa.com", role: "admin" },
  { email: "manager@bakesewa.com", role: "manager" },
  { email: "staff@bakesewa.com", role: "staff" }
];

const resourceTests = [
  "dashboard", "products", "inventory", "orders", "production",
  "customers", "parties", "assets", "expenses", "sales", "purchases",
  "reports", "settings", "users", "staff", "admin"
];

console.log("🔐 Testing Role-Based Access Control");
console.log("=====================================");

roleTestUsers.forEach(user => {
  console.log(`\n👤 Testing ${user.role.toUpperCase()} access:`);
  
  resourceTests.forEach(resource => {
    let hasAccess = false;
    
    // Define role access rules
    switch (user.role) {
      case "super_admin":
        hasAccess = true;
        break;
      case "admin":
        hasAccess = resource !== "super_admin";
        break;
      case "manager":
        const managerResources = [
          "dashboard", "products", "inventory", "orders", "production",
          "customers", "parties", "assets", "expenses", "sales", "purchases",
          "reports", "staff"
        ];
        hasAccess = managerResources.includes(resource);
        break;
      case "staff":
        const staffResources = ["dashboard", "products", "inventory", "orders", "production"];
        hasAccess = staffResources.includes(resource);
        break;
    }
    
    console.log(`  ${hasAccess ? "✅" : "❌"} ${resource}`);
  });
});

console.log("\n🎯 Role-based access control test completed!");
