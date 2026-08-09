const fs = require('fs');

let content = fs.readFileSync('src/pages/Sales.tsx', 'utf8');

const regex = /\{creditSales > 0 && \(\s*<div className="space-y-2 sm:col-span-2 p-4 bg-orange-50 border border-orange-100 rounded-xl">.*?\n\s*<\/div>\n\s*\)\}/s;

content = content.replace(regex, '');

fs.writeFileSync('src/pages/Sales.tsx', content);
