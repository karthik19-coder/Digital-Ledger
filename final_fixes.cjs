const fs = require('fs');

// Fix Vendors.tsx
let vendors = fs.readFileSync('src/pages/Vendors.tsx', 'utf8');
if (!vendors.includes('IndianRupee,')) {
    vendors = vendors.replace(
        "import { Search",
        "import { IndianRupee, Search"
    );
}
fs.writeFileSync('src/pages/Vendors.tsx', vendors);

// Fix VendorDetails.tsx imports
let vendorDetails = fs.readFileSync('src/pages/VendorDetails.tsx', 'utf8');
vendorDetails = vendorDetails.replace(
    "import { vendorService, Vendor, VendorTransaction } from '../services/vendor.service';",
    "import { vendorService } from '../services/vendor.service';\nimport { Vendor, VendorTransaction } from '../types/vendor';"
);
fs.writeFileSync('src/pages/VendorDetails.tsx', vendorDetails);

console.log("Fixes applied!");
