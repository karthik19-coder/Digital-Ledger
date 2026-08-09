const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');
content = content.replace('FileText, Tag, Plus', 'FileText, Plus');
fs.writeFileSync('src/pages/CustomerDetails.tsx', content);

console.log("Removed Tag import");
