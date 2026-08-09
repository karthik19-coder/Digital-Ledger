const fs = require('fs');

let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

// 1. Update link to details
content = content.replace(
  /<Link to=\{\`\/credit\/\$\{customer\.id\}\`\} /g,
  '<Link to={`/credit/customers/${customer.id}`} '
);
content = content.replace(
  /to=\{\`\/credit\/\$\{customer\.id\}\`\}/g,
  'to={`/credit/customers/${customer.id}`}'
);

// 2. Add Back Button and update header
const headerRegex = /<div className="flex items-center justify-between">\s*<h1 className="text-2xl font-bold text-slate-900">Customer Credit<\/h1>\s*<\/div>/;

const newHeader = `
        <div>
          <Link to="/credit" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Credit Management
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Customer Credit</h1>
          </div>
        </div>
`;

content = content.replace(headerRegex, newHeader);

// Ensure ArrowLeft is imported
if (!content.includes('ArrowLeft')) {
  content = content.replace(
    "import { Search, Plus,",
    "import { ArrowLeft, Search, Plus,"
  );
}

fs.writeFileSync('src/pages/Credit.tsx', content);
console.log("Updated Credit.tsx");
