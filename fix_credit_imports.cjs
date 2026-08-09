const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

if (!content.includes('dashboardService')) {
  content = content.replace(
    "import { customerService, Customer } from '../services/customer.service';",
    "import { customerService, Customer } from '../services/customer.service';\nimport { dashboardService } from '../services/dashboard.service';\nimport { useDashboardStore } from '../store/dashboard.store';"
  );
}

content = content.replace(
  "window.dispatchEvent(new Event('dashboard-refresh'));",
  "const summary = await dashboardService.getDailySummary();\n        useDashboardStore.setState(summary as any);\n        window.dispatchEvent(new Event('dashboard-refresh'));"
);

fs.writeFileSync('src/pages/Credit.tsx', content);
