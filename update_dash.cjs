const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Add import
code = code.replace(
  "import { dashboardService } from '../services/dashboard.service';",
  "import { dashboardService, DashboardSummary } from '../services/dashboard.service';"
);

// Add summary state
code = code.replace(
  "const [data, setData] = useState<DashboardData | null>(null);",
  "const [data, setData] = useState<DashboardData | null>(null);\n  const [summary, setSummary] = useState<DashboardSummary | null>(null);"
);

// Update fetchData
code = code.replace(
  /const fetchData = async \(\) => \{\s+try \{\s+setError\(null\);\s+const result = await dashboardService\.getDashboardData\(\);\s+setData\(result\);\s+\} catch \(err\)/,
  `const fetchData = async () => {
    try {
      setError(null);
      const [result, sumResult] = await Promise.all([
        dashboardService.getDashboardData(),
        dashboardService.getDailySummary()
      ]);
      setData(result);
      setSummary(sumResult);
    } catch (err)`
);

// Update data checks
code = code.replace(
  "if (!data) {",
  "if (!data || !summary) {"
);

// Replace formatCurrency(data.summary.todays_sales) -> formatCurrency(summary.todaySales)
code = code.replace("data.summary.todays_sales", "summary.todaySales");
code = code.replace("data.summary.cash_balance", "summary.cashBalance");
code = code.replace("data.summary.upi_balance", "summary.upiBalance");
code = code.replace("data.summary.customer_credit_outstanding", "summary.customerCredit");

fs.writeFileSync('src/pages/Dashboard.tsx', code);
