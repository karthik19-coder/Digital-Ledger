const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');
content = content.replace('FileText, Plus', 'FileText, Plus, Tag');
fs.writeFileSync('src/pages/CustomerDetails.tsx', content);

console.log("Re-added Tag import");
