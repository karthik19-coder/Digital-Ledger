const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');
content = content.replace('{/* TODO: Implement /credit/:id details page */}', '');
fs.writeFileSync('src/pages/Credit.tsx', content);
