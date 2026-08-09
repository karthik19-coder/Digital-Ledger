const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// add imports
content = content.replace(
  "import Settings from './pages/Settings';",
  "import Settings from './pages/Settings';\nimport Vendors from './pages/Vendors';\nimport VendorDetails from './pages/VendorDetails';"
);

// add routes inside DEV_MODE_BYPASS
content = content.replace(
  /<Route path="credit\/:id" element=\{<CustomerDetails \/>\} \/>/g,
  '<Route path="credit/:id" element={<CustomerDetails />} />\n              <Route path="vendors" element={<Vendors />} />\n              <Route path="vendors/:id" element={<VendorDetails />} />'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx");
