const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

content = content.replace(
  'Initial Credit Amount <span className="text-slate-400 font-normal">(Optional)</span>',
  'Initial Credit Amount <span className="text-red-500">*</span>'
);

content = content.replace(
  "if (!newCustomer.name.trim()) {\n      setAddError('Customer Name is required');\n      return;\n    }",
  "if (!newCustomer.name.trim()) {\n      setAddError('Customer Name is required');\n      return;\n    }\n    if (newCustomer.initial_credit === '') {\n      setAddError('Initial Credit Amount is required');\n      return;\n    }"
);

fs.writeFileSync('src/pages/Credit.tsx', content);
