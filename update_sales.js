const fs = require('fs');
let code = fs.readFileSync('src/pages/Sales.tsx', 'utf8');

if (!code.includes('dashboardService')) {
  code = code.replace(
    "import { salesService } from '../services/sales.service';",
    "import { salesService } from '../services/sales.service';\nimport { dashboardService } from '../services/dashboard.service';\nimport { useDashboardStore } from '../store/dashboard.store';"
  );
}

code = code.replace(
  "await salesService.saveSale(data);",
  "await salesService.saveSale(data);\n      \n      // Refresh dashboard data automatically\n      const summary = await dashboardService.getDailySummary();\n      useDashboardStore.setState(summary);\n      window.dispatchEvent(new Event('dashboard-refresh'));"
);

fs.writeFileSync('src/pages/Sales.tsx', code);
