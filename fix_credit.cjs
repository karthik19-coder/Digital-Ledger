const fs = require('fs');

let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

content = content.replace(
  /<div className="pt-4 flex flex-col sm:flex-row gap-3">\s*<Button\s*type="button"\s*variant="outline"\s*className="w-full"/g,
  '<div className="pt-4 flex flex-col md:flex-row gap-3">\n                <Button \n                  type="button" \n                  variant="outline" \n                  className="w-full md:flex-1"'
);

content = content.replace(
  /className="w-full bg-orange-600 hover:bg-orange-700 text-white"/g,
  'className="w-full md:flex-1 bg-orange-600 hover:bg-orange-700 text-white"'
);

fs.writeFileSync('src/pages/Credit.tsx', content);

console.log("Updated Credit.tsx");
