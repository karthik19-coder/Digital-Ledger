const fs = require('fs');

let content = fs.readFileSync('src/pages/Vendors.tsx', 'utf8');

// 1. Update link to details
content = content.replace(
  /<Link to=\{\`\/credit\/\$\{vendor\.id\}\`\} /g, // wait, previously it might have been /vendors/ or /credit/ since it was copied from Credit.tsx
  '<Link to={`/credit/vendors/${vendor.id}`} '
);
content = content.replace(
  /to=\{\`\/credit\/\$\{vendor\.id\}\`\}/g,
  'to={`/credit/vendors/${vendor.id}`}'
);

// We need to also catch if it was /vendors/
content = content.replace(
  /<Link to=\{\`\/vendors\/\$\{vendor\.id\}\`\} /g,
  '<Link to={`/credit/vendors/${vendor.id}`} '
);
content = content.replace(
  /to=\{\`\/vendors\/\$\{vendor\.id\}\`\}/g,
  'to={`/credit/vendors/${vendor.id}`}'
);

// 2. Add Back Button and update header
const headerRegex = /<div className="flex items-center justify-between">\s*<h1 className="text-2xl font-bold text-slate-900">Vendor Credit<\/h1>\s*<\/div>/;

const newHeader = `
        <div>
          <Link to="/credit" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Credit Management
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Vendor Credit</h1>
          </div>
        </div>
`;

content = content.replace(headerRegex, newHeader);

// Ensure ArrowLeft is imported
if (!content.includes('ArrowLeft')) {
  content = content.replace(
    "import { IndianRupee, Search, Plus,",
    "import { ArrowLeft, IndianRupee, Search, Plus,"
  );
}

fs.writeFileSync('src/pages/Vendors.tsx', content);
console.log("Updated Vendors.tsx");
