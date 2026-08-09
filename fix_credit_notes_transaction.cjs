const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

content = content.replace(
  "'Opening balance recorded at customer creation'",
  "newCustomer.notes.trim() || 'Opening balance recorded at customer creation'"
);

fs.writeFileSync('src/pages/Credit.tsx', content);
