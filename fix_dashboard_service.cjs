const fs = require('fs');
let content = fs.readFileSync('src/services/dashboard.service.ts', 'utf8');

// add vendorService import
content = content.replace(
  "import { customerService } from './customer.service';",
  "import { customerService } from './customer.service';\nimport { vendorService } from './vendor.service';"
);

// update DashboardSummary interface
content = content.replace(
  "customerCredit: number;\n}",
  "customerCredit: number;\n  vendorCredit: number;\n}"
);

// update getDailySummary logic
content = content.replace(
  "return {\n      todaySales,\n      cashBalance,\n      upiBalance,\n      customerCredit,\n    };",
  "// Get all-time outstanding vendor credit\n    let vendorCredit = 0;\n    const vendors = await vendorService.getVendors();\n    for (const v of vendors) {\n      vendorCredit += v.total_due || 0;\n    }\n\n    return {\n      todaySales,\n      cashBalance,\n      upiBalance,\n      customerCredit,\n      vendorCredit,\n    };"
);

// update getDashboardData mock response
content = content.replace(
  "vendor_credit_outstanding: 12000,",
  "vendor_credit_outstanding: summaryData.vendorCredit,"
);

fs.writeFileSync('src/services/dashboard.service.ts', content);
console.log("Updated dashboard.service.ts");
