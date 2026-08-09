const fs = require('fs');
const path = './src/services/financialCalculation.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import for salesRepository
if (!code.includes("import { salesRepository }")) {
  code = code.replace(
    "import { Settings } from '../types/settings';",
    "import { Settings } from '../types/settings';\nimport { salesRepository } from '../repositories/sales.repository';"
  );
}

// Replace in calculateBalances
code = code.replace(
  /const salesData = sessionStorage\.getItem\('mock_sales'\);\n\s+if \(salesData\) \{\n\s+for \(const sale of JSON\.parse\(salesData\)\) \{/,
  `const salesRes = await salesRepository.getSales();
    if (salesRes.success) {
      for (const sale of salesRes.data) {`
);

// Replace in calculateDaySummary
code = code.replace(
  /const salesData = sessionStorage\.getItem\('mock_sales'\);\n\s+if \(salesData\) \{\n\s+for \(const sale of JSON\.parse\(salesData\)\) \{/,
  `const salesRes = await salesRepository.getSales();
    if (salesRes.success) {
      for (const sale of salesRes.data) {`
);

fs.writeFileSync(path, code);
