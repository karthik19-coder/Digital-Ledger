const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace mismatched removes
  content = content.replace(/window\.removeEventListener\('dashboard-refresh',\s*handleRefresh\);/g, "window.removeEventListener('app-data-refresh', handleRefresh);");
  content = content.replace(/window\.removeEventListener\('sales-refresh',\s*handleRefresh\);/g, "window.removeEventListener('app-data-refresh', handleRefresh);");
  content = content.replace(/window\.removeEventListener\('employees-refresh',\s*handleRefresh\);/g, "window.removeEventListener('app-data-refresh', handleRefresh);");
  content = content.replace(/window\.removeEventListener\('attendance-refresh',\s*handleRefresh\);/g, "window.removeEventListener('app-data-refresh', handleRefresh);");
  content = content.replace(/window\.removeEventListener\('expenses-refresh',\s*handleRefresh\);/g, "window.removeEventListener('app-data-refresh', handleRefresh);");
  content = content.replace(/window\.removeEventListener\('salary-refresh',\s*handleRefresh\);/g, "window.removeEventListener('app-data-refresh', handleRefresh);");

  // Deduplicate consecutive identical lines (e.g. multiple app-data-refresh removes)
  content = content.replace(/(window\.removeEventListener\('app-data-refresh',\s*handleRefresh\);\s*){2,}/g, "window.removeEventListener('app-data-refresh', handleRefresh);\n      ");

  fs.writeFileSync(file, content);
});

console.log('Fixed listeners');
