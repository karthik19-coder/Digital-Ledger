const fs = require('fs');
let content = fs.readFileSync('src/pages/Vendors.tsx', 'utf8');

content = content.replace("Total Outstanding", "Total Vendor Due");
content = content.replace(/Customers/g, 'Vendors');
content = content.replace(/customers/g, 'vendors');

fs.writeFileSync('src/pages/Vendors.tsx', content);
