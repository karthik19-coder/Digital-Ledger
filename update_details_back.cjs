const fs = require('fs');

let customerDetails = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');
customerDetails = customerDetails.replace(
  '<Link to="/credit" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">',
  '<Link to="/credit/customers" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">'
);
fs.writeFileSync('src/pages/CustomerDetails.tsx', customerDetails);

let vendorDetails = fs.readFileSync('src/pages/VendorDetails.tsx', 'utf8');
vendorDetails = vendorDetails.replace(
  '<Link to="/credit" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">',
  '<Link to="/credit/vendors" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">'
);
// In Vendor details it might have been /vendors depending on what it was replaced to, wait... I just used `/credit` from `CustomerDetails`.
vendorDetails = vendorDetails.replace(
  '<Link to="/vendors" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">',
  '<Link to="/credit/vendors" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">'
);
fs.writeFileSync('src/pages/VendorDetails.tsx', vendorDetails);

console.log("Updated Details back links");
