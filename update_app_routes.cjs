const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "import Vendors from './pages/Vendors';",
  "import Vendors from './pages/Vendors';\nimport CreditManagement from './pages/CreditManagement';"
);

// We have TWO blocks of routes (because of DEV_MODE_BYPASS). We need to replace them carefully.

// DEV_MODE_BYPASS = true block
content = content.replace(
  /<Route path="credit" element=\{<Credit \/>\} \/>\n\s*<Route path="credit\/:id" element=\{<CustomerDetails \/>\} \/>\n\s*<Route path="vendors" element=\{<Vendors \/>\} \/>\n\s*<Route path="vendors\/:id" element=\{<VendorDetails \/>\} \/>/g,
  `<Route path="credit" element={<CreditManagement />} />
              <Route path="credit/customers" element={<Credit />} />
              <Route path="credit/customers/:id" element={<CustomerDetails />} />
              <Route path="credit/vendors" element={<Vendors />} />
              <Route path="credit/vendors/:id" element={<VendorDetails />} />`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx");
